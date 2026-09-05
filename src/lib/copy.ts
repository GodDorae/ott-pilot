/**
 * 자극물 화면 카피 — 근거유형별 헤드라인/배너, 이용조건별 결제 문구
 *
 * 화면 구조 (문서 0.2):
 *   [레일 제목 — 조건별 헤드라인]
 *   [포스터 3개 + peek 1개]
 *   [강조색 배너 — 근거유형 설명 문구]
 */

import { GENRE_LABELS, type Genre, type RationaleType, type UsageCondition } from "./experiment";

/** 화면 표시용 호칭 길이 상한 */
export const DISPLAY_NAME_MAX = 12;

/** 입력된 호칭을 화면·저장에 쓸 수 있게 다듬는다 */
export function normalizeDisplayName(raw: string | null | undefined): string | null {
  const cleaned = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, DISPLAY_NAME_MAX);
  return cleaned.length > 0 ? cleaned : null;
}

/** 맥락 인식 조건 문구를 만든 근거 */
export type ContextSnapshot = {
  weekday: string;
  daypart: string;
  device: string;
  /** 완성된 맥락 문구 */
  phrase: string;
  /** 시간대·기기를 어디서 가져왔는지 — 분석 시 재현·해석용 */
  source: "self_report" | "access_time";
};

const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

/**
 * 조사 기준 시간대. 참여자는 한국에 있으므로 화면 문구도 한국 시각이어야 한다.
 *
 * Date 의 getDay()/getHours() 는 서버가 놓인 곳의 시간대를 따른다. Vercel 서버는 UTC 라
 * 그대로 두면 한국 토요일 아침 8시가 "금요일 23시"로 나온다 — 요일도 시간대도 틀린다.
 * 맥락 인식 조건은 바로 그 요일·시간대를 근거로 내세우는 조작이므로 치명적이다.
 * 그래서 서버가 어디에 있든 항상 한국 시각으로 계산한다.
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

type Daypart = { label: string; scene: string };

/** B-5 자기보고 시간대 */
const DAYPART_BY_TIMESLOT: Record<string, Daypart> = {
  morning: { label: "아침", scene: "하루를 시작하며 가볍게" },
  afternoon: { label: "오후", scene: "느긋하게" },
  evening: { label: "저녁", scene: "하루를 마치고 편하게" },
  late_night: { label: "심야", scene: "불 끄고 몰입해서" },
};

/** B-5 가 '불규칙'이거나 없을 때 실제 접속 시각으로 대체 */
function daypartFromHour(hour: number): Daypart {
  if (hour < 6) return { label: "새벽", scene: "잠들기 전 조용히" };
  if (hour < 11) return { label: "아침", scene: "하루를 시작하며 가볍게" };
  if (hour < 14) return { label: "점심시간", scene: "짧게 틈내어" };
  if (hour < 18) return { label: "오후", scene: "느긋하게" };
  if (hour < 22) return { label: "저녁", scene: "하루를 마치고 편하게" };
  return { label: "밤", scene: "불 끄고 몰입해서" };
}

/** B-4 자기보고 기기 */
const DEVICE_LABELS: Record<string, string> = {
  smartphone: "스마트폰",
  tablet: "태블릿",
  pc: "PC",
  tv: "TV",
};

/**
 * 조사 '로/으로' 선택. 받침이 없거나 ㄹ 받침이면 '로'.
 * 기타 자유입력이 들어올 수 있어서 필요하다 ("빔프로젝터로", "노트북으로").
 */
function withRo(noun: string): string {
  const last = noun.trim().slice(-1);
  const code = last.charCodeAt(0);
  // 한글 음절이 아니면(영문·숫자 등) 안전하게 '로'
  if (code < 0xac00 || code > 0xd7a3) return noun + "로";
  const jong = (code - 0xac00) % 28; // 0 = 받침 없음, 8 = ㄹ
  return noun + (jong === 0 || jong === 8 ? "로" : "으로");
}

/**
 * 참여자의 평소 시청 맥락(B-4 기기, B-5 시간대)과 실제 접속 요일로 맥락 문구를 만든다.
 *
 * 요일만 실제 접속 시점에서 가져오고 시간대·기기는 자기보고를 쓰는 이유:
 * 참여자가 실험에 응답하는 시각·기기(예: 낮에 PC로)는 평소 OTT 시청 맥락과
 * 어긋나기 쉬운데, 맥락 인식 추천이 실제로 참조하는 건 후자이기 때문이다.
 *
 * B-5 가 '불규칙'이면 자기보고할 시간대가 없으므로 실제 접속 시각으로 대체한다.
 * 어느 쪽을 썼는지는 snapshot.source 에 남는다.
 *
 * 사전 문항이 끝난 뒤 한 번 계산해 DB에 저장한다 → 3화면 간 문구가 흔들리지 않고,
 * 분석할 때 어떤 문구를 봤는지 재현할 수 있다.
 */
