"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OTHER_MAX_LENGTH, type PreSection } from "@/lib/presurvey";
import { postJson } from "@/lib/client-api";
import { CLabel } from "@/components/Notice";

/** 사전 문항 섹션 하나를 렌더링한다 (A, B 공용) */
export default function PreSurveyForm({
  section,
  initial,
}: {
  section: PreSection;
  /** 뒤로 돌아왔을 때 이전 응답을 되살리기 위한 값 */
  initial: Record<string, string | null>;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const q of section.questions) {
      const v = initial[q.id];
      if (v) seed[q.id] = v;
    }
    return seed;
  });
  const [others, setOthers] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const q of section.questions) {
      if (!q.otherColumn) continue;
      const v = initial[q.otherColumn];
      if (v) seed[q.id] = v;
    }
    return seed;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const missing = section.questions.filter((q) => {
    if (!q.required) return false;
    const v = answers[q.id];
    if (!v) return true;
    if (q.otherColumn && v === q.otherValue) return !(others[q.id] ?? "").trim();
    return false;
  });
  const complete = missing.length === 0;

  async function submit() {
    if (!complete || pending) return;
    setPending(true);
    setError(null);
    try {
      const r = await postJson("/api/session/presurvey", {
        section: section.key,
        answers,
        others,
      });
      if (!r.ok) throw new Error(r.error);
      router.push((r.data.next as string) ?? section.next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {section.questions.map((q) => (
        // 문항 번호는 카드 안 맨 위에 둔다. legend 로 두면 테두리 선 위에
        // 걸쳐 앉아서, 글이 선을 뚫고 나온 것처럼 보인다.
        <div key={q.id} className="card-shadow rounded-xl border border-line bg-card p-4 sm:p-5">
          <CLabel className="text-accent">{q.code}</CLabel>
          <p className="mb-3 text-sm leading-relaxed font-medium break-keep">
            {q.label}
            {q.required && <span className="ml-1 text-accent">*</span>}
          </p>

          <div role="radiogroup" aria-label={q.label} className="space-y-2">
            {q.choices.map((c) => (
              <label
                key={c.value}
                className={
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm leading-relaxed break-keep transition " +
                  (answers[q.id] === c.value
                    ? "border-accent bg-accent/5"
                    : "border-line hover:border-muted/50")
                }
              >
                <input
                  type="radio"
                  name={q.id}
                  value={c.value}
                  checked={answers[q.id] === c.value}
                  onChange={() => setAnswers((p) => ({ ...p, [q.id]: c.value }))}
                  className="accent-[var(--accent)]"
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>

          {/* '기타' 선택 시에만 자유입력을 연다 */}
          {q.otherColumn && answers[q.id] === q.otherValue && (
            <input
              type="text"
              value={others[q.id] ?? ""}
              onChange={(e) => setOthers((p) => ({ ...p, [q.id]: e.target.value }))}
              maxLength={OTHER_MAX_LENGTH}
              placeholder="직접 입력해 주세요"
              aria-label={q.code + " 기타 입력"}
              className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          )}
        </div>
      ))}

      {error && (
        <p role="alert" className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-5 border-t border-line bg-bg/95 px-5 py-3 backdrop-blur">
        <button
          type="button"
          onClick={submit}
          disabled={!complete || pending}
          className="w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
        >
          {pending
            ? "저장 중…"
            : complete
              ? "다음"
              : "남은 문항 " + missing.length + "개"}
        </button>
      </div>
    </div>
  );
}
