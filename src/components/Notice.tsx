import type { ReactNode } from "react";

/**
 * 참여자가 반드시 읽어야 하는 문장을 담는 상자.
 *
 * 본문과 같은 흰 카드에 담으면 주변에 묻혀 그냥 지나친다. 배경·테두리·글자색을
 * 한꺼번에 바꿔 "여기는 다른 종류의 글"이라는 신호를 준다.
 * 선행 조사(ott-survey-react)의 안내 상자와 같은 색을 쓴다.
 */
export function NoticeCard({
  label,
  children,
  className = "",
}: {
  /** 상자 위 작은 라벨 (예: 유의사항) */
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-xl border border-warn-line bg-warn-bg px-4 py-3.5 sm:px-5 sm:py-4 " + className
      }
    >
      {label && <CLabel className="text-warn-strong">{label}</CLabel>}
      <div className="text-sm leading-relaxed text-warn-fg break-keep">{children}</div>
    </div>
  );
}

/**
 * 이용조건 안내 — 자극물 목업 **위**에 놓이는 상자.
 *
 * 이 연구의 조절변수(SVOD / TVOD)가 참여자에게 전달되는 유일한 자리다. 못 읽고 지나가면
 * 조건이 걸리지 않은 응답이 되므로, 같은 화면의 다른 안내보다 먼저 눈에 들어와야 한다.
 * 일반 안내 상자(NoticeCard)와 색 계열은 같이 두고 — 참여자가 이미 "읽어야 하는 글"로
 * 배운 색이다 — 눈에 걸리는 요소만 세 가지 더한다.
 *
 *   조건 이름 배지  usageNotice().label ("구독 포함" / "개별 대여"). 글 덩어리를
 *                  읽지 않고 지나가도 조건 이름 하나는 남는다.
 *                  (CLabel 은 10px 소문자 라벨이라 이 자리에선 눈에 덜 들어온다.)
 *   왼쪽 굵은 띠    상자 자체가 본문 흐름에서 끊겨 보이게.
 *   한 급 큰 본문   14px → 15px · font-medium.
 */
export function UsageNotice({
  label,
  lines,
}: {
  /** 조건 이름 — usageNotice().label */
  label: string;
  /** 조건 설명 — usageNotice().detail. 줄바꿈 자리는 문구 쪽에서 정한다 */
  lines: readonly string[];
}) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border-2 border-warn-line bg-warn-bg">
      <div aria-hidden className="w-1.5 shrink-0 bg-warn-line" />
      <div className="px-4 py-3 sm:px-5 sm:py-3.5">
        {/*
          w-fit + leading-4 로 블록 상자로 둔다 (inline-block 아님).
          inline-block 이면 부모 줄상자에 베이스라인으로 얹혀 아래에 여분이 붙고,
          그만큼 이 상자의 높이가 계산과 어긋난다 — globals.css 의 --mock-reserve 가
          이 높이를 손으로 재서 쓰므로, 높이가 산수로 딱 떨어져야 한다.
          지금 높이는 leading-4(16) + py-1(4+4) = 24px 고정이다.
        */}
        <p className="mb-1.5 w-fit rounded-md bg-warn-strong px-2.5 py-1 text-xs leading-4 font-bold tracking-wide text-warn-bg">
          {label}
        </p>
        <div className="text-[15px] leading-relaxed font-medium text-warn-fg break-keep">
          {/*
            한 사실이 한 칸이고 각각 제 줄에서 시작한다. 칸이 좁아 두 줄로 접힐 때
            text-balance 가 줄 길이를 고르게 나눈다 — 기본 줄바꿈은 되는 데까지 채우고
            넘기므로 "…구독 중인 서비스에 / 포함되어 있어," (238/94px) 처럼 뒤에
            토막이 남는다. balance 는 줄 수를 늘리지 않고 "…회원님이 구독 중인 /
            서비스에 포함되어 있어," (179/152px) 로 나눈다.
            break-keep(위 div)이 한글 단어 안에서 끊기는 것을 막고, 금액·기간처럼
            갈라지면 안 되는 묶음은 문구 쪽에서 NBSP 로 붙여 둔다 (copy.ts 참고).
          */}
          {lines.map((line) => (
            <span key={line} className="block text-balance">
              {line}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 카드 위에 붙는 작은 머리글 — 무엇에 대한 카드인지만 알린다 */
export function CLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={"mb-2 text-[10px] font-bold tracking-widest text-faint uppercase " + className}>
      {children}
    </p>
  );
}

/** 안내 상자 안의 항목 목록 — 앞에 강조색 점을 찍는다 */
export function NoticeList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((text) => (
        <li key={text} className="flex gap-2.5">
          <span
            aria-hidden
            className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-warn-line"
          />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * 문항 묶음의 **범위**를 알리는 짙은 상자.
 *
 * 안내 상자(NoticeCard)와 색을 달리한다. 노란 상자는 "실험 조건" 을 담고,
 * 이 짙은 상자는 "지금부터 답할 문항이 무엇을 기준으로 하는지" 를 담는다.
 * 둘을 같은 색으로 두면 이용조건 안내가 문항 안내에 섞여 눈에 덜 들어온다.
 *
 * 선행 조사(ott-survey-react)에서 문항 묶음 앞에 두던 상자와 같은 색·같은 자리다.
 */
export function ScopeBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-accent-deep px-4 py-3">
      <p className="text-[13px] leading-relaxed text-accent-soft break-keep wide:text-sm">{children}</p>
    </div>
  );
}
