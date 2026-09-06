import type { ReactNode } from "react";

/**
 * 자극물 화면 전용 2분할 레이아웃 — 왼쪽 목업, 오른쪽 문항.
 *
 * 이 연구의 이전 버전(세현이논문/ott-survey-react)의 SplitScreen 과 같은 구조다.
 *
 * 넓은 화면(md 이상)
 *   두 칸이 각각 화면 높이를 차지하고, **오른쪽만 스크롤**한다.
 *   문항을 끝까지 내려도 자극물이 왼쪽에 그대로 남아 있어야 한다 —
 *   참여자가 배너 문구를 다시 확인하면서 답할 수 있어야 하기 때문이다.
 *
 * 좁은 화면(모바일)
 *   위아래로 쌓인다. 목업이 먼저 나오고 그 아래에 문항이 온다.
 */
export default function SplitScreen({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="flex w-full flex-1 flex-col overflow-x-hidden md:h-screen md:flex-row md:overflow-hidden">
      {/* 왼쪽 — 자극물 목업 */}
      <div className="flex w-full shrink-0 flex-col items-center justify-center border-b border-line bg-bg px-4 py-6 md:h-screen md:w-1/2 md:border-r md:border-b-0 md:px-8">
        <div className="flex w-full max-w-md flex-col md:min-h-0 md:flex-1">{left}</div>
      </div>

      {/* 오른쪽 — 측정 문항 (여기만 스크롤) */}
      <div className="w-full min-w-0 px-5 py-6 md:h-screen md:w-1/2 md:overflow-y-auto md:px-8 md:py-10">
        <div className="mx-auto w-full max-w-lg">{right}</div>
      </div>
    </div>
  );
}
