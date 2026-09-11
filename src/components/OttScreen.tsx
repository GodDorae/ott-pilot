/**
 * 자극물 화면 — 제공된 실험물 UI 목업(1500×3248)을 그대로 옮긴 것.
 *
 * 화면 구성(위 → 아래)
 *   상태바(9:41) · 헤더({호칭}님 + 캐스트/다운로드/검색)
 *   상단 포스터 줄 — 헤더 그라디언트에 윗부분이 가려진 채 걸쳐 있다
 *   레일 제목(스파클 + 조건별 헤드라인 + ⓘ)
 *   붉은 그라디언트 배너 — **근거유형 조작이 실제로 들어가는 지점**
 *   실험 포스터 줄 — 3편 온전히 + 1편 일부. TVOD 조건에서만 파란 '구매' 배지가 붙는다
 *   "오직 이곳에서만" 줄
 *   하단 탭바(홈 / Trending Now / 나의 프로필)
 *
 * ── 왜 이런 방식으로 구현했나 ─────────────────────────────────
 * 목업은 1500px 폭 기준으로 그려졌는데 실제 화면에서는 훨씬 좁게(300px 안팎) 보인다.
 * 그래서 컨테이너 질의 단위(cqw)로 "목업 1px" 을 정의해 두고, 모든 값을 목업에서 잰
 * 숫자 그대로 적었다 — 어떤 폭에서 렌더링해도 목업과 같은 비율이 유지되고,
 * 코드의 숫자를 목업 위에서 바로 확인할 수 있다.
 *
 * ── 실험 설계상 주의 ──────────────────────────────────────
 * 상단 포스터 줄과 "오직 이곳에서만" 줄은 세 근거유형 조건에서 **완전히 동일하다**.
 * 조건 간에 달라지는 것은 레일 제목·배너 문구, 그리고 이용조건(구매 배지)뿐이다.
 * 장식용 요소가 조건마다 달라지면 근거유형 효과와 뒤섞인다.
 */

import type { Title } from "@/lib/stimuli";
import { VISIBLE_PER_SET } from "@/lib/stimuli";
import type { RationaleType, UsageCondition } from "@/lib/experiment";
import { honorific, type BannerSegment } from "@/lib/copy";

/** 목업 1px → 화면 단위. 목업 폭이 1500 이므로 1px = 100/1500 cqw */
const u = (n: number) => `calc(${n} * var(--ott-u))`;

/**
 * 목업에서 실측한 좌표·크기 (모두 1500px 폭 기준).
 *
 * 원본 목업은 3248 높이였는데 두 군데의 빈 자리를 걷어내 3042 로 줄였다.
 *   - 상태바와 헤더({호칭}님) 사이 136px → 54px
 *   - 하단 탭 라벨 아래 빈 검정 138px → 62px
 * 2분할 화면에서 왼쪽 칸이 화면 높이에 갇혀 있어, 이 빈 자리 때문에 목업이
 * 폭을 유지한 채로는 들어가지 못했다. 레일·배너·포스터 크기는 손대지 않았으므로
 * 목업의 내용 비율은 그대로다 (가로세로비 0.462 → 0.493).
 */
