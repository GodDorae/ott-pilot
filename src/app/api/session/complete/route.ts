import { NextResponse } from "next/server";
import { completeParticipant } from "@/lib/db";
import { currentParticipant } from "@/lib/session";

export async function POST() {
  const participant = await currentParticipant();
  if (!participant) {
    return NextResponse.json({ error: "세션이 없습니다." }, { status: 401 });
  }
  if (!participant.completed_at) {
    await completeParticipant(participant.id);
  }
  return NextResponse.json({ ok: true, participantCode: participant.participant_code });
}
