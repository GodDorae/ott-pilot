"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LikertBlock from "./LikertBlock";
import ScreenChecksBlock, {
  EMPTY_SCREEN_CHECKS,
  screenChecksDone,
  type ScreenChecks,
} from "./ScreenChecksBlock";
import { ALL_ITEMS, ATTENTION_CHECK, TRIAL_ITEMS } from "@/lib/items";
import { TOTAL_STEPS } from "@/lib/experiment";
import { postJson } from "@/lib/client-api";
import { CountdownHint, useCountdown } from "./Countdown";
import { MIN_DWELL_SECONDS } from "@/lib/pacing";

/**
 * Trial 별 종속변수 문항 폼 (유용성 3 + 수용의도 3).
 * 근거유형·세트는 서버가 배정에서 유도하므로 여기서는 stepIndex 만 보낸다.
 * 근거유형 조작점검은 trial 마다 묻지 않고 4단계에서 한 번만 확인한다.
 */
export default function StimulusForm({
  stepIndex,
  skipWait = false,
  intro,
}: {
  stepIndex: number;
  /** /dev 미리보기에서는 최소 체류 시간을 기다리지 않는다 */
  skipWait?: boolean;
  /** 문항 위에 함께 스크롤되는 안내 (척도 설명·진행 표시) */
  intro?: React.ReactNode;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, number>>({});
  // 화면 단위 조작점검 (PU·RA 뒤에 붙는다)
  const [checks, setChecks] = useState<ScreenChecks>(EMPTY_SCREEN_CHECKS);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const shownAt = useRef<number | null>(null);

  // 화면이 실제로 표시된 시점 = 체류시간 기준점.
  // 단계별 상태 초기화는 페이지에서 key={stepIndex} 로 리마운트해 처리한다.
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  /*
    다음 화면을 미리 받아 둔다. 최소 체류 10초 + 문항 7개를 답하는 동안 받아 두면,
    버튼을 눌렀을 때 기다릴 것이 저장뿐이다.
  */
  const nextPath =
    stepIndex < TOTAL_STEPS ? "/stimulus/" + (stepIndex + 1) : "/post/check";
  useEffect(() => {
    router.prefetch(nextPath);
  }, [router, nextPath]);

  const answered = ALL_ITEMS.filter((i) => values[i.key]).length;
  const attention = values[ATTENTION_CHECK.key];
  const itemsDone = answered === ALL_ITEMS.length && Boolean(attention);
  const checksDone = screenChecksDone(checks);
  const complete = itemsDone && checksDone;
  const unanswered = ALL_ITEMS.length - answered + (attention ? 0 : 1);

  /*
    문항 번호는 화면 위에서부터 하나로 이어 붙인다 (측정 → 조작점검).
  */
  const checksStartNo = TRIAL_ITEMS.length + 1;

  // 목업을 실제로 볼 시간을 준다 — 문항에는 그 전에도 답할 수 있고, 막히는 건 제출뿐이다
  const { remaining: secondsLeft, done: waited } = useCountdown(
    skipWait ? 0 : MIN_DWELL_SECONDS.stimulus,
  );

  function set(key: string, value: number) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!complete || !waited || pending) return;
    setPending(true);
    setError(null);
    try {
      const r = await postJson("/api/session/screen", {
        stepIndex,
        answers: values,
        attentionCheck: attention ?? null,
        mcRationale: checks.mcRationale,
        dwellMs: shownAt.current === null ? null : Date.now() - shownAt.current,
      });
      if (!r.ok) throw new Error(r.error);
      router.push((r.data.next as string) ?? "/done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    /*
      문항과 제출 줄을 위아래로 나눈다.
      제출 줄이 스크롤 영역 안에 있으면 문항이 그 뒤로 지나가 글자가 버튼에
      반쯤 걸린 채 보인다. 넓은 화면에서는 위쪽만 스크롤하고 버튼은 칸 바닥에 붙는다.
    */
    <>
      <div className="pretty-scroll pane-scroll min-h-0 flex-1 px-5 py-5 wide:overflow-y-auto wide:px-8 wide:py-8">
        <div className="mx-auto w-full max-w-lg space-y-2.5 wide:max-w-none">
          {intro}

          {/* 유용성 3 → 성실성 확인 1 → 수용의도 3 을 한 컨테이너에 이어서 */}
          <LikertBlock items={TRIAL_ITEMS} values={values} onChange={set} />

          <ScreenChecksBlock
            startNo={checksStartNo}
            value={checks}
            onChange={(patch) => setChecks((prev) => ({ ...prev, ...patch }))}
          />

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent"
            >
              {error}
            </p>
          )}
        </div>
      </div>

      {/* 좁은 화면에서는 칸 높이가 정해지지 않아 sticky 로 띄운다 (배경은 불투명) */}
      <div className="sticky bottom-0 shrink-0 border-t border-line bg-bg px-5 py-3 wide:static wide:px-8">
        <div className="mx-auto w-full max-w-lg wide:max-w-none">
          <button
            type="button"
            onClick={submit}
            disabled={!complete || !waited || pending}
            className="w-full rounded-xl bg-accent px-4 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-off-bg disabled:text-off-fg"
          >
            {pending
              ? "저장 중…"
              : !itemsDone
                ? "남은 문항 " + unanswered + "개"
                : !checksDone
                  ? "아래 확인 문항에 답해 주세요"
                  : !waited
                    ? "잠시 후 넘어갈 수 있습니다"
                    : stepIndex < 3
                      ? "평가 완료"
                      : "다음 단계로"}
          </button>
          <CountdownHint remaining={secondsLeft} done={waited} />
        </div>
      </div>
    </>
  );
}
