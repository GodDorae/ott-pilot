"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LikertBlock from "./LikertBlock";
import { ALL_ITEMS, ATTENTION_CHECK, INTENTION_ITEMS, USEFULNESS_ITEMS } from "@/lib/items";

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
      const res = await fetch("/api/session/screen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stepIndex,
          answers: values,
          attentionCheck: attention ?? null,
          dwellMs: shownAt.current === null ? null : Date.now() - shownAt.current,
        }),
      });
      const data = (await res.json()) as { next?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "저장에 실패했습니다.");
      router.push(data.next ?? "/done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted break-keep">
        위 화면을 보고 느낀 그대로 답해 주세요. 정답은 없습니다.
      </p>

      <LikertBlock
        legend="이 추천이 얼마나 유용하다고 느꼈나요?"
        items={USEFULNESS_ITEMS}
        values={values}
        onChange={set}
      />

      <LikertBlock
        legend="이 추천을 받아들이고 싶은 정도는 어떤가요?"
        items={INTENTION_ITEMS}
        values={values}
        onChange={set}
      />

      {/* 성실성 확인 — 다른 문항과 같은 모양이라야 변별력이 있다 */}
      <LikertBlock
        legend="확인 문항"
        items={[{ key: ATTENTION_CHECK.key, text: ATTENTION_CHECK.text }]}
        values={values}
        onChange={set}
      />

      {error && (
        <p role="alert" className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-5 border-t border-line bg-bg/95 px-5 py-3 backdrop-blur md:-mx-8 md:px-8">
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
  );
}
