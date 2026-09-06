"use client";

import { useEffect, useState } from "react";

/**
 * 다음으로 넘어가기 전 최소 체류 시간.
 *
 * 자극물을 제대로 보지 않고 문항만 빠르게 찍고 넘어가는 응답을 막는다.
 * dwell_ms 로 사후에 걸러낼 수도 있지만, 그건 자료를 버리는 방식이다 —
 * 애초에 못 넘어가게 하는 편이 표본을 지킨다.
 *
 * 시간이 지나기 전에도 문항에는 답할 수 있다. 막는 것은 '제출' 뿐이다.
 * (선행 조사 ott-survey-react 의 useCountdown 과 같은 방식)
 */
export function useCountdown(seconds: number, start = true) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!start || remaining <= 0) return;
    const id = setInterval(() => setRemaining((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [start, remaining]);

  return { remaining, done: remaining <= 0 };
}

/**
 * 남은 시간 안내.
 *
 * 버튼이 왜 눌리지 않는지 알려주지 않으면 고장으로 여긴다.
 * 자리를 미리 잡아 두어(min-h) 시간이 다 됐을 때 화면이 흔들리지 않게 한다.
 */
export function CountdownHint({
  remaining,
  done,
  doneText,
}: {
  remaining: number;
  done: boolean;
  doneText?: string;
}) {
  return (
    <p
      aria-live="polite"
      className="mt-2 flex min-h-5 items-center justify-center gap-2 text-xs text-muted"
    >
      {done ? (
        doneText ? <span className="font-bold text-accent">{doneText}</span> : null
      ) : (
        <>
          <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-accent" />
          <span>{remaining}초 후에 넘어갈 수 있습니다</span>
        </>
      )}
    </p>
  );
}
