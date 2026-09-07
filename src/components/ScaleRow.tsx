"use client";

import QuestionCard from "./QuestionCard";
import LikertScale from "./LikertScale";

/**
 * 5점 척도 문항 한 개 — 조작점검 척도 문항 공용.
 *
 * 자극물의 측정 문항(LikertBlock)과 같은 카드·같은 눈금을 쓴다. 조작점검이라고
 * 다른 모양이면 참여자가 "여기부터는 다른 걸 묻는다"를 알아차리는 단서가 된다.
 */
export default function ScaleRow({
  name,
  label,
  value,
  onChange,
  required = true,
  children,
}: {
  name: string;
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  required?: boolean;
  /** 눈금 아래에 딸려 나오는 것 (예: 낮은 점수일 때 받는 이유) — 같은 카드 안에 둔다 */
  children?: React.ReactNode;
}) {
  return (
    <QuestionCard question={label} required={required}>
      <LikertScale name={name} label={label} value={value} onChange={onChange} />
      {children}
    </QuestionCard>
  );
}
