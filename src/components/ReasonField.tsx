"use client";

import { OPEN_MAX_LENGTH_CLARITY } from "@/lib/items";

/**
 * 문항 카드 안에 딸려 나오는 이유 입력칸.
 *
 * 낮은 점수를 고르거나 어려웠던 문항을 고른 사람에게만 나타난다 — 처음부터 보여 주면
 * 답할 일이 없는 사람도 빈칸을 채우려고 아무 말이나 적는다.
 */
export default function ReasonField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="mt-3.5 border-t border-line pt-3.5">
      <label htmlFor={id} className="block text-sm leading-relaxed font-medium break-keep">
        {label}
        {required && (
          <span className="ml-1 text-required" aria-hidden>
            *
          </span>
        )}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={OPEN_MAX_LENGTH_CLARITY}
        rows={3}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-lg border border-black/15 bg-surface px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-accent focus:bg-white"
      />
    </div>
  );
}