const M = {
  screenW: 1500,
  screenH: 3042,
  pad: 48,

  /** 상태바는 9:41 과 오른쪽 아이콘이 같은 세로 중심에 놓인 한 줄이다 */
  statusY: 40,
  statusH: 56,
  statusTimeIndent: 85,
  statusTimeSize: 57,
  statusIconH: 44,
  statusIconGap: 26,
  statusIconsRight: 59,

  headerY: 150,
  headerNameSize: 80,
  headerIconBox: 96,
  headerIconSize: 96,
  headerIconGap: 106,

  /** 상단 포스터 줄은 헤더 바로 아래에서 딱 잘린 채 시작한다 — 아랫부분만 보인다 */
  heroTop: 300,
  heroVisibleH: 348,
  /** 원본 포스터(608px) 중 어느 부분이 보이는지 — 목업과 같이 아래쪽 348px */
  heroCrop: "50% 100%",
  heroW: 424,
  heroH: 608,
  heroPeekW: 84,
  gap: 32,
  /** 헤더 뒤 붉은 그라디언트가 내려오는 높이 */
  fadeH: 300,

  /*
    제목 위 두 자리만 목업 128(화면 32px)로 둔다.
      A 상단 포스터 줄 아래끝(648) → 레일 제목(title1Y)
      D 실험 포스터 줄 아래끝      → "오직 이곳에서만"(title2Y)

    나머지는 기존 목업 간격을 유지한다.
      B 레일 제목 아래끝 → 배너 35
      C 배너 아래끝      → 실험 포스터 줄 52
      E "오직 이곳에서만" 아래끝 → 아래 포스터 줄 37

    제목 줄 높이는 65 × line-height 1.6 = 104 이다.
  */
  title1Y: 776,
  titleSize: 65,
  /*
    레일 제목 줄 — [AI 스파클] [제목] [ⓘ]. 세 요소 모두 세로 중앙 정렬(items-center).
    화면 크기는 목업값 / 4 다 (Figma 프레임 375px 기준 축척 1/4).

    크기는 **상자가 아니라 잉크**를 글자에 맞춘다. 아이콘마다 잉크가 상자를 채우는
    비율이 달라서(스파클 11.2/14, ⓘ 원 지름 18.4/24) 상자 크기를 같게 맞추면
    눈에 보이는 크기가 어긋난다. 제목 글자 65목업의 한글 잉크는 약 0.92em = 60목업(15px)다.

      sparkleBox 88 → 잉크 88 × 11.2/14 = 70목업 (17.6px)
                      Figma 원본 실측 잉크는 44×52(11×13px)로 더 작았는데,
                      원본을 따르지 않고 "글자만큼 키워 달라" 는 요청을 따랐다.
      infoBox    72 → 잉크 (18.4 + stroke 1.33) × 72/24 = 59목업 (14.8px)
                      제목 잉크 60목업과 거의 같다. 56(14px)일 때는 잉크가 11.7px 라
                      "글자보다 작다" 는 지적을 받았다.
      sparkleGap 22 → 화면 5.5px (원래 30 = 7.5px). 스파클과 글자가 떠 보여 2px 좁혔다.

    위계: 스파클 잉크 17.6px > 제목 15px ≈ ⓘ 14.8px. ⓘ 는 상자(72)가 스파클(88)보다
    작아 보조 요소로 읽히고, 잉크는 글자와 나란하다.
  */
  sparkleX: 53,
  sparkleBox: 88,
  sparkleGap: 22,
  infoBox: 72,

  bannerY: 915,
  /*
    Figma 원본 실측값 — 원본 PNG(1500×3248)에서 배너 상자가 y 1022~1165, 즉 144목업
    (화면 36px)인데 코드는 120(30px)이라 17% 낮았다. 룰러로 짚으신 "추천 문구 컨테이너가
    원본보다 작다" 가 이 차이다. 상자가 24 커진 만큼 아래(rail1Y·title2Y·rail2Y)를 함께
    내려, 배너와 포스터 줄 사이 여백 52 는 그대로 지킨다.
  */
  bannerH: 144,
  /* 4px — 목업 1500px 이 375px 로 그려지므로(축척 1/4) 목업 단위로는 16 이다 */
  bannerRadius: 16,
  /*
    배너 왼쪽 아이콘 — 화면 13px. 잉크는 상자의 13/14(달력 path 가 0.5~13.5)이므로
    52 × 13/14 = 48목업 = 12.1px 다. 배너 글자(49목업) 잉크가 45목업 = 11.3px 라
    7% 만 크다.

    72(18px)로 키웠다가 되돌렸다 — 그때 잉크가 16.7px 로 글자 잉크보다 48% 커서
    "추천문구 이유 아이콘이 글씨보다 크다" 는 지적을 받았다. Figma 원본은 56(14px)인데,
    원본 글자가 여기보다 커서(52목업) 원본에서는 균형이 맞았던 것이다.
  */
  bannerIcon: 52,
  /** 아이콘과 글자 사이 — 화면 6px (원래 JSX 에 20 으로 박혀 있었다) */
  bannerIconGap: 24,
  /*
    화면에서 12.25px (축척 1/4).

    배너는 한 줄로 잘리므로(truncate) **가장 긴 조건이 상한을 정한다.**
    글자 자리 = 1404(배너 폭) - 24×2(paddingInline) - 52(아이콘) - 24(gap) = 1280목업.
    가장 긴 오후 조건
        "분주한 평일 오후에 맞춰 ○○○님이 기분 전환하며 볼 만한 작품"
    은 글자 크기 1목업당 25.6목업 을 쓴다 (Noto Sans KR 실측: 한글 자폭 920/1000em,
    공백 224, letterSpacing -0.01em, 호칭 3자 = DISPLAY_NAME_MAX).
    → 여덟 갈래가 모두 들어가는 상한은 50.0목업. 49 는 25.8목업(2.0%) 남는다.

    ⚠️ 아이콘·gap·paddingInline 을 건드리면 이 자리가 함께 변한다. 아이콘을 72 로
    키웠을 때는 자리가 1260 으로 줄어 상한이 49.2 였고, 49 는 여유가 0.46% 뿐이라
    대체 글꼴로 떨어지기만 해도 끝이 "…" 로 잘렸다. 그래서 그때는 48 로 낮췄다.

    ── Figma 원본보다 작은 이유 ────────────────────────────────
    원본 실측 잉크 48목업 → 원본 글자는 약 52목업(13px)이다. 여기는 49 라 6% 작다.
    52 를 넣으려면 1331목업 이 필요한데 paddingInline 을 0 으로 줘도 안쪽이 1328 이라
    **여백을 다 없애도 간신히 모자란다.** 원본에 실린 것은 짧은 아침 조건이라
    그 크기로 들어갔던 것이고, 오후 조건은 그려 본 적이 없다.

    무드 문구를 줄이면 상한이 올라간다 (오후 기준, 실측):
        "기분 전환하며" → 50.0목업 (12.50px)   ← 지금
        "기분 전환"     → 53.8목업 (13.45px)   ← 원본 크기 가능
    문구는 연구자가 정하는 것이라 여기서 바꾸지 않았다.
  */
  bannerTextSize: 49,

  rail1Y: 1111,
  posterRadius: 10,

  badgeInset: 18,
  badgeH: 60,
  badgePadX: 17,
  badgeSize: 40,
  badgeRadius: 8,

  /* D — 위 title1Y 주석의 32px 규칙 참고 */
  title2Y: 1847,
  rail2Y: 1988,
  rail2W: 612,
  rail2H: 1194,
  rail2PeekW: 164,
  rail2Radius: 12,

  tabTop: 2839,
  tabIconY: 2864,
  tabIconW: 62,
  tabIconH: 63,
  tabLabelY: 2940,
  tabLabelSize: 38,
  tabAvatar: 76,
} as const;

