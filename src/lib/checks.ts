/**
 * 조작점검 문항.
 *
 * 대원칙: 조작점검은 PU·RA 뒤에 붙는다.
 * 예외는 주의력 점검(성실성 확인) 하나뿐이다 — 그건 문항을 읽고 있는지 보려는 것이므로
 * 측정 문항 사이에 끼어 있어야 뜻이 있다.
 *
 * 파일럿 전용 문항은 `pilotOnly` 로 표시한다. 문구가 전달되는지·이해되는지 확인하려는
 * 것이라 본실험까지 끌고 가면 응답 부담만 늘고 본 측정을 밀어낸다.
 */

import { RATIONALE_TYPES, type RationaleType } from "./experiment";
import { LIKERT_LABELS } from "./items";

/** 5점 척도 보기 (조작점검 척도 문항 공용) */
export const SCALE_LABELS = LIKERT_LABELS;

/**
 * 근거유형 조작점검 — 모든 화면.
 *
 * 보기 문구에 '콘텐츠 기반 / 협업 필터링 / 맥락 인식' 같은 학술 용어를 쓰지 않는다.
 * 용어를 보여주면 참여자가 실험의 틀을 알아차리고 그 틀에 맞춰 답한다.
 * 대신 화면이 실제로 내세운 근거를 참여자의 말로 적는다.
 *
 * ⚠️ 화면마다 묻는 대가: 첫 화면 직후 "추천 근거가 조작된다" 는 것을 알게 되어
 * 2·3화면은 그것을 아는 상태에서 보게 된다. 제시 순서 카운터밸런싱으로 상쇄되지 않는다.
 * 파일럿에서 근거 전달을 확인하려는 것이므로 감수한다.
 */
export const MC_RATIONALE = {
  question: "방금 보신 추천의 근거는 무엇에 가장 가까웠나요?",
  options: [
    { value: "content", label: "자주 시청한다고 답한 장르와의 유사성" },
    { value: "collab", label: "나와 비슷한 다른 이용자들의 시청 이력" },
    { value: "context", label: "현재의 평일·주말 여부 및 시간대와의 적합성" },
    { value: "unsure", label: "잘 모르겠다" },
  ],
} as const;

export type McRationaleAnswer = (typeof MC_RATIONALE.options)[number]["value"];

const MC_RATIONALE_VALUES = new Set<string>(MC_RATIONALE.options.map((o) => o.value));

export function isMcRationaleAnswer(v: unknown): v is McRationaleAnswer {
  return typeof v === "string" && MC_RATIONALE_VALUES.has(v);
}

/** 답이 그 화면의 실제 근거유형과 같은지 ('잘 모르겠다' 는 틀린 것으로 본다) */
export function isMcRationaleCorrect(answer: McRationaleAnswer, actual: RationaleType): boolean {
  return (RATIONALE_TYPES as readonly string[]).includes(answer) && answer === actual;
}

/**
 * 2,900원 금액 점검 — 이용조건 조작점검 화면, TVOD 조건만, 파일럿 전용.
 *
 * '볼 법한 금액인가' 와 '부담인가' 는 서로 다른 것을 묻는다.
 * 한 문항에 붙이면 어느 쪽에 답한 것인지 알 수 없으므로 척도를 둘로 나눈다.
 */
export const PRICE_CHECK = {
  realistic: "개별 대여 가격 2,900원이 실제 OTT 서비스에서 볼 법한 금액으로 느껴지셨나요?",
  burden: "이 금액이 선택에 부담으로 느껴지셨나요?",
  reasonLabel: "위 두 문항에 그렇게 답한 이유가 있다면 적어 주세요. (선택)",
  reasonPlaceholder: "예: 영화 한 편 값으로는 비싸게 느껴졌다",
  pilotOnly: true,
} as const;

/**
 * 반대 조건이었다면 — 이용조건 조작점검 화면, 개방형.
 *
 * 자기 조건이 아닌 쪽을 가정하게 해서, 이용 방식이 '추천 이유를 확인하려는 욕구' 에
 * 어떻게 걸리는지 본다. 그래서 문구가 조건에 따라 뒤집힌다.
 */
export const COUNTERFACTUAL = {
  question: (condition: "SVOD" | "TVOD") =>
    condition === "SVOD"
      ? "만약 추천 작품이 추가 결제를 해야 볼 수 있는 것이었다면, 추천 이유를 확인하는 데 있어 더 필요했던 정보가 있었나요?"
      : "만약 추천 작품이 구독형 무료로 볼 수 있었다면, 추천 이유를 확인하는 데 있어 더 필요했던 정보가 있었나요?",
  placeholder: "없으면 '없음' 이라고 적어 주세요.",
} as const;
