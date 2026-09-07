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

import { RATIONALE_TYPES, type Genre, GENRE_LABELS, type RationaleType } from "./experiment";
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
    { value: "context", label: "지금 이 요일·시간대·기기 상황" },
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

/** 문구 자연스러움 — 모든 화면, 파일럿 전용. 3점 이하면 이유를 받는다 */
export const WORDING_NATURAL = {
  question: "방금 보신 화면의 문구가 자연스럽게 느껴지셨나요?",
  reasonLabel: "어떤 점이 자연스럽지 않았는지 적어 주세요.",
  reasonPlaceholder: "예: 요일과 시간대를 말하는 게 어색했다",
  /** 이 값 이하면 이유를 받는다 */
  reasonThreshold: 3,
  pilotOnly: true,
} as const;

/**
 * 하단 문구의 적용 범위 이해 — 첫 화면에서만, 파일럿 전용.
 *
 * 배너 한 줄이 가로로 나열된 작품 전체에 걸린다는 것이 읽히는지 본다.
 * 첫 화면에서만 묻는 이유: 한 번 묻고 나면 그 뒤로는 "전체에 걸린다" 는 것을 알고 보게 되어
 * 두 번째·세 번째 화면의 답은 처음 인상이 아니다.
 */
export const SCOPE_UNDERSTOOD = {
  question:
    "방금 보신 화면에서, 하단 문구 설명이 화면에 가로로 나열된 작품들 전체에 해당한다는 뜻인지 이해되셨나요?",
  options: [
    { value: "yes", label: "그렇다." },
    { value: "no", label: "아니다. 이해하지 못했다." },
    { value: "unsure", label: "잘 모르겠다." },
  ],
  pilotOnly: true,
} as const;

const SCOPE_VALUES = new Set<string>(SCOPE_UNDERSTOOD.options.map((o) => o.value));

export function isScopeAnswer(v: unknown): v is "yes" | "no" | "unsure" {
  return typeof v === "string" && SCOPE_VALUES.has(v);
}

/**
 * 목적격 조사를 붙인다 — 받침이 있으면 "을", 없으면 "를".
 *
 * 장르 라벨을 문장에 끼워 넣는 자리에 필요하다. "액션를 선택하셨습니다" 처럼 틀린 조사가
 * 나오면 참여자가 문구를 자동 생성으로 읽고, 그 화면에서 묻는 "문구가 자연스러웠는지" 에
 * 그대로 섞여 들어간다.
 *
 * 한글 음절은 유니코드에서 초성×588 + 중성×28 + 종성 순으로 배열되어 있어,
 * (코드 - 가) % 28 이 0 이면 종성이 없다.
 */
function withObjectParticle(word: string): string {
  const last = word.codePointAt(word.length - 1) ?? 0;
  const isHangulSyllable = last >= 0xac00 && last <= 0xd7a3;
  // 한글이 아니면(예: SF/판타지 의 "지" 는 한글이라 걸리지 않지만, 영문·숫자 끝이면) "를"
  const hasFinal = isHangulSyllable && (last - 0xac00) % 28 !== 0;
  return word + (hasFinal ? "을" : "를");
}

/** 선호 장르 적합도 — 모든 화면, 파일럿 전용 */
const GENRE_FIT_TEMPLATE =
  "앞서 선호 장르로 {장르} 선택하셨습니다. 방금 보신 추천작들이 그 장르와 잘 맞았다고 느끼셨나요?";

export const GENRE_FIT = {
  /** 코드북·논문 부록에 싣는 원문 — {장르} 자리에 참여자가 고른 장르가 조사와 함께 들어간다 */
  template: GENRE_FIT_TEMPLATE.replace("{장르}", "{장르}를"),
  question: (genre: Genre) =>
    GENRE_FIT_TEMPLATE.replace("{장르}", withObjectParticle(GENRE_LABELS[genre])),
  pilotOnly: true,
} as const;

/** 3단계 안내 이해도 — 안내 화면 하단, 파일럿 전용 */
export const BRIEF_UNDERSTOOD = {
  question:
    "이용 방식에 대한 안내 문구를 읽고, 이후 화면들에서 어떻게 콘텐츠를 이용하게 되는지 명확히 이해되셨나요?",
  pilotOnly: true,
} as const;

/**
 * 5,500원 금액 점검 — 이용조건 조작점검 화면, TVOD 조건만, 파일럿 전용.
 *
 * '볼 법한 금액인가' 와 '부담인가' 는 서로 다른 것을 묻는다.
 * 한 문항에 붙이면 어느 쪽에 답한 것인지 알 수 없으므로 척도를 둘로 나눈다.
 */
export const PRICE_CHECK = {
  realistic: "개별 대여 가격 5,500원이 실제 OTT 서비스에서 볼 법한 금액으로 느껴지셨나요?",
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