/**
 * 배너 아이콘의 stroke 두께 — 세 근거유형 아이콘을 1px 로 통일한다.
 *
 * 목업 1500px 이 화면에서 375px 로 그려지므로(축척 1/4) 1px = 목업 4px 이다.
 * 아이콘마다 viewBox 가 달라(달력 14, 시계·사람 24) 같은 stroke-width 를 적으면
 * 두께가 달라진다 — 목업 4px 이 되도록 viewBox 단위로 환산해서 쓴다.
 *
 * 결과: 달력 0.966 (viewBox 14) · 시계·사람 1.655 (viewBox 24) → 셋 다 화면에서 1px.
 * 예전에는 시계·사람이 1.9 였고 화면에서 1.13px 라 달력(1.04px)보다 굵었다.
 */
const ICON_STROKE_MOCK = 4;
const iconStroke = (viewBox: number) => (ICON_STROKE_MOCK * viewBox) / M.bannerIcon;

/**
 * AI 추천 표식 — 레일 제목 왼쪽의 반짝임.
 *
 * 연구자 자료(artificial-intelligence-08.svg)를 그대로 옮겼다. 좌표·그라디언트 정지점을
 * 손대지 않았고, Figma 가 붙인 id 만 이 파일 안에서 부딪히지 않게 바꿨다.
 * 채움(fill)에 그라디언트를 직접 걸어야 원본 색이 난다 — 예전에는 직접 그린 별 두 개에
 * 분홍 두 정지점만 준 것이라 원본의 붉은색→마젠타→보라 흐름이 나오지 않았다.
 *
 * 크기는 M.sparkleBox (정사각). 잉크가 viewBox 를 꽉 채우지 않아(14 중 약 11.2)
 * 상자를 제목 글자 높이보다 조금 크게 잡아야 글자와 비슷한 높이로 보인다.
 */
