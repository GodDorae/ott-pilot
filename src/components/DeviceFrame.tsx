/**
 * 자극물 화면을 감싸는 기기 목업.
 *
 * 접속 기기에 맞춰 프레임을 고른다 — 모바일이면 스마트폰, 그 외(PC·태블릿)는 브라우저 창.
 * 맥락 인식 조건 문구가 "스마트폰으로 / 큰 화면으로" 를 말하므로, 화면의 생김새도
 * 같은 기기를 가리켜야 문구와 어긋나지 않는다.
 *
 * `scale` 은 순위 화면에서 세 화면을 나란히 줄여 보여줄 때 쓴다.
 */
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
          "mx-auto w-full rounded-[2rem] bg-neutral-900 p-2 shadow-xl ring-1 ring-black/20 " +
          (compact ? "max-w-[15rem]" : "max-w-[20rem]")
        }
      >
        {/* 노치 */}
        <div className="flex justify-center pt-1 pb-2">
          <span className="h-1 w-16 rounded-full bg-neutral-700" />
        </div>
        <div className="overflow-hidden rounded-[1.5rem] bg-ott-bg">{children}</div>
        {/* 홈 인디케이터 */}
        <div className="flex justify-center pt-2 pb-1">
          <span className="h-1 w-24 rounded-full bg-neutral-700" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        "mx-auto w-full overflow-hidden rounded-xl bg-neutral-900 shadow-xl ring-1 ring-black/20 " +
        (compact ? "max-w-full" : "max-w-xl")
      }
    >
      {/* 브라우저 상단 바 */}
      <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2">
        <span className="size-2.5 rounded-full bg-neutral-700" />
        <span className="size-2.5 rounded-full bg-neutral-700" />
        <span className="size-2.5 rounded-full bg-neutral-700" />
        <span className="ml-2 flex-1 truncate rounded bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
          stream.example
        </span>
      </div>
      <div className="bg-ott-bg">{children}</div>
    </div>
  );
}
