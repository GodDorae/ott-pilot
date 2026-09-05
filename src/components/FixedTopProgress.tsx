"use client";

import { usePathname } from "next/navigation";
import { STEPS, TOTAL_STEP_COUNT, stepByPath } from "@/lib/steps";

/**
 * 화면 맨 위에 얇게 깔리는 진행바.
 * 경로만 보고 계산하므로 서버 조회가 없다 — 설문 단계가 아닌 경로에서는 아무것도 안 그린다.
 */
export default function FixedTopProgress() {
  const pathname = usePathname();
  const step = stepByPath(pathname) ?? (pathname === "/" ? STEPS[0] : null);
  if (!step) return null;

  const pct = (step.n / TOTAL_STEP_COUNT) * 100;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]"
    >
      <div
        className="h-full bg-accent transition-[width] duration-500 ease-out"
        style={{ width: pct + "%" }}
      />
    </div>
  );
}
