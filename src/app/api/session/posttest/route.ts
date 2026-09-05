import { NextResponse } from "next/server";
import { countTrials, savePostTest } from "@/lib/db";
import { currentParticipant } from "@/lib/session";
import { canSubmitAt } from "@/lib/flow";
import {
  OPEN_MAX_LENGTH,
  OPEN_QUESTIONS,
  RANK_COLUMNS,
  RATIONALE_RECOGNITION_CHECK,
  USAGE_MANIPULATION_CHECK,
  gradeRationaleRecognition,
  validateRanking,
} from "@/lib/posttest";
import { RATIONALE_TYPES, type RationaleType } from "@/lib/experiment";

/**
 * 4단계 사후 문항 저장 — 한 번에 한 파트.
 *
 *   check   4-1 조작점검 (조절변수)
 *   ranking 4-2 순위
 *   open    4-3 주관식
 */
export async function POST(req: Request) {
  const participant = await currentParticipant();
  if (!participant) {
    return NextResponse.json({ error: "세션이 없습니다." }, { status: 401 });
  }

  const body = (await req.json()) as {
    part?: string;
    answer?: string;
    recognized?: string[];
    ranking?: Record<string, number>;
    open?: Record<string, string>;
  };

  // part 를 먼저 확인해야 오류 메시지가 정확해진다 (없는 part 를 '순서 문제'로 보고하지 않도록)
  if (!["check", "ranking", "open"].includes(body.part ?? "")) {
    return NextResponse.json({ error: "part 값이 올바르지 않습니다." }, { status: 400 });
  }

  // 3단계를 다 끝내기 전에 사후 문항을 채우는 것을 막는다
  const trialsDone = await countTrials(participant.id);
  if (!canSubmitAt(participant, "/post/" + body.part, trialsDone)) {
    return NextResponse.json({ error: "아직 답할 수 없는 단계입니다." }, { status: 409 });
  }

  switch (body.part) {
    case "check": {
      const answer = body.answer;
      if (!answer || !USAGE_MANIPULATION_CHECK.options.some((o) => o.value === answer)) {
        return NextResponse.json({ error: "선택지가 올바르지 않습니다." }, { status: 400 });
      }
      // 4-1b 독립변수 재인 과제 (같은 화면에서 함께 받는다)
      const recognized = Array.isArray(body.recognized) ? body.recognized : [];
      const allowed = new Set(RATIONALE_RECOGNITION_CHECK.options.map((o) => o.value));
      if (recognized.some((v) => !allowed.has(v as never))) {
        return NextResponse.json({ error: "선택지가 올바르지 않습니다." }, { status: 400 });
      }
      if (recognized.length === 0) {
        return NextResponse.json(
          { error: "제시된 설명을 하나 이상 골라 주세요." },
          { status: 400 },
        );
      }

      // 'unsure' 는 오답으로 본다 (조작을 인지하지 못한 것)
      await savePostTest(participant.id, {
        mc_usage_answer: answer,
        mc_usage_correct: answer === participant.usage_condition,
        mc_rationale_answer: recognized,
        mc_rationale_correct: gradeRationaleRecognition(recognized),
        posttest_at: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true, next: "/post/ranking" });
    }

    case "ranking": {
      const raw = body.ranking ?? {};
      const ranking: Partial<Record<RationaleType, number>> = {};
      for (const r of RATIONALE_TYPES) ranking[r] = Number(raw[r]);

      const check = validateRanking(ranking);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }

      const patch: Record<string, number> = {};
      for (const r of RATIONALE_TYPES) patch[RANK_COLUMNS[r]] = ranking[r] as number;
      await savePostTest(participant.id, patch);
      return NextResponse.json({ ok: true, next: "/post/open" });
    }

    case "open": {
      const given = body.open ?? {};
      const patch: Record<string, string | null> = {};
      for (const q of OPEN_QUESTIONS) {
        const text = (given[q.id] ?? "").trim();
        if (q.required && !text) {
          return NextResponse.json({ error: "필수 응답을 입력해 주세요." }, { status: 400 });
        }
        patch[q.id] = text ? text.slice(0, OPEN_MAX_LENGTH) : null;
      }
      await savePostTest(participant.id, patch);
      return NextResponse.json({ ok: true, next: "/survey/demographics" });
    }

    default:
      return NextResponse.json({ error: "part 값이 올바르지 않습니다." }, { status: 400 });
  }
}
