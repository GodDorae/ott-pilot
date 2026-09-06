/**
 * 코드북 — CSV 의 컬럼 하나하나가 무엇인지 적은 표.
 *
 * 참여자에게 보이는 문항 번호(A-1, B-3, 3-4, 4-2-2 …)와 DB 컬럼명(age_group,
 * rec_selection_freq, mc_usage_answer, open_notable …)은 서로 다르다.
 * 컬럼명을 문항 번호로 바꾸면 통계 도구에서 쓰기 어렵고(하이픈은 R·SPSS 변수명에
 * 못 쓴다) 이름만 봐서는 무엇을 재는지 알 수 없으므로, 이름을 맞추는 대신
 * **둘을 이어 주는 표**를 만든다.
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
import { ATTENTION_CHECK, INTENTION_ITEMS, LIKERT_LABELS, USEFULNESS_ITEMS } from "./items";
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

/** 자극물 화면 측정 문항 — 화면에 번호를 붙이지 않는다 (번호가 보이면 구성개념 경계가 드러난다) */
function trialItemRows(): CodebookRow[] {
  const scale = "3단계 · 추천 화면 평가";
  return [
    ...USEFULNESS_ITEMS.map((it, i) => ({
      column: it.key,
      code: `PU${i + 1}`,
      section: scale,
      question: it.text,
      type: "5점 리커트",
      values: LIKERT_SCALE,
    })),
    {
      column: ATTENTION_CHECK.key,
      code: "",
      section: scale,
      question: ATTENTION_CHECK.text,
      type: "5점 리커트 (성실성 확인)",
      values: `${LIKERT_SCALE} · 정답 ${ATTENTION_CHECK.correctValue}`,
    },
    {
      column: "attention_passed",
      code: "",
      section: scale,
      question: `성실성 확인 문항을 맞혔는지 (attention_check = ${ATTENTION_CHECK.correctValue})`,
      type: "논리",
      values: "true=통과 | false=오답",
    },
    ...INTENTION_ITEMS.map((it, i) => ({
      column: it.key,
      code: `RA${i + 1}`,
      section: scale,
      question: it.text,
      type: "5점 리커트",
      values: LIKERT_SCALE,
    })),
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
      code: "3-4",
      section: "3단계 · 조작점검",
      question: USAGE_MANIPULATION_CHECK.question,
      type: "명목 (단일선택)",
      values: pipe(
        USAGE_MANIPULATION_CHECK.options.map((o) => [o.value, o.label] as [string, string]),
      ),
    },
    {
      column: "mc_usage_correct",
      code: "3-4",
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
    { column: "instrument_version", code: "", section: design, question: "문항 구성 판번호 — 문항이 바뀌면 올라간다", type: "정수", values: "" },
    { column: "participant_code", code: "", section: meta, question: "참여자 식별 코드 (익명)", type: "문자열", values: "" },
    { column: "assignment_seq", code: "", section: meta, question: "배정 순번", type: "정수", values: "" },
    {
      column: "usage_condition",
      code: "",
      section: design,
      question: "이용조건 — 피험자 간 조절변수",
      type: "명목",
      values: pipe(USAGE_CONDITIONS.map((u) => [u, u === "SVOD" ? "구독 포함" : "개별 대여 5,500원/48시간"] as [string, string])),
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

/** 컬럼명 → 코드북 행 */
export function codebookByColumn(): Map<string, CodebookRow> {
  const rows = [...preSurveyRows(), ...designRows(), ...postTestRows(), ...trialItemRows()];
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
