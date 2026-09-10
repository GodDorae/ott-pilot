import type { ReactNode } from "react";

/**
 * 자극물 화면 전용 2분할 레이아웃 — 왼쪽 목업, 오른쪽 문항.
 *
 * 선행 조사(세현이논문/ott-survey-react)의 SplitScreen 과 같은 구조다.
 *
 * PC (900px 이상)
 *   반으로 나누지 않는다. 왼쪽 칸은 목업 폭(23rem)에 여백만 더한 만큼만 쓰고,
 *   남는 폭은 전부 문항 칸으로 간다 — 목업이 368px 인데 칸이 화면의 절반이면
 *   목업 옆이 통째로 비고 그만큼 문항 글줄이 좁아진다.
 *   두 칸을 묶어 가운데 정렬하므로, 큰 모니터에서는 양쪽 여백이 고르게 남는다.
 *
 *   두 칸 사이는 gap-10(40px) 으로 벌린다. 목업은 짙은 덩어리, 문항은 흰 카드라
 *   맞닿으면 대비가 세서 서로 밀치는 것처럼 보인다 — 목업 끝에서 카드 끝까지
 *   실측 104px 이 떨어진다 (칸 여백 32 + 간격 40 + 칸 여백 32).
 *
 *   가운데 구분선은 두지 않는다. 두 칸의 바탕색이 같고 문항이 흰 카드로 떠 있어
 *   경계는 이미 보인다 — 선을 그으면 그것이 화면에서 가장 진한 것이 된다.
 *
 *   두 칸이 각각 화면 높이를 차지하고 **칸 안에서만** 스크롤한다.
 *   문항을 끝까지 내려도 자극물이 왼쪽에 그대로 남아 있어야 한다 —
 *   참여자가 배너 문구를 다시 확인하면서 답할 수 있어야 하기 때문이다.
 *
 *   왼쪽 칸에도 스크롤을 허용한다. 목업은 창 크기와 무관하게 23rem 고정이라
 *   (.device-fit) 낮은 창에서는 아래가 칸을 넘치는데, 그만큼을 스크롤로 넘긴다.
 *   줄여서 맞추지 않는 이유는 두 가지다 — 목업 안의 글자가 폭에 비례해 배너가
 *   같이 작아지고, 창 높이가 참여자마다 달라 자극물이 저마다 다른 크기로 보인다.
 *
 *   칸 높이는 vh 가 아니라 dvh 로 잡는다. 페이지 자체가 스크롤되지 않아 모바일
 *   브라우저의 주소창이 접히지 않으므로, vh 로 잡으면 칸 아래쪽(오른쪽 칸의 제출
 *   줄)이 화면 밖에 잘린 채로 닿을 수 없게 된다 — 눕힌 태블릿에서 그렇다.
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
    <div className="flex w-full flex-1 flex-col overflow-x-hidden wide:h-dvh wide:flex-row wide:justify-center wide:gap-10 wide:overflow-hidden">
      {/* 왼쪽 — 자극물 목업 */}
      {/*
        2분할에서는 overflow-hidden 이다 — 스크롤이 생길 수 없다.
        목업이 남은 세로에 맞춰 줄어들도록 해 두었으므로(.mock-shell) 넘칠 것이 없고,
        스크롤바가 보이는 것 자체를 없애려는 것이다. 세로로 쌓일 때는 페이지가 스크롤된다.
      */}
      <div className="flex w-full shrink-0 flex-col items-center border-b border-line bg-bg px-4 py-6 mock-pane wide:h-dvh wide:overflow-hidden wide:border-b-0 wide:px-8 wide:py-4">
        {/*
          max-w-md 는 세로로 쌓일 때만이다. 2분할에서는 목업 폭을 .mock-pane 이 정하므로
          여기서 다시 448px 로 잡으면 상한(30rem)이 걸리기 전에 이쪽이 먼저 잘라 버린다.

          2분할에서는 flex-1 로 칸 높이를 채운다 — 안쪽에서 목업 칸이 남은 세로를 받아야
          하므로 이 칸이 먼저 정해진 높이를 가져야 한다. (예전에는 my-auto 로 가운데
          정렬했는데, 이제 목업 칸이 items-center 로 스스로 가운데 온다.)
        */}
        <div className="flex w-full max-w-md flex-col wide:max-w-none wide:min-h-0 wide:flex-1">
          {left}
        </div>
      </div>

      {/* 오른쪽 — 측정 문항 (PC 에서는 여기만 스크롤) */}
      {/*
        max-w-3xl: 이보다 넓히면 글줄이 길어져 오히려 읽기 나빠지고, 눈금 다섯 칸이
        170px 씩 벌어져 어느 숫자를 누르는지 겨냥하기 어려워진다.
      */}
      <div className="q-pane flex w-full min-w-0 flex-col wide:h-dvh wide:max-w-3xl wide:flex-1">{right}</div>
    </div>
  );
}
