"use client";

import QuestionCard from "./QuestionCard";
import ReasonField from "./ReasonField";
import { ITEM_CLARITY, MEASURED_ITEM_NUMBERS } from "@/lib/items";

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
  const box =
    "q-text flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-semibold break-keep transition ";
  const on = "border-accent bg-accent-soft text-accent-strong";
  const off = "border-black/15 bg-surface hover:border-accent/60 hover:bg-accent-soft/60";

  return (
    <QuestionCard
      id="clarity-q"
      question={ITEM_CLARITY.question}
      help={ITEM_CLARITY.help}
      required
    >
      <div role="group" aria-labelledby="clarity-q" className="flex flex-wrap gap-2">
        {MEASURED_ITEM_NUMBERS.map((no) => (
          <label
            key={no}
            className={box + "min-w-14 " + (selected.includes(no) ? on : off)}
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
        <label className={box + (none ? on : off)}>
          <input type="checkbox" checked={none} onChange={onToggleNone} />
          <span>{ITEM_CLARITY.noneLabel}</span>
        </label>
      </div>

      {selected.length > 0 && (
        <ReasonField
          id="unclear-reason"
          label={ITEM_CLARITY.reasonLabel}
          placeholder={ITEM_CLARITY.reasonPlaceholder}
          value={reason}
          onChange={onReason}
        />
      )}
    </QuestionCard>
  );
}
