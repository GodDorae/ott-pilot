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
      <p className="text-[13px] leading-relaxed text-accent-soft break-keep">{children}</p>
    </div>
  );
}
