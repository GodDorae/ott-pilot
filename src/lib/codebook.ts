/**
 * 코드북 — CSV 의 컬럼 하나하나가 무엇인지 적은 표.
 *
 * 참여자에게 보이는 문항 번호(A-1, B-3, 3-4, 4-2-2 …)와 DB 컬럼명(age_group,
 * rec_selection_freq, mc_usage_answer, open_notable …)은 서로 다르다.
 * 컬럼명을 문항 번호로 바꾸면 통계 도구에서 쓰기 어렵고(하이픈은 R·SPSS 변수명에
 * 못 쓴다) 이름만 봐서는 무엇을 재는지 알 수 없으므로, 이름을 맞추는 대신
 * **둘을 이어 주는 표**를 만든다.
 *
 * code 열은 **참여자 화면에 보이는 번호**다. 두 가지 표기가 섞여 있다 —
 * 설문 문서의 번호 체계를 쓰는 화면은 A-1 · 3-4-2 · 4-2-1 처럼 계층 코드이고,
 * 자극물 화면은 1~12 로 위에서부터 이어지는 번호다 (이해도 확인에서 참여자가
 * "3번" 이라고 가리켜야 해서 계층 코드를 쓸 수 없다).
 *
 * 표는 문항 정의(presurvey.ts / items.ts / posttest.ts / stimuli.ts)에서 그대로
 * 뽑아낸다 — 손으로 적어 두면 문항을 고쳤을 때 표만 옛날 것으로 남는다.
 * 논문 부록의 코드북으로 그대로 쓸 수 있다.
 */

import {
  GENRE_LABELS,
  GENRES,
  RATIONALE_TYPES,
  SEQUENCES,
  SET_IDS,
  USAGE_CONDITIONS,
} from "./experiment";
import {
  ATTENTION_CHECK,
  INTENTION_ITEMS,
  ITEM_CLARITY,
  LIKERT_LABELS,
  ITEM_NUMBERS,
  TRIAL_ITEMS,
  USEFULNESS_ITEMS,
} from "./items";
import {
  BRIEF_UNDERSTOOD,
  COUNTERFACTUAL,
  GENRE_FIT,
  MC_RATIONALE,
  PRICE_CHECK,
  SCOPE_UNDERSTOOD,
  WORDING_NATURAL,
} from "./checks";
import { PRE_SECTIONS } from "./presurvey";
import { OPEN_QUESTIONS, RANK_COLUMNS, RANK_REASON, RANK_TASK, USAGE_MANIPULATION_CHECK } from "./posttest";
import { FAMILIARITY_LEVELS, FAMILIARITY_QUESTION } from "./stimuli";

export type CodebookRow = {
  /** CSV·DB 컬럼명 */
  column: string;
  /** 참여자 화면에 보이는 문항 번호. 설계값·파생값이면 빈 문자열 */
  code: string;
  /** 어느 단계에서 나온 값인지 */
  section: string;
  /** 문항 전문 또는 값의 뜻 */
  question: string;
  /** 척도·자료형 */
  type: string;
  /** 값 → 라벨 */
  values: string;
};

const pipe = (pairs: [string, string][]) => pairs.map(([v, l]) => `${v}=${l}`).join(" | ");

const LIKERT_SCALE = pipe(LIKERT_LABELS.map((l, i) => [String(i + 1), l] as [string, string]));

const GENRE_VALUES = pipe(GENRES.map((g) => [g, GENRE_LABELS[g]] as [string, string]));

/** 사전조사 A·B — 문항 정의에서 그대로 */
function preSurveyRows(): CodebookRow[] {
  const rows: CodebookRow[] = [];
  for (const section of [PRE_SECTIONS.demographics, PRE_SECTIONS.usage]) {
    for (const q of section.questions) {
      rows.push({
        column: q.id,
        code: q.code,
        section: section.title,
        question: q.label,
        type: "명목 (단일선택)",
        values: pipe(q.choices.map((c) => [c.value, c.label] as [string, string])),
      });
      if (q.otherColumn) {
        rows.push({
          column: q.otherColumn,
          code: q.code,
          section: section.title,
          question: `${q.label} — '기타' 선택 시 자유입력`,
          type: "문자열",
          values: `${q.otherValue} 를 골랐을 때만 값이 있다`,
        });
      }
    }
  }
  return rows;
}

