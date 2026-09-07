import { NextResponse } from "next/server";
import { savePostTest } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { canSubmitAt } from "@/lib/flow";
import { LIKERT_MAX, LIKERT_MIN } from "@/lib/items";
import { SURVEY_PHASE } from "@/lib/phase";
import {
  OPEN_MAX_LENGTH,
  OPEN_QUESTIONS,
  USAGE_MANIPULATION_CHECK,
  ranksByRationale,
  validateRanking,
} from "@/lib/posttest";

/**
 * 3단계 마지막 확인 + 4단계 사후 문항 저장 — 한 번에 한 파트.
 *
 *   check    3-4 조작점검 (조절변수) — 3단계 마지막 스텝
 *   ranking  4-1 추천 화면 순위 + 선택 이유 (한 화면에서 함께 받는다)
 *   open     4-2 주관식
 */
export async function POST(req: Request) {
  // 참여자와 진행한 화면 수를 한 번에 읽는다 — 따로 부르면 왕복이 두 번이다
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: "설문 세션이 만료되었습니다. 처음부터 다시 시작해 주세요." }, { status: 401 });
  }
  const { participant, trialsDone } = session;

  const body = (await req.json()) as {
    part?: string;
    answer?: string;
    /** 화면 번호(1-3) → 순위 */
    ranks?: Record<string, number>;
    reason?: string;
    open?: Record<string, string>;
    priceRealistic?: number | null;
    priceBurden?: number | null;
    priceReason?: string | null;
    counterfactualInfo?: string;
  };

  if (!["check", "ranking", "open"].includes(body.part ?? "")) {
    return NextResponse.json({ error: "part 값이 올바르지 않습니다." }, { status: 400 });
  }

  if (!canSubmitAt(participant, "/post/" + body.part, trialsDone)) {
    return NextResponse.json({ error: "아직 답할 수 없는 단계입니다." }, { status: 409 });
  }

  switch (body.part) {
    case "check": {
      const answer = body.answer;
      if (!answer || !USAGE_MANIPULATION_CHECK.options.some((o) => o.value === answer)) {
        return NextResponse.json({ error: "선택지가 올바르지 않습니다." }, { status: 400 });
      }
      /*
        금액 점검은 개별 대여 조건에서만 받는다 — 구독 조건 참여자는 금액을 본 적이 없다.
        '볼 법한 금액인가' 와 '부담인가' 는 서로 다른 것이라 척도를 둘로 나눠 받는다.
      */
      const scale = (v: unknown) =>
        Number.isInteger(v) && (v as number) >= LIKERT_MIN && (v as number) <= LIKERT_MAX
          ? (v as number)
          : null;
      const askPrice = SURVEY_PHASE === "pilot" && participant.usage_condition === "TVOD";
      const priceRealistic = askPrice ? scale(body.priceRealistic) : null;
      const priceBurden = askPrice ? scale(body.priceBurden) : null;
      if (askPrice && (priceRealistic === null || priceBurden === null)) {
        return NextResponse.json({ error: "금액 확인 문항에 답해 주세요." }, { status: 400 });
      }

      // 반대 조건 가정 — 전부 필수 ('없음' 이라고 적게 안내한다)
      const counterfactual = (body.counterfactualInfo ?? "").trim().slice(0, OPEN_MAX_LENGTH);
      if (counterfactual.length === 0) {
        return NextResponse.json({ error: "필수 응답을 입력해 주세요." }, { status: 400 });
      }

      // 'unsure' 는 오답으로 본다 (조작을 인지하지 못한 것)
      await savePostTest(participant.id, {
        mc_usage_answer: answer,
        mc_usage_correct: answer === participant.usage_condition,
        price_realistic: priceRealistic,
        price_burden: priceBurden,
        price_reason: askPrice ? ((body.priceReason ?? "").trim().slice(0, OPEN_MAX_LENGTH) || null) : null,
        counterfactual_info: counterfactual,
        posttest_at: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true, next: "/post/ranking" });
    }

    case "ranking": {
      const raw = body.ranks ?? {};
      const ranksByStep: Record<number, number> = {};
      for (let step = 1; step <= 3; step++) ranksByStep[step] = Number(raw[String(step)]);

      const check = validateRanking(ranksByStep);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }

      const reason = (body.reason ?? "").trim();
      if (!reason) {
        return NextResponse.json({ error: "선택 이유를 적어 주세요." }, { status: 400 });
      }

      if (!participant.presentation_order) {
        return NextResponse.json({ error: "조건 배정을 찾을 수 없습니다." }, { status: 409 });
      }

      // 참여자는 화면 번호로 답하지만, 저장은 근거유형 기준으로 되돌린다
      await savePostTest(participant.id, {
        ...ranksByRationale(ranksByStep, participant.presentation_order),
        open_reason: reason.slice(0, OPEN_MAX_LENGTH),
      });
      return NextResponse.json({ ok: true, next: "/post/open" });
    }

    case "open": {
      const given = body.open ?? {};
      const patch: Record<string, string> = {};
      for (const q of OPEN_QUESTIONS) {
        const text = (given[q.id] ?? "").trim();
        // 전부 필수 — 쓸 말이 없으면 없음 이라고 적게 안내한다
        if (!text) {
          return NextResponse.json({ error: "필수 응답을 입력해 주세요." }, { status: 400 });
        }
        patch[q.id] = text.slice(0, OPEN_MAX_LENGTH);
      }
      await savePostTest(participant.id, patch);
      return NextResponse.json({ ok: true, next: "/done" });
    }

    default:
      return NextResponse.json({ error: "part 값이 올바르지 않습니다." }, { status: 400 });
  }
}