function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      className="shrink-0"
      style={{ width: u(M.sparkleBox), height: u(M.sparkleBox) }}
      aria-hidden
    >
      <defs>
        <linearGradient
          id="ott-ai-1"
          x1="3.49185"
          y1="5.23875"
          x2="10.4749"
          y2="11.8726"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#CB2026" />
          <stop offset="0.639046" stopColor="#D4048F" />
          <stop offset="1" stopColor="#C400FF" />
        </linearGradient>
        <linearGradient
          id="ott-ai-2"
          x1="9.7843"
          y1="2.2188"
          x2="12.4029"
          y2="4.70651"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#CB2026" />
          <stop offset="0.52779" stopColor="#D4048F" />
          <stop offset="1" stopColor="#C400FF" />
        </linearGradient>
      </defs>
      <path
        d="M5.58704 3.55835C5.77435 3.08342 6.44648 3.08342 6.6338 3.55835L7.16387 4.90228C7.50697 5.77228 8.19561 6.46095 9.06564 6.80405L10.4096 7.33412C10.8845 7.52144 10.8845 8.19355 10.4096 8.38087L9.06564 8.91094C8.19561 9.25404 7.50697 9.94268 7.16387 10.8127L6.6338 12.1566C6.44648 12.6315 5.77435 12.6315 5.58704 12.1566L5.057 10.8127C4.71388 9.94268 4.02521 9.25404 3.15521 8.91094L1.81128 8.38087C1.33635 8.19355 1.33635 7.52144 1.81128 7.33412L3.15521 6.80405C4.02521 6.46095 4.71388 5.77228 5.057 4.90228L5.58704 3.55835Z"
        fill="url(#ott-ai-1)"
      />
      <path
        d="M10.57 1.58865C10.6402 1.41055 10.8923 1.41055 10.9625 1.58865L11.1613 2.09263C11.29 2.41887 11.5482 2.67713 11.8745 2.8058L12.3785 3.00456C12.5565 3.0748 12.5565 3.32686 12.3785 3.3971L11.8745 3.59587C11.5482 3.72453 11.29 3.98279 11.1613 4.30904L10.9625 4.81301C10.8923 4.99111 10.6402 4.99111 10.57 4.81301L10.3713 4.30904C10.2425 3.98279 9.98428 3.72453 9.65806 3.59587L9.15406 3.3971C8.97599 3.32686 8.97599 3.0748 9.15406 3.00456L9.65806 2.8058C9.98428 2.67713 10.2425 2.41887 10.3713 2.09263L10.57 1.58865Z"
        fill="url(#ott-ai-2)"
      />
    </svg>
  );
}

/** 조건 무관 장식용 포스터 — 상단 줄과 "오직 이곳에서만" 줄 */
const HERO_IMAGES = ["hero-1", "hero-2", "hero-3"];
const HERO_PEEK = "hero-4";
const ONLY_IMAGES = ["only-1", "only-2"];
const ONLY_PEEK = "only-3";

function Img({ src, alt, crop }: { src: string; alt: string; crop?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 목업 고정 크기라 next/image 의 최적화가 필요 없다
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      style={crop ? { objectPosition: crop } : undefined}
      draggable={false}
    />
  );
}

/* ── 아이콘 ─────────────────────────────────────────────── */

function CastIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden
    >
      <path
        d="M3 17.5a3.5 3.5 0 0 1 3.5 3.5M3 13.5a7.5 7.5 0 0 1 7.5 7.5"
        strokeLinecap="round"
      />
      <circle cx="3.4" cy="20.6" r="1" fill="currentColor" stroke="none" />
      <path
        d="M8.5 5.5h11.2A1.8 1.8 0 0 1 21.5 7.3v9.4a1.8 1.8 0 0 1-1.8 1.8h-5.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4.5 5.5H4.3A1.8 1.8 0 0 0 2.5 7.3v1.4" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        d="M12 3v11m0 0 4.5-4.5M12 14l-4.5-4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 19.5h14" strokeLinecap="round" strokeWidth={2.6} />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <circle cx="10.6" cy="10.6" r="7.1" />
      <path d="m16 16 5 5" strokeLinecap="round" />
    </svg>
  );
}

/** 시청 이력 — 되감기 화살표가 달린 시계 (내용 기반 조건) */
function HistoryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={iconStroke(24)}
      aria-hidden
    >
      <path
        d="M3.4 8.2A9 9 0 1 1 3 12"
        strokeLinecap="round"
        transform="rotate(-8 12 12)"
      />
      <path d="M3.1 3.6v4.8h4.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7.4V12l3.1 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 비슷한 사용자들 — 두 사람 (협업 필터링 조건) */
function PeopleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={iconStroke(24)}
      aria-hidden
    >
      <circle cx="9.2" cy="8" r="3.5" />
      <path
        d="M2.8 19.4c.6-3.4 3.2-5.4 6.4-5.4s5.8 2 6.4 5.4"
        strokeLinecap="round"
      />
      <path
        d="M16.4 5c1.9.3 3.2 1.8 3.2 3.6a3.6 3.6 0 0 1-2.4 3.4"
        strokeLinecap="round"
      />
      <path d="M18.2 14.6c1.7.7 2.8 2.2 3.1 4.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 달력 + 시계 — 맥락 인식 조건 아이콘 (근거로 내세우는 것이 "지금이 어떤 때인가" 다).
 *
 * 연구자가 준 자료(맥락용 아이콘.svg)를 그대로 옮겼다. 좌표를 손대지 않았고 두 가지만 바꿨다:
 *   stroke="white" → currentColor  — 감싼 span 의 text-white 를 물려받게. 배너 색이 바뀌어도 따라간다.
 *   clipPath 삭제                  — 뷰박스 전체를 덮는 사각형이라 아무것도 자르지 않는데,
 *                                    Figma 가 붙인 id 가 한 화면에 여러 번 들어가면 부딪친다.
 * 모든 path 에 있던 linecap·linejoin 은 svg 로 올렸다 (값이 전부 같다).
 *
 * 앞서 쓰던 스마트폰 아이콘을 뺀 이유: 확정 문구에서 기기 언급이 빠졌는데
 * (자극물은 접속 기기와 무관하게 언제나 스마트폰 화면이라 "스마트폰으로" 는 PC 응답자에게 틀린 근거가 된다)
 * 아이콘만 스마트폰으로 남으면 문구가 말하지 않는 근거를 그림이 말하게 된다.
 */
function ScheduleIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={iconStroke(14)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1.5 2.5C1.23478 2.5 0.98043 2.60536 0.792893 2.79289C0.605357 2.98043 0.5 3.23478 0.5 3.5V12.5C0.5 12.7652 0.605357 13.0196 0.792893 13.2071C0.98043 13.3946 1.23478 13.5 1.5 13.5H7M10.5 2.5H12.5C12.7652 2.5 13.0196 2.60536 13.2071 2.79289C13.3946 2.98043 13.5 3.23478 13.5 3.5V8" />
      <path d="M0.5 6.5H13.5" />
      <path d="M3.5 0.5V4.5" />
      <path d="M10.5 0.5V4.5" />
      <path d="M3.5 2.5H8.5" />
      <path d="M11.2715 13.5001C12.5023 13.5001 13.5001 12.5023 13.5001 11.2715C13.5001 10.0407 12.5023 9.04297 11.2715 9.04297C10.0407 9.04297 9.04297 10.0407 9.04297 11.2715C9.04297 12.5023 10.0407 13.5001 11.2715 13.5001Z" />
      <path d="M11.3779 10.6431V11.2906L12.0358 12.0572" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="2.6 3.2 18.8 17.7" fill="currentColor" aria-hidden>
      <path d="M12 3.2 2.6 11.1a.7.7 0 0 0 .45 1.24H5.1v8.06c0 .22.18.4.4.4h4.3v-5.5h4.4v5.5h4.3a.4.4 0 0 0 .4-.4V12.34h2.05a.7.7 0 0 0 .45-1.24Z" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg
      viewBox="2.6 2.25 17.85 17.15"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden
    >
      <rect
        x="2.6"
        y="6.6"
        width="12.6"
        height="12.8"
        rx="1.8"
        fill="currentColor"
        stroke="none"
      />
      <path d="M6.6 6.6V4.9a1.8 1.8 0 0 1 1.8-1.8h9.4a1.8 1.8 0 0 1 1.8 1.8v9.4a1.8 1.8 0 0 1-1.8 1.8h-2.6" />
      <path d="m7.6 10 4.4 3-4.4 3z" fill="#000" stroke="none" />
    </svg>
  );
}

/* ── 화면 ───────────────────────────────────────────────── */

