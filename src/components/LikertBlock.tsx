"use client";

import { LIKERT_LABELS, LIKERT_MAX, LIKERT_MIN, type LikertItem } from "@/lib/items";

const SCALE = Array.from({ length: LIKERT_MAX - LIKERT_MIN + 1 }, (_, i) => LIKERT_MIN + i);

/**
 * 리커트 문항 한 묶음.
 *
 * 자극물 화면에서는 유용성·성실성·수용의도를 **한 컨테이너에 이어서** 보여준다.
 * 구성개념별로 소제목을 달면 참여자가 "여기부터는 다른 걸 묻는구나"를 알아차려
 * 묶음마다 다른 기준으로 답하게 되고, 성실성 확인 문항도 눈에 띄어 변별력을 잃는다.
 */
export default function LikertBlock({
  items,
  values,
  onChange,
}: {
  items: LikertItem[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <fieldset className="rounded-xl border border-line bg-card p-4 sm:p-5">
      {/* 척도 양 끝 라벨 — 컨테이너 맨 위에 한 번만 */}
      <div className="flex justify-between text-[11px] text-muted">
        <span>{LIKERT_LABELS[0]}</span>
        <span>{LIKERT_LABELS[LIKERT_LABELS.length - 1]}</span>
      </div>

      <ul className="mt-1 divide-y divide-line">
        {items.map((item) => (
          <li key={item.key} className="py-4">
            <p className="mb-2.5 text-sm leading-relaxed break-keep">{item.text}</p>
            <div role="radiogroup" aria-label={item.text} className="grid grid-cols-5 gap-1.5">
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
