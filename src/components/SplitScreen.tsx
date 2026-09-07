import type { ReactNode } from "react";

/**
 * 자극물 화면 전용 2분할 레이아웃 — 왼쪽 목업, 오른쪽 문항.
 *
 * 선행 조사(세현이논문/ott-survey-react)의 SplitScreen 과 같은 구조다.
 *
 * PC (900px 이상)
 *   두 칸이 각각 화면 높이를 차지하고 **칸 안에서만** 스크롤한다.
 *   문항을 끝까지 내려도 자극물이 왼쪽에 그대로 남아 있어야 한다 —
 *   참여자가 배너 문구를 다시 확인하면서 답할 수 있어야 하기 때문이다.
 *
 *   왼쪽 칸에도 스크롤을 허용한다. 창이 낮을 때 목업을 계속 줄이면 배너 글자가
 *   읽을 수 없는 크기가 되므로, 목업 크기에 하한을 두고(.device-fit) 모자란 만큼은
 *   스크롤로 넘긴다. 큰 모니터에서는 상한(23rem)에 걸려 더 커지지 않는다 —
 *   참여자마다 자극물이 다른 크기로 보이면 그 차이가 근거유형 효과에 섞인다.
 *
 * 모바일 (900px 미만)
 *   2분할하지 않고 위아래로 쌓아 페이지 전체를 스크롤한다. 눕힌 폰(844×390)까지
 *   2분할이 켜지면 왼쪽 칸에 남는 세로가 없어 목업이 90px 까지 줄어든다.
 */
export default function SplitScreen({
  left,
  right,
}: {
  left: ReactNode;
  /**
   * 오른쪽 칸의 내용.
   *
   * 세로 방향 flex 칸만 내어 주고 스크롤과 여백은 내용 쪽에서 정한다.
   * 제출 줄을 스크롤 영역 **바깥**에 둘 수 있어야 하기 때문 — 안에 두고 sticky 로
   * 띄우면 문항이 버튼 뒤로 지나가면서 글자가 버튼에 반쯤 걸린 채로 보인다.
   */
  right: ReactNode;
}) {
  return (
    <div className="flex w-full flex-1 flex-col overflow-x-hidden wide:h-screen wide:flex-row wide:overflow-hidden">
      {/* 왼쪽 — 자극물 목업 */}
      <div className="flex w-full shrink-0 flex-col items-center border-b border-line bg-bg px-4 py-6 wide:h-screen wide:w-1/2 wide:overflow-y-auto wide:border-r wide:border-b-0 wide:px-8 wide:py-8">
        {/*
          my-auto 로 가운데 정렬한다. justify-center 를 쓰면 내용이 칸보다 높을 때
          위쪽이 스크롤로도 닿지 않는 곳에 잘려 나간다 (flex 스크롤 컨테이너의 알려진 문제).
        */}
        <div className="flex w-full max-w-md flex-col wide:my-auto">{left}</div>
      </div>

      {/* 오른쪽 — 측정 문항 (PC 에서는 여기만 스크롤) */}
      <div className="flex w-full min-w-0 flex-col wide:h-screen wide:w-1/2">{right}</div>
    </div>
  );
}
