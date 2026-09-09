/**
 * 자극물 화면 카피 — 근거유형별 헤드라인/배너, 이용조건별 결제 문구
 *
 * 문구는 실험물 UI 목업(OttScreen)의 것을 그대로 옮겼다. 화면 구조:
 *   [레일 제목 — 조건별 헤드라인]
 *   [붉은 배너 — 근거유형 설명 문구]
 *   [포스터 3개 + 일부만 보이는 1개]
 */

import { GENRE_LABELS, type Genre, type RationaleType, type UsageCondition } from "./experiment";

/** 화면 표시용 호칭 길이 상한 */
export const DISPLAY_NAME_MAX = 4;

/** 입력된 호칭을 화면·저장에 쓸 수 있게 다듬는다 */
export function normalizeDisplayName(raw: string | null | undefined): string | null {
  const cleaned = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, DISPLAY_NAME_MAX);
  return cleaned.length > 0 ? cleaned : null;
}

/** 맥락 문구가 갈리는 첫 번째 축 */
export const WEEKDAY_KINDS = ["평일", "주말"] as const;
export type WeekdayKind = (typeof WEEKDAY_KINDS)[number];

/** 맥락 문구가 갈리는 두 번째 축 */
export const DAYPARTS = ["아침·오전", "오후", "저녁", "늦은 밤"] as const;
export type Daypart = (typeof DAYPARTS)[number];

/** 맥락 인식 조건 문구를 만든 근거 */
export type ContextSnapshot = {
  /** 실제 접속 요일 (예: "토요일") — 문구에는 안 쓰고 분석용으로 남긴다 */
  weekday: string;
  weekdayKind: WeekdayKind;
  daypart: Daypart;
  /** 배너 앞 구간 — "바쁜 평일 아침" */
  moment: string;
  /**
   * 배너 뒤 구간의 무드 부사 — "가볍게". 화면에서는 뒤에 " 볼 만한 작품" 이 붙는다.
   *
   * ⚠️ 2026-09-10 개정 전 스냅샷에는 "가볍게 볼 만한" 처럼 서술구까지 들어 있다.
   * 저장된 값으로 문장을 되살릴 때(분석·내보내기) 그 판을 함께 봐야 한다 —
   * 옛 값에 " 볼 만한 작품" 을 이어 붙이면 "가볍게 볼 만한 볼 만한 작품" 이 된다.
   */
  fit: string;
  /** 접속 기기가 모바일인지 (participants.is_mobile 과 같은 값을 스냅샷에도 남긴다) */
  isMobile: boolean;
  /** 맥락을 어디서 가져왔는지 (지금은 항상 실제 접속 정보) */
  source: "access_time";
};

const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

/**
 * 조사 기준 시간대. 참여자는 한국에 있으므로 화면 문구도 한국 시각이어야 한다.
 *
 * Date 의 getDay()/getHours() 는 서버가 놓인 곳의 시간대를 따른다. Vercel 서버는 UTC 라
 * 그대로 두면 한국 토요일 아침 8시가 "금요일 23시"로 나온다 — 요일도 시간대도 틀린다.
 * 맥락 인식 조건은 바로 그 요일·시간대를 근거로 내세우는 조작이므로 치명적이다.
 */
export const SURVEY_TIMEZONE = "Asia/Seoul";

const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 주어진 시각을 한국 기준 요일 인덱스와 시(0-23)로 바꾼다 */
function inSurveyTimezone(now: Date): { weekdayIndex: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SURVEY_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  // 자정을 "24" 로 주는 구현이 있어 24 는 0 으로 접는다
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;

  return { weekdayIndex: Math.max(0, EN_WEEKDAYS.indexOf(weekday)), hour };
}

/**
 * 실제 접속 시각 → 네 시간대.
 *
 * 확정 문구가 평일·주말 × 시간대 여덟 갈래로 정해져 있어 그 표에 맞춰 넷으로 나눈다.
 * 새벽(0~5시)은 "늦은 밤"에 함께 넣는다 — 그 시각에 접속한 사람에게 "아침"이라고 하면
 * 문구가 상황과 어긋나고, 맞지 않는 맥락 조작은 오히려 거슬린다.
 */
function daypartOf(hour: number): Daypart {
  if (hour < 6) return "늦은 밤";
  if (hour < 12) return "아침·오전";
  if (hour < 18) return "오후";
  if (hour < 22) return "저녁";
  return "늦은 밤";
}

/**
 * 배너 앞 구간 — 평일·주말 × 시간대 여덟 갈래 (연구자 확정 문구).
 *
 * 같은 시간대라도 평일과 주말의 수식어가 다르다. 맥락 인식 조작이 내세우는 근거가
 * "지금이 어떤 때인가" 이므로, 그 때의 성격을 말해 주어야 근거로 읽힌다.
 */
