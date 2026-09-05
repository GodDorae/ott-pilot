"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  OPEN_MAX_LENGTH,
  OPEN_QUESTIONS,
  RANK_TASK,
  RATIONALE_RECOGNITION_CHECK,
  USAGE_MANIPULATION_CHECK,
  validateRanking,
} from "@/lib/posttest";
import type { RationaleType } from "@/lib/experiment";

/** 세 사후 파트가 공유하는 제출 버튼 + 오류 표시 */
function useSubmit(part: string) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(payload: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/session/posttest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ part, ...payload }),
      });
      const data = (await res.json()) as { next?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "저장에 실패했습니다.");
      router.push(data.next ?? "/done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  return { submit, pending, error };
}

function Submit({
  onClick,
  disabled,
  pending,
  label,
  blockedLabel,
}: {
  onClick: () => void;
  disabled: boolean;
  pending: boolean;
  label: string;
  blockedLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className="mt-5 w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
    >
      {pending ? "저장 중…" : disabled ? blockedLabel : label}
    </button>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
      {error}
    </p>
  );
}

// 4-1 조작점검 ---------------------------------------------------------------

export function UsageCheckForm() {
  const { submit, pending, error } = useSubmit("check");
  const [answer, setAnswer] = useState<string | null>(null);
  const [recognized, setRecognized] = useState<string[]>([]);

  function toggle(value: string) {
    setRecognized((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  const complete = answer !== null && recognized.length > 0;

  return (
    <div>
      <fieldset className="rounded-xl border border-line bg-card p-4 sm:p-5">
        <legend className="px-1 text-xs font-bold text-accent">4-1-1</legend>
        <p className="text-sm leading-relaxed font-medium break-keep">
          {USAGE_MANIPULATION_CHECK.question}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted break-keep">
          {USAGE_MANIPULATION_CHECK.help}
        </p>

        <div role="radiogroup" className="mt-4 space-y-2">
          {USAGE_MANIPULATION_CHECK.options.map((o) => (
            <label
              key={o.value}
              className={
                "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm leading-relaxed break-keep transition " +
                (answer === o.value
                  ? "border-accent bg-accent/5"
                  : "border-line hover:border-muted/50")
              }
            >
              <input
                type="radio"
                name="mc_usage"
                value={o.value}
                checked={answer === o.value}
                onChange={() => setAnswer(o.value)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 4-1b 독립변수 재인 과제 — trial 마다 묻지 않고 여기서 한 번만 */}
      <fieldset className="mt-4 rounded-xl border border-line bg-card p-4 sm:p-5">
        <legend className="px-1 text-xs font-bold text-accent">4-1-2</legend>
        <p className="text-sm leading-relaxed font-medium break-keep">
          {RATIONALE_RECOGNITION_CHECK.question}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted break-keep">
          {RATIONALE_RECOGNITION_CHECK.help}
        </p>

        <div className="mt-4 space-y-2">
          {RATIONALE_RECOGNITION_CHECK.options.map((o) => (
            <label
              key={o.value}
              className={
                "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm leading-relaxed break-keep transition " +
                (recognized.includes(o.value)
                  ? "border-accent bg-accent/5"
                  : "border-line hover:border-muted/50")
              }
            >
              <input
                type="checkbox"
                checked={recognized.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <ErrorLine error={error} />
      <Submit
        onClick={() => complete && submit({ answer, recognized })}
        disabled={!complete}
        pending={pending}
        label="다음"
        blockedLabel={answer ? "제시된 설명을 골라 주세요" : "하나를 골라 주세요"}
      />
    </div>
  );
}

// 4-2 순위 -------------------------------------------------------------------

export function RankingForm() {
  const { submit, pending, error } = useSubmit("ranking");
  const [ranking, setRanking] = useState<Partial<Record<RationaleType, number>>>({});

  /** 어떤 순위를 이미 다른 항목이 쓰고 있는지 */
  const takenBy = (rank: number) =>
    (Object.keys(ranking) as RationaleType[]).find((k) => ranking[k] === rank);

  /**
   * 같은 순위를 다른 항목이 쓰고 있으면 그 항목에서 뺀다.
   * 그리드에서 '1열당 응답 1개 제한'을 구현하는 방식 (기조 문서 4-2).
   */
  function pick(key: RationaleType, rank: number) {
    setRanking((prev) => {
      const next: Partial<Record<RationaleType, number>> = { ...prev };
      const holder = (Object.keys(next) as RationaleType[]).find(
        (k) => k !== key && next[k] === rank,
      );
      if (holder) delete next[holder];
      next[key] = rank;
      return next;
    });
  }

  const valid = validateRanking(ranking).ok;

  return (
    <div>
      <fieldset className="rounded-xl border border-line bg-card p-4 sm:p-5">
        <legend className="px-1 text-xs font-bold text-accent">4-2</legend>
        <p className="text-sm leading-relaxed font-medium break-keep">{RANK_TASK.question}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted break-keep">{RANK_TASK.help}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-2/5 py-2 text-left text-xs font-medium text-muted">
                  추천 방식
                </th>
                {RANK_TASK.ranks.map((r) => (
                  <th key={r} className="py-2 text-center text-xs font-medium text-muted">
                    {r}위
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RANK_TASK.items.map((item) => (
                <tr key={item.key} className="border-t border-line">
                  <th scope="row" className="py-3 pr-2 text-left text-sm font-medium break-keep">
                    {item.label}
                  </th>
                  {RANK_TASK.ranks.map((r) => {
                    const holder = takenBy(r);
                    const mine = ranking[item.key] === r;
                    return (
                      <td key={r} className="py-3 text-center">
                        <label className="inline-flex cursor-pointer items-center justify-center p-1">
                          <input
                            type="radio"
                            name={"rank-" + item.key}
                            checked={mine}
                            onChange={() => pick(item.key, r)}
                            aria-label={item.label + " " + r + "위"}
                            className="size-4 accent-[var(--accent)]"
                          />
                          {/* 다른 항목이 쓰고 있는 순위는 눌러도 되지만, 눌리면 그쪽에서 빠진다 */}
                          {holder && holder !== item.key && !mine && (
                            <span className="sr-only">다른 항목이 선택 중</span>
                          )}
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <ErrorLine error={error} />
      <Submit
        onClick={() => valid && submit({ ranking })}
        disabled={!valid}
        pending={pending}
        label="다음"
        blockedLabel="세 항목에 1~3위를 매겨 주세요"
      />
    </div>
  );
}

// 4-3 주관식 ------------------------------------------------------------------

export function OpenEndedForm() {
  const { submit, pending, error } = useSubmit("open");
  const [values, setValues] = useState<Record<string, string>>({});

  const missing = OPEN_QUESTIONS.filter((q) => q.required && !(values[q.id] ?? "").trim());

  return (
    <div className="space-y-4">
      {OPEN_QUESTIONS.map((q, i) => (
        <div key={q.id} className="rounded-xl border border-line bg-card p-4 sm:p-5">
          <p className="text-xs font-bold text-accent">4-3-{i + 1}</p>
          <label
            htmlFor={q.id}
            className="mt-1.5 block text-sm leading-relaxed font-medium break-keep"
          >
            {q.label}
            {q.required && <span className="ml-1 text-accent">*</span>}
          </label>
          <textarea
            id={q.id}
            rows={4}
            maxLength={OPEN_MAX_LENGTH}
            placeholder={q.placeholder}
            value={values[q.id] ?? ""}
            onChange={(e) => setValues((p) => ({ ...p, [q.id]: e.target.value }))}
            className="mt-2.5 w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent"
          />
          <p className="mt-1 text-right text-[11px] text-muted tabular-nums">
            {(values[q.id] ?? "").length} / {OPEN_MAX_LENGTH}
          </p>
        </div>
      ))}

      <ErrorLine error={error} />
      <Submit
        onClick={() => missing.length === 0 && submit({ open: values })}
        disabled={missing.length > 0}
        pending={pending}
        label="다음"
        blockedLabel="필수 문항을 채워 주세요"
      />
    </div>
  );
}
