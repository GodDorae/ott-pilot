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

/** 맥락 인식 조건 문구를 만든 근거 */
export type ContextSnapshot = {
  weekday: string;
  daypart: string;
  /** "주말을 시작하며" 처럼 요일·시간대를 함께 반영한 상황 묘사 */
  scene: string;
  device: string;
  /** 완성된 맥락 문구 */
  phrase: string;
  /** 접속 기기가 모바일인지 — 목업 프레임 선택에도 쓴다 */
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

/** 실제 접속 시각 기준 시간대 이름 */
function daypartLabel(hour: number): string {
  if (hour < 6) return "새벽";
  if (hour < 11) return "오전";
  if (hour < 14) return "점심시간";
  if (hour < 18) return "오후";
  if (hour < 22) return "저녁";
  return "밤";
}

/**
 * 상황 묘사 — 요일과 시간대를 함께 본다.
 *
 * 문장은 "{요일} {시간대}, {상황} {기기} 보기 좋은 작품" 꼴로 조립된다.
 * 앞에 이미 요일과 시간대가 있으므로 여기서 그것을 되풀이하지 않는다 —
 * "토요일 오후, 주말 오후를 느긋하게…" 처럼 같은 말을 두 번 하면 어색해진다.
 *
 * 주말이 걸린 시점(금요일 밤 · 일요일 밤)은 그 사실 자체가 가장 두드러진 맥락이라
 * 시간대보다 우선한다. 맥락 인식 조건이 내세우는 근거가 바로 '지금 이 상황'이다.
 */
function scenePhrase(weekdayIndex: number, hour: number): string {
  const isSat = weekdayIndex === 6;
  const isSun = weekdayIndex === 0;
  const isWeekend = isSat || isSun;

  // 새벽은 요일과 무관하게 같은 상황이다
  if (hour < 6) return "잠들기 전 조용히";

  // 주말의 시작과 끝
  if (weekdayIndex === 5 && hour >= 18) return "주말을 시작하며";
  if (isSun && hour >= 18) return "주말을 마무리하며";

  if (isWeekend) {
    if (hour < 11) return "느긋한 아침에";
    if (hour < 18) return "느긋하게 시간을 보내며";
    return "시간에 쫓기지 않고"; // 토요일 저녁·밤
  }

  if (hour < 11) return weekdayIndex === 1 ? "한 주를 시작하며" : "하루를 시작하며";
  if (hour < 14) return "짧게 틈내어";
  if (hour < 18) return "잠깐 쉬어가며";
  if (hour < 22) return "하루를 마무리하며";
  return "불 끄고 몰입해서";
}

/**
 * 맥락 문구를 만든다 — 참여자가 **지금 실제로** 접속한 요일·시간대·기기 기준.
 *
 * 처음에는 B-4·B-5 자기보고(평소 시청 기기·시간대)를 썼는데, 오전에 응답하는데도
 * 평소 시간대인 "오후"가 뜨는 게 어색하다는 피드백이 있었다. 맥락 인식 추천이
 * 내세우는 근거는 '지금 이 상황'이므로 실제 접속 정보를 쓰는 편이 화면과 어긋나지 않는다.
 * (자기보고 값은 B-4·B-5 컬럼에 그대로 남아 있어 분석에는 계속 쓸 수 있다.)
 *
 * 사전 문항이 끝난 뒤 한 번 계산해 DB에 저장한다 → 3화면 간 문구가 흔들리지 않고,
 * 분석할 때 어떤 문구를 봤는지 재현할 수 있다.
 */
export function buildContextSnapshot(now: Date, isMobile: boolean): ContextSnapshot {
  const { weekdayIndex, hour } = inSurveyTimezone(now);
  const weekday = WEEKDAYS[weekdayIndex];
  const daypart = daypartLabel(hour);
  const scene = scenePhrase(weekdayIndex, hour);
  // 모바일이면 스마트폰, 그 외(PC·태블릿)는 큰 화면
  /*
    자극물은 접속 기기와 무관하게 언제나 스마트폰 화면이다.
    PC 용 목업 자료가 없어 화면을 기기별로 나눌 수 없고, 나눌 수 있더라도
    참여자마다 다른 화면을 보면 그 차이가 근거유형 효과에 섞인다.
    실제 접속 기기는 participants.is_mobile 에 그대로 남아 공변량으로 쓸 수 있다.
  */
  const device = "스마트폰으로";

  return {
    weekday,
    daypart,
    scene,
    device,
    isMobile,
    phrase: `${weekday} ${daypart}, ${scene} ${device} 보기 좋은 작품`,
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
 * 그 조건이 '더 개인화된 화면'이 되어 근거유형 효과와 뒤섞인다.
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

/**
 * 배너 — 근거유형 조작의 핵심 문구.
 *
 * 굵게 처리하는 구간은 조작의 근거를 직접 말하는 부분이다(무엇을 근거로 골랐는가).
 * 세 조건 모두 굵은 구간이 두 군데씩이라 시각적 강조량이 같다.
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
        { text: `최근 시청하신 ${GENRE_LABELS[genre]}`, strong: true },
        { text: " 작품과 분위기가 " },
        { text: "유사한", strong: true },
        { text: " 작품" },
      ];
    case "collab":
      return [
        { text: `${who}과 취향이 ` },
        { text: "비슷한 사용자들", strong: true },
        { text: "이 많이 " },
        { text: "시청한", strong: true },
        { text: " 작품" },
      ];
    case "context":
      return [
        { text: `${ctx.weekday} ${ctx.daypart}`, strong: true },
        { text: `, ${ctx.scene ?? ""} ` },
        { text: ctx.device, strong: true },
        { text: " 보기 좋은 작품" },
      ];
  }
}

/** 배너 문구를 한 줄 텍스트로 (기록·검증용) */
export function bannerPlainText(segments: BannerSegment[]): string {
  return segments.map((s) => s.text).join("");
}

/**
 * 이용조건 문구 — 피험자 간 변수.
 *
 * 자극물 화면 **위**에 놓는다. 아래에 두었더니 포스터에 시선을 뺏겨
 * 읽지 않고 지나갔다 — 조절변수를 전달받지 못한 채 평가하게 된다.
 */
export function usageNotice(condition: UsageCondition): { label: string; detail: string } {
  return condition === "SVOD"
    ? {
        label: "구독 포함",
        detail: "추천 콘텐츠는 구독에 포함되어 있어 추가 결제 없이 바로 시청 가능합니다.",
      }
    : {
        label: "개별 대여",
        detail: "추천 콘텐츠는 5,500원 결제 시 48시간 동안 시청 가능합니다.",
      };
}
