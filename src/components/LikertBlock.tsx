"use client";

import { LIKERT_LABELS, LIKERT_MAX, LIKERT_MIN, type LikertItem } from "@/lib/items";

const SCALE = Array.from({ length: LIKERT_MAX - LIKERT_MIN + 1 }, (_, i) => LIKERT_MIN + i);

export default function LikertBlock({
  legend,
  items,
  values,
  onChange,
}: {
  legend: string;
  items: LikertItem[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <fieldset className="rounded-xl border border-line bg-card p-4 sm:p-5">
      <legend className="px-1 text-sm font-bold">{legend}</legend>

      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>{LIKERT_LABELS[0]}</span>
        <span>{LIKERT_LABELS[LIKERT_LABELS.length - 1]}</span>
      </div>

      <ul className="mt-1 divide-y divide-line">
        {items.map((item) => (
          <li key={item.key} className="py-4">
            <p className="mb-2.5 text-sm leading-relaxed break-keep">{item.text}</p>
            <div
              role="radiogroup"
              aria-label={item.text}
              className="grid grid-cols-5 gap-1.5"
            >
              {SCALE.map((n) => (
                <label
                  key={n}
                  className="likert-cell relative"
                  title={LIKERT_LABELS[n - LIKERT_MIN]}
                >
                  <input
                    type="radio"
                    name={item.key}
                    value={n}
                    checked={values[item.key] === n}
                    onChange={() => onChange(item.key, n)}
                    aria-label={LIKERT_LABELS[n - LIKERT_MIN]}
                  />
                  <span>{n}</span>
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
