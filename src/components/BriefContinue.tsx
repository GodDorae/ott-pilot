"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";

/**
 * 3단계 안내를 읽고 넘어가는 버튼.
 *
 * 넘어간 시각을 서버에 남긴 다음에야 첫 자극물로 이동한다 — 기록이 남지 않으면
 * 흐름 가드가 이 화면을 건너뛴 것으로 보아 다시 여기로 돌려보낸다.
 */
export default function BriefContinue() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (pending) return;
    setPending(true);
    setError(null);
    const r = await postJson("/api/session/brief", {});
    if (!r.ok) {
      setError(r.error);
      setPending(false);
      return;
    }
    router.push((r.data.next as string) ?? "/stimulus/1");
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {pending ? "이동 중…" : "이해했습니다, 추천 화면 보기"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-accent">
          {error}
        </p>
      )}
    </>
  );
}