/**
 * 자극물 화면 측정 문항.
 *
 * code 열에는 **화면에 보이는 번호**(1~7)를 적는다. 참여자에게는 구성개념 이름을
 * 보여주지 않으므로 PU1·RA3 같은 표기는 화면에 없는 것이고, 이해도 확인 문항에서
 * 참여자가 가리키는 것도 "3번" 이다. 구성개념은 section 열에 적어 둔다 —
 * 그러면 이 표 하나로 "3번 → pu3 → 지각된 유용성" 이 한 줄에 따라온다.
 *
 * 번호는 TRIAL_ITEMS 에서 그대로 읽는다. 여기서 따로 세면 화면 순서가 바뀔 때
 * 표만 옛날 번호로 남는다.
 */
function trialItemRows(): CodebookRow[] {
  const scale = "3단계 · 추천 화면 평가";
  const construct = (key: string) =>
    USEFULNESS_ITEMS.some((i) => i.key === key)
      ? `${scale} (지각된 유용성)`
      : INTENTION_ITEMS.some((i) => i.key === key)
        ? `${scale} (추천 수용의도)`
        : `${scale} (성실성 확인)`;

  return [
    ...TRIAL_ITEMS.map((it) => ({
      column: it.key,
      code: String(it.no),
      section: construct(it.key),
      question: it.text,
      type: it.key === ATTENTION_CHECK.key ? "5점 리커트 (성실성 확인)" : "5점 리커트",
      values:
        it.key === ATTENTION_CHECK.key
          ? `${LIKERT_SCALE} · 정답 ${ATTENTION_CHECK.correctValue}`
          : LIKERT_SCALE,
    })),
    {
      column: "attention_passed",
      code: "",
      section: `${scale} (성실성 확인)`,
      question: `성실성 확인 문항을 맞혔는지 (attention_check = ${ATTENTION_CHECK.correctValue})`,
      type: "논리",
      values: "true=통과 | false=오답",
    },
    {
      column: "unclear_count",
      code: "",
      section: scale,
      question: "이해하기 어려웠다고 고른 문항 수 (파생)",
      type: "정수",
      values: "0~7 · 0 = 없음 을 골랐거나 고른 문항이 없다",
    },
    {
      column: "unclear_items",
      code: "8",
      section: scale,
      question: ITEM_CLARITY.question,
      type: "다중선택 (문항 번호)",
      values: ITEM_NUMBERS.join(" | ") + " (| 로 구분) · 빈 값 = 없음",
    },
    {
      column: "unclear_reason",
      code: "8",
      section: scale,
      question: ITEM_CLARITY.reasonLabel,
      type: "주관식",
      values: "문항을 하나라도 골랐을 때만 값이 있다",
    },
    {
      column: "pu_mean",
      code: "",
      section: scale,
      question: "지각된 유용성 3문항 평균 (파생)",
      type: "연속",
      values: "1.000 ~ 5.000",
    },
    {
      column: "ra_mean",
      code: "",
      section: scale,
      question: "추천 수용의도 3문항 평균 (파생)",
      type: "연속",
      values: "1.000 ~ 5.000",
    },
    {
      column: "dwell_ms",
      code: "",
      section: scale,
      question: "그 화면에 머문 시간",
      type: "연속 (밀리초)",
      values: "",
    },
  ];
}

