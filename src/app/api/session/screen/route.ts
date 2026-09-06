import { NextResponse } from "next/server";
import { TOTAL_STEPS, type RationaleType, type SetId } from "@/lib/experiment";
import { ALL_ITEMS, ATTENTION_CHECK, LIKERT_MAX, LIKERT_MIN } from "@/lib/items";
import { getRail } from "@/lib/stimuli";
import { saveScreenResponse } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { canSubmitAt } from "@/lib/flow";

/**
 * 화면 1개 분량의 응답 저장.
 * 근거유형·세트·장르는 클라이언트가 보내온 값을 믿지 않고 DB의 배정에서 다시 유도한다.
 */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: "설문 세션이 만료되었습니다. 처음부터 다시 시작해 주세요." }, { status: 401 });
  }
  const { participant } = session;
  if (!participant.preferred_genre) {
    return NextResponse.json({ error: "선호 장르가 아직 없습니다." }, { status: 409 });
  }
  // 배정은 /api/session/genre 에서 이뤄진다. 여기 도달했는데 없다면 흐름이 깨진 것.
  if (!participant.presentation_order || !participant.set_mapping) {
    return NextResponse.json({ error: "조건이 아직 배정되지 않았습니다." }, { status: 409 });
  }

  const body = (await req.json()) as {
    stepIndex?: number;
    answers?: Record<string, number>;
    attentionCheck?: number | null;
    dwellMs?: number | null;
  };

  const stepIndex = Number(body.stepIndex);
  if (!Number.isInteger(stepIndex) || stepIndex < 1 || stepIndex > TOTAL_STEPS) {
    return NextResponse.json({ error: "단계 값이 올바르지 않습니다." }, { status: 400 });
  }

  /*
    순서 검사. 화면 가드만으로는 부족하다 — API 를 직접 부르면 그냥 통과했다.
    이걸 막지 않으면 3단계 안내(이용조건 조작)를 건너뛰고 평가하거나,
    2·3번 화면을 보지 않은 채 응답을 넣을 수 있다.
    (같은 화면을 다시 제출하는 것은 허용한다 — 뒤로 가서 고치는 경우다.)
  */
  if (!canSubmitAt(participant, "/stimulus/" + stepIndex, session.trialsDone)) {
    return NextResponse.json({ error: "이전 단계를 먼저 완료해 주세요." }, { status: 409 });
  }

  const answers = body.answers ?? {};
  for (const item of ALL_ITEMS) {
    const v = answers[item.key];
    if (!Number.isInteger(v) || v < LIKERT_MIN || v > LIKERT_MAX) {
      return NextResponse.json(
        { error: "응답하지 않은 문항이 있습니다: " + item.key },
        { status: 400 },
      );
    }
  }

  // 성실성 확인 문항 — 틀려도 통과시키고 값만 기록한다 (막으면 고쳐 맞춰버린다)
  const attention = body.attentionCheck;
  if (
    !Number.isInteger(attention) ||
    (attention as number) < LIKERT_MIN ||
    (attention as number) > LIKERT_MAX
  ) {
    return NextResponse.json(
      { error: "응답하지 않은 문항이 있습니다: " + ATTENTION_CHECK.key },
      { status: 400 },
    );
  }

  const rationaleType = participant.presentation_order[stepIndex - 1] as RationaleType;
  const setId = participant.set_mapping[rationaleType] as SetId;
  const genre = participant.preferred_genre;

  await saveScreenResponse({
    participantId: participant.id,
    stepIndex,
    rationaleType,
    genre,
    setId,
    titleIds: getRail(genre, setId).map((t) => t.id),
    answers,
    attentionCheck: attention as number,
    dwellMs: typeof body.dwellMs === "number" ? Math.round(body.dwellMs) : null,
  });

  // 마지막 trial 이면 4단계로, 아니면 바로 다음 자극물로 (휴식 화면은 보류)
  return NextResponse.json({
    ok: true,
    next: stepIndex >= TOTAL_STEPS ? "/post/check" : "/stimulus/" + (stepIndex + 1),
  });
}
