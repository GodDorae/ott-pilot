"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Trial 사이의 짧은 휴식 (기조 문서 3단계).
 *
 * 목적은 앞 화면의 인상이 다음 평가로 그대로 흘러가는 것(carryover)을 줄이는 것이다.
 * 카운트다운이 끝나기 전에는 다음으로 못 넘어가게 해서, 세 화면을 한 번에 훑고
 * 비교해버리는 응답 패턴을 막는다.
 */
export default function RestInterstitial({
  next,
  seconds,
  trialsDone,
  totalTrials,
}: {
  next: string;
  seconds: number;
  trialsDone: number;
  totalTrials: number;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1 && timer.current) clearInterval(timer.current);
        return s <= 1 ? 0 : s - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const done = remaining <= 0;
  const pct = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16 text-center">
      <p className="text-xs text-muted tabular-nums">
        {trialsDone} / {totalTrials} 완료
      </p>
      <h1 className="mt-3 text-lg font-bold break-keep">잠시 쉬어 갈게요</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted break-keep">
        방금 본 화면은 잊고, 다음 화면을 새로 보시면 됩니다.
      </p>

      <div className="mt-8" aria-live="polite">
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-accent transition-[width] duration-1000 ease-linear"
            style={{ width: pct + "%" }}
          />
        </div>
        <p className="mt-3 min-h-5 text-xs text-muted tabular-nums">
          {done ? "준비가 되셨으면 계속해 주세요." : remaining + "초 후 계속할 수 있습니다"}
        </p>
      </div>

      {done ? (
        <Link
          href={next}
          className="mt-6 rounded-lg bg-accent px-4 py-3.5 text-sm font-bold text-white"
        >
          다음 화면으로
        </Link>
      ) : (
        <span className="mt-6 cursor-not-allowed rounded-lg bg-line px-4 py-3.5 text-sm font-bold text-muted">
          다음 화면으로
        </span>
      )}
    </div>
  );
}
