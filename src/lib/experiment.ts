/**
 * 실험 설계 상수 및 배정(assignment) 로직
 *
 * 설계 요약 (인수인계 문서 0.1 기준)
 * - 독립변수 1 · 추천 근거유형: 피험자 내(within), 3수준 → 참여자 1명이 3화면 모두 봄
 * - 독립변수 2 · 이용조건: 피험자 간(between), 2수준 → 참여자당 1조건만 배정
 * - 매개변수: 지각된 추천 유용성(3문항) / 종속변수: 추천 수용의도(3문항)
 */

export const RATIONALE_TYPES = ["content", "collab", "context"] as const;
export type RationaleType = (typeof RATIONALE_TYPES)[number];

export const USAGE_CONDITIONS = ["SVOD", "TVOD"] as const;
export type UsageCondition = (typeof USAGE_CONDITIONS)[number];

export const SET_IDS = ["A", "B", "C"] as const;
export type SetId = (typeof SET_IDS)[number];

export const GENRES = ["action", "romance", "comedy", "thriller", "drama", "scifi"] as const;
export type Genre = (typeof GENRES)[number];

export const GENRE_LABELS: Record<Genre, string> = {
  action: "액션",
  romance: "로맨스",
  comedy: "코미디",
  thriller: "스릴러",
  drama: "드라마",
  scifi: "SF/판타지",
};

export const RATIONALE_LABELS: Record<RationaleType, string> = {
  content: "콘텐츠 기반",
  collab: "협업 기반",
  context: "맥락 인식 기반",
};

/**
 * 제시 순서 카운터밸런싱 — 3! = 6개 시퀀스 완전 카운터밸런싱
 *
 * 기조 문서 3단계의 Sequence 1~6 과 같은 순서로 적어 둔다.
 * IV1 = 콘텐츠 기반(content), IV2 = 협업 기반(collab), IV3 = 맥락 인식 기반(context)
 *
 * 3×3 라틴방격(3행)이 아니라 6개 전체 순열을 쓰는 이유: 라틴방격은 각 조건이 각 순서
 * 위치에 한 번씩 오는 것만 보장하고, 조건 간 '직전에 무엇을 봤는지'(carryover)는
 * 균형시키지 못한다. 6개 순열을 모두 쓰면 순서 효과와 이월 효과가 함께 균형을 이룬다.
 */
export const SEQUENCES: readonly RationaleType[][] = [
  ["content", "collab", "context"], // Seq 1 · IV1 → IV2 → IV3
  ["collab", "context", "content"], // Seq 2 · IV2 → IV3 → IV1
  ["context", "content", "collab"], // Seq 3 · IV3 → IV1 → IV2
  ["content", "context", "collab"], // Seq 4 · IV1 → IV3 → IV2
  ["collab", "content", "context"], // Seq 5 · IV2 → IV1 → IV3
  ["context", "collab", "content"], // Seq 6 · IV3 → IV2 → IV1
];

/** 사람이 읽는 시퀀스 이름 (1부터) */
export function sequenceLabel(index: number): string {
  return "Seq " + (index + 1);
}

/**
 * 세트↔근거유형 매칭 카운터밸런싱 — 3개 순환 이동(cyclic shift)
 * 특정 포스터 세트가 항상 같은 근거유형에만 붙는 것을 방지 (인수인계 문서 3장 6번).
 */
export const SET_MAPPINGS: readonly Record<RationaleType, SetId>[] = [
  { content: "A", collab: "B", context: "C" },
  { content: "B", collab: "C", context: "A" },
  { content: "C", collab: "A", context: "B" },
];

export type Assignment = {
  /** 36개 셀 중 몇 번째 (0-35) */
  cell: number;
  usageCondition: UsageCondition;
  /** 시퀀스 인덱스 (0-5) */
  sequenceIndex: number;
  /** 세트 매칭 인덱스 (0-2) */
  mappingIndex: number;
  /** 실제 제시 순서 */
  order: RationaleType[];
  /** 근거유형 → 포스터 세트 */
  setMapping: Record<RationaleType, SetId>;
};

/**
 * 설계 전체 = 이용조건(2) × 시퀀스(6) × 세트매칭(3) = 36개 셀
 *
 * 어떤 셀을 줄지는 DB의 assign_next_cell() 이 고른다 — 지금까지 가장 적게 채워진 셀,
 * 동률이면 그 중 무작위. 표본이 36의 배수가 아니어도 1:1 비율에 최대한 붙는다.
 * (시퀀스만 보면 6개가 1:1:1:1:1:1 로 채워진다 — 기조 문서 3단계의 요구사항)
 */
export const TOTAL_CELLS = USAGE_CONDITIONS.length * SEQUENCES.length * SET_MAPPINGS.length;

/** cell 번호 → 실제 배정 내용 */
export function cellToAssignment(cell: number): Assignment {
  const c = ((cell % TOTAL_CELLS) + TOTAL_CELLS) % TOTAL_CELLS;
  const perUsage = SEQUENCES.length * SET_MAPPINGS.length; // 18
  const usageIndex = Math.floor(c / perUsage);
  const sequenceIndex = Math.floor((c % perUsage) / SET_MAPPINGS.length);
  const mappingIndex = c % SET_MAPPINGS.length;

  return {
    cell: c,
    usageCondition: USAGE_CONDITIONS[usageIndex],
    sequenceIndex,
    mappingIndex,
    order: [...SEQUENCES[sequenceIndex]],
    setMapping: { ...SET_MAPPINGS[mappingIndex] },
  };
}

/** 배정 내용 → cell 번호 (관리자 집계·/dev 조건 지정용) */
export function assignmentToCell(
  usageCondition: UsageCondition,
  sequenceIndex: number,
  mappingIndex: number,
): number {
  return (
    USAGE_CONDITIONS.indexOf(usageCondition) * SEQUENCES.length * SET_MAPPINGS.length +
    sequenceIndex * SET_MAPPINGS.length +
    mappingIndex
  );
}

/** 3단계 반복측정 trial 수 */
export const TOTAL_STEPS = RATIONALE_TYPES.length;

/** 참여자 코드: 사람이 읽고 옮겨적을 수 있는 짧은 익명 코드 */
export function makeParticipantCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동되는 I,O,0,1 제외
  let out = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}
