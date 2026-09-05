/**
 * 1단계 사전조사 문항
 *
 *   demographics  A. 인구 통계학적 정보 (A-1 연령대, A-2 성별)   ← 가장 먼저
 *   usage         B. OTT 이용 현황 (B-1 플랫폼 ~ B-5 감상 시간대)
 *
 * 문구·선택지는 원 설문(구글 폼) 그대로다. `id` 는 participants 컬럼명과 같고
 * `value` 는 DB에 저장되는 슬러그다. 이 정의 하나로 화면 렌더링과 서버 검증을 모두 한다.
 */

export type Choice = { value: string; label: string };

export type PreQuestion = {
  /** participants 컬럼명 */
  id: string;
  /** 원 설문의 문항 번호 */
  code: string;
  label: string;
  required: boolean;
  choices: Choice[];
  /** '기타' 선택 시 자유입력을 담을 컬럼명 */
  otherColumn?: string;
  /** '기타'에 해당하는 value */
  otherValue?: string;
};

export type SectionKey = "usage" | "demographics";

export type PreSection = {
  key: SectionKey;
  /** 원 설문의 섹션 번호 (14개 중 몇 번째) */
  formSection: number;
  title: string;
  lead: string;
  questions: PreQuestion[];
  next: string;
};

/** 1-2 사전조사 첫 화면 — 인구통계 */
export const SECTION_DEMOGRAPHICS: PreSection = {
  key: "demographics",
  formSection: 2,
  title: "A. 인구 통계학적 정보",
  lead: "먼저 기본적인 인적사항에 답변해 주세요.",
  next: "/survey/usage",
  questions: [
    {
      id: "age_group",
      code: "A-1",
      label: "귀하의 연령대를 선택해 주세요.",
      required: true,
      choices: [
        { value: "10s", label: "10대" },
        { value: "20s", label: "20대" },
        { value: "30s", label: "30대" },
        { value: "40s", label: "40대" },
        { value: "50s_plus", label: "50대 이상" },
      ],
    },
    {
      id: "gender",
      code: "A-2",
      label: "귀하의 성별을 선택해 주세요.",
      required: true,
      choices: [
        { value: "female", label: "여성" },
        { value: "male", label: "남성" },
      ],
    },
  ],
};

/** 1-2 사전조사 두 번째 화면 — 평소 미디어/OTT 이용 습관·기기·시간대 */
export const SECTION_USAGE: PreSection = {
  key: "usage",
  formSection: 3,
  title: "B. OTT 이용 현황",
  lead: "실제 평상시 OTT 이용 모습을 떠올리고 솔직히 응답해 주시면 됩니다.",
  next: "/pre",
  questions: [
    {
      id: "ott_platform",
      code: "B-1",
      label: "주로 이용하는 OTT 플랫폼은 무엇인가요? (가장 자주 이용하는 1개)",
      required: true,
      otherColumn: "ott_platform_other",
      otherValue: "other",
      choices: [
        { value: "netflix", label: "넷플릭스" },
        { value: "tving", label: "티빙" },
        { value: "coupangplay", label: "쿠팡플레이" },
        { value: "wavve", label: "웨이브" },
        { value: "watcha", label: "왓챠" },
        { value: "none", label: "없음" },
        { value: "other", label: "기타" },
      ],
    },
    {
      id: "ott_tenure",
      code: "B-2",
      label: "현재 주로 사용하는 OTT 서비스를 어느 정도 기간 동안 이용하고 계신가요?",
      required: true,
      choices: [
        { value: "under_1m", label: "1개월 이하" },
        { value: "1_6m", label: "1~6개월" },
        { value: "6m_1y", label: "6개월~1년" },
        { value: "over_1y", label: "1년 이상" },
        { value: "never", label: "사용한 적 없음" },
      ],
    },
    {
      id: "rec_selection_freq",
      code: "B-3",
      label: "OTT 추천 콘텐츠를 선택하는 빈도는 어느 정도인가요?",
      required: true,
      choices: [
        { value: "rarely", label: "거의 선택하지 않는다" },
        { value: "sometimes", label: "가끔 선택한다" },
        { value: "often", label: "자주 선택한다" },
        { value: "always", label: "항상 추천을 통해 선택한다" },
      ],
    },
    {
      id: "primary_device",
      code: "B-4",
      label:
        "평소 OTT 콘텐츠를 감상하실 때 가장 자주 사용하시는 주 이용 기기는 무엇인가요? 여러 기기를 함께 사용하시는 경우, 이용 시간이 가장 많은 기기 한 가지만 선택해 주시기 바랍니다.",
      required: true,
      otherColumn: "primary_device_other",
      otherValue: "other",
      choices: [
        { value: "smartphone", label: "스마트폰" },
        { value: "tablet", label: "태블릿" },
        { value: "pc", label: "PC(컴퓨터)" },
        { value: "tv", label: "TV" },
        { value: "other", label: "기타" },
      ],
    },
    {
      id: "viewing_timeslot",
      code: "B-5",
      label: "평소 OTT 콘텐츠를 주로 감상하시는 시간대는 언제인가요?",
      required: true,
      choices: [
        { value: "morning", label: "이른 아침~오전 (06:00 ~ 12:00)" },
        { value: "afternoon", label: "오후 (12:00 ~ 18:00)" },
        { value: "evening", label: "저녁~야간 (18:00 ~ 24:00)" },
        { value: "late_night", label: "심야~새벽 (00:00 ~ 06:00)" },
        { value: "irregular", label: "정해진 시간 없이 불규칙하게 이용" },
      ],
    },
  ],
};

export const PRE_SECTIONS: Record<SectionKey, PreSection> = {
  usage: SECTION_USAGE,
  demographics: SECTION_DEMOGRAPHICS,
};

/** 원 설문의 총 섹션 수 — 진행 표시에 쓴다 */
export const FORM_TOTAL_SECTIONS = 14;

/** 자유입력 길이 상한 */
export const OTHER_MAX_LENGTH = 60;

/**
 * 선별 제외(screen-out) 규칙
 *
 * OTT 이용 경험이 없는 응답자는 이 실험의 대상이 아니다(연구 대상: 사용해 본 경험이 있는 분).
 * 해당 선택지를 고르면 자극물로 넘어가지 않고 종료 화면으로 보낸다.
 * 응답 자체는 지우지 않고 screened_out_at 으로 표시만 해, 몇 명이 왜 걸렀는지 남긴다.
 */
export const SCREEN_OUT_RULES: {
  questionId: string;
  value: string;
  reason: "no_platform" | "never_used";
}[] = [
  { questionId: "ott_platform", value: "none", reason: "no_platform" },
  { questionId: "ott_tenure", value: "never", reason: "never_used" },
];

/** 이번 응답이 선별 제외에 걸리는지 */
export function screenOutReason(
  answers: Record<string, string>,
): "no_platform" | "never_used" | null {
  for (const rule of SCREEN_OUT_RULES) {
    if (answers[rule.questionId] === rule.value) return rule.reason;
  }
  return null;
}

/** 라벨 조회 (관리자 화면·요약용) */
export function labelOf(questionId: string, value: string | null): string {
  if (!value) return "-";
  for (const section of Object.values(PRE_SECTIONS)) {
    const q = section.questions.find((q) => q.id === questionId);
    if (q) return q.choices.find((c) => c.value === value)?.label ?? value;
  }
  return value;
}
