"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  FOLLOWUP,
  FOLLOWUP_MAX_LENGTH,
  OPEN_MAX_LENGTH,
  OPEN_QUESTIONS,
  OPEN_REQUIRED_HINT,
  RANK_REASON,
  RANK_TASK,
  USAGE_MANIPULATION_CHECK,
  validateRanking,
} from "@/lib/posttest";

/** 사후 파트가 공유하는 제출 처리 */
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

function Textarea({
  id,
  label,
  placeholder,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm leading-relaxed font-medium break-keep">
        {label}
        <span className="ml-1 text-accent">*</span>
      </label>
      {hint && <p className="mt-1 text-xs text-muted break-keep">{hint}</p>}
      <textarea
        id={id}
        rows={4}
        maxLength={OPEN_MAX_LENGTH}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2.5 w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent"
      />
      <p className="mt-1 text-right text-[11px] text-muted tabular-nums">
        {value.length} / {OPEN_MAX_LENGTH}
      </p>
    </div>
  );
}

// 4-1 조작점검 ---------------------------------------------------------------

export function UsageCheckForm() {
  const { submit, pending, error } = useSubmit("check");
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <div>
      <fieldset className="rounded-xl border border-line bg-card p-4 sm:p-5">
        <legend className="px-1 text-xs font-bold text-accent">3-4</legend>
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

      <ErrorLine error={error} />
      <Submit
        onClick={() => answer && submit({ answer })}
        disabled={!answer}
        pending={pending}
        label="다음"
        blockedLabel="하나를 골라 주세요"
      />
    </div>
  );
}

// 4-2 순위 + 선택 이유 --------------------------------------------------------

/**
 * 화면 미리보기는 서버에서 만들어 넘겨준다 (자극물 렌더링에 배정 정보가 필요하므로).
 * 참여자에게는 근거유형 이름 대신 추천 화면 1·2·3 만 보인다.
 */
export function RankingForm({ previews }: { previews: ReactNode[] }) {
  const { submit, pending, error } = useSubmit("ranking");
  const [ranks, setRanks] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");

  /** 같은 순위를 다른 화면이 쓰고 있으면 그쪽에서 뺀다 (1열당 응답 1개) */
  function pick(step: number, rank: number) {
    setRanks((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (Number(k) !== step && next[Number(k)] === rank) delete next[Number(k)];
      }
      next[step] = rank;
      return next;
    });
  }

  const rankValid = validateRanking(ranks).ok;
  const complete = rankValid && reason.trim().length > 0;

  return (
    <div>
      <fieldset className="rounded-xl border border-line bg-card p-4 sm:p-5">
        <legend className="px-1 text-xs font-bold text-accent">4-1</legend>
        <p className="text-sm leading-relaxed font-medium break-keep">{RANK_TASK.question}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted break-keep">{RANK_TASK.help}</p>

        <div className="mt-5 space-y-5">
          {previews.map((preview, i) => {
            const step = i + 1;
            return (
              <div key={step} className="rounded-xl border border-line p-3">
                <p className="mb-2.5 text-sm font-bold">추천 화면 {step}</p>
                <div className="mb-3">{preview}</div>
                <div
                  role="radiogroup"
                  aria-label={"추천 화면 " + step + " 순위"}
                  className="grid grid-cols-3 gap-2"
                >
                  {RANK_TASK.ranks.map((r) => (
                    <label
                      key={r}
                      className={
                        "cursor-pointer rounded-lg border py-2.5 text-center text-sm font-medium transition " +
                        (ranks[step] === r
                          ? "border-accent bg-accent text-white"
                          : "border-line hover:border-muted/50")
                      }
                    >
                      <input
                        type="radio"
                        name={"rank-" + step}
                        checked={ranks[step] === r}
                        onChange={() => pick(step, r)}
                        className="sr-only"
                      />
                      {r}위
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* 선택 이유 — 순위 바로 아래, 같은 화면에서 받는다 */}
      <div className="mt-4 rounded-xl border border-line bg-card p-4 sm:p-5">
        <Textarea
          id={RANK_REASON.id}
          label={RANK_REASON.label}
          placeholder={RANK_REASON.placeholder}
          value={reason}
          onChange={setReason}
          hint={OPEN_REQUIRED_HINT}
        />
      </div>

      <ErrorLine error={error} />
      <Submit
        onClick={() => complete && submit({ ranks, reason })}
        disabled={!complete}
        pending={pending}
        label="다음"
        blockedLabel={rankValid ? "선택 이유를 적어 주세요" : "세 화면에 1~3위를 매겨 주세요"}
      />
    </div>
  );
}

// 4-3 주관식 ------------------------------------------------------------------

export function OpenEndedForm() {
  const { submit, pending, error } = useSubmit("open");
  const [values, setValues] = useState<Record<string, string>>({});

  const missing = OPEN_QUESTIONS.filter((q) => !(values[q.id] ?? "").trim());

  return (
    <div className="space-y-4">
      {OPEN_QUESTIONS.map((q, i) => (
        <div key={q.id} className="rounded-xl border border-line bg-card p-4 sm:p-5">
          <p className="mb-1.5 text-xs font-bold text-accent">4-2-{i + 1}</p>
          <Textarea
            id={q.id}
            label={q.label}
            placeholder={q.placeholder}
            value={values[q.id] ?? ""}
            onChange={(v) => setValues((p) => ({ ...p, [q.id]: v }))}
            hint={OPEN_REQUIRED_HINT}
          />
        </div>
      ))}

      <ErrorLine error={error} />
      <Submit
        onClick={() => missing.length === 0 && submit({ open: values })}
        disabled={missing.length > 0}
        pending={pending}
        label="응답 마치기"
        blockedLabel="필수 문항을 채워 주세요"
      />
    </div>
  );
}

// 후속 인터뷰 모집 (완료 화면) ------------------------------------------------

export function FollowupForm({ initial }: { initial: Record<string, string | null> }) {
  const [values, setValues] = useState<Record<string, string>>({
    followup_email: initial.followup_email ?? "",
    followup_phone: initial.followup_phone ?? "",
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const any = Object.values(values).some((v) => v.trim().length > 0);

  async function save() {
    if (!any || state === "saving") return;
    setState("saving");
    try {
      const res = await fetch("/api/session/followup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-line bg-card p-4 sm:p-5">
      <h2 className="text-sm font-bold">{FOLLOWUP.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted break-keep">{FOLLOWUP.body}</p>

      <div className="mt-4 space-y-3">
        {FOLLOWUP.fields.map((f) => (
          <div key={f.id}>
            <label htmlFor={f.id} className="block text-xs font-medium text-muted">
              {f.label}
            </label>
            <input
              id={f.id}
              type={f.type}
              value={values[f.id] ?? ""}
              maxLength={FOLLOWUP_MAX_LENGTH}
              placeholder={f.placeholder}
              onChange={(e) => {
                setValues((p) => ({ ...p, [f.id]: e.target.value }));
                setState("idle");
              }}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted break-keep">{FOLLOWUP.note}</p>

      <button
        type="button"
        onClick={save}
        disabled={!any || state === "saving" || state === "saved"}
        className="mt-3 w-full rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {state === "saving"
          ? "저장 중…"
          : state === "saved"
            ? "제출되었습니다 · 감사합니다"
            : any
              ? "연락처 남기기"
              : "이메일 또는 휴대전화를 입력해 주세요"}
      </button>

      {state === "error" && (
        <p role="alert" className="mt-2 text-sm text-accent">
          저장에 실패했습니다. 다시 시도해 주세요.
        </p>
      )}
    </section>
  );
}