/** 사후 문항 3-4 · 4-1 · 4-2 */
function postTestRows(): CodebookRow[] {
  const rows: CodebookRow[] = [
    {
      column: "mc_usage_answer",
      code: "3-4-1",
      section: "3단계 · 조작점검",
      question: USAGE_MANIPULATION_CHECK.question,
      type: "명목 (단일선택)",
      values: pipe(
        USAGE_MANIPULATION_CHECK.options.map((o) => [o.value, o.label] as [string, string]),
      ),
    },
    {
      column: "mc_usage_correct",
      code: "3-4-1",
      section: "3단계 · 조작점검",
      question: "조작점검 응답이 배정된 이용조건과 일치하는지 (파생)",
      type: "논리",
      values: "true=일치 | false=불일치·모름",
    },
  ];

  for (const rationale of RATIONALE_TYPES) {
    rows.push({
      column: RANK_COLUMNS[rationale],
      code: "4-1",
      section: "4단계 · 순위",
      question: `${RANK_TASK.question} — ${rationale} 근거유형 화면이 받은 순위`,
      type: "순위",
      values: "1 | 2 | 3 (1이 가장 좋음)",
    });
  }

  rows.push({
    column: RANK_REASON.id,
    code: "4-1",
    section: "4단계 · 순위",
    question: RANK_REASON.label,
    type: "주관식",
    values: "",
  });

  for (const [i, q] of OPEN_QUESTIONS.entries()) {
    rows.push({
      column: q.id,
      code: `4-2-${i + 1}`,
      section: "4단계 · 주관식",
      question: q.label,
      type: "주관식 (필수)",
      values: "",
    });
  }

  return rows;
}

