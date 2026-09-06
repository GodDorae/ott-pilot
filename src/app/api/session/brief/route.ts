import { NextResponse } from "next/server";
import { markBriefSeen } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { canSubmitAt } from "@/lib/flow";

/**
 * 3단계 안내를 읽었다고 표시한다.
 *
 * 저장할 응답은 없고 시각만 남긴다. 그래도 API 로 두는 이유는,
 * 이 화면을 지났는지가 흐름 가드의 기준이라 클라이언트 말만 믿을 수 없기 때문이다.
 */
export async function POST() {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json(
      { error: "설문 세션이 만료되었습니다. 처음부터 다시 시작해 주세요." },
      { status: 401 },
    );
  }
  const { participant } = session;

  if (!canSubmitAt(participant, "/brief", session.trialsDone)) {
    return NextResponse.json({ error: "이전 단계를 먼저 완료해 주세요." }, { status: 409 });
  }

  // 이미 읽은 참여자가 뒤로 갔다 다시 눌러도 처음 시각을 덮지 않는다
  if (!participant.is_dev && !participant.brief_seen_at) {
    await markBriefSeen(participant.id);
  }

  return NextResponse.json({ ok: true, next: "/stimulus/1" });
}
