import { NextResponse } from "next/server";
import { completeParticipant } from "@/lib/db";
import { currentParticipant } from "@/lib/session";

export async function POST() {
  const participant = await currentParticipant();
  if (!participant) {
    return NextResponse.json({ error: "설문 세션이 만료되었습니다. 처음부터 다시 시작해 주세요." }, { status: 401 });
  }
  if (!participant.completed_at) {
    await completeParticipant(participant.id);
  }
  return NextResponse.json({ ok: true, participantCode: participant.participant_code });
}
