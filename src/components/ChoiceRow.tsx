"use client";

import QuestionCard from "./QuestionCard";

/**
 * 단일선택 문항 한 개 — 조작점검 객관식 공용.
 *
 * 보기는 한 줄에 하나씩 쌓는다. 근거유형 점검의 보기는 "자주 시청한다고 답한 장르와의
 * 유사성" 처럼 길어서, 가로로 늘어놓으면 좁은 화면에서 줄바꿈이 제멋대로 생기고
 * 어느 동그라미가 어느 보기의 것인지 흐려진다.
 */
export default function ChoiceRow({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: readonly { readonly value: string; readonly label: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <QuestionCard question={label} required>
      <div role="radiogroup" aria-label={label} className="space-y-1.5">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <label
              key={o.value}
              className={
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-relaxed break-keep transition " +
                (on
                  ? "border-accent bg-accent-soft font-semibold text-accent-strong"
                  : "border-black/15 bg-surface hover:border-accent/60 hover:bg-accent-soft/60")
              }
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={on}
                onChange={() => onChange(o.value)}
              />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
    </QuestionCard>
  );
}
