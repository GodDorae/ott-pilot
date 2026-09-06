"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GENRES, GENRE_LABELS, type Genre } from "@/lib/experiment";
import { DISPLAY_NAME_MAX } from "@/lib/copy";

export default function GenrePicker({
  initial,
  initialName,
}: {
  initial: Genre | null;
  initialName: string | null;
}) {
  const router = useRouter();
  const [genre, setGenre] = useState<Genre | null>(initial);
  const [name, setName] = useState(initialName ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function next() {
    if (!genre || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/session/genre", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ genre, displayName: name }),
      });
      if (!res.ok) throw new Error("장르를 저장할 수 없습니다.");
      router.push("/stimulus/1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "장르를 저장할 수 없습니다.");
      setPending(false);
    }
  }

  const shown = name.trim() || "회원";

  return (
    <div className="space-y-6">
      {/* 호칭 — 자극물 화면의 프로필·인사말·레일 제목에 쓰인다 */}
      <div className="rounded-xl border border-line bg-card p-4 sm:p-5">
        <label htmlFor="displayName" className="block text-sm font-bold">
          화면에 표시될 호칭
          <span className="ml-1.5 text-xs font-normal text-muted">
            (선택 · 최대 {DISPLAY_NAME_MAX}글자)
          </span>
        </label>
        <p className="mt-1.5 text-xs leading-relaxed text-muted break-keep">
          다음 화면들이 실제 서비스처럼 보이도록 쓰입니다. 실명이 아니어도 되고,
          비워 두셔도 됩니다.
        </p>
        <input
          id="displayName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={DISPLAY_NAME_MAX}
          placeholder="예: 건빵, 수리"
          className="mt-3 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <p className="mt-2 text-xs text-muted">
          화면에는 <strong className="text-fg">{shown}님</strong> 으로 표시됩니다.
        </p>
      </div>

      <div>
        <p className="mb-2.5 text-sm font-bold">평소 즐겨 보는 장르</p>
        <div className="grid grid-cols-2 gap-2.5">
        {GENRES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGenre(g)}
            aria-pressed={genre === g}
            className={
              "rounded-xl border px-4 py-5 text-sm font-medium transition " +
              (genre === g
                ? "border-accent bg-accent text-white"
                : "border-line bg-card hover:border-muted/50")
            }
          >
            {GENRE_LABELS[g]}
          </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={next}
        disabled={!genre || pending}
        className="w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {pending ? "이동 중…" : genre ? "다음" : "장르를 골라 주세요"}
      </button>
    </div>
  );
}