export function buildContextSnapshot(
  now: Date,
  selfReport: {
    primaryDevice: string | null;
    primaryDeviceOther: string | null;
    viewingTimeslot: string | null;
  },
): ContextSnapshot {
  const { weekdayIndex, hour } = inSurveyTimezone(now);
  const weekday = WEEKDAYS[weekdayIndex];

  const reported = selfReport.viewingTimeslot
    ? DAYPART_BY_TIMESLOT[selfReport.viewingTimeslot]
    : undefined;
  const daypart = reported ?? daypartFromHour(hour);

  const deviceNoun =
    (selfReport.primaryDevice && DEVICE_LABELS[selfReport.primaryDevice]) ||
    selfReport.primaryDeviceOther?.trim() ||
    null;
  const device = deviceNoun ? withRo(deviceNoun) : "지금 쓰는 화면으로";

  return {
    weekday,
    daypart: daypart.label,
    device,
    phrase:
      weekday + " " + daypart.label + ", " + device + " " + daypart.scene + " 보기 좋은 작품입니다",
    source: reported && deviceNoun ? "self_report" : "access_time",
  };
}

/** 호칭 기본값 — 입력하지 않은 참여자에게 쓴다 */
export const DEFAULT_DISPLAY_NAME = "회원";

/** "OO님" — 호칭이 없으면 "회원님" */
export function honorific(displayName: string | null): string {
  return (displayName?.trim() || DEFAULT_DISPLAY_NAME) + "님";
}

/**
 * 헤더 인사말 — 접속 시각의 시간대를 반영한다.
 *
 * ⚠️ 세 근거유형 조건 모두에 똑같이 들어간다. 특정 조건에만 개인화 요소가 붙으면
 * 그 조건이 '더 개인화된 화면'이 되어 근거유형 효과와 뒤섞인다.
 *
 * 요일은 여기 넣지 않는다. 요일·기기까지 언급하는 것은 맥락 인식 조건의 조작 그 자체이므로,
 * 모든 조건에 깔면 그 조건의 대비가 흐려진다. 인사말은 시간대까지만 쓴다.
 */
export function greeting(now: Date, displayName: string | null): string {
  const { hour } = inSurveyTimezone(now);
  const part =
    hour < 6 ? "늦은 밤이네요" : hour < 11 ? "좋은 아침이에요" : hour < 18 ? "반가워요" : "좋은 저녁이에요";
  return part + ", " + honorific(displayName);
}

/**
 * 레일 제목 — 조건별 헤드라인.
 * 호칭은 세 조건에 모두 들어간다 (위와 같은 이유).
 */
export function railHeadline(
  rationale: RationaleType,
  genre: Genre,
  displayName: string | null,
): string {
  const who = honorific(displayName);
  const g = GENRE_LABELS[genre];
  switch (rationale) {
    case "content":
      return `${who}이 최근 시청한 ${g} 작품과 분위기가 비슷한 작품`;
    case "collab":
      return `${who}과 취향이 비슷한 이용자들이 많이 본 작품`;
    case "context":
      return `지금 ${who}의 상황에 어울리는 작품`;
  }
}

/** 강조색 배너 — 근거유형 조작의 핵심 문구 */
export function rationaleBanner(
  rationale: RationaleType,
  genre: Genre,
  ctx: ContextSnapshot,
  displayName: string | null,
): string {
  const who = honorific(displayName);
  switch (rationale) {
    case "content":
      return `${who}이 최근 시청하신 ${GENRE_LABELS[genre]} 작품과 분위기가 유사한 작품입니다`;
    case "collab":
      return `${who}과 취향이 비슷한 이용자들이 많이 시청한 작품입니다`;
    case "context":
      // 스냅샷에는 맥락만 담고, 호칭은 여기서 붙인다 (세 조건 모두 동일하게)
      return `${who}이 ` + ctx.phrase;
  }
}

/** 이용조건 문구 — 피험자 간 변수 (문서 0.1) */
export function usageNotice(condition: UsageCondition): { label: string; detail: string } {
  return condition === "SVOD"
    ? {
        label: "구독 포함",
        detail: "구독에 포함되어 있어 추가 결제 없이 바로 시청할 수 있습니다.",
      }
    : {
        label: "개별 대여",
        detail: "5,500원을 결제하면 48시간 동안 시청할 수 있습니다.",
      };
}
