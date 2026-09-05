/**
 * 4단계 사후 점검 문항 (기조 문서 4-1 ~ 4-3)
 *
 *   4-1 조작점검 — 배정받은 조절변수(이용/결제 방식)를 인지했는지
 *   4-2 순위      — 독립변수 3조건의 상대적 순위 (1/2/3위, 중복 불가)
 *   4-3 주관식    — 선택 이유 / 경험 의견
 *
 * 4-4 인구통계는 사전 문항 정의(presurvey.ts)의 demographics 섹션을 그대로 쓴다.
 */

import { RATIONALE_LABELS, RATIONALE_TYPES, type RationaleType } from "./experiment";

// 4-1 조작점검 (조절변수) -----------------------------------------------------

/**
 * 화면별 조작점검(screen_responses.manipulation_*)과는 별개다.
 * 그쪽은 독립변수(근거유형)가 전달됐는지 보고, 이쪽은 조절변수를 본다.
 */
export const USAGE_MANIPULATION_CHECK = {
  question: "이번 조사에서 보신 추천 화면의 작품들은 어떻게 시청할 수 있다고 안내되었나요?",
  help: "기억나는 대로 답해 주세요. 정확히 기억나지 않으면 마지막 항목을 골라도 됩니다.",
  options: [
    { value: "SVOD", label: "구독에 포함되어 추가 결제 없이 볼 수 있다고 안내되었다" },
    { value: "TVOD", label: "5,500원을 결제하면 48시간 동안 볼 수 있다고 안내되었다" },
    { value: "unsure", label: "잘 기억나지 않는다" },
  ],
} as const;

/**
 * 4-1b 독립변수 조작점검 — 재인(recognition) 과제
 *
 * 참여자는 세 근거유형을 모두 보므로 "무엇이었나요?"를 한 번 묻는 형태는 성립하지 않는다.
 * 실제 제시된 설명 3개에 제시되지 않은 방해자극 2개를 섞어 고르게 하고,
 * 3개를 모두 고르고 방해자극을 하나도 고르지 않았을 때만 정답으로 본다.
 *
 * trial 안에서는 포스터 소재가 달라도 근거유형이 하나로 고정되므로,
 * trial 마다 묻지 않고 여기서 한 번만 확인한다.
 */
export const RATIONALE_RECOGNITION_CHECK = {
  question: "이번 조사에서 실제로 제시된 추천 이유 설명을 모두 골라 주세요.",
  help: "여러 개를 고를 수 있습니다. 제시되지 않은 설명도 섞여 있습니다.",
  options: [
    {
      value: "content",
      label: "최근 시청한 작품과 분위기가 비슷해서",
      correct: true,
    },
    {
      value: "collab",
      label: "나와 취향이 비슷한 이용자들이 많이 시청해서",
      correct: true,
    },
    {
      value: "context",
      label: "지금의 시간대·기기 상황에 어울려서",
      correct: true,
    },
    // 아래 둘은 실제로 제시하지 않은 방해자극
    {
      value: "rating",
      label: "평점이 높은 순서라서",
      correct: false,
    },
    {
      value: "new",
      label: "최근에 공개된 신작이라서",
      correct: false,
    },
  ],
} as const;

/** 정답 = 실제 3개를 모두 고르고 방해자극은 하나도 고르지 않음 */
export function gradeRationaleRecognition(selected: string[]): boolean {
  const picked = new Set(selected);
  return RATIONALE_RECOGNITION_CHECK.options.every(
    (o) => picked.has(o.value) === o.correct,
  );
}

// 4-2 순위 -------------------------------------------------------------------

export const RANK_TASK = {
  question: "세 가지 추천 방식을 좋았던 순서대로 1위부터 3위까지 골라 주세요.",
  help: "같은 순위를 두 번 고를 수는 없습니다.",
  /** 순위를 매길 대상 = 독립변수 3수준 */
  items: RATIONALE_TYPES.map((r) => ({
    key: r,
    label: RATIONALE_LABELS[r],
  })),
  ranks: [1, 2, 3] as const,
} as const;

/** 근거유형 → participants 컬럼명 */
export const RANK_COLUMNS: Record<RationaleType, string> = {
  content: "rank_content",
  collab: "rank_collab",
  context: "rank_context",
};

/**
 * 각 항목에 순위가 하나씩, 순위끼리 중복 없이 배정됐는지 검증.
 * DB 제약과 같은 조건을 화면·서버에서도 본다.
 */
export function validateRanking(
  ranking: Partial<Record<RationaleType, number>>,
): { ok: true } | { ok: false; error: string } {
  const values: number[] = [];
  for (const r of RATIONALE_TYPES) {
    const v = ranking[r];
    if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > 3) {
      return { ok: false, error: "모든 항목에 순위를 매겨 주세요." };
    }
    values.push(v as number);
  }
  if (new Set(values).size !== values.length) {
    return { ok: false, error: "같은 순위를 두 번 고를 수는 없습니다." };
  }
  return { ok: true };
}

// 4-3 주관식 ------------------------------------------------------------------

export const OPEN_QUESTIONS = [
  {
    id: "open_reason",
    label: "1위로 고른 추천 방식을 그렇게 고른 이유는 무엇인가요?",
    placeholder: "예: 왜 추천되었는지가 가장 납득이 갔다",
    required: true,
  },
  {
    id: "open_opinion",
    label: "이번 추천 화면들을 보면서 느낀 점이 있다면 자유롭게 적어 주세요.",
    placeholder: "불편했던 점, 실제 서비스에서 바랐던 점 등 (선택 응답)",
    required: false,
  },
] as const;

export const OPEN_MAX_LENGTH = 1000;
