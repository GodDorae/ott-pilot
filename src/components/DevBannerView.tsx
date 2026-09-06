"use client";

import { usePathname } from "next/navigation";
import { STEPS, TOTAL_STEP_COUNT, stepByPath } from "@/lib/steps";

/** 우측 상단 미리보기 배너 — 단계 이동 + 현재 조건 표시 */
export default function DevBannerView({
  query,
  usage,
  sequenceIndex,
  mappingIndex,
  cell,
  genreLabel,
}: {
  query: string;
  usage: string;
  sequenceIndex: number | null;
  mappingIndex: number | null;
  cell: number | null;
  genreLabel: string;
}) {
  const pathname = usePathname();
  const step = stepByPath(pathname);

  const prev = step && step.n > 1 ? STEPS[step.n - 2] : null;
  const next = step && step.n < TOTAL_STEP_COUNT ? STEPS[step.n] : null;

  const arrow = "px-1 underline decoration-dotted";
  const off = "px-1 opacity-30";

  return (
    /*
      한 줄로 고정한다. 좁은 화면에서 줄바꿈되면 두 줄이 되어 화면 맨 위 내용
      (자극물의 "추천 화면 N" 머리글 등)을 덮어, 정작 확인하려는 것을 가린다.
      넘치는 만큼은 배너 안에서 옆으로 밀어 본다.
    */
    <div className="fixed top-1.5 right-2 left-2 z-[60] ml-auto flex w-fit max-w-[calc(100%-1rem)] items-center gap-1.5 overflow-x-auto rounded-md bg-black/80 px-2.5 py-1 font-mono text-[11px] whitespace-nowrap text-white backdrop-blur-sm">
      <a href={"/dev?" + query} className="underline decoration-dotted">
        /dev
      </a>
      <span className="opacity-50">·</span>
      {step ? (
        <span className="tabular-nums">
          {step.n}/{TOTAL_STEP_COUNT} {step.id.toUpperCase()}
        </span>
      ) : (
        <span className="opacity-60">off-flow</span>
      )}

      <span className="opacity-40">|</span>
      {prev ? (
        <a href={"/dev/" + prev.n + "?" + query} className={arrow} title={prev.label}>
          ←
        </a>
      ) : (
        <span className={off}>←</span>
      )}
      {next ? (
        <a href={"/dev/" + next.n + "?" + query} className={arrow} title={next.label}>
          →
        </a>
      ) : (
        <span className={off}>→</span>
      )}

      <span className="opacity-40">|</span>
      <span className="opacity-80">
        {usage} · seq{sequenceIndex === null ? "-" : sequenceIndex + 1} · map{mappingIndex ?? "-"}
        {cell !== null && " · c" + cell}
      </span>
      <span className="opacity-40">|</span>
      <span className="opacity-80">{genreLabel}</span>
    </div>
  );
}
