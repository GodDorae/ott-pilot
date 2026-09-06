/**
 * 설문 단계 목록 — /dev 미리보기와 개발 배너가 공유한다.
 */

export type Step = {
  /** 1부터 시작하는 단계 번호 — /dev/<n> 의 n */
  n: number;
  /** 짧은 식별자 (배너 표시용) */
  id: string;
  path: string;
  label: string;
  /** 큰 단계 (1~4) */
  stage: 1 | 2 | 3 | 4;
  /** 문항 번호 */
  ref: string;
};

export const STEPS: Step[] = [
  { n: 1, id: "s1", path: "/", label: "실험 안내 & 참가 동의", stage: 1, ref: "1-1" },
  {
    n: 2,
    id: "s2",
    path: "/survey/demographics",
    label: "A. 인구 통계학적 정보",
    stage: 1,
    ref: "1-2",
  },
  { n: 3, id: "s3", path: "/survey/usage", label: "B. OTT 이용 현황", stage: 1, ref: "1-2" },
  { n: 4, id: "s4", path: "/pre", label: "호칭 + 선호 장르 선택", stage: 2, ref: "2-2" },
  { n: 5, id: "b1", path: "/brief", label: "3단계 안내 (이용조건 제시)", stage: 3, ref: "3-0" },
  { n: 6, id: "t1", path: "/stimulus/1", label: "추천 화면 1 + 평가", stage: 3, ref: "3" },
  { n: 7, id: "t2", path: "/stimulus/2", label: "추천 화면 2 + 평가", stage: 3, ref: "3" },
  { n: 8, id: "t3", path: "/stimulus/3", label: "추천 화면 3 + 평가", stage: 3, ref: "3" },
  { n: 9, id: "p1", path: "/post/check", label: "조작 점검 (이용조건)", stage: 3, ref: "3-4" },
  { n: 10, id: "p2", path: "/post/ranking", label: "추천 화면 순위 + 이유", stage: 4, ref: "4-1" },
  { n: 11, id: "p3", path: "/post/open", label: "주관식 응답", stage: 4, ref: "4-2" },
  { n: 12, id: "s12", path: "/done", label: "완료 + 후속 인터뷰 모집", stage: 4, ref: "4-3" },
];

export const TOTAL_STEP_COUNT = STEPS.length;

export const STAGE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "1단계 · 사전 조사",
  2: "2단계 · 조건 배정 & 장르 선택",
  3: "3단계 · 추천 화면 평가",
  4: "4단계 · 사후 점검 & 종료",
};

export function stepByNumber(n: number): Step | undefined {
  return STEPS.find((s) => s.n === n);
}

/** 현재 경로가 몇 번째 단계인지. 설문 단계가 아니면 null. */
export function stepByPath(pathname: string): Step | null {
  return STEPS.find((s) => s.path === pathname) ?? null;
}
