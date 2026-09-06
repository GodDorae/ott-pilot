"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GENRES, GENRE_LABELS, type Genre } from "@/lib/experiment";
import { DISPLAY_NAME_MAX } from "@/lib/copy";
import type { Title } from "@/lib/stimuli";
import { postJson } from "@/lib/client-api";

/**
 * 2-2 개인화 화면 — 호칭 · 선호 장르 · 시청 경험 확인
 *
 * 장르를 고르면 그 장르에서 보게 될 12편이 나오고, 본 적 있는 작품을 고르게 한다.
 * 이 작품들은 '이미 알고 있으면 안 된다'는 기준으로 고른 것이라, 그 가정이 참여자마다
 * 실제로 성립하는지 확인해야 평가가 추천 근거 때문인지 원래 아는 작품이라 그런지 갈라진다.
 *
 * 목록은 서버에서 통째로 받아 둔다 — 장르를 바꿀 때마다 요청하면 화면이 끊긴다.
 */
export default function GenrePicker({
  initial,
  initialName,
  initialSeen,
  titlesByGenre,
}: {
  initial: Genre | null;
  initialName: string | null;
  initialSeen: string[] | null;
  titlesByGenre: Record<Genre, Title[]>;
}) {
  const router = useRouter();
  const [genre, setGenre] = useState<Genre | null>(initial);
  const [name, setName] = useState(initialName ?? "");
  const [seen, setSeen] = useState<string[]>(initialSeen ?? []);
  /** '본 작품 없음'을 눌렀는지 — 빈 배열과 미응답을 구분하기 위해 별도로 둔다 */
  const [noneSeen, setNoneSeen] = useState((initialSeen?.length ?? -1) === 0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titles = genre ? titlesByGenre[genre] : [];
  const answeredSeen = noneSeen || seen.length > 0;
  const complete = genre !== null && answeredSeen;

  function chooseGenre(g: Genre) {
    setGenre(g);
    // 장르가 바뀌면 이전 장르의 작품 선택은 의미가 없다
    setSeen([]);
    setNoneSeen(false);
  }

  function toggleTitle(id: string) {
    setNoneSeen(false);
    setSeen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function next() {
    if (!complete || pending) return;
    setPending(true);
    setError(null);
    try {
      const r = await postJson("/api/session/genre", {
        genre,
        displayName: name,
        seenTitleIds: noneSeen ? [] : seen,
      });
      if (!r.ok) throw new Error(r.error);
      router.push("/stimulus/1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장할 수 없습니다.");
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
          다음 화면들이 실제 서비스처럼 보이도록 쓰입니다. 실명이 아니어도 되고, 비워 두셔도
          됩니다.
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

      {/* 선호 장르 */}
      <div>
        <p className="mb-2.5 text-sm font-bold">
          평소 즐겨 보는 장르<span className="ml-1 text-accent">*</span>
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => chooseGenre(g)}
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

      {/* 시청 경험 확인 — 장르를 고르면 나타난다 */}
      {genre && (
        <fieldset className="rounded-xl border border-line bg-card p-4 sm:p-5">
          <legend className="px-1 text-sm font-bold">
            이 중 본 적 있는 작품<span className="ml-1 text-accent">*</span>
          </legend>
          <p className="mt-1.5 text-xs leading-relaxed text-muted break-keep">
            {GENRE_LABELS[genre]} 작품 {titles.length}편입니다. 이미 보신 작품을 모두 골라
            주세요. 없으면 아래 &lsquo;본 작품이 없습니다&rsquo;를 눌러 주세요.
          </p>

          <div className="mt-4 space-y-2">
            {titles.map((t) => (
              <label
                key={t.id}
                className={
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm leading-relaxed break-keep transition " +
                  (seen.includes(t.id)
                    ? "border-accent bg-accent/5"
                    : "border-line hover:border-muted/50")
                }
              >
                <input
                  type="checkbox"
                  checked={seen.includes(t.id)}
                  onChange={() => toggleTitle(t.id)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <span>{t.title}</span>
              </label>
            ))}
          </div>

          <label
            className={
              "mt-3 flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm font-medium break-keep transition " +
              (noneSeen ? "border-accent bg-accent/5" : "border-line hover:border-muted/50")
            }
          >
            <input
              type="checkbox"
              checked={noneSeen}
              onChange={(e) => {
                setNoneSeen(e.target.checked);
                if (e.target.checked) setSeen([]);
              }}
              className="accent-[var(--accent)]"
            />
            <span>본 작품이 없습니다</span>
          </label>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={next}
        disabled={!complete || pending}
        className="w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {pending
          ? "이동 중…"
          : !genre
            ? "장르를 골라 주세요"
            : !answeredSeen
              ? "본 적 있는 작품을 표시해 주세요"
              : "다음"}
      </button>
    </div>
  );
}
