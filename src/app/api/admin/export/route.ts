import { listAll } from "@/lib/db";
import { GENRE_LABELS, type Genre } from "@/lib/experiment";
import { PHASES, SURVEY_PHASE, type Phase } from "@/lib/phase";
import { isAdminRequest } from "@/lib/adminauth";

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
  "open_opinion",
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
  "dwell_ms",
] as const;

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
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
        p.open_opinion,
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
