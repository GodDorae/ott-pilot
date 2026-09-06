import { SCREEN_ASPECT } from "./OttScreen";

/**
 * 자극물 화면을 감싸는 스마트폰 목업.
 *
 * 접속 기기와 무관하게 언제나 스마트폰이다. 실험물 목업이 스마트폰용만 있어
 * PC 용 화면을 따로 만들 자료가 없고, 만들 수 있더라도 참여자마다 다른 화면을 보면
 * 그 차이가 근거유형 효과에 섞인다. 실제 접속 기기는 participants.is_mobile 에
 * 그대로 남아 공변량으로 쓸 수 있다.
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
 *   + 안내가 한 줄 더 늘어날 여지 22 + 폰 베젤 6
 * 넉넉히 잡아 두면 목업이 조금 작아질 뿐이지만, 모자라면 아래가 잘린다.
 */
const CONTENT_RESERVE_PX = 190;
const PHONE_BEZEL_PX = 6; // 위아래 3px

/**
 * 화면 비율과 여백을 CSS 로 넘긴다 (.device-fit 이 폭을 계산한다).
 *
 * 목업 위에 놓는 것(머리글·이용조건 안내)도 목업과 같은 폭이어야 하므로,
 * 이 값을 공통 조상에 실어 준다. 그 아래에서는 `.device-fit` 만 붙이면 같은 폭이 나온다.
 */
export const deviceFitVars = () =>
  ({
    "--screen-ratio": (1 / SCREEN_ASPECT).toFixed(4),
    "--device-reserve": `${CONTENT_RESERVE_PX + PHONE_BEZEL_PX}px`,
  }) as React.CSSProperties;

export default function DeviceFrame({
  compact = false,
  children,
}: {
  /** 순위 화면용 축소 표시 */
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "rounded-[1.9rem] bg-neutral-900 p-[3px] shadow-xl ring-1 ring-white/10 " +
        (compact ? "mx-auto w-full max-w-[9.5rem]" : "device-fit")
      }
      style={compact ? undefined : deviceFitVars()}
    >
      <div className="overflow-hidden rounded-[1.75rem] bg-black">{children}</div>
    </div>
  );
}
