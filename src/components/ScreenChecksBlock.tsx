"use client";

import ChoiceRow from "./ChoiceRow";
import { MC_RATIONALE, type McRationaleAnswer } from "@/lib/checks";

export type ScreenChecks = {
  mcRationale: McRationaleAnswer | null;
};

export const EMPTY_SCREEN_CHECKS: ScreenChecks = {
  mcRationale: null,
};

/** 이 화면의 조작점검이 다 채워졌는지 */
export function screenChecksDone(c: ScreenChecks): boolean {
  return Boolean(c.mcRationale);
}

/**
 * 화면 단위 조작점검 — PU·RA 뒤에 붙는다.
 *
 * 측정 문항과 같은 카드를 쓴다. 조작점검만 다른 상자에 담으면 "여기부터는 검사다"가
 * 드러나 답이 달라진다.
 */
export default function ScreenChecksBlock({
  startNo,
  value,
  onChange,
}: {
  /** 이 묶음의 첫 문항 번호 — 위쪽 문항들에서 이어진다 */
  startNo: number;
  value: ScreenChecks;
  onChange: (patch: Partial<ScreenChecks>) => void;
}) {
  return (
    <ChoiceRow
      no={startNo}
      name="mc-rationale"
      label={MC_RATIONALE.question}
      options={MC_RATIONALE.options}
      value={value.mcRationale}
      onChange={(v) => onChange({ mcRationale: v as McRationaleAnswer })}
    />
  );
}
