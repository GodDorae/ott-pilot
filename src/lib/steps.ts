/**
 * 설문 단계 목록 — /dev 미리보기, 상단 진행바, 개발 배너가 공유한다.
 *
 * 기조 문서의 4단계 구조를 그대로 옮겼다. `stage` 가 문서의 단계 번호다.
 *
 *   1단계 사전 세팅            1-1 안내·동의 / 1-2 사전설문
 *   2단계 조건 배정 & 장르선택  2-1 무작위 배정(화면 없음, 2-2 제출 시 서버에서) / 2-2 장르
 *   3단계 라틴스퀘어 반복측정   Trial 1~3, 사이에 짧은 휴식
 *   4단계 사후 점검 & 종료      4-1 조작점검 / 4-2 순위 / 4-3 주관식 / 4-4 인구통계
 */

export type Step = {
  /** 1부터 시작하는 단계 번호 — /dev/<n> 의 n */
  n: number;
  /** 짧은 식별자 (배너 표시용) */
  id: string;
  path: string;
  label: string;
  /** 기조 문서의 단계 (1~4) */
  stage: 1 | 2 | 3 | 4;
  /** 기조 문서의 항목 번호 */
  ref: string;
};

export const STEPS: Step[] = [
  { n: 1, id: "s1", path: "/", label: "실험 안내 & 참가 동의", stage: 1, ref: "1-1" },
  { n: 2, id: "s2", path: "/survey/usage", label: "사전 설문 · OTT 이용 현황", stage: 1, ref: "1-2" },
  { n: 3, id: "s3", path: "/pre", label: "6가지 장르 중 1개 선택", stage: 2, ref: "2-2" },
  { n: 4, id: "t1", path: "/stimulus/1", label: "Trial 1 · 자극 제시 + 평가", stage: 3, ref: "3" },
  { n: 5, id: "r1", path: "/rest/1", label: "짧은 휴식", stage: 3, ref: "3" },
  { n: 6, id: "t2", path: "/stimulus/2", label: "Trial 2 · 자극 제시 + 평가", stage: 3, ref: "3" },
  { n: 7, id: "r2", path: "/rest/2", label: "짧은 휴식", stage: 3, ref: "3" },
  { n: 8, id: "t3", path: "/stimulus/3", label: "Trial 3 · 자극 제시 + 평가", stage: 3, ref: "3" },
  { n: 9, id: "p1", path: "/post/check", label: "조작 점검 (조절변수)", stage: 4, ref: "4-1" },
  { n: 10, id: "p2", path: "/post/ranking", label: "독립변수 3조건 순위", stage: 4, ref: "4-2" },
  { n: 11, id: "p3", path: "/post/open", label: "주관식 응답", stage: 4, ref: "4-3" },
  {
    n: 12,
    id: "p4",
    path: "/survey/demographics",
    label: "인구통계 문항",
    stage: 4,
    ref: "4-4",
  },
  { n: 13, id: "s13", path: "/done", label: "제출 완료 / 참여 코드", stage: 4, ref: "4-4" },
];

export const TOTAL_STEP_COUNT = STEPS.length;

export const STAGE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "1단계 · 사전 세팅",
  2: "2단계 · 조건 배정 & 장르 선택",
  3: "3단계 · 반복 측정",
  4: "4단계 · 사후 점검 & 종료",
};

export function stepByNumber(n: number): Step | undefined {
  return STEPS.find((s) => s.n === n);
}

/** 현재 경로가 몇 번째 단계인지 (진행바용). 설문 단계가 아니면 null. */
export function stepByPath(pathname: string): Step | null {
  return STEPS.find((s) => s.path === pathname) ?? null;
}
