/**
 * 측정 문항 — 7점 리커트
 *
 * ⚠️ 아래 문구는 "틀을 돌려보기 위한 초안"이다.
 * 최종 문항은 선행연구(TAM 계열 perceived usefulness / behavioral intention 척도)에서
 * 출처를 명시해 번안·수정해야 하며, 지도교수 확인 후 확정할 것.
 */

export type LikertItem = { key: string; text: string };

export const LIKERT_MIN = 1;
export const LIKERT_MAX = 5;

/** 각 눈금의 뜻 — 5점이라 전부 적어줄 수 있다 */
export const LIKERT_LABELS = [
  "전혀 그렇지 않다",
  "그렇지 않다",
  "보통이다",
  "그렇다",
  "매우 그렇다",
] as const;

/** 매개변수 — 지각된 추천 유용성 */
export const USEFULNESS_ITEMS: LikertItem[] = [
  { key: "pu1", text: "이 추천은 내가 볼 만한 작품을 찾는 데 도움이 될 것 같다." },
  { key: "pu2", text: "이 추천은 내 취향을 잘 반영하고 있다고 느꼈다." },
  { key: "pu3", text: "이런 방식의 추천은 작품을 고를 때 유용하다고 생각한다." },
];

/** 종속변수 — 추천 수용의도 */
export const INTENTION_ITEMS: LikertItem[] = [
  { key: "ai1", text: "이 화면에서 추천된 작품을 시청해 보고 싶다." },
  { key: "ai2", text: "이 추천을 받아들여 실제로 재생해 볼 것 같다." },
  { key: "ai3", text: "이 추천 작품을 내 시청 목록에 추가할 것 같다." },
];

export const ALL_ITEMS = [...USEFULNESS_ITEMS, ...INTENTION_ITEMS];

/**
 * 성실성 확인 문항 (attention check)
 *
 * 화면마다 측정 문항 끝에 하나씩 둔다. 문항을 읽지 않고 같은 값만 찍고 넘어가는
 * 응답을 걸러내기 위한 것이다.
 *
 * 틀려도 진행을 막지 않는다 — 막으면 참여자가 정답을 맞출 때까지 고치게 되어,
 * 걸러내려던 응답이 그대로 통과해 버린다. 값만 기록하고 분석에서 제외 여부를 정한다.
 */
export const ATTENTION_CHECK = {
  key: "attention_check",
  text: "본 문항은 설문 응답의 성실성을 확인하기 위한 문항입니다. 아래 척도에서 ‘그렇다(4)’를 선택해 주세요.",
  correctValue: 4,
} as const;

/**
 * 자극물 화면에 실제로 놓이는 순서.
 *
 * 유용성 3 → 성실성 확인 1 → 수용의도 3
 * 성실성 문항을 가운데 끼워 두면 앞뒤 문항과 섞여 눈에 덜 띈다. 끝에 붙이면
 * "마지막 하나는 확인용이겠거니" 하고 알아채기 쉽다.
 */
export const TRIAL_ITEMS: LikertItem[] = [
  ...USEFULNESS_ITEMS,
  { key: ATTENTION_CHECK.key, text: ATTENTION_CHECK.text },
  ...INTENTION_ITEMS,
];
