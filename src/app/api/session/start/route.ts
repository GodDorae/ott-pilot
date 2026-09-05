import { NextResponse } from "next/server";
import { makeParticipantCode } from "@/lib/experiment";
import { createParticipant, dbMisconfigured, nextAssignmentSeq } from "@/lib/db";
import { DEV_COOKIE, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/**
 * 세션 시작 (동의 직후).
 *
 * 여기서는 조건을 배정하지 않는다. 배정은 사전 문항을 다 끝낸 뒤
 * /api/session/genre 에서 이뤄진다 — 동의만 누르고 나간 사람이 배정 셀을
 * 차지해 카운터밸런싱을 어긋나게 하는 걸 막기 위해서다.
 */
export async function POST(req: Request) {
  if (dbMisconfigured) {
    return NextResponse.json(
      { error: "서버 설정이 끝나지 않았습니다. 관리자에게 알려 주세요." },
      { status: 503 },
    );
  }

  const participant = await createParticipant({
    participantCode: makeParticipantCode(),
    assignmentSeq: await nextAssignmentSeq(),
    userAgent: req.headers.get("user-agent"),
  });

  const res = NextResponse.json({ participantCode: participant.participant_code });
  res.cookies.set(SESSION_COOKIE, participant.id, sessionCookieOptions);
  // 실제 참여 세션이므로 미리보기 표시는 확실히 지운다
  res.cookies.set(DEV_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return res;
}