/** 조건 배정·설계값·기록 — 참여자가 답한 것이 아니라 시스템이 남긴 값 */
function designRows(): CodebookRow[] {
  const design = "설계 · 배정";
  const meta = "기록";
  return [
    { column: "phase", code: "", section: design, question: "수집 단계", type: "명목", values: "pilot=파일럿 | main=본실험" },
    {
      column: "instrument_version",
      code: "",
      section: design,
      question: "문항 구성 판번호 — 문항이 바뀌면 올라간다",
      type: "정수",
      values:
        "1=초판 (개별 대여 5,500원 48시간) | 2=추천 근거 확정 문구 + 개별 대여 4,000원 · 결제 후 30일 내 시청 시작, 시작 후 48시간",
    },
    { column: "participant_code", code: "", section: meta, question: "참여자 식별 코드 (익명)", type: "문자열", values: "" },
    { column: "assignment_seq", code: "", section: meta, question: "배정 순번", type: "정수", values: "" },
    {
      column: "usage_condition",
      code: "",
      section: design,
      question: "이용조건 — 피험자 간 조절변수",
      type: "명목",
      values: pipe(USAGE_CONDITIONS.map((u) => [u, u === "SVOD" ? "구독 포함" : "개별 대여 2,900원 · 30일 내 시작 후 48시간"] as [string, string])),
    },
    {
      column: "sequence_index",
      code: "",
      section: design,
      question: "근거유형 제시 순서 (카운터밸런싱)",
      type: "명목",
      values: SEQUENCES.map((seq, i) => `${i}=${seq.join(">")}`).join(" | "),
    },
    {
      column: "mapping_index",
      code: "",
      section: design,
      question: "근거유형↔포스터 세트 짝짓기 (카운터밸런싱)",
      type: "명목",
      values: "0 | 1 | 2 (순환 배정)",
    },
    { column: "presentation_order", code: "", section: design, question: "실제 제시된 근거유형 순서", type: "문자열", values: RATIONALE_TYPES.join(">") + " 형태" },
    { column: "step_index", code: "", section: design, question: "몇 번째 추천 화면인지 (긴 형식의 반복 단위)", type: "정수", values: "1 | 2 | 3" },
    { column: "rationale_type", code: "", section: design, question: "그 화면의 근거유형 — 피험자 내 독립변수", type: "명목", values: RATIONALE_TYPES.join(" | ") },
    { column: "set_id", code: "", section: design, question: "그 화면에 쓰인 포스터 세트", type: "명목", values: SET_IDS.join(" | ") },
    { column: "title_ids", code: "", section: design, question: "그 화면에 나온 작품 4편", type: "문자열 (| 구분)", values: "" },
    {
      column: "preferred_genre",
      code: "2-2",
      section: "2단계 · 개인화",
      question: "평소 즐겨 보는 장르 (선택한 장르가 자극물 포스터를 결정한다)",
      type: "명목",
      values: GENRE_VALUES,
    },
    { column: "preferred_genre_label", code: "2-2", section: "2단계 · 개인화", question: "선호 장르 한글 표기 (파생)", type: "문자열", values: "" },
    {
      column: "has_display_name",
      code: "2-2",
      section: "2단계 · 개인화",
      question: "화면 표시용 호칭을 입력했는지 (호칭 자체는 익명성 때문에 내보내지 않는다)",
      type: "논리",
      values: "true | false",
    },
    {
      column: "title_familiarity",
      code: "2-2",
      section: "2단계 · 개인화",
      question: FAMILIARITY_QUESTION,
      type: "JSON (작품 id → 단계)",
      values: pipe(FAMILIARITY_LEVELS.map((l) => [l.value, l.label] as [string, string])),
    },
    { column: "watched_count", code: "2-2", section: "2단계 · 개인화", question: "선호 장르 12편 중 '시청한 적 있다' 편수 (저인지도 가정 검증)", type: "정수", values: "0~12" },
    { column: "heard_count", code: "2-2", section: "2단계 · 개인화", question: "'이름만 들어봤다' 편수", type: "정수", values: "0~12" },
    { column: "unknown_count", code: "2-2", section: "2단계 · 개인화", question: "'전혀 모른다' 편수", type: "정수", values: "0~12" },
    { column: "seen_title_ids", code: "2-2", section: "2단계 · 개인화", question: "'시청한 적 있다' 로 답한 작품 id", type: "문자열 (| 구분)", values: "" },
    { column: "is_mobile", code: "", section: meta, question: "모바일로 응답했는지 (기록용 공변량 — 자극물은 기기와 무관하게 언제나 스마트폰 화면이다)", type: "논리", values: "true=모바일 | false=PC·태블릿" },
    { column: "device", code: "", section: meta, question: "응답 기기 (파생)", type: "명목", values: "mobile | desktop" },
    { column: "screened_out", code: "", section: meta, question: "선별 제외되었는지", type: "논리", values: "true | false" },
    { column: "screened_out_reason", code: "", section: meta, question: "선별 제외 사유", type: "명목", values: "no_platform=이용 플랫폼 없음 | never_used=OTT 사용 경험 없음" },
    { column: "followup_agreed", code: "", section: meta, question: "후속 인터뷰 연락처를 남겼는지 (연락처 자체는 내보내지 않는다)", type: "논리", values: "true | false" },
    { column: "consent_agreed_at", code: "1-1", section: meta, question: "연구참여 동의 시각", type: "시각 (ISO8601)", values: "" },
    { column: "started_at", code: "", section: meta, question: "설문 시작 시각", type: "시각 (ISO8601)", values: "" },
    { column: "assigned_at", code: "", section: meta, question: "조건이 배정된 시각 (장르 제출 시점)", type: "시각 (ISO8601)", values: "" },
    { column: "brief_seen_at", code: "", section: meta, question: "3단계 안내를 읽고 넘어간 시각", type: "시각 (ISO8601)", values: "" },
    { column: "brief_dwell_sec", code: "", section: meta, question: "3단계 안내에 머문 시간 — 조작점검 오답을 해석할 때 쓴다 (파생)", type: "연속 (초)", values: "" },
    { column: "attention_passed_count", code: "", section: meta, question: "화면 3개 중 성실성 확인 문항을 맞힌 수 (참여자 단위, 파생)", type: "정수", values: "0~3" },
    { column: "posttest_at", code: "", section: meta, question: "사후 문항 제출 시각", type: "시각 (ISO8601)", values: "" },
    { column: "completed_at", code: "", section: meta, question: "완료 시각 (비어 있으면 중도 이탈)", type: "시각 (ISO8601)", values: "" },
  ];
}


/**
 * 조작점검 — 대원칙상 PU·RA 뒤에 붙는 문항들.
 *
 * 파일럿 전용 문항은 그 사실을 values 에 적는다. 본실험 CSV 에서 그 열이 통째로
 * 비어 있는 것을 보고 "수집이 안 됐다" 고 오해하지 않게.
 */
