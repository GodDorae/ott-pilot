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
          "mx-auto rounded-[1.9rem] bg-neutral-900 p-[3px] shadow-xl ring-1 ring-white/10 " +
          (compact ? "w-full max-w-[9.5rem]" : "device-fit")
        }
      >
        <div className="overflow-hidden rounded-[1.75rem] bg-black">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={
        "mx-auto overflow-hidden rounded-xl bg-neutral-900 shadow-xl ring-1 ring-white/10 " +
        (compact ? "w-full max-w-[10.5rem]" : "device-fit")
      }
    >
      {/* 브라우저 상단 바 */}
      <div className={"flex items-center border-b border-neutral-800 " + (compact ? "gap-1 px-1.5 py-1" : "gap-2 px-3 py-2")}>
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
