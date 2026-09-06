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
    <fieldset className="card-shadow rounded-xl border border-line bg-card p-4 sm:p-5">
      {/*
        척도 안내 — 묶음마다 맨 위에 한 번.

        문항 옆에는 숫자 1~5 만 나오므로, 그 숫자가 무엇을 뜻하는지 같은 화면에
        있어야 한다. 양 끝만 적어 두면 2·3·4 를 참여자가 짐작해서 답하게 된다.
        묶음마다 반복해 두는 것은, 화면을 내려 답하다가 위로 돌아가지 않아도
        기준을 확인할 수 있게 하려는 것.
      */}
      <div className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2.5">
        <p className="text-[11px] font-bold text-accent">5점 척도</p>
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1.5">
          {LIKERT_LABELS.map((label, i) => (
            <li key={label} className="flex items-center gap-1.5 text-[11px] leading-none">
              <span className="grid size-4 shrink-0 place-items-center rounded bg-accent text-[10px] font-bold text-white tabular-nums">
                {LIKERT_MIN + i}
              </span>
              <span className="break-keep">{label}</span>
            </li>
          ))}
        </ul>
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
