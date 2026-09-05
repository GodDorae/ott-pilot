/**
 * 참여 흐름 순서와 단계 가드 (기조 문서 4단계 구조)
 *
 *   /                      1-1 안내 + 참가 동의
 *   /survey/usage          1-2 사전설문 (OTT 이용 습관·기기·시간대)
 *   /pre                   2-2 장르 선택  ← 여기 제출 시 2-1 조건 배정이 일어난다
 *   /stimulus/1 → /rest/1 → /stimulus/2 → /rest/2 → /stimulus/3   3단계 반복측정
 *   /post/check            4-1 조작점검 (조절변수)
 *   /post/ranking          4-2 순위
 *   /post/open             4-3 주관식
 *   /survey/demographics   4-4 인구통계
 *   /done                  제출 완료
 *
 * 참여자가 URL로 단계를 건너뛰면 아직 못 채운 가장 앞 단계로 되돌린다.
 * 인구통계를 4단계로 옮긴 것도 기조 문서에 따른 것이고, 결과적으로 자극물 노출 전에
 * 답을 받아 자극물이 인적사항 응답에 영향을 줄 여지도 없앤다.
 */

import type { ParticipantRow } from "./db";
import { PRE_SECTIONS, type SectionKey } from "./presurvey";
import { TOTAL_STEPS } from "./experiment";

function sectionComplete(p: ParticipantRow, key: SectionKey): boolean {
  return PRE_SECTIONS[key].questions.every((q) => {
    if (!q.required) return true;
    const value = p[q.id as keyof ParticipantRow];
    return typeof value === "string" && value.length > 0;
  });
}

/** 이 참여자가 지금 있어야 하는 경로 */
export function nextStepPath(p: ParticipantRow, trialsDone = 0): string {
  if (p.is_dev) return "/stimulus/1"; // 미리보기 세션은 순서를 강제하지 않는다

  if (!sectionComplete(p, "usage")) return "/survey/usage";
  if (!p.preferred_genre || !p.presentation_order) return "/pre";

  // 3단계: 저장된 trial 수를 보고 다음 자극물로
  if (trialsDone < TOTAL_STEPS) return "/stimulus/" + (trialsDone + 1);

  if (!p.mc_usage_answer) return "/post/check";
  if (p.rank_content === null) return "/post/ranking";
  if (!p.open_reason) return "/post/open";
  if (!sectionComplete(p, "demographics")) return "/survey/demographics";
  return "/done";
}

/** 단계 순서 — 뒤로 돌아가는 것을 허용할지 판단할 때 쓴다 */
const ORDER = [
  "/survey/usage",
  "/pre",
  "/stimulus/1",
  "/rest/1",
  "/stimulus/2",
  "/rest/2",
  "/stimulus/3",
  "/post/check",
  "/post/ranking",
  "/post/open",
  "/survey/demographics",
  "/done",
];

/**
 * 3단계 반복측정 블록에 속한 경로인지.
 * 이 경로들은 뒤로 가기를 허용하지 않는다 — 이미 평가한 자극물을 다시 보여주면
 * 그 인상이 남은 trial 과 4-2 순위 응답에 섞여 들어간다.
 */
function isTrialPath(path: string): boolean {
  return path.startsWith("/stimulus/") || path.startsWith("/rest/");
}

/**
 * 요청한 경로에 머물러도 되는지 판단.
 * 되돌려야 하면 목적지를, 괜찮으면 null 을 반환한다.
 */
export function guard(
  p: ParticipantRow,
  requested: string,
  trialsDone = 0,
): string | null {
  // /dev 미리보기는 어느 단계든 바로 열어 볼 수 있어야 한다
  if (p.is_dev) return null;

  const expected = nextStepPath(p, trialsDone);
  if (requested === expected) return null;

  /*
   * 휴식 화면은 응답을 남기지 않는 통과 지점이라 nextStepPath 가 가리키지 않는다.
   * 방금 끝낸 trial 의 휴식이면 그대로 머물게 한다 — 이걸 빼먹으면 휴식 화면에서
   * '다음 화면으로'를 눌러도 계속 휴식으로 되돌아온다.
   */
  if (
    requested === "/rest/" + trialsDone &&
    trialsDone >= 1 &&
    trialsDone < TOTAL_STEPS
  ) {
    return null;
  }

  // 자극물·휴식은 앞으로만 진행된다
  if (isTrialPath(requested)) return expected;

  // 그 밖의 문항 단계는 이미 지나온 곳으로 돌아가 고치는 것을 허용한다
  const iReq = ORDER.indexOf(requested);
  const iExp = ORDER.indexOf(expected);
  if (iReq >= 0 && iExp >= 0 && iReq <= iExp) return null;

  return expected;
}

/**
 * 응답 저장 API 에서 쓰는 순서 검사.
 * 화면 가드를 우회해 API를 직접 호출하는 것을 막는다 — 특히 4-4 인구통계를
 * 자극물 노출 전에 미리 채워 넣는 것을 막아야 한다.
 */
export function canSubmitAt(
  p: ParticipantRow,
  path: string,
  trialsDone = 0,
): boolean {
  if (p.is_dev) return true;
  const expected = nextStepPath(p, trialsDone);
  if (path === expected) return true;
  const iReq = ORDER.indexOf(path);
  const iExp = ORDER.indexOf(expected);
  return iReq >= 0 && iExp >= 0 && iReq <= iExp;
}