const CONTEXT_MOMENTS: Record<WeekdayKind, Record<Daypart, string>> = {
  평일: {
    "아침·오전": "바쁜 평일 아침",
    오후: "분주한 평일 오후",
    저녁: "평일 일과 후 저녁",
    "늦은 밤": "고요한 평일 밤",
  },
  주말: {
    "아침·오전": "여유로운 주말 아침",
    오후: "느긋한 주말 오후",
    저녁: "한가로운 주말 저녁",
    "늦은 밤": "편안한 주말 밤",
  },
};

/**
 * 배너 뒤 구간의 무드 — 시간대에만 걸린다 (평일·주말 공통).
 *
 * 부사만 담는다. 뒤에 붙는 " 볼 만한 작품" 은 조건과 무관한 결과 표현이라
 * contextSegments 가 굵기 없이 이어 붙인다 (아래 참고).
 * 굵게 처리되는 것은 추천 이유를 말하는 구간뿐이어야 하므로, 예전처럼
 * "차분히 몰입할 만한" 을 통째로 굵게 하면 서술구까지 근거로 읽힌다.
 */
const CONTEXT_FITS: Record<Daypart, string> = {
  "아침·오전": "가볍게",
  오후: "기분 전환하며",
  저녁: "편히",
  "늦은 밤": "차분히",
};

/**
 * 맥락 문구의 근거를 만든다 — 참여자가 **지금 실제로** 접속한 요일·시간대 기준.
 *
 * 활동을 콕 집는 표현(출근길에·퇴근길에·잠들기 전 …)은 쓰지 않는다.
 * 시스템이 알 수 없는 것을 안다고 말하는 셈이고, 맞지 않으면 조작이 오히려 거슬린다.
 * 통제되는 것은 평일·주말 여부와 시간대뿐이라 해석도 이쪽이 깔끔하다.
 *
 * 처음에는 B-4·B-5 자기보고(평소 시청 기기·시간대)를 썼는데, 오전에 응답하는데도
 * 평소 시간대인 "오후"가 뜨는 게 어색하다는 피드백이 있었다. 맥락 인식 추천이
 * 내세우는 근거는 지금 이 상황이므로 실제 접속 정보를 쓰는 편이 화면과 어긋나지 않는다.
 * (자기보고 값은 B-4·B-5 컬럼에 그대로 남아 있어 분석에는 계속 쓸 수 있다.)
 *
 * 기기는 확정 문구에서 빠졌다. 자극물은 접속 기기와 무관하게 언제나 스마트폰 화면인데
 * (PC 용 목업 자료가 없고, 참여자마다 다른 화면을 보면 그 차이가 근거유형 효과에 섞인다)
 * 문구만 "스마트폰으로" 라고 말하면 PC 로 응답하는 사람에게는 틀린 근거가 된다.
 * 실제 접속 기기는 participants.is_mobile 에 그대로 남아 공변량으로 쓸 수 있다.
 *
 * 사전 문항이 끝난 뒤 한 번 계산해 DB에 저장한다 → 3화면 간 문구가 흔들리지 않고,
 * 분석할 때 어떤 문구를 봤는지 재현할 수 있다.
 */
export function buildContextSnapshot(now: Date, isMobile: boolean): ContextSnapshot {
  const { weekdayIndex, hour } = inSurveyTimezone(now);
  // 주말은 요일로만 정한다 — 조작점검도 "평일·주말 여부" 를 묻는다
  const weekdayKind: WeekdayKind = weekdayIndex === 0 || weekdayIndex === 6 ? "주말" : "평일";
  const daypart = daypartOf(hour);

  return {
    weekday: WEEKDAYS[weekdayIndex],
    weekdayKind,
    daypart,
    moment: CONTEXT_MOMENTS[weekdayKind][daypart],
    fit: CONTEXT_FITS[daypart],
    isMobile,
    source: "access_time",
  };
}

/** user-agent 로 모바일 여부를 판단한다 (목업 프레임과 맥락 문구가 함께 이걸 쓴다) */
export function isMobileUserAgent(ua: string | null): boolean {
  return /Android|iPhone|iPod|Windows Phone|Mobile/i.test(ua ?? "");
}

/** 호칭 기본값 — 입력하지 않은 참여자에게 쓴다 */
export const DEFAULT_DISPLAY_NAME = "회원";

/** "OO님" — 호칭이 없으면 "회원님" */
export function honorific(displayName: string | null): string {
  return (displayName?.trim() || DEFAULT_DISPLAY_NAME) + "님";
}

/**
 * 레일 제목 — 조건별 헤드라인. 실험물 UI 목업의 문구를 그대로 쓴다.
 *
 * 호칭은 세 조건에 모두 들어간다. 특정 조건에만 개인화 요소가 붙으면
 * 그 조건이 더 개인화된 화면이 되어 근거유형 효과와 뒤섞인다.
 */
