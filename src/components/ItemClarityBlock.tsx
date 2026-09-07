"use client";

import { ITEM_CLARITY, MEASURED_ITEM_NUMBERS, OPEN_MAX_LENGTH_CLARITY } from "@/lib/items";

/**
 * 문항 이해도 확인 — 측정 문항 바로 아래.
 *
 * 어려웠던 문항 번호를 여러 개 고를 수 있고, 없으면 '없음' 을 고른다.
 * '없음' 과 무응답은 다르다 — 빈 배열(없음)과 미선택을 갈라 두어야
 * "어려운 게 없었다" 와 "묻는데 답하지 않았다" 가 자료에서 섞이지 않는다.
 *
 * 이유는 문항을 하나라도 골랐을 때만 받는다. 없다고 답한 사람에게 이유를 물으면
 * 빈칸을 채우려고 아무 말이나 적게 된다.
 */
export default function ItemClarityBlock({
  selected,
  none,
  reason,
  onToggleItem,
  onToggleNone,
  onReason,
}: {
  selected: number[];
  none: boolean;
  reason: string;
  onToggleItem: (no: number) => void;
  onToggleNone: () => void;
  onReason: (v: string) => void;
}) {
  return (
    <div
      role="group"
      aria-labelledby="clarity-q"
      className="card-shadow rounded-xl border border-line bg-card p-4 sm:p-5"
    >
      <p id="clarity-q" className="text-sm leading-relaxed font-bold break-keep">
        {ITEM_CLARITY.question}
        <span className="ml-1 text-required" aria-hidden>
          *
        </span>
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted break-keep">{ITEM_CLARITY.help}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {MEASURED_ITEM_NUMBERS.map((no) => (
          <label
            key={no}
            className={
              "flex min-w-14 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition " +
              (selected.includes(no)
                ? "border-accent bg-accent/10"
                : "border-line hover:border-muted/50")
            }
          >
            <input
              type="checkbox"
              checked={selected.includes(no)}
              onChange={() => onToggleItem(no)}
              aria-label={no + "번 문항이 어려웠다"}
            />
            <span className="tabular-nums">{no}</span>
          </label>
        ))}

        {/* '없음' 은 번호들과 같은 줄에 두되, 서로 배타적이다 */}
        <label
          className={
            "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium break-keep transition " +
            (none ? "border-accent bg-accent/10" : "border-line hover:border-muted/50")
          }
        >
          <input type="checkbox" checked={none} onChange={onToggleNone} />
          <span>{ITEM_CLARITY.noneLabel}</span>
        </label>
      </div>

      {/* 이유는 어려웠다고 고른 사람에게만 묻는다 */}
      {selected.length > 0 && (
        <div className="mt-4">
          <label
            htmlFor="unclear-reason"
            className="block text-sm leading-relaxed font-medium break-keep"
          >
            {ITEM_CLARITY.reasonLabel}
            <span className="ml-1 text-required" aria-hidden>
              *
            </span>
          </label>
          <textarea
            id="unclear-reason"
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            maxLength={OPEN_MAX_LENGTH_CLARITY}
            rows={3}
            placeholder={ITEM_CLARITY.reasonPlaceholder}
            className="mt-2 w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent"
          />
        </div>
      )}
    </div>
  );
}
