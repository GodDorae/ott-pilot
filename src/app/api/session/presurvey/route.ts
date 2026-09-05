import { NextResponse } from "next/server";
import { countTrials, savePreSurvey } from "@/lib/db";
import { currentParticipant } from "@/lib/session";
import { canSubmitAt } from "@/lib/flow";
import { OTHER_MAX_LENGTH, PRE_SECTIONS, type SectionKey } from "@/lib/presurvey";

/**
 * 선택형 문항 한 섹션 저장 (1-2 사전설문 / 4-4 인구통계 공용).
 * 저장 가능한 컬럼과 허용 값은 전부 presurvey.ts 정의에서만 나온다
 * — 클라이언트가 임의 컬럼을 밀어넣을 수 없다.
 */
export async function POST(req: Request) {
  const participant = await currentParticipant();
  if (!participant) {
    return NextResponse.json({ error: "세션이 없습니다." }, { status: 401 });
  }

  const body = (await req.json()) as {
    section?: string;
    answers?: Record<string, string>;
    others?: Record<string, string>;
  };

  const section = PRE_SECTIONS[body.section as SectionKey];
  if (!section) {
    return NextResponse.json({ error: "섹션 값이 올바르지 않습니다." }, { status: 400 });
  }

  // 4-4 인구통계를 자극물 노출 전에 미리 채워 넣는 것을 막는다
  const trialsDone = await countTrials(participant.id);
  if (!canSubmitAt(participant, "/survey/" + section.key, trialsDone)) {
    return NextResponse.json({ error: "아직 답할 수 없는 단계입니다." }, { status: 409 });
  }

  const answers = body.answers ?? {};
  const others = body.others ?? {};
  const patch: Record<string, string | null> = {};

  for (const q of section.questions) {
    const value = answers[q.id];

    if (!value) {
      if (q.required) {
        return NextResponse.json(
          { error: q.code + " 문항에 답해 주세요." },
          { status: 400 },
        );
      }
      continue;
    }

    if (!q.choices.some((c) => c.value === value)) {
      return NextResponse.json(
        { error: q.code + " 문항의 선택지가 올바르지 않습니다." },
        { status: 400 },
      );
    }
    patch[q.id] = value;

    // '기타' 자유입력 — 기타를 고르지 않았으면 반드시 비워 둔다 (DB 제약과 일치)
    if (q.otherColumn) {
      if (value === q.otherValue) {
        const text = (others[q.id] ?? "").trim();
        if (!text) {
          return NextResponse.json(
            { error: q.code + " 기타 항목을 입력해 주세요." },
            { status: 400 },
          );
        }
        patch[q.otherColumn] = text.slice(0, OTHER_MAX_LENGTH);
      } else {
        patch[q.otherColumn] = null;
      }
    }
  }

  await savePreSurvey(participant.id, patch);
  return NextResponse.json({ ok: true, next: section.next });
}
