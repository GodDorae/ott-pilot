"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { postJson } from "@/lib/client-api";
import { CountdownHint, useCountdown } from "./Countdown";
import { MIN_DWELL_SECONDS } from "@/lib/pacing";
import ScaleRow from "./ScaleRow";
import { BRIEF_UNDERSTOOD } from "@/lib/checks";

/**
 * 3단계 안내를 읽고 넘어가는 버튼.
 *
 * 넘어간 시각을 서버에 남긴 다음에야 첫 자극물로 이동한다 — 기록이 남지 않으면
 * 흐름 가드가 이 화면을 건너뛴 것으로 보아 다시 여기로 돌려보낸다.
 */
export default function BriefContinue({
  skipWait = false,
  pilot,
}: {
  skipWait?: boolean;
  /** 파일럿에서만 이해도를 묻는다 */
  pilot: boolean;
}) {
  const router = useRouter();
  // 이 화면이 이용조건 조작을 전달한다 — 읽지 않고 지나가면 조건이 걸리지 않는다
  const { remaining, done: waited } = useCountdown(
    skipWait ? 0 : MIN_DWELL_SECONDS.brief,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [understood, setUnderstood] = useState<number | null>(null);
  const answered = !pilot || understood !== null;

  /*
    다음 화면을 미리 받아 둔다 — 안내를 읽는 최소 5초 동안 받아 둘 수 있다.
    참여자가 문항에 답하는 동안 받아 두면, 버튼을 눌렀을 때 기다릴 것이 저장뿐이다.
  */
  useEffect(() => {
    router.prefetch("/stimulus/1");
  }, [router]);


  async function go() {
    if (!waited || !answered || pending) return;
    setPending(true);
    setError(null);
    const r = await postJson("/api/session/brief", { briefUnderstood: understood });
    if (!r.ok) {
      setError(r.error);
      setPending(false);
      return;
    }
    router.push((r.data.next as string) ?? "/stimulus/1");
  }

  return (
    <>
      {/* 안내를 읽고 이해했는지 — 조작이 전달됐는지 보려는 것이라 안내 바로 아래에 둔다 */}
      {pilot && (
        <div className="mb-4">
          <ScaleRow
            code="3-0"
            name="brief-understood"
            label={BRIEF_UNDERSTOOD.question}
            value={understood}
            onChange={setUnderstood}
          />
        </div>
      )}

      <button
        type="button"
        onClick={go}
        disabled={!waited || !answered || pending}
        className="w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {pending
          ? "이동 중…"
          : !answered
            ? "위 문항에 답해 주세요"
            : !waited
              ? "잠시 후 넘어갈 수 있습니다"
              : "이해했습니다, 추천 화면 보기"}
      </button>
      <CountdownHint remaining={remaining} done={waited} />

      {error && (
        <p role="alert" className="mt-3 text-sm text-accent">
          {error}
        </p>
      )}
    </>
  );
}
