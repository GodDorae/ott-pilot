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

/** 목업에서 실측한 좌표·크기 (모두 1500px 폭 기준) */
const M = {
  screenW: 1500,
  screenH: 3248,
  pad: 48,

  /** 상태바는 9:41 과 오른쪽 아이콘이 같은 세로 중심(y≈91)에 놓인 한 줄이다 */
  statusY: 54,
  statusH: 56,
  statusTimeIndent: 85,
  statusTimeSize: 57,
  statusIconH: 44,
  statusIconGap: 26,
  statusIconsRight: 59,

  headerY: 246,
  headerNameSize: 80,
  headerIconBox: 96,
  headerIconSize: 96,
  headerIconGap: 106,

  /** 상단 포스터 줄은 y416 에서 딱 잘린 채 시작한다 — 포스터 윗부분만 보인다 */
  heroTop: 416,
  heroVisibleH: 348,
  /** 원본 포스터(608px) 중 어느 부분이 보이는지 — 목업과 같이 아래쪽 348px */
  heroCrop: "50% 100%",
  heroW: 424,
  heroH: 608,
  heroPeekW: 84,
  gap: 32,
  /** 헤더 뒤 붉은 그라디언트가 내려오는 높이 */
  fadeH: 416,

  title1Y: 823,
  titleSize: 65,
  /** 스파클은 세로로 긴 별 — 목업 잉크 44×52, 왼쪽 여백 56에서 시작 */
  sparkleX: 53,
  sparkleW: 48,
  sparkleH: 58,
  sparkleGap: 30,
  infoBox: 44,

  bannerY: 962,
  bannerH: 120,
  bannerRadius: 14,
  bannerIcon: 58,
  bannerTextSize: 45,

  rail1Y: 1134,
  posterRadius: 10,

  badgeInset: 18,
  badgeH: 60,
  badgePadX: 17,
  badgeSize: 40,
  badgeRadius: 8,

  title2Y: 1801,
  rail2Y: 1942,
  rail2W: 612,
  rail2H: 1194,
  rail2PeekW: 164,
  rail2Radius: 12,

  tabTop: 2955,
  tabIconY: 2980,
  tabIconW: 62,
  tabIconH: 63,
  tabLabelY: 3056,
  tabLabelSize: 38,
  tabAvatar: 76,
} as const;

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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <path d="M3 17.5a3.5 3.5 0 0 1 3.5 3.5M3 13.5a7.5 7.5 0 0 1 7.5 7.5" strokeLinecap="round" />
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M12 3v11m0 0 4.5-4.5M12 14l-4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19.5h14" strokeLinecap="round" strokeWidth={2.6} />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="10.6" cy="10.6" r="7.1" />
      <path d="m16 16 5 5" strokeLinecap="round" />
    </svg>
  );
}

/** 최근 시청 — 되감기 화살표가 달린 시계 (내용 기반 조건) */
function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <circle cx="9.2" cy="8" r="3.5" />
      <path d="M2.8 19.4c.6-3.4 3.2-5.4 6.4-5.4s5.8 2 6.4 5.4" strokeLinecap="round" />
      <path d="M16.4 5c1.9.3 3.2 1.8 3.2 3.6a3.6 3.6 0 0 1-2.4 3.4" strokeLinecap="round" />
      <path d="M18.2 14.6c1.7.7 2.8 2.2 3.1 4.2" strokeLinecap="round" />
    </svg>
  );
}

/** 큰 화면 (맥락 인식 조건 · PC) */
function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <rect x="2.4" y="3.8" width="19.2" height="13" rx="1.8" />
      <path d="M12 16.8v3.4M8.4 20.2h7.2" strokeLinecap="round" />
    </svg>
  );
}

