import { NextResponse } from "next/server";
import { TOTAL_STEPS, type RationaleType, type SetId } from "@/lib/experiment";
import { ALL_ITEMS, LIKERT_MAX, LIKERT_MIN } from "@/lib/items";
import { getRail } from "@/lib/stimuli";
import { saveScreenResponse } from "@/lib/db";
import { currentParticipant } from "@/lib/session";

/**
 * 화면 1개 분량의 응답 저장.
 * 근거유형·세트·장르는 클라이언트가 보내온 값을 믿지 않고 DB의 배정에서 다시 유도한다.
 */
export async function POST(req: Request) {
  const participant = await currentParticipant();
  if (!participant) {
    return NextResponse.json({ error: "세션이 없습니다." }, { status: 401 });
  }
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
    dwellMs?: number | null;
  };

  const stepIndex = Number(body.stepIndex);
  if (!Number.isInteger(stepIndex) || stepIndex < 1 || stepIndex > TOTAL_STEPS) {
    return NextResponse.json({ error: "단계 값이 올바르지 않습니다." }, { status: 400 });
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
    dwellMs: typeof body.dwellMs === "number" ? Math.round(body.dwellMs) : null,
  });

  // 마지막 trial 이면 4단계로, 아니면 바로 다음 자극물로 (휴식 화면은 보류)
  return NextResponse.json({
    ok: true,
    next: stepIndex >= TOTAL_STEPS ? "/post/check" : "/stimulus/" + (stepIndex + 1),
  });
}
