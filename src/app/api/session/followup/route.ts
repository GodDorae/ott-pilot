import { NextResponse } from "next/server";
import { savePostTest } from "@/lib/db";
import { currentParticipant } from "@/lib/session";
import { FOLLOWUP_MAX_LENGTH } from "@/lib/posttest";

/**
 * 후속 인터뷰 연락처 저장 (완료 화면, 선택 입력).
 *
 * 설문이 끝난 뒤 받는 값이라 순서 검사는 하지 않는다.
 * 개인정보라 분석용 뷰·CSV 에는 나가지 않는다.
 */
export async function POST(req: Request) {
  const participant = await currentParticipant();
  if (!participant) {
    return NextResponse.json({ error: "설문 세션이 만료되었습니다. 처음부터 다시 시작해 주세요." }, { status: 401 });
  }

  const body = (await req.json()) as { followup_email?: string; followup_phone?: string };
  const clean = (v: string | undefined) => {
    const t = (v ?? "").trim().slice(0, FOLLOWUP_MAX_LENGTH);
    return t.length > 0 ? t : null;
  };

  const email = clean(body.followup_email);
  const phone = clean(body.followup_phone);
  if (!email && !phone) {
    return NextResponse.json(
      { error: "이메일 또는 휴대전화 중 하나는 입력해 주세요." },
      { status: 400 },
    );
  }

  await savePostTest(participant.id, { followup_email: email, followup_phone: phone });
  return NextResponse.json({ ok: true });
}
