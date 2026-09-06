/**
 * 3단계 마지막 확인 + 4단계 사후 점검 문항
 *
 *   3-4 조작점검 — 배정받은 이용/결제 방식을 인지했는지 (3단계 마지막 스텝)
 *   4-1 순위      — 앞서 본 추천 화면 3개의 상대 순위 + 그렇게 고른 이유
 *   4-2 주관식    — 느낀 점 / 눈에 들어온 것 / 더 있었으면 한 것
 *
 * 근거유형 재인 과제(옛 4-1-2)는 쓰지 않기로 해서 화면과 컬럼을 모두 지웠다.
 */

import { RATIONALE_TYPES, type RationaleType } from "./experiment";

// 3-4 조작점검 (조절변수) -----------------------------------------------------

export const USAGE_MANIPULATION_CHECK = {
  question: "이번 조사에서 보신 추천 화면의 작품들은 어떻게 시청할 수 있다고 안내되었나요?",
  help: "기억나는 대로 답해 주세요. 정확히 기억나지 않으면 마지막 항목을 골라도 됩니다.",
  options: [
    { value: "SVOD", label: "구독에 포함되어 추가 결제 없이 볼 수 있다고 안내되었다" },
    { value: "TVOD", label: "5,500원을 결제하면 48시간 동안 볼 수 있다고 안내되었다" },
    { value: "unsure", label: "잘 기억나지 않는다" },
  ],
} as const;

// 4-1 순위 -------------------------------------------------------------------

/**
 * 참여자에게는 근거유형 이름을 보여주지 않는다.
 * '콘텐츠 기반/협업 기반/맥락 기반' 같은 용어를 노출하면 참여자가 실험의 조작을
 * 알아차리고 그 틀에 맞춰 답하게 된다. 대신 본 순서대로 '추천 화면 1·2·3' 으로 부르고
 * 각 화면을 축소해 함께 보여준다.
 *
 * 저장은 여전히 근거유형 기준(rank_content/collab/context)이다 — 화면 번호는
 * 참여자마다 다른 근거유형을 가리키므로, 제시 순서로 되돌려 기록한다.
 */
export const RANK_TASK = {
  question: "앞서 보신 추천 화면 세 개를 좋았던 순서대로 1위부터 3위까지 골라 주세요.",
  help: "같은 순위를 두 번 고를 수는 없습니다.",
  ranks: [1, 2, 3] as const,
} as const;

/** 4-1 바로 아래에서 함께 받는 주관식 */
export const RANK_REASON = {
  id: "open_reason",
  label: "각 순위(1~3위)로 추천 화면을 고른 이유는 무엇인가요?",
  placeholder: "예: 1위는 왜 추천되었는지가 가장 납득이 갔고, 3위는 …",
} as const;

/** 근거유형 → participants 컬럼명 */
export const RANK_COLUMNS: Record<RationaleType, string> = {
  content: "rank_content",
  collab: "rank_collab",
  context: "rank_context",
};

/**
 * 화면 번호(1-3) 기준 순위를 근거유형 기준으로 바꾼다.
 * presentationOrder[i] 가 i+1 번째 화면의 근거유형이다.
 */
export function ranksByRationale(
  ranksByStep: Record<number, number>,
  presentationOrder: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (let step = 1; step <= presentationOrder.length; step++) {
    const rationale = presentationOrder[step - 1] as RationaleType;
    out[RANK_COLUMNS[rationale]] = ranksByStep[step];
  }
  return out;
}

/** 각 화면에 순위가 하나씩, 순위끼리 중복 없이 배정됐는지 검증 */
export function validateRanking(
  ranksByStep: Record<number, number>,
): { ok: true } | { ok: false; error: string } {
  const values: number[] = [];
  for (let step = 1; step <= RATIONALE_TYPES.length; step++) {
    const v = ranksByStep[step];
    if (!Number.isInteger(v) || v < 1 || v > 3) {
      return { ok: false, error: "세 화면 모두에 순위를 매겨 주세요." };
    }
    values.push(v);
  }
  if (new Set(values).size !== values.length) {
    return { ok: false, error: "같은 순위를 두 번 고를 수는 없습니다." };
  }
  return { ok: true };
}

// 4-2 주관식 ------------------------------------------------------------------

/**
 * 전부 필수다. 쓸 말이 없으면 '없음' 이라고 적게 안내한다 —
 * 선택 응답으로 두면 대부분 비워 두어 자료가 남지 않는다.
 */
export const OPEN_QUESTIONS = [
  {
    id: "open_feeling",
    label: "각 추천 화면을 보고 난 후, 어떤 생각이나 느낌이 드셨나요? 자유롭게 적어 주세요.",
    placeholder: "예: 두 번째 화면은 나를 잘 안다는 느낌이 들었다",
  },
  {
    id: "open_notable",
    label: "각 추천 화면에서 특별히 눈에 들어온 내용이 있었다면 자유롭게 적어 주세요.",
    placeholder: "예: 추천 이유를 설명하는 문구, 작품 포스터 등",
  },
  {
    id: "open_missing",
    label:
      "각 추천 화면에서 제공된 내용 외에, 더 있었으면 했던 것이 있다면 자유롭게 적어 주세요.",
    placeholder: "예: 러닝타임, 평점, 왜 이 작품인지에 대한 더 자세한 설명 등",
  },
] as const;

export const OPEN_REQUIRED_HINT = "적을 내용이 없으시면 '없음' 이라고 적어 주세요.";
export const OPEN_MAX_LENGTH = 1000;

// 후속 인터뷰 모집 (마지막 화면) ---------------------------------------------

export const FOLLOWUP = {
  title: "후속 인터뷰 참여자 모집",
  body:
    "이번 조사에 이어 짧은 인터뷰(약 20분)에 참여해 주실 분을 찾고 있습니다. " +
    "참여해 주신 분께는 소정의 커피 기프티콘을 드립니다.",
  note: "선택 사항입니다. 남겨주신 연락처는 인터뷰 안내 외의 목적으로 쓰지 않으며, 대상자 선정이 끝나면 폐기합니다.",
  fields: [
    { id: "followup_email", label: "이메일", placeholder: "example@email.com", type: "email" },
    { id: "followup_phone", label: "휴대전화", placeholder: "010-0000-0000", type: "tel" },
  ],
} as const;

export const FOLLOWUP_MAX_LENGTH = 100;
