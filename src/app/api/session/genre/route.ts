import { NextResponse } from "next/server";
import { GENRES, type Genre } from "@/lib/experiment";
import { genreTitles } from "@/lib/stimuli";
import {
  assignAssignment,
  saveContextSnapshot,
  setDisplayName,
  setPreferredGenre,
  setSeenTitles,
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
    return NextResponse.json({ error: "설문 세션이 만료되었습니다. 처음부터 다시 시작해 주세요." }, { status: 401 });
  }

  const body = (await req.json()) as {
    genre?: string;
    displayName?: string;
    seenTitleIds?: string[];
  };
  if (!body.genre || !GENRES.includes(body.genre as Genre)) {
    return NextResponse.json({ error: "장르 값이 올바르지 않습니다." }, { status: 400 });
  }

  // 사전 문항을 건너뛰고 여기로 바로 들어오는 것을 막는다
  const expected = nextStepPath(participant);
  if (!participant.is_dev && expected !== "/pre" && expected !== "/stimulus/1") {
    return NextResponse.json({ error: "사전 문항을 먼저 완료해 주세요." }, { status: 409 });
  }

  // 시청 경험은 그 장르 작품에 한해서만 받는다 (다른 장르 id 가 섞여 들어오지 않도록)
  const allowed = new Set(genreTitles(body.genre as Genre).map((t) => t.id));
  const seen = (body.seenTitleIds ?? []).filter((id) => allowed.has(id));
  if ((body.seenTitleIds ?? []).some((id) => !allowed.has(id))) {
    return NextResponse.json({ error: "작품 값이 올바르지 않습니다." }, { status: 400 });
  }

  await setPreferredGenre(participant.id, body.genre as Genre);
  await setSeenTitles(participant.id, seen);
  // 호칭은 선택 입력 — 비워두면 화면에서 '회원님'으로 나간다
  await setDisplayName(participant.id, normalizeDisplayName(body.displayName));

  if (!participant.context_snapshot) {
    await saveContextSnapshot(
      participant.id,
      // 실제 접속 기기·시각 기준 (자기보고 B-4·B-5 는 분석용으로만 남긴다).
      // 기기는 세션 시작 때 정해둔 값을 쓴다 — 중간에 바뀌지 않도록.
      buildContextSnapshot(new Date(), participant.is_mobile ?? false),
    );
  }

  // 미리보기 세션은 /dev 에서 지정한 조건을 그대로 유지한다
  if (!participant.is_dev) {
    await assignAssignment(participant.id);
  }

  return NextResponse.json({ ok: true, next: "/stimulus/1" });
}
