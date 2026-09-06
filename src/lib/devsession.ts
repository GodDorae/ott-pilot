/**
 * /dev 미리보기 세션 — 설문을 처음부터 채우지 않고 임의 단계를 바로 열어보기 위한 장치.
 *
 * 실제 화면 컴포넌트를 그대로 쓰기 위해, 별도 미리보기 UI를 만들지 않고
 * `is_dev = true` 참여자 행을 하나 만들어 필요한 값을 미리 채운 뒤 그 단계로 보낸다.
 * is_dev 행은 분석용 뷰(pilot_export)와 배정 카운트에서 제외된다.
 */

import {
  GENRES,
  TOTAL_CELLS,
  USAGE_CONDITIONS,
  assignmentToCell,
  makeParticipantCode,
  type Genre,
  type UsageCondition,
} from "./experiment";
import { buildContextSnapshot, isMobileUserAgent } from "./copy";
import {
  assignAssignment,
  createParticipant,
  deleteDevSessions,
  nextAssignmentSeq,
  savePostTest,
  savePreSurvey,
  saveContextSnapshot,
  setDisplayName,
  setPreferredGenre,
  type ParticipantRow,
} from "./db";

/** 4단계 사후 문항 기본값 — 미리보기에서 순서 가드에 막히지 않게 한다 */
const POST_TEST_DEFAULTS: Record<string, string | number | null> = {
  mc_usage_answer: "SVOD",
  rank_content: 1,
  rank_collab: 2,
  rank_context: 3,
  open_reason: "(미리보기)",
  open_feeling: "(미리보기)",
  open_notable: "(미리보기)",
  open_missing: "(미리보기)",
};

/** /dev 링크로 지정할 수 있는 조건들 */
export type DevOverrides = {
  usage: UsageCondition;
  sequenceIndex: number;
  mappingIndex: number;
  genre: Genre;
};

export const DEV_DEFAULTS: DevOverrides = {
  usage: "SVOD",
  sequenceIndex: 0,
  mappingIndex: 0,
  genre: "action",
};

/** 사전 문항 기본값 — 미리보기에서 A·B를 매번 채우지 않아도 되게 한다 */
const PRE_SURVEY_DEFAULTS: Record<string, string | null> = {
  age_group: "20s",
  gender: "female",
  ott_platform: "netflix",
  ott_platform_other: null,
  ott_tenure: "over_1y",
  rec_selection_freq: "often",
  primary_device: "smartphone",
  primary_device_other: null,
  viewing_timeslot: "evening",
};

function clampIndex(raw: string | null, max: number, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : fallback;
}

/** 쿼리스트링에서 조건을 읽는다. 잘못된 값은 기본값으로 떨어진다. */
export function parseOverrides(params: URLSearchParams): DevOverrides {
  const usage = params.get("usage");
  const genre = params.get("genre");
  return {
    usage: USAGE_CONDITIONS.includes(usage as UsageCondition)
      ? (usage as UsageCondition)
      : DEV_DEFAULTS.usage,
    sequenceIndex: clampIndex(params.get("seq"), 5, DEV_DEFAULTS.sequenceIndex),
    mappingIndex: clampIndex(params.get("mapping"), 2, DEV_DEFAULTS.mappingIndex),
    genre: GENRES.includes(genre as Genre) ? (genre as Genre) : DEV_DEFAULTS.genre,
  };
}

export function overridesToQuery(o: DevOverrides): string {
  return new URLSearchParams({
    usage: o.usage,
    seq: String(o.sequenceIndex),
    mapping: String(o.mappingIndex),
    genre: o.genre,
  }).toString();
}

/**
 * 미리보기 세션을 만들거나 갱신한다.
 * 이미 미리보기 세션이 있으면 같은 행을 재사용해 조건만 바꾼다 — 배너에서 조건을
 * 갈아 끼울 때 행이 계속 쌓이지 않게 하려는 것.
 */
/**
 * 미리보기 세션의 수명 — 세션 쿠키(6시간)보다 길게 잡을 이유가 없다.
 * 이보다 오래된 미리보기 행은 아무도 쓰고 있지 않다.
 */
const DEV_SESSION_TTL_MS = 6 * 60 * 60 * 1000;

export async function ensureDevSession(
  existing: ParticipantRow | null,
  overrides: DevOverrides,
  userAgent?: string | null,
): Promise<ParticipantRow> {
  // 지난 미리보기 행이 쌓이지 않도록 만들 때마다 걷어낸다
  await deleteDevSessions(new Date(Date.now() - DEV_SESSION_TTL_MS));

  // 미리보기도 실제 접속 기기를 따른다 — 목업 프레임(스마트폰/브라우저)과
  // 맥락 조건 문구("스마트폰으로"/"큰 화면으로")가 여기서 갈리므로,
  // 항상 PC 로 고정해 두면 정작 확인하려는 화면을 볼 수 없다.
  const isMobile = isMobileUserAgent(userAgent ?? null);

  const participant =
    existing?.is_dev
      ? existing
      : await createParticipant({
          participantCode: makeParticipantCode(),
          assignmentSeq: await nextAssignmentSeq(),
          userAgent: userAgent ? "dev-preview " + userAgent : "dev-preview",
          isMobile,
          isDev: true,
        });

  await savePreSurvey(participant.id, PRE_SURVEY_DEFAULTS);
  // 4단계 화면도 가드 없이 열리도록 사후 문항까지 기본값을 넣어 둔다
  await savePostTest(participant.id, POST_TEST_DEFAULTS);
  await setPreferredGenre(participant.id, overrides.genre);
  await setDisplayName(participant.id, "건빵");
  await saveContextSnapshot(
    participant.id,
    buildContextSnapshot(new Date(), isMobile),
  );

  const cell =
    assignmentToCell(overrides.usage, overrides.sequenceIndex, overrides.mappingIndex) %
    TOTAL_CELLS;
  const updated = await assignAssignment(participant.id, cell);

  return {
    ...updated,
    ...PRE_SURVEY_DEFAULTS,
    ...POST_TEST_DEFAULTS,
    preferred_genre: overrides.genre,
  } as ParticipantRow;
}
