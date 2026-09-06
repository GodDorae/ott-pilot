import { listAll } from "@/lib/db";
import { GENRE_LABELS, type Genre } from "@/lib/experiment";
import { PHASES, SURVEY_PHASE, type Phase } from "@/lib/phase";
import { isAdminRequest } from "@/lib/adminauth";
import type { FamiliarityLevel } from "@/lib/stimuli";
import { buildCodebook } from "@/lib/codebook";

/**
 * 응답 CSV 내보내기 — trial 1개 = 1행 (long format, 참여자당 3행).
 * 반복측정 분산분석(피험자 내 근거유형 × 피험자 간 이용조건)에 그대로 넣을 수 있는 모양.
 * 참여자 단위 값(사전설문·인구통계·사후 문항)은 3행에 반복해서 실린다.
 */

const HEADERS = [
  "phase",
  "instrument_version",
  "participant_code",
  "assignment_seq",
  "usage_condition",
  "preferred_genre",
  "preferred_genre_label",
  // 호칭 자체는 싣지 않는다 (익명성) — 개인화가 걸렸는지만 남긴다
  "has_display_name",
  // 응답 기기 — 목업 프레임과 맥락 문구를 함께 결정한 값
  "is_mobile",
  "device",
  // 저인지도 가정 검증 — 그 장르 12편 중 이미 본 편수
  "watched_count",
  "heard_count",
  "unknown_count",
  "seen_title_ids",
  "title_familiarity",
  // A. 인구통계 / B. OTT 이용 현황
  "age_group",
  "gender",
  "ott_platform",
  "ott_platform_other",
  "ott_tenure",
  "rec_selection_freq",
  "primary_device",
  "primary_device_other",
  "viewing_timeslot",
  "screened_out",
  "screened_out_reason",
  "mc_usage_answer",
  "mc_usage_correct",
  "rank_content",
  "rank_collab",
  "rank_context",
  "open_reason",
  "open_feeling",
  "open_notable",
  "open_missing",
  "followup_agreed",
  "consent_agreed_at",
  "posttest_at",
  "sequence_index",
  "mapping_index",
  "presentation_order",
  "started_at",
  "completed_at",
  "step_index",
  "rationale_type",
  "set_id",
  "title_ids",
  "pu1",
  "pu2",
  "pu3",
  "pu_mean",
  "ai1",
  "ai2",
  "ai3",
  "ai_mean",
  // 성실성 확인 — 정답 4
  "attention_check",
  "attention_passed",
  "dwell_ms",
] as const;

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** 작품별 시청 경험 3단계 중 특정 단계로 답한 편수 */
function countLevel(
  familiarity: Record<string, FamiliarityLevel> | null,
  level: FamiliarityLevel,
): string {
  if (!familiarity) return "";
  return String(Object.values(familiarity).filter((v) => v === level).length);
}

function mean(values: (number | null)[]): string {
  if (values.some((v) => v === null)) return "";
  const nums = values as number[];
  const sum = nums.reduce((a, b) => a + b, 0);
  return (sum / nums.length).toFixed(3);
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return new Response("권한이 없습니다.", { status: 401 });
  }

  /*
    ?format=codebook — 응답 대신 "컬럼이 무엇인지" 를 내려준다.
    화면의 문항 번호(A-1, 4-2-2 …)와 컬럼명(age_group, open_notable …)이 다르므로,
    통계를 뽑을 때 둘을 이어 주는 표가 있어야 한다. 문항 정의에서 그대로 만들기 때문에
    문항을 고쳐도 표가 옛날 것으로 남지 않는다.
  */
  if (new URL(req.url).searchParams.get("format") === "codebook") {
    const head = ["column", "code", "section", "question", "type", "values"];
    const body = buildCodebook(HEADERS).map((r) =>
      [r.column, r.code, r.section, r.question, r.type, r.values].map(cell).join(","),
    );
    const stampC = new Date().toISOString().slice(0, 10);
    return new Response("﻿" + [head.join(","), ...body].join("\r\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="ott-codebook-${stampC}.csv"`,
      },
    });
  }

  // ?phase=pilot|main|all — 기본은 지금 수집 중인 단계
  const raw = new URL(req.url).searchParams.get("phase");
  const phase: Phase | "all" =
    raw === "all" ? "all" : PHASES.includes(raw as Phase) ? (raw as Phase) : SURVEY_PHASE;

  const { participants, responses } = await listAll(phase);
  const byId = new Map(participants.map((p) => [p.id, p]));

  const rows = responses
    .map((r) => {
      const p = byId.get(r.participant_id);
      if (!p) return null;
      return [
        p.phase,
        p.instrument_version,
        p.participant_code,
        p.assignment_seq,
        p.usage_condition,
        p.preferred_genre,
        p.preferred_genre ? GENRE_LABELS[p.preferred_genre as Genre] : "",
        p.display_name !== null,
        p.is_mobile,
        p.is_mobile === null ? "" : p.is_mobile ? "mobile" : "desktop",
        p.seen_title_ids === null ? "" : p.seen_title_ids.length,
        countLevel(p.title_familiarity, "heard"),
        countLevel(p.title_familiarity, "unknown"),
        (p.seen_title_ids ?? []).join("|"),
        p.title_familiarity ? JSON.stringify(p.title_familiarity) : "",
        p.age_group,
        p.gender,
        p.ott_platform,
        p.ott_platform_other,
        p.ott_tenure,
        p.rec_selection_freq,
        p.primary_device,
        p.primary_device_other,
        p.viewing_timeslot,
        p.screened_out_at !== null,
        p.screened_out_reason,
        p.mc_usage_answer,
        p.mc_usage_correct,
        p.rank_content,
        p.rank_collab,
        p.rank_context,
        p.open_reason,
        p.open_feeling,
        p.open_notable,
        p.open_missing,
        p.followup_email !== null || p.followup_phone !== null,
        p.consent_agreed_at,
        p.posttest_at,
        p.sequence_index,
        p.mapping_index,
        (p.presentation_order ?? []).join(">"),
        p.started_at,
        p.completed_at,
        r.step_index,
        r.rationale_type,
        r.set_id,
        (r.title_ids ?? []).join("|"),
        r.pu1,
        r.pu2,
        r.pu3,
        mean([r.pu1, r.pu2, r.pu3]),
        r.ai1,
        r.ai2,
        r.ai3,
        mean([r.ai1, r.ai2, r.ai3]),
        r.attention_check,
        r.attention_passed,
        r.dwell_ms,
      ].map(cell);
    })
    .filter((r): r is string[] => r !== null);

  const csv = [HEADERS.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = phase === "all" ? "" : "-" + phase;

  // Excel 에서 한글이 깨지지 않도록 UTF-8 BOM 을 붙인다
  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition":
        'attachment; filename="ott-survey' + suffix + "-" + stamp + '.csv"',
    },
  });
}
