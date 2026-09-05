import { NextResponse } from "next/server";
import { GENRES, type Genre } from "@/lib/experiment";
import {
  assignAssignment,
  saveContextSnapshot,
  setDisplayName,
  setPreferredGenre,
} from "@/lib/db";
import { buildContextSnapshot, normalizeDisplayName } from "@/lib/copy";
import { currentParticipant } from "@/lib/session";
import { nextStepPath } from "@/lib/flow";

/**
 * 선호 장르 저장 + 조건 배정.
 *
 * 이 시점이 배정 지점인 이유: 사전 문항(A·B)과 장르 선택까지 끝낸 참여자만
 * 배정 셀을 차지하게 해서, 중간 이탈이 카운터밸런싱을 어긋나게 하지 않도록 한다.
 * 맥락 인식 조건 문구도 여기서 한 번 만들어 저장한다 — B-4·B-5 자기보고가
 * 이미 들어와 있어야 만들 수 있기 때문.
 */
export async function POST(req: Request) {
  const participant = await currentParticipant();
  if (!participant) {
    return NextResponse.json({ error: "세션이 없습니다." }, { status: 401 });
  }

  const body = (await req.json()) as { genre?: string; displayName?: string };
  if (!body.genre || !GENRES.includes(body.genre as Genre)) {
    return NextResponse.json({ error: "장르 값이 올바르지 않습니다." }, { status: 400 });
  }

  // 사전 문항을 건너뛰고 여기로 바로 들어오는 것을 막는다
  const expected = nextStepPath(participant);
  if (!participant.is_dev && expected !== "/pre" && expected !== "/stimulus/1") {
    return NextResponse.json({ error: "사전 문항을 먼저 완료해 주세요." }, { status: 409 });
  }

  await setPreferredGenre(participant.id, body.genre as Genre);
  // 호칭은 선택 입력 — 비워두면 화면에서 '회원님'으로 나간다
  await setDisplayName(participant.id, normalizeDisplayName(body.displayName));

  if (!participant.context_snapshot) {
    await saveContextSnapshot(
      participant.id,
      buildContextSnapshot(new Date(), {
        primaryDevice: participant.primary_device,
        primaryDeviceOther: participant.primary_device_other,
        viewingTimeslot: participant.viewing_timeslot,
      }),
    );
  }

  // 미리보기 세션은 /dev 에서 지정한 조건을 그대로 유지한다
  if (!participant.is_dev) {
    await assignAssignment(participant.id);
  }

  return NextResponse.json({ ok: true, next: "/stimulus/1" });
}
