"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LikertBlock from "./LikertBlock";
import { ALL_ITEMS, ATTENTION_CHECK, TRIAL_ITEMS } from "@/lib/items";
import { postJson } from "@/lib/client-api";

/**
 * Trial 별 종속변수 문항 폼 (유용성 3 + 수용의도 3).
 * 근거유형·세트는 서버가 배정에서 유도하므로 여기서는 stepIndex 만 보낸다.
 * 근거유형 조작점검은 trial 마다 묻지 않고 4단계에서 한 번만 확인한다.
 */
export default function StimulusForm({ stepIndex }: { stepIndex: number }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const shownAt = useRef<number | null>(null);

  // 화면이 실제로 표시된 시점 = 체류시간 기준점.
  // 단계별 상태 초기화는 페이지에서 key={stepIndex} 로 리마운트해 처리한다.
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  const answered = ALL_ITEMS.filter((i) => values[i.key]).length;
  const attention = values[ATTENTION_CHECK.key];
  const complete = answered === ALL_ITEMS.length && Boolean(attention);
  const remaining = ALL_ITEMS.length - answered + (attention ? 0 : 1);

  function set(key: string, value: number) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!complete || pending) return;
    setPending(true);
    setError(null);
    try {
      const r = await postJson("/api/session/screen", {
        stepIndex,
        answers: values,
        attentionCheck: attention ?? null,
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
      <div className="min-h-0 flex-1 px-5 py-5 md:overflow-y-auto md:px-8">
        <div className="mx-auto w-full max-w-lg space-y-4">
          {/* 유용성 3 → 성실성 확인 1 → 수용의도 3 을 한 컨테이너에 이어서 */}
          <LikertBlock items={TRIAL_ITEMS} values={values} onChange={set} />

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
      <div className="sticky bottom-0 shrink-0 border-t border-line bg-bg px-5 py-3 md:static md:px-8">
        <div className="mx-auto w-full max-w-lg">
          <button
            type="button"
            onClick={submit}
            disabled={!complete || pending}
            className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            {pending
              ? "저장 중…"
              : complete
                ? stepIndex < 3
                  ? "평가 완료"
                  : "다음 단계로"
                : "남은 문항 " + remaining + "개"}
          </button>
        </div>
      </div>
    </>
  );
}
