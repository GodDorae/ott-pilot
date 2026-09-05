/**
 * 측정 문항 — 7점 리커트
 *
 * ⚠️ 아래 문구는 "틀을 돌려보기 위한 초안"이다.
 * 최종 문항은 선행연구(TAM 계열 perceived usefulness / behavioral intention 척도)에서
 * 출처를 명시해 번안·수정해야 하며, 지도교수 확인 후 확정할 것.
 */

export type LikertItem = { key: string; text: string };

export const LIKERT_MIN = 1;
export const LIKERT_MAX = 7;
export const LIKERT_ANCHORS = ["전혀 그렇지 않다", "보통이다", "매우 그렇다"] as const;

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
