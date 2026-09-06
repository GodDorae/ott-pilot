"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GENRES, GENRE_LABELS, type Genre } from "@/lib/experiment";
import { DISPLAY_NAME_MAX } from "@/lib/copy";
import {
  FAMILIARITY_LEVELS,
  FAMILIARITY_QUESTION,
  type FamiliarityLevel,
  type Title,
} from "@/lib/stimuli";
import { postJson } from "@/lib/client-api";

/**
 * 2-2 개인화 화면 — 호칭 · 선호 장르 · 시청 경험 확인
 *
 * 장르를 고르면 그 장르에서 보게 될 12편이 나오고, 각 작품을 얼마나 아는지 3단계로 받는다.
 * 이 작품들은 '이미 알고 있으면 안 된다'는 기준으로 고른 것이라, 그 가정이 참여자마다
 * 실제로 성립하는지 확인해야 평가가 추천 근거 때문인지 원래 아는 작품이라 그런지 갈라진다.
 *
 * 12편 전부에 답하게 한다 — 고르지 않은 것을 '모른다'로 치면 무응답과 구분되지 않는다.
 *
 * 목록은 서버에서 통째로 받아 둔다 — 장르를 바꿀 때마다 요청하면 화면이 끊긴다.
 */
export default function GenrePicker({
  initial,
  initialName,
  initialFamiliarity,
  titlesByGenre,
}: {
  initial: Genre | null;
  initialName: string | null;
  initialFamiliarity: Record<string, FamiliarityLevel> | null;
  titlesByGenre: Record<Genre, Title[]>;
}) {
  const router = useRouter();
  const [genre, setGenre] = useState<Genre | null>(initial);
  const [name, setName] = useState(initialName ?? "");
  const [familiarity, setFamiliarity] = useState<Record<string, FamiliarityLevel>>(
    initialFamiliarity ?? {},
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titles = genre ? titlesByGenre[genre] : [];
  const remaining = titles.filter((t) => !familiarity[t.id]).length;
  const complete = genre !== null && remaining === 0;

  function chooseGenre(g: Genre) {
    setGenre(g);
    // 장르가 바뀌면 이전 장르의 작품 응답은 의미가 없다
    setFamiliarity({});
  }

  async function next() {
    if (!complete || pending) return;
    setPending(true);
    setError(null);
    try {
      const r = await postJson("/api/session/genre", {
        genre,
        displayName: name,
        familiarity,
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
            {FAMILIARITY_QUESTION}
            <span className="ml-1 text-accent">*</span>
          </legend>
          <p className="mt-1.5 text-xs leading-relaxed text-muted break-keep">
            {GENRE_LABELS[genre]} 작품 {titles.length}편입니다. 작품마다 하나씩 골라 주세요.
          </p>

          {/*
            넓은 화면은 표(제목 | 3단계), 좁은 화면은 제목 아래 버튼 세 개.
            sm:contents 로 같은 마크업을 두 배치에 그대로 쓴다 — 좁은 화면에서는
            보기 라벨이 각 줄에 붙고, 넓은 화면에서는 맨 위 머리글 한 번으로 끝난다.
          */}
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <div className="hidden bg-bg sm:grid sm:grid-cols-[1fr_repeat(3,7.5rem)] sm:items-center sm:gap-2 sm:border-b sm:border-line sm:px-3 sm:py-2.5">
              <span />
              {FAMILIARITY_LEVELS.map((l) => (
                <span key={l.value} className="text-center text-xs font-medium text-muted">
                  {l.label}
                </span>
              ))}
            </div>

            {titles.map((t, i) => (
              <div
                key={t.id}
                className={
                  "grid gap-2 px-3 py-3 sm:grid-cols-[1fr_repeat(3,7.5rem)] sm:items-center " +
                  (i > 0 ? "border-t border-line " : "") +
                  (familiarity[t.id] ? "bg-accent/5" : "")
                }
              >
                <p className="text-sm leading-relaxed font-medium break-keep">{t.title}</p>
                <div className="flex gap-2 sm:contents">
                  {FAMILIARITY_LEVELS.map((l) => (
                    <label
                      key={l.value}
                      className={
                        "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2 text-center text-[11px] leading-tight break-keep transition sm:border-0 sm:bg-transparent sm:p-0 " +
                        (familiarity[t.id] === l.value
                          ? "border-accent bg-accent/10"
                          : "border-line hover:border-muted/50")
                      }
                    >
                      <input
                        type="radio"
                        name={t.id}
                        value={l.value}
                        checked={familiarity[t.id] === l.value}
                        onChange={() => setFamiliarity((p) => ({ ...p, [t.id]: l.value }))}
                        aria-label={t.title + " — " + l.label}
                        className="accent-[var(--accent)]"
                      />
                      <span className="sm:hidden">{l.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
            : remaining > 0
              ? "남은 작품 " + remaining + "편"
              : "다음"}
      </button>
    </div>
  );
}