/** 스마트폰 (맥락 인식 조건 · 모바일) */
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <rect x="6.2" y="2.4" width="11.6" height="19.2" rx="2.4" />
      <path d="M10.4 18.6h3.2" strokeLinecap="round" />
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
    <svg viewBox="2.6 2.25 17.85 17.15" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <rect x="2.6" y="6.6" width="12.6" height="12.8" rx="1.8" fill="currentColor" stroke="none" />
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
  isMobile,
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
  /** 맥락 조건 아이콘을 접속 기기에 맞춘다 */
  isMobile: boolean;
}) {
  const visible = titles.slice(0, VISIBLE_PER_SET);
  const peek = titles[VISIBLE_PER_SET];
  const isTvod = usageCondition === "TVOD";
  const who = honorific(displayName);

  const BannerIcon =
    rationale === "content" ? HistoryIcon : rationale === "collab" ? PeopleIcon : isMobile ? PhoneIcon : MonitorIcon;

  return (
    <div
      className="relative isolate select-none overflow-hidden bg-black text-white"
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
          background: "linear-gradient(180deg, #000 0%, #0a0505 36%, #2a1c1b 78%, #51372f 100%)",
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
            <Img src={`/posters/chrome/${name}.webp`} alt="" crop={M.heroCrop} />
          </div>
        ))}
        <div
          className="shrink-0 overflow-hidden"
          style={{ width: u(M.heroPeekW), borderRadius: u(M.posterRadius) }}
        >
          <Img src={`/posters/chrome/${HERO_PEEK}.webp`} alt="" crop={M.heroCrop} />
        </div>
      </div>

      {/* 상태바 — 스마트폰 프레임에서만. 브라우저 창에는 이런 줄이 없다 */}
      {isMobile && (
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
            style={{ marginLeft: u(M.statusTimeIndent), fontSize: u(M.statusTimeSize) }}
          >
            9:41
          </span>
          <div className="ml-auto flex items-center" style={{ gap: u(M.statusIconGap) }}>
            {/* 신호 */}
            <svg viewBox="0 0 20 14" fill="currentColor" style={{ height: u(M.statusIconH) }}>
              <rect x="0" y="9.5" width="3" height="4.5" rx="1" />
              <rect x="4.6" y="6.8" width="3" height="7.2" rx="1" />
              <rect x="9.2" y="4" width="3" height="10" rx="1" />
              <rect x="13.8" y="0.6" width="3" height="13.4" rx="1" />
            </svg>
            {/* 와이파이 */}
            <svg viewBox="0 0 20 12" fill="currentColor" style={{ height: u(M.statusIconH) }}>
              <path d="M10 11.6 7.5 8.6a3.3 3.3 0 0 1 5 0Z" />
              <path d="M10 4.1c1.85 0 3.55.72 4.8 1.9l1.75-2.1A10.2 10.2 0 0 0 10 1.3a10.2 10.2 0 0 0-6.55 2.6L5.2 6A6.9 6.9 0 0 1 10 4.1Z" />
              <path d="M10 .4c2.8 0 5.4 1 7.35 2.7l1.6-1.95A13.2 13.2 0 0 0 10-1.5 13.2 13.2 0 0 0 1.05 1.15l1.6 1.95A11.2 11.2 0 0 1 10 .4Z" />
            </svg>
            {/* 배터리 */}
            <svg viewBox="0 0 26 14" fill="none" style={{ height: u(M.statusIconH) }}>
              <rect x="0.7" y="0.7" width="22.6" height="12.6" rx="3.6" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
              <rect x="2.4" y="2.4" width="19.2" height="9.2" rx="2.3" fill="currentColor" />
              <path d="M24.8 5v4a2.3 2.3 0 0 0 0-4Z" fill="currentColor" fillOpacity="0.45" />
            </svg>
          </div>
        </div>
      )}

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
          <span style={{ width: u(M.headerIconSize), height: u(M.headerIconSize) }}>
            <CastIcon />
          </span>
          <span style={{ width: u(M.headerIconSize - 8), height: u(M.headerIconSize) }}>
            <DownloadIcon />
          </span>
          <span style={{ width: u(M.headerIconSize), height: u(M.headerIconSize) }}>
            <SearchIcon />
          </span>
        </div>
      </div>

      {/* 레일 제목 — 조건별 헤드라인 */}
      <div
        className="absolute flex items-center"
        style={{ left: u(M.sparkleX), right: u(M.pad), top: u(M.title1Y), gap: u(M.sparkleGap) }}
      >
        {/* 스파클 — 개인화 추천 표식 */}
        <svg
          viewBox="0 0 44 52"
          className="shrink-0"
          style={{ width: u(M.sparkleW), height: u(M.sparkleH) }}
          aria-hidden
        >
          <defs>
            <linearGradient id="ott-sparkle" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#ee1f6e" />
              <stop offset="100%" stopColor="#e01ab4" />
            </linearGradient>
          </defs>
          {/* 큰 별 (왼쪽 아래) — 세로로 긴 4각 별 */}
          <path
            d="M15 10C15 20.5 22.5 31 30 31C22.5 31 15 41.5 15 52C15 41.5 7.5 31 0 31C7.5 31 15 20.5 15 10Z"
            fill="url(#ott-sparkle)"
          />
          {/* 작은 별 (오른쪽 위) */}
          <path
            d="M34 0C34 5.5 39 11 44 11C39 11 34 16.5 34 22C34 16.5 29 11 24 11C29 11 34 5.5 34 0Z"
            fill="url(#ott-sparkle)"
          />
        </svg>
        <h2 className="truncate font-bold" style={{ fontSize: u(M.titleSize) }}>
          {headline}
        </h2>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9b9ba1"
          strokeWidth={1.8}
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
          gap: u(20),
          // 좌상단 어두운 적갈색 → 우하단 밝은 적색 (목업 실측)
          background: "linear-gradient(177deg, #381717 0%, #8a1817 100%)",
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
            <span key={i} className={seg.strong ? "font-bold text-white" : undefined}>
              {seg.text}
            </span>
          ))}
        </p>
      </div>

      {/* 실험 포스터 줄 — 여기에 배정된 세트가 들어간다 */}
      <div
        className="absolute flex"
        style={{ left: u(M.pad), top: u(M.rail1Y), height: u(M.heroH), gap: u(M.gap) }}
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
        style={{ left: u(M.pad), top: u(M.rail2Y), height: u(M.rail2H), gap: u(M.gap) }}
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
                    background: "linear-gradient(160deg, #f0464b 0%, #d9081b 100%)",
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
              style={{ top: u(M.tabLabelY - M.tabIconY), fontSize: u(M.tabLabelSize) }}
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