export function railHeadline(rationale: RationaleType, displayName: string | null): string {
  const who = honorific(displayName);
  switch (rationale) {
    case "content":
      return `${who} 취향과 비슷한 작품`;
    case "collab":
      return `${who}과 비슷한 시청자의 픽`;
    case "context":
      return `${who}께 지금 딱 맞는 작품`;
  }
}

/** 배너 문구 조각. strong 인 구간이 화면에서 굵게 나온다 */
export type BannerSegment = { text: string; strong?: boolean };

/** 맥락 인식 배너 — 스냅샷에 저장해 둔 두 구간을 호칭과 이어 붙인다 */
function contextSegments(ctx: ContextSnapshot, displayName: string | null): BannerSegment[] {
  return [
    { text: ctx.moment, strong: true },
    // "에 맞춰" 는 두 근거를 잇는 기능어라 굵게 하지 않는다 (조사·기능어는 Regular)
    { text: `에 맞춰 ${honorific(displayName)}이 ` },
    { text: ctx.fit, strong: true },
    { text: " 볼 만한 작품" },
  ];
}

/**
 * 배너 — 근거유형 조작의 핵심 문구.
 *
 * 굵게 처리하는 구간은 조작의 근거를 직접 말하는 부분이다(무엇을 근거로 골랐는가).
 * 세 조건 모두 굵은 구간이 두 군데씩이라 시각적 강조량이 같다.
 *
 * 배너는 한 줄로 잘린다(OttScreen 의 truncate). 문구를 고칠 때는 호칭이 네 글자인
 * 참여자를 기준으로 목업의 글자 자리(1278/1500px, 글자 크기 45px)를 넘지 않는지 본다.
 */
export function rationaleBanner(
  rationale: RationaleType,
  genre: Genre,
  ctx: ContextSnapshot,
  displayName: string | null,
): BannerSegment[] {
  const who = honorific(displayName);
  switch (rationale) {
    case "content":
      return [
        { text: `${who}이 평소 자주 보시는 ` },
        { text: `${GENRE_LABELS[genre]} 장르`, strong: true },
        { text: "와 " },
        { text: "유사한", strong: true },
        { text: " 작품" },
      ];
    case "collab":
      return [
        { text: `${who}과 시청 취향이 ` },
        { text: "비슷한 이용자들", strong: true },
        { text: "이 많이 " },
        { text: "본", strong: true },
        { text: " 작품" },
      ];
    case "context":
      return contextSegments(ctx, displayName);
  }
}

/** 배너 문구를 한 줄 텍스트로 (기록·검증용) */
export function bannerPlainText(segments: BannerSegment[]): string {
  return segments.map((s) => s.text).join("");
}

/**
 * 맥락 배너를 한 줄 문장으로 — 확인 화면(/done, /dev)에서 쓴다.
 *
 * 완성된 문장을 스냅샷에 넣어 두지 않는 이유: 문장 안에 호칭이 들어가는데,
 * 호칭은 논문 아카이브 전에 display_name 을 지워 없애기로 한 값이다.
 * 문장을 통째로 저장하면 그 조치를 우회해 호칭이 context_snapshot 에 남는다.
 */
export function contextPhrase(ctx: ContextSnapshot, displayName: string | null): string {
  return bannerPlainText(contextSegments(ctx, displayName));
}

/**
 * 이용조건 문구 — 피험자 간 변수.
 *
 * 자극물 화면 **위**에 놓는다. 아래에 두었더니 포스터에 시선을 뺏겨
 * 읽지 않고 지나갔다 — 조절변수를 전달받지 못한 채 평가하게 된다.
 */
export function usageNotice(condition: UsageCondition): { label: string; detail: string[] } {
  /*
    한 줄에 하나의 사실만 오도록 직접 끊는다
    (얼마인가 / 언제까지 시작하면 되는가 / 시작한 뒤 얼마나 볼 수 있는가).
    브라우저에 맡기면 창 폭에 따라 "4,000원에 / 개별 대여" 처럼 조건의 핵심이 갈라진다.
    칸이 좁으면 한 줄이 그 안에서 한 번 더 접히기는 하지만, 접히는 자리가
    사실과 사실 사이가 아니라 사실 안쪽이라 읽는 순서는 지켜진다.
  */
  return condition === "SVOD"
    ? {
        label: "구독 포함",
        detail: [
          "이 작품은 회원님이 구독 중인 서비스에 포함되어 있어,",
          "추가 결제 없이 바로 시청하실 수 있습니다.",
        ],
      }
    : {
        label: "개별 대여",
        detail: [
          "이 작품은 4,000원에 개별 대여가 가능합니다.",
          "결제 후 30일 이내에 시청을 시작하시면 되고,",
          "한 번 시청을 시작한 뒤에는 48시간 동안 자유롭게 다시 보실 수 있습니다.",
        ],
      };
}
