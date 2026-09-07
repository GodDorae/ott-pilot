"use client";

import QuestionCard from "./QuestionCard";
import LikertScale from "./LikertScale";
import type { LikertItem } from "@/lib/items";

/**
 * 리커트 문항 한 묶음 — 문항마다 카드 하나.
 *
 * 구성개념별 소제목을 달지 않는다. 유용성·성실성·수용의도가 겉보기로 갈리면
 * 참여자가 "여기부터는 다른 걸 묻는구나"를 알아차려 묶음마다 다른 기준으로 답하고,
 * 성실성 확인 문항도 눈에 띄어 변별력을 잃는다. 카드는 일곱 개가 모두 똑같이 생겼다.
 *
 * 번호는 카드 라벨이 아니라 문항 글 앞에 붙인다. 라벨 자리에 두면 번호가 없는
 * 성실성 확인 문항만 라벨 줄이 비어 그 카드가 눈에 띈다 — 문장 앞의 "1." 하나가
 * 빠지는 것과는 다른 크기의 단서다.
 */
export default function LikertBlock({
  items,
  values,
  onChange,
}: {
  items: LikertItem[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <QuestionCard key={item.key} required no={item.no} question={item.text}>
          <LikertScale
            name={item.key}
            label={item.text}
            value={values[item.key] ?? null}
            onChange={(v) => onChange(item.key, v)}
          />
        </QuestionCard>
      ))}
    </>
  );
}
