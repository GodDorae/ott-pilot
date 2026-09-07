"use client";

import ChoiceRow from "./ChoiceRow";
import ScaleRow from "./ScaleRow";
import ReasonField from "./ReasonField";
import {
  GENRE_FIT,
  MC_RATIONALE,
  SCOPE_UNDERSTOOD,
  WORDING_NATURAL,
  type McRationaleAnswer,
} from "@/lib/checks";
import type { Genre } from "@/lib/experiment";

export type ScreenChecks = {
  mcRationale: McRationaleAnswer | null;
  wordingNatural: number | null;
  wordingReason: string;
  scopeUnderstood: string | null;
  genreFit: number | null;
};

export const EMPTY_SCREEN_CHECKS: ScreenChecks = {
  mcRationale: null,
  wordingNatural: null,
  wordingReason: "",
  scopeUnderstood: null,
  genreFit: null,
};

/** 문구 자연스러움이 낮으면 이유를 받아야 한다 */
export function wordingNeedsReason(v: number | null): boolean {
  return v !== null && v <= WORDING_NATURAL.reasonThreshold;
}

/** 이 화면의 조작점검이 다 채워졌는지 */
export function screenChecksDone(
  c: ScreenChecks,
  opts: { pilot: boolean; firstScreen: boolean },
): boolean {
  if (!c.mcRationale) return false;
  if (!opts.pilot) return true;
  if (c.wordingNatural === null) return false;
  if (wordingNeedsReason(c.wordingNatural) && c.wordingReason.trim().length === 0) return false;
  if (opts.firstScreen && !c.scopeUnderstood) return false;
  if (c.genreFit === null) return false;
  return true;
}

/**
 * 화면 단위 조작점검 — PU·RA 뒤에 붙는다.
 *
 * 근거유형 점검은 늘 묻고, 나머지는 파일럿에서만 묻는다 (문구가 전달되는지 확인하려는 것).
 * 하단 문구 범위 이해는 첫 화면에서만 — 한 번 묻고 나면 그 뒤로는 "전체에 걸린다" 는 것을
 * 알고 보게 되어 두 번째·세 번째 화면의 답이 처음 인상이 아니게 된다.
 *
 * 측정 문항과 같은 카드를 쓴다. 조작점검만 다른 상자에 담으면 "여기부터는 검사다"가
 * 드러나 답이 달라진다.
 */
export default function ScreenChecksBlock({
  startNo,
  value,
  onChange,
  genre,
  pilot,
  firstScreen,
}: {
  /** 이 묶음의 첫 문항 번호 — 위쪽 문항들에서 이어진다 */
  startNo: number;
  value: ScreenChecks;
  onChange: (patch: Partial<ScreenChecks>) => void;
  genre: Genre;
  pilot: boolean;
  firstScreen: boolean;
}) {
  /*
    번호는 실제로 그려지는 것만 세어 이어 붙인다. 파일럿 전용 문항이나 첫 화면 전용
    문항이 빠지는 화면에서 번호가 중간에 뛰면, 참여자에게는 문항이 사라진 것으로 보인다.
  */
  let n = startNo;
  const mcNo = n++;
  const wordingNo = pilot ? n++ : 0;
  const scopeNo = pilot && firstScreen ? n++ : 0;
  const genreNo = pilot ? n++ : 0;

  return (
    <>
      <ChoiceRow
        no={mcNo}
        name="mc-rationale"
        label={MC_RATIONALE.question}
        options={MC_RATIONALE.options}
        value={value.mcRationale}
        onChange={(v) => onChange({ mcRationale: v as McRationaleAnswer })}
      />

      {pilot && (
        <>
          <ScaleRow
            no={wordingNo}
            name="wording-natural"
            label={WORDING_NATURAL.question}
            value={value.wordingNatural}
            onChange={(v) => onChange({ wordingNatural: v })}
          >
            {wordingNeedsReason(value.wordingNatural) && (
              <ReasonField
                id="wording-reason"
                label={WORDING_NATURAL.reasonLabel}
                placeholder={WORDING_NATURAL.reasonPlaceholder}
                value={value.wordingReason}
                onChange={(v) => onChange({ wordingReason: v })}
              />
            )}
          </ScaleRow>

          {firstScreen && (
            <ChoiceRow
              no={scopeNo}
              name="scope-understood"
              label={SCOPE_UNDERSTOOD.question}
              options={SCOPE_UNDERSTOOD.options}
              value={value.scopeUnderstood}
              onChange={(v) => onChange({ scopeUnderstood: v })}
            />
          )}

          <ScaleRow
            no={genreNo}
            name="genre-fit"
            label={GENRE_FIT.question(genre)}
            value={value.genreFit}
            onChange={(v) => onChange({ genreFit: v })}
          />
        </>
      )}
    </>
  );
}