export default function OttScreen({
  rationale,
  headline,
  banner,
  titles,
  usageCondition,
  displayName,
}: {
  rationale: RationaleType;
  /** 레일 제목 — 조건별 헤드라인 */
  headline: string;
  /** 배너 문구. 굵게 나오는 구간이 근거유형 조작의 핵심어다 */
  banner: BannerSegment[];
  /** 4편 — 앞 3편은 온전히, 마지막 1편은 화면 끝에서 잘려 보인다 */
  titles: Title[];
  usageCondition: UsageCondition;
  displayName: string | null;
}) {
  const visible = titles.slice(0, VISIBLE_PER_SET);
  const peek = titles[VISIBLE_PER_SET];
  const isTvod = usageCondition === "TVOD";
  const who = honorific(displayName);

  const BannerIcon =
    rationale === "content"
      ? HistoryIcon
      : rationale === "collab"
        ? PeopleIcon
        : ScheduleIcon;

  return (
    <div
      className="ott-screen-fit relative isolate select-none overflow-hidden bg-black text-white"
      style={{
        // 목업 1px = 100/1500 cqw. 아래 모든 숫자는 목업에서 잰 값 그대로다.
        ["--ott-u" as string]: "0.0666667cqw",
        containerType: "inline-size",
        aspectRatio: `${M.screenW} / ${M.screenH}`,
        // 설문 전체와 같은 Noto Sans KR. 참여자 기기와 무관하게 같은 글자꼴로 보여야 한다.
        fontFamily: "var(--font-noto), system-ui, sans-serif",
        letterSpacing: "-0.01em",
      }}
      role="img"
      aria-label={`${who} 홈 화면 · ${headline}`}
    >
      {/* 헤더 뒤 붉은 그라디언트 — 상단 포스터 줄이 시작되기 직전까지 내려온다 */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: u(M.fadeH),
          background:
            "linear-gradient(180deg, #000 0%, #0a0505 36%, #2a1c1b 78%, #51372f 100%)",
        }}
        aria-hidden
      />

      {/* 상단 포스터 줄 — 위쪽이 잘린 채 걸쳐 있다 */}
      <div
        className="absolute flex overflow-hidden"
        style={{
          left: u(M.pad),
          top: u(M.heroTop),
          right: 0,
          height: u(M.heroVisibleH),
          gap: u(M.gap),
        }}
        aria-hidden
      >
        {HERO_IMAGES.map((name) => (
          <div
            key={name}
            className="shrink-0 overflow-hidden"
            style={{ width: u(M.heroW), borderRadius: u(M.posterRadius) }}
          >
            <Img
              src={`/posters/chrome/${name}.webp`}
              alt=""
              crop={M.heroCrop}
            />
          </div>
        ))}
        <div
          className="shrink-0 overflow-hidden"
          style={{ width: u(M.heroPeekW), borderRadius: u(M.posterRadius) }}
        >
          <Img
            src={`/posters/chrome/${HERO_PEEK}.webp`}
            alt=""
            crop={M.heroCrop}
          />
        </div>
      </div>

      {/* 상태바 */}
      <div
        className="absolute flex items-center"
        style={{
          left: u(M.pad),
          right: u(M.statusIconsRight),
          top: u(M.statusY),
          height: u(M.statusH),
        }}
        aria-hidden
      >
        <span
          className="font-semibold"
          style={{
            marginLeft: u(M.statusTimeIndent),
            fontSize: u(M.statusTimeSize),
          }}
        >
          9:41
        </span>
        <div
          className="ml-auto flex items-center"
          style={{ gap: u(M.statusIconGap) }}
        >
          {/* 신호 */}
          <svg
            viewBox="0 0 20 14"
            fill="currentColor"
            style={{ height: u(M.statusIconH) }}
          >
            <rect x="0" y="9.5" width="3" height="4.5" rx="1" />
            <rect x="4.6" y="6.8" width="3" height="7.2" rx="1" />
            <rect x="9.2" y="4" width="3" height="10" rx="1" />
            <rect x="13.8" y="0.6" width="3" height="13.4" rx="1" />
          </svg>
          {/* 와이파이 */}
          <svg
            viewBox="0 0 20 12"
            fill="currentColor"
            style={{ height: u(M.statusIconH) }}
          >
            <path d="M10 11.6 7.5 8.6a3.3 3.3 0 0 1 5 0Z" />
            <path d="M10 4.1c1.85 0 3.55.72 4.8 1.9l1.75-2.1A10.2 10.2 0 0 0 10 1.3a10.2 10.2 0 0 0-6.55 2.6L5.2 6A6.9 6.9 0 0 1 10 4.1Z" />
            <path d="M10 .4c2.8 0 5.4 1 7.35 2.7l1.6-1.95A13.2 13.2 0 0 0 10-1.5 13.2 13.2 0 0 0 1.05 1.15l1.6 1.95A11.2 11.2 0 0 1 10 .4Z" />
          </svg>
          {/* 배터리 */}
          <svg
            viewBox="0 0 26 14"
            fill="none"
            style={{ height: u(M.statusIconH) }}
          >
            <rect
              x="0.7"
              y="0.7"
              width="22.6"
              height="12.6"
              rx="3.6"
              stroke="currentColor"
              strokeOpacity="0.45"
              strokeWidth="1.2"
            />
            <rect
              x="2.4"
              y="2.4"
              width="19.2"
              height="9.2"
              rx="2.3"
              fill="currentColor"
            />
            <path
              d="M24.8 5v4a2.3 2.3 0 0 0 0-4Z"
              fill="currentColor"
              fillOpacity="0.45"
            />
          </svg>
        </div>
      </div>

      {/* 헤더 — 호칭 + 앱 아이콘. 세 조건 모두 동일하다 */}
      <div
        className="absolute flex items-center justify-between"
        style={{
          left: u(M.pad),
          right: u(M.pad),
          top: u(M.headerY),
          height: u(M.headerIconBox),
        }}
      >
        <span className="font-bold" style={{ fontSize: u(M.headerNameSize) }}>
          {who}
        </span>
        <div
          className="flex items-center"
          style={{ gap: u(M.headerIconGap), transform: `translateY(${u(12)})` }}
        >
          <span
            style={{ width: u(M.headerIconSize), height: u(M.headerIconSize) }}
          >
            <CastIcon />
          </span>
          <span
            style={{
              width: u(M.headerIconSize - 8),
              height: u(M.headerIconSize),
            }}
          >
            <DownloadIcon />
          </span>
          <span
            style={{ width: u(M.headerIconSize), height: u(M.headerIconSize) }}
          >
            <SearchIcon />
          </span>
        </div>
      </div>

      {/* 레일 제목 — 조건별 헤드라인 */}
      <div
        className="absolute flex items-center"
        style={{
          left: u(M.sparkleX),
          right: u(M.pad),
          top: u(M.title1Y),
          gap: u(M.sparkleGap),
        }}
      >
        <SparkleIcon />
        <h2 className="truncate font-bold" style={{ fontSize: u(M.titleSize) }}>
          {headline}
        </h2>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9b9ba1"
          /* 화면 1px 고정 — 상자(infoBox)가 커져도 선이 굵어지지 않게 환산한다 */
          strokeWidth={(ICON_STROKE_MOCK * 24) / M.infoBox}
          className="shrink-0"
          style={{ width: u(M.infoBox), height: u(M.infoBox) }}
          aria-hidden
        >
          <circle cx="12" cy="12" r="9.2" />
          <path d="M12 10.6v6" strokeLinecap="round" />
          <circle cx="12" cy="7.4" r="1" fill="#9b9ba1" stroke="none" />
        </svg>
      </div>

      {/* 배너 — 근거유형 조작 */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: u(M.pad),
          right: u(M.pad),
          top: u(M.bannerY),
          height: u(M.bannerH),
          borderRadius: u(M.bannerRadius),
          gap: u(M.bannerIconGap),
          /*
            연구자 지정 그라디언트 (확정 목업). 붉은색 → 짙은 남색.

            세 겹을 적어 준 그대로 둔다. 다만 실제로 보이는 것은 맨 앞 한 겹뿐이다 —
            CSS 는 먼저 적은 층을 위에 깔고, 세 층이 모두 불투명해서 뒤의 두 층이 가려진다.
            (Figma 가 층별 블렌드 모드를 CSS 로 내보내지 못해 생기는 꼴이다.)
            뒤 두 층을 살리려면 background-blend-mode 를 함께 지정해야 한다.
          */
          background:
            "linear-gradient(91deg, #B91E30 0%, #021C4F 101.74%), " +
            "linear-gradient(91deg, #C50337 0%, #021C4F 101.74%), " +
            "linear-gradient(91deg, #0100EC 0%, #FB37F4 100%)",
          paddingInline: u(24),
        }}
      >
        <span
          className="shrink-0 text-white"
          style={{ width: u(M.bannerIcon), height: u(M.bannerIcon) }}
        >
          <BannerIcon />
        </span>
        <p
          className="truncate"
          style={{ fontSize: u(M.bannerTextSize), color: "#f0f0f0" }}
        >
          {banner.map((seg, i) => (
            <span
              key={i}
              className={seg.strong ? "font-bold text-white" : undefined}
            >
              {seg.text}
            </span>
          ))}
        </p>
      </div>

      {/* 실험 포스터 줄 — 여기에 배정된 세트가 들어간다 */}
      <div
        className="absolute flex"
        style={{
          left: u(M.pad),
          top: u(M.rail1Y),
          height: u(M.heroH),
          gap: u(M.gap),
        }}
      >
        {visible.map((t) => (
          <figure
            key={t.id}
            className="relative shrink-0 overflow-hidden"
            style={{ width: u(M.heroW), borderRadius: u(M.posterRadius) }}
          >
            <Img src={t.posterUrl ?? ""} alt={t.title} />
            {isTvod && <PurchaseBadge />}
          </figure>
        ))}
        {peek && (
          <figure
            className="relative shrink-0 overflow-hidden"
            style={{ width: u(M.heroW), borderRadius: u(M.posterRadius) }}
            aria-hidden
          >
            <Img src={peek.posterUrl ?? ""} alt="" />
            {isTvod && <PurchaseBadge />}
          </figure>
        )}
      </div>

      {/* "오직 이곳에서만" — 조건 무관 장식 줄 */}
      <h2
        className="absolute font-bold"
        style={{ left: u(M.pad), top: u(M.title2Y), fontSize: u(M.titleSize) }}
      >
        오직 이곳에서만
      </h2>
      <div
        className="absolute flex"
        style={{
          left: u(M.pad),
          top: u(M.rail2Y),
          height: u(M.rail2H),
          gap: u(M.gap),
        }}
        aria-hidden
      >
        {ONLY_IMAGES.map((name) => (
          <div
            key={name}
            className="shrink-0 overflow-hidden"
            style={{ width: u(M.rail2W), borderRadius: u(M.rail2Radius) }}
          >
            <Img src={`/posters/chrome/${name}.webp`} alt="" />
          </div>
        ))}
        <div
          className="shrink-0 overflow-hidden"
          style={{ width: u(M.rail2PeekW), borderRadius: u(M.rail2Radius) }}
        >
          <Img src={`/posters/chrome/${ONLY_PEEK}.webp`} alt="" />
        </div>
      </div>

      {/* 하단 탭바 — 포스터 줄을 덮고 앉는다 */}
      <div
        className="absolute inset-x-0 bottom-0 bg-black"
        style={{ top: u(M.tabTop) }}
        aria-hidden
      >
        {[
          { key: "home", label: "홈", active: true },
          { key: "trending", label: "Trending Now", active: false },
          { key: "profile", label: "나의 프로필", active: false },
        ].map((tab, i) => (
          <div
            key={tab.key}
            className="absolute flex flex-col items-center"
            style={{
              left: `calc(${i} * 100% / 3)`,
              width: "calc(100% / 3)",
              top: u(M.tabIconY - M.tabTop),
            }}
          >
            <span
              style={{
                width: u(tab.key === "profile" ? M.tabAvatar : M.tabIconW),
                height: u(tab.key === "profile" ? M.tabAvatar : M.tabIconH),
              }}
            >
              {tab.key === "home" && <HomeIcon />}
              {tab.key === "trending" && <TrendingIcon />}
              {tab.key === "profile" && (
                <span
                  className="grid h-full w-full place-items-center"
                  style={{
                    borderRadius: u(12),
                    background:
                      "linear-gradient(160deg, #f0464b 0%, #d9081b 100%)",
                  }}
                >
                  <span
                    className="font-bold text-white"
                    style={{ fontSize: u(40), lineHeight: 1 }}
                  >
                    ˮ
                  </span>
                </span>
              )}
            </span>
            <span
              className="absolute whitespace-nowrap font-medium"
              style={{
                top: u(M.tabLabelY - M.tabIconY),
                fontSize: u(M.tabLabelSize),
              }}
            >
              {tab.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** TVOD 조건 표식 — 개별 결제가 필요한 작품이라는 신호 */
function PurchaseBadge() {
  return (
    <span
      className="absolute font-bold text-white"
      style={{
        left: u(M.badgeInset),
        top: u(M.badgeInset),
        height: u(M.badgeH),
        lineHeight: u(M.badgeH),
        paddingInline: u(M.badgePadX),
        fontSize: u(M.badgeSize),
        borderRadius: u(M.badgeRadius),
        background: "#004dff",
      }}
    >
      구매
    </span>
  );
}
