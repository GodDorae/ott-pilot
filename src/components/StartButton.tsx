"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 연구참여 동의 → 세션 시작(=배정 확정) → 첫 사전 문항으로.
 * 동의 체크 시점이 participants.consent_agreed_at 에 기록된다.
 */
export default function StartButton() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!agreed || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/session/start", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "세션을 시작할 수 없습니다.");
      router.push("/survey/demographics");
    } catch (e) {
      setError(e instanceof Error ? e.message : "세션을 시작할 수 없습니다.");
      setPending(false);
    }
  }

  return (
    <>
      <label
        className={
          "flex cursor-pointer items-start gap-2.5 rounded-xl border p-4 text-sm leading-relaxed break-keep transition " +
          (agreed ? "border-accent bg-accent/5" : "border-line bg-card")
        }
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 accent-[var(--accent)]"
        />
        <span>
          위 내용을 모두 읽고 이해하였으며, 연구 참여에 동의합니다.
          <span className="ml-1 text-required" aria-hidden>*</span>
        </span>
      </label>

      <button
        type="button"
        onClick={start}
        disabled={!agreed || pending}
        className="mt-3 w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {pending ? "준비 중…" : agreed ? "설문 시작하기" : "동의 후 시작할 수 있습니다"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-accent">
          {error}
        </p>
      )}
    </>
  );
}
