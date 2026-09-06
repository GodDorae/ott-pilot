/**
 * 참여 흐름 순서와 단계 가드
 *
 *   /                      실험 안내 + 참가 동의
 *   /survey/demographics   A. 인구 통계학적 정보      ← 사전조사 첫 문항
 *   /survey/usage          B. OTT 이용 현황           ← 여기서 선별 제외가 갈린다
 *   /pre                   호칭 + 선호 장르           ← 제출 시 조건 배정
 *   /brief                 3단계 안내                 ← 이용조건 조작을 전달
 *   /stimulus/1 → 2 → 3    반복측정 3회
 *   /post/check            조작점검 (조절변수)
 *   /post/ranking          추천 화면 순위 + 선택 이유
 *   /post/open             주관식
 *   /done                  완료 + 후속 인터뷰 연락처(선택)
 *
 *   /screened-out          선별 제외 종료 화면
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

  // 선별 제외된 참여자는 어디로도 더 가지 않는다
  if (p.screened_out_at) return "/screened-out";

  if (!sectionComplete(p, "demographics")) return "/survey/demographics";
  if (!sectionComplete(p, "usage")) return "/survey/usage";
  if (!p.preferred_genre || !p.presentation_order) return "/pre";
  /*
    안내를 읽기 전에는 자극물로 보내지 않는다. 이 화면이 이용조건(SVOD/TVOD)을
    말해 주는 유일한 곳이라, 건너뛰면 조절변수를 전달받지 못한 채 평가하게 된다.
    이미 한 화면이라도 평가했다면 되돌리지 않는다 — 자극물은 앞으로만 간다.
  */
  if (!p.brief_seen_at && trialsDone === 0) return "/brief";

  if (trialsDone < TOTAL_STEPS) return "/stimulus/" + (trialsDone + 1);

  if (!p.mc_usage_answer) return "/post/check";
  // 순위와 선택 이유는 한 화면에서 같이 받는다
  if (p.rank_content === null || !p.open_reason) return "/post/ranking";
  if (!p.open_feeling || !p.open_notable || !p.open_missing) return "/post/open";
  return "/done";
}

/** 단계 순서 — 뒤로 돌아가는 것을 허용할지 판단할 때 쓴다 */
const ORDER = [
  "/survey/demographics",
  "/survey/usage",
  "/pre",
  "/brief",
  "/stimulus/1",
  "/stimulus/2",
  "/stimulus/3",
  "/post/check",
  "/post/ranking",
  "/post/open",
  "/done",
];

/**
 * 자극물 경로인지.
 * 이 경로들은 뒤로 가기를 허용하지 않는다 — 이미 평가한 자극물을 다시 보여주면
 * 그 인상이 남은 trial 과 순위 응답에 섞여 들어간다.
 */
function isTrialPath(path: string): boolean {
  return path.startsWith("/stimulus/");
}

/**
 * 요청한 경로에 머물러도 되는지 판단.
 * 되돌려야 하면 목적지를, 괜찮으면 null 을 반환한다.
 */
export function guard(p: ParticipantRow, requested: string, trialsDone = 0): string | null {
  // /dev 미리보기는 어느 단계든 바로 열어 볼 수 있어야 한다
  if (p.is_dev) return null;

  const expected = nextStepPath(p, trialsDone);
  if (requested === expected) return null;

  // 자극물은 앞으로만 진행된다
  if (isTrialPath(requested)) return expected;

  // 그 밖의 문항 단계는 이미 지나온 곳으로 돌아가 고치는 것을 허용한다
  const iReq = ORDER.indexOf(requested);
  const iExp = ORDER.indexOf(expected);
  if (iReq >= 0 && iExp >= 0 && iReq <= iExp) return null;

  return expected;
}

/**
 * 응답 저장 API 에서 쓰는 순서 검사.
 * 화면 가드를 우회해 API를 직접 호출하는 것을 막는다.
 */
export function canSubmitAt(p: ParticipantRow, path: string, trialsDone = 0): boolean {
  if (p.is_dev) return true;
  if (p.screened_out_at) return false;
  const expected = nextStepPath(p, trialsDone);
  if (path === expected) return true;
  const iReq = ORDER.indexOf(path);
  const iExp = ORDER.indexOf(expected);
  return iReq >= 0 && iExp >= 0 && iReq <= iExp;
}
