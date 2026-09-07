"use client";

import { LIKERT_LABELS, LIKERT_MAX, LIKERT_MIN } from "@/lib/items";

const SCALE = Array.from({ length: LIKERT_MAX - LIKERT_MIN + 1 }, (_, i) => LIKERT_MIN + i);

/** 양 끝과 가운데만 적는다 — 1·3·5 가 고정되면 2·4 는 그 사이로 읽힌다 */
const ANCHORS = [
  LIKERT_LABELS[0],
  LIKERT_LABELS[Math.floor(LIKERT_LABELS.length / 2)],
  LIKERT_LABELS[LIKERT_LABELS.length - 1],
] as const;

/**
 * 5점 척도 보기 한 줄 — 이 조사의 모든 척도 문항이 같은 것을 쓴다.
 *
 * 눈금 아래가 아니라 **위**에 라벨을 둔다. 아래에 두면 다음 문항의 제목과 붙어 보여
 * 어느 문항에 걸린 라벨인지 헷갈린다.
 *
 * 숫자 칸은 라디오 입력을 숨긴 label 이다 (.likert-cell). 버튼으로 만들면 키보드
 * 이동과 스크린리더에서 "5개 중 하나" 라는 관계가 사라진다.
 */
export default function LikertScale({
  name,
  label,
  value,
  onChange,
}: {
  /** 라디오 묶음 이름 — 문항마다 달라야 한다 */
  name: string;
  /** aria-label 용 문항 전문 */
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex text-[10.5px] leading-tight text-faint">
        <span className="flex-1 text-left break-keep">{ANCHORS[0]}</span>
        <span className="flex-1 text-center break-keep">{ANCHORS[1]}</span>
        <span className="flex-1 text-right break-keep">{ANCHORS[2]}</span>
      </div>

      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
        {SCALE.map((n) => (
          <label key={n} className="likert-cell relative" title={LIKERT_LABELS[n - LIKERT_MIN]}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              aria-label={LIKERT_LABELS[n - LIKERT_MIN]}
            />
            <span>{n}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * 척도 안내 — 문항 묶음 맨 위에 한 번.
 *
 * 문항 옆에는 숫자 1~5 와 양 끝·가운데 라벨만 나온다. 2·4 가 무엇인지 확인할 곳이
 * 같은 화면에 있어야 하므로, 다섯 단계를 모두 적은 상자를 안내 카드에 넣는다.
 */
export function LikertScaleGuide({ className = "" }: { className?: string }) {
  return (
    <div className={"rounded-lg bg-surface px-4 py-3 " + className}>
      <p className="text-xs font-semibold text-muted">5점 척도</p>
      <ul className="mt-1 space-y-0.5 text-xs text-muted">
        {LIKERT_LABELS.map((label, i) => (
          <li key={label} className="break-keep">
            <span className="tabular-nums">{LIKERT_MIN + i}번</span> {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