function checkRows(): CodebookRow[] {
  const screen = "3단계 · 화면별 조작점검";
  const pilotOnly = " · 파일럿에서만 수집";
  return [
    {
      column: "mc_rationale_answer",
      code: "9",
      section: screen,
      question: MC_RATIONALE.question,
      type: "명목 (단일선택)",
      values: pipe(MC_RATIONALE.options.map((o) => [o.value, o.label] as [string, string])),
    },
    {
      column: "mc_rationale_correct",
      code: "",
      section: screen,
      question: "근거유형 조작점검 응답이 그 화면의 실제 근거유형과 같은지 (파생)",
      type: "논리",
      values: "true=일치 | false=불일치·모름",
    },
    {
      column: "mc_rationale_correct_count",
      code: "",
      section: "기록",
      question: "화면 3개 중 근거유형 조작점검을 맞힌 수 (참여자 단위, 파생)",
      type: "정수",
      values: "0~3",
    },
    {
      column: "wording_natural",
      code: "10",
      section: screen,
      question: WORDING_NATURAL.question,
      type: "5점 리커트",
      values: LIKERT_SCALE + pilotOnly,
    },
    {
      column: "wording_reason",
      code: "10",
      section: screen,
      question: WORDING_NATURAL.reasonLabel,
      type: "주관식",
      values: `wording_natural 이 ${WORDING_NATURAL.reasonThreshold}점 이하일 때만 값이 있다`,
    },
    {
      column: "scope_understood",
      code: "11",
      section: screen,
      question: SCOPE_UNDERSTOOD.question,
      type: "명목 (단일선택)",
      values:
        pipe(SCOPE_UNDERSTOOD.options.map((o) => [o.value, o.label] as [string, string])) +
        " · 첫 화면(step_index=1)에서만" +
        pilotOnly,
    },
    {
      column: "genre_fit",
      // 문구 범위 점검이 첫 화면에만 있어, 2·3화면에서는 번호가 한 칸 당겨진다
      code: "11~12",
      section: screen,
      question: GENRE_FIT.template,
      type: "5점 리커트",
      values: LIKERT_SCALE + " · 첫 화면 12번 · 2·3화면 11번" + pilotOnly,
    },
    {
      column: "brief_understood",
      code: "3-0",
      section: "3단계 · 시작 전 안내",
      question: BRIEF_UNDERSTOOD.question,
      type: "5점 리커트",
      values: LIKERT_SCALE + pilotOnly,
    },
    {
      column: "price_realistic",
      code: "3-4-2",
      section: "3단계 · 조작점검",
      question: PRICE_CHECK.realistic,
      type: "5점 리커트",
      values: LIKERT_SCALE + " · TVOD 조건만" + pilotOnly,
    },
    {
      column: "price_burden",
      code: "3-4-3",
      section: "3단계 · 조작점검",
      question: PRICE_CHECK.burden,
      type: "5점 리커트",
      values: LIKERT_SCALE + " · TVOD 조건만" + pilotOnly,
    },
    {
      column: "price_reason",
      code: "3-4-4",
      section: "3단계 · 조작점검",
      question: PRICE_CHECK.reasonLabel,
      type: "주관식 (선택)",
      values: "TVOD 조건만" + pilotOnly,
    },
    {
      column: "counterfactual_info",
      code: "3-4-5",
      section: "3단계 · 조작점검",
      question: `${COUNTERFACTUAL.question("SVOD")} (SVOD 조건) / ${COUNTERFACTUAL.question("TVOD")} (TVOD 조건)`,
      type: "주관식",
      values: "배정 조건에 따라 문구가 뒤집힌다",
    },
  ];
}

/** 컬럼명 → 코드북 행 */
export function codebookByColumn(): Map<string, CodebookRow> {
  const rows = [...preSurveyRows(), ...designRows(), ...postTestRows(), ...trialItemRows(), ...checkRows()];
  return new Map(rows.map((r) => [r.column, r]));
}

/**
 * CSV 컬럼 순서대로 코드북을 만든다.
 * 설명이 없는 컬럼은 그 사실이 드러나도록 남겨 둔다 — 조용히 빠지면 못 알아챈다.
 */
export function buildCodebook(columns: readonly string[]): CodebookRow[] {
  const byColumn = codebookByColumn();
  return columns.map(
    (column) =>
      byColumn.get(column) ?? {
        column,
        code: "",
        section: "(설명 없음)",
        question: "코드북에 정의되지 않은 컬럼 — src/lib/codebook.ts 에 추가해야 한다",
        type: "",
        values: "",
      },
  );
}
