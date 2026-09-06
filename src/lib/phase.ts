/**
 * 조사 단계 — 파일럿 / 본실험
 *
 * 두 단계는 같은 테이블을 쓴다. 테이블을 새로 만들 이유가 없다.
 * 다른 것은 두 가지다.
 *   1) 응답이 어느 단계 것으로 기록되는가 (participants.phase)
 *   2) 조건 배정 카운터를 어느 범위에서 세는가
 *
 * 두 번째가 중요하다. 파일럿 응답이 테이블에 남은 채 본실험을 시작하면, 본실험 첫
 * 참여자들이 '파일럿 누적치 기준으로 가장 적은 칸'에 배정되어 카운터밸런싱이
 * 조용히 깨진다. 그래서 배정 함수 assign_next_cell(phase) 는 항상 같은 단계 안에서만 센다.
 *
 * 전환은 환경변수 한 줄이다 — .env.local 의 SURVEY_PHASE 를 main 으로 바꾸고 재시작.
 * 파일럿 데이터를 지울 필요도, 스키마를 바꿀 필요도 없다.
 */

export const PHASES = ["pilot", "main"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_LABELS: Record<Phase, string> = {
  pilot: "파일럿",
  main: "본실험",
};

function readPhase(): Phase {
  const raw = process.env.SURVEY_PHASE?.trim().toLowerCase();
  return PHASES.includes(raw as Phase) ? (raw as Phase) : "pilot";
}

/** 지금 수집 중인 단계. 설정이 없거나 값이 이상하면 안전하게 pilot 으로 떨어진다. */
export const SURVEY_PHASE: Phase = readPhase();

/**
 * 측정 도구 버전 — 이 응답이 '어떤 구성·순서'로 수집됐는지 데이터에 남기는 표시.
 *
 * 본실험은 구성과 순서가 달라질 수 있다. 그런데 단계 순서나 문항 구성은 스키마가 아니라
 * 앱 코드(steps.ts / flow.ts / presurvey.ts / posttest.ts)에 있어서, 바꿔도 DB에는
 * 아무 흔적이 남지 않는다. 그러면 나중에 두 단계 응답을 나란히 놓았을 때 어느 쪽이
 * 어떤 문항지로 받은 것인지 구분할 수 없다.
 *
 * 그래서 구성이나 순서를 바꿀 때마다 이 값을 올린다. 무엇을 바꿨는지는 아래 기록에 적는다.
 *
 *   2026-09-06.a  자극물 72편 확정(장르 12편 = 3세트 × 4편), 장르 선택 화면에
 *                 시청 경험 확인 문항 추가, peek 포스터가 세트의 4번째 작품이 됨
 *   2026-09-05.a  최초 — 기조 문서 4단계 구성
 *                 1-1 동의 / 1-2 사전설문(B) / 2-2 장르 / Trial×3(휴식 3초)
 *                 / 4-1 조작점검(조절변수+독립변수 재인) / 4-2 순위 / 4-3 주관식
 *                 / 4-4 인구통계(A)
 *                 시퀀스 6개, 세트매칭 3개, 이용조건 2개
 */
export const INSTRUMENT_VERSION = "2026-09-06.a";
