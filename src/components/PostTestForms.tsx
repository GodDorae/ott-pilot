"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode, useEffect } from "react";
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
import { postJson } from "@/lib/client-api";
import ScaleRow from "./ScaleRow";
import { COUNTERFACTUAL, PRICE_CHECK } from "@/lib/checks";
import { CLabel } from "@/components/Notice";

/** 사후 파트가 공유하는 제출 처리 */
/** 사후 문항 각 파트의 다음 화면 — 미리 받아 두는 데 쓴다 */
const NEXT_AFTER: Record<string, string> = {
  check: "/post/ranking",
  ranking: "/post/open",
  open: "/done",
};

function useSubmit(part: string) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 답하는 동안 다음 화면을 받아 둔다 — 버튼을 눌렀을 때 기다릴 것이 저장뿐이게
  useEffect(() => {
    const next = NEXT_AFTER[part];
    if (next) router.prefetch(next);
  }, [router, part]);

  async function submit(payload: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const r = await postJson("/api/session/posttest", { part, ...payload });
      if (!r.ok) throw new Error(r.error);
      router.push((r.data.next as string) ?? "/done");
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
  code,
  required = true,
}: {
  id: string;
  label: string;
  /** 선택 입력이면 false — 별표를 붙이지 않는다 */
  required?: boolean;
  /** 문항 코드 (4-2-1 …) */
  code?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      {code && <CLabel className="text-accent">{code}</CLabel>}
      <label htmlFor={id} className="block text-sm leading-relaxed font-medium break-keep">
        {label}
        {required && (
          <span className="ml-0.5 text-required" aria-hidden>
            *
          </span>
        )}
      </label>
      {hint && <p className="mt-1 text-xs text-muted break-keep">{hint}</p>}
      <textarea
        id={id}
        rows={4}
        maxLength={OPEN_MAX_LENGTH}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pretty-scroll mt-2.5 w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent"
      />
      <p className="mt-1 text-right text-[11px] text-muted tabular-nums">
        {value.length} / {OPEN_MAX_LENGTH}
      </p>
    </div>
  );
}

// 4-1 조작점검 ---------------------------------------------------------------

export function UsageCheckForm({
  condition,
  pilot,
}: {
  condition: "SVOD" | "TVOD";
  /** 파일럿에서만 금액 점검을 묻는다 */
  pilot: boolean;
}) {
  const { submit, pending, error } = useSubmit("check");
  const [answer, setAnswer] = useState<string | null>(null);
  // 금액 점검은 개별 대여 조건에서만 뜻이 있다 — 구독 조건은 금액을 본 적이 없다
  const askPrice = pilot && condition === "TVOD";
  const [realistic, setRealistic] = useState<number | null>(null);
  const [burden, setBurden] = useState<number | null>(null);
  const [priceReason, setPriceReason] = useState("");
  const [counterfactual, setCounterfactual] = useState("");

  const priceDone = !askPrice || (realistic !== null && burden !== null);
  const complete = Boolean(answer) && priceDone && counterfactual.trim().length > 0;

  return (
    <div>
      <div className="card-shadow rounded-xl border border-line bg-card p-4 sm:p-5">
        <CLabel className="text-accent">3-4-1</CLabel>
        <p className="q-text text-sm leading-relaxed font-medium break-keep">
          {USAGE_MANIPULATION_CHECK.question}
          <span className="ml-0.5 text-required" aria-hidden>
            *
          </span>
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
      </div>

      {/* 금액 점검 — 개별 대여 조건, 파일럿 전용. 두 가지를 묻는 것이라 척도를 나눈다 */}
      {askPrice && (
        <div className="mt-4 space-y-2.5">
          <ScaleRow
            code="3-4-2"
            name="price-realistic"
            label={PRICE_CHECK.realistic}
            value={realistic}
            onChange={setRealistic}
          />
          <ScaleRow
            code="3-4-3"
            name="price-burden"
            label={PRICE_CHECK.burden}
            value={burden}
            onChange={setBurden}
          />
          <div className="card-shadow rounded-xl border border-line bg-card px-4 py-4 sm:px-5">
            <Textarea
              code="3-4-4"
              required={false}
              id="price_reason"
              label={PRICE_CHECK.reasonLabel}
              placeholder={PRICE_CHECK.reasonPlaceholder}
              value={priceReason}
              onChange={setPriceReason}
            />
          </div>
        </div>
      )}

      {/* 반대 조건을 가정하게 한다 — 이용 방식이 '이유를 확인하려는 욕구' 에 어떻게 걸리는지 */}
      <div className="card-shadow mt-2.5 rounded-xl border border-line bg-card px-4 py-4 sm:px-5">
        <Textarea
          code="3-4-5"
          id="counterfactual_info"
          label={COUNTERFACTUAL.question(condition)}
          placeholder={COUNTERFACTUAL.placeholder}
          value={counterfactual}
          onChange={setCounterfactual}
          hint={OPEN_REQUIRED_HINT}
        />
      </div>

      <ErrorLine error={error} />
      <Submit
        onClick={() =>
          complete &&
          submit({
            answer,
            priceRealistic: realistic,
            priceBurden: burden,
            priceReason: priceReason.trim() || null,
            counterfactualInfo: counterfactual.trim(),
          })
        }
        disabled={!complete}
        pending={pending}
        label="다음"
        blockedLabel={!answer ? "하나를 골라 주세요" : "남은 문항에 답해 주세요"}
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
      <div className="card-shadow rounded-xl border border-line bg-card p-4 sm:p-5">
        <CLabel className="text-accent">4-1</CLabel>
        <p className="text-sm leading-relaxed font-medium break-keep">{RANK_TASK.question}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted break-keep">{RANK_TASK.help}</p>

        {/*
          세 화면을 나란히 놓는 것은 셋 다 제 크기로 들어갈 만큼 넓을 때만이다.
          어중간한 폭에서 3열로 나누면 목업이 270px 로 줄고 배너 글자가 8px 이 된다 —
          비교하라고 나란히 놓았는데 정작 무엇이 다른지 안 보인다. 그럴 바엔 쌓는다.
        */}
        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          {previews.map((preview, i) => {
            const step = i + 1;
            return (
              // 좁은 화면에서는 테두리·여백을 걷어낸다 — 겹겹이 쌓인 안쪽 여백이
              // 목업 폭을 그만큼 깎는다
              <div
                key={step}
                className="flex flex-col rounded-xl sm:border sm:border-line sm:p-3"
              >
                <p className="mb-2.5 text-sm font-bold">추천 화면 {step}</p>
                {/*
                  좁은 화면에서는 목업만 카드 여백 밖으로 내보낸다 — 바깥 카드(p-4)와
                  본문 여백(px-5)이 겹쳐 목업 폭을 40px 넘게 깎고 있었다.
                */}
                <div className="-mx-4 mb-3 flex-1 sm:mx-0">{preview}</div>
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
      </div>

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
        <div key={q.id} className="card-shadow rounded-xl border border-line bg-card p-4 sm:p-5">
          <CLabel className="text-accent">4-2-{i + 1}</CLabel>
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
      const r = await postJson("/api/session/followup", values);
      if (!r.ok) throw new Error(r.error);
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
