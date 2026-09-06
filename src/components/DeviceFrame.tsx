import { SCREEN_ASPECT } from "./OttScreen";

/**
 * 자극물 화면을 감싸는 기기 목업.
 *
 * 접속 기기에 맞춰 프레임을 고른다 — 모바일이면 스마트폰, 그 외(PC·태블릿)는 브라우저 창.
 * 맥락 인식 조건 문구가 "스마트폰으로 / 큰 화면으로" 를 말하므로, 화면의 생김새도
 * 같은 기기를 가리켜야 문구와 어긋나지 않는다.
 *
 * 안쪽 화면(OttScreen)이 상태바까지 스스로 그리므로, 여기서는 얇은 베젤만 두른다.
 * `compact` 는 순위 화면에서 세 화면을 나란히 줄여 보여줄 때 쓴다 —
 * 화면 내부가 전부 컨테이너 비례 단위라 폭만 줄이면 그대로 축소된다.
 *
 * ── 크기가 정해지는 방식 ────────────────────────────────────────
 * 좁은 화면은 폭 기준, 넓은 화면은 남은 세로 공간에서 역산한 폭과 기준 폭 중 작은 쪽.
 * 큰 모니터에서 계속 커지면 참여자마다 자극물이 다른 크기로 보이므로 상한을 둔다 —
 * 시각디자인 실험에서 그냥 두면 안 되는 오차다. 세로가 모자란 창에서만
 * 기준 폭 아래로 줄어들고, 잘리지는 않는다.
 */

/**
 * 목업 위아래로 이미 자리를 차지한 것들의 합 (px).
 *   왼쪽 칸 위아래 여백 48 + 머리글·이용조건 안내 108 + 사이 간격 12
 *   + 안내가 한 줄 더 늘어날 여지 22
 * 여기에 기기 테두리(폰 베젤 / 브라우저 주소창)를 더해 넘긴다.
 * 넉넉히 잡아 두면 목업이 조금 작아질 뿐이지만, 모자라면 아래가 잘린다.
 */
const CONTENT_RESERVE_PX = 190;
const PHONE_BEZEL_PX = 6; // 위아래 3px
const WEB_CHROME_PX = 35; // 브라우저 주소창 줄(34) + 아래 테두리(1)

/** 화면 비율과 여백을 CSS 로 넘긴다 (.device-fit 이 폭을 계산한다) */
const fitVars = (chromePx: number) =>
  ({
    "--screen-ratio": (1 / SCREEN_ASPECT).toFixed(4),
    "--device-reserve": `${CONTENT_RESERVE_PX + chromePx}px`,
  }) as React.CSSProperties;

/**
 * 목업 위에 놓는 것(머리글·이용조건 안내)도 목업과 같은 폭이어야 한다.
 * 그러려면 폭 계산에 쓰는 값이 둘 다에게 보여야 하므로, 공통 조상에 실어 준다.
 * 그 아래에서는 `.device-fit` 만 붙이면 같은 폭이 나온다.
 */
export const deviceFitVars = (isMobile: boolean) =>
  fitVars(isMobile ? PHONE_BEZEL_PX : WEB_CHROME_PX);

export default function DeviceFrame({
  isMobile,
  compact = false,
  children,
}: {
  isMobile: boolean;
  /** 순위 화면용 축소 표시 */
  compact?: boolean;
  children: React.ReactNode;
}) {
  if (isMobile) {
    return (
      <div
        className={
          "rounded-[1.9rem] bg-neutral-900 p-[3px] shadow-xl ring-1 ring-white/10 " +
          (compact ? "mx-auto w-full max-w-[9.5rem]" : "device-fit")
        }
        style={compact ? undefined : fitVars(PHONE_BEZEL_PX)}
      >
        <div className="overflow-hidden rounded-[1.75rem] bg-black">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={
        "overflow-hidden rounded-xl bg-neutral-900 shadow-xl ring-1 ring-white/10 " +
        (compact ? "mx-auto w-full max-w-[10.5rem]" : "device-fit")
      }
      style={compact ? undefined : fitVars(WEB_CHROME_PX)}
    >
      {/* 브라우저 상단 바 */}
      <div
        className={
          "flex shrink-0 items-center border-b border-neutral-800 " +
          (compact ? "gap-1 px-1.5 py-1" : "h-[34px] gap-2 px-3")
        }
      >
        <span className={"rounded-full bg-neutral-700 " + (compact ? "size-1" : "size-2.5")} />
        <span className={"rounded-full bg-neutral-700 " + (compact ? "size-1" : "size-2.5")} />
        <span className={"rounded-full bg-neutral-700 " + (compact ? "size-1" : "size-2.5")} />
        <span
          className={
            "ml-1 flex-1 truncate rounded bg-neutral-800 text-neutral-400 " +
            (compact ? "px-1 text-[5px]" : "px-2 py-0.5 text-[10px]")
          }
        >
          stream.example
        </span>
      </div>
      <div className="bg-black">{children}</div>
    </div>
  );
}
