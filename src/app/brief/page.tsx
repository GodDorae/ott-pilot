import { redirect } from "next/navigation";
import BriefContinue from "@/components/BriefContinue";
import { currentSession } from "@/lib/session";
import { guard } from "@/lib/flow";
import { NoticeCard } from "@/components/Notice";
import { BRIEF_KICKER, BRIEF_TITLE, briefScene, usageBrief } from "@/lib/brief";
import type { UsageCondition } from "@/lib/experiment";
import { STAGE_LABELS } from "@/lib/steps";

/**
 * 3단계 시작 전 안내.
 *
 * 이 화면이 이용조건 조작을 전달하는 지점이라 건너뛸 수 없게 해 두었다
 * (넘어간 시각을 participants.brief_seen_at 에 남기고, 흐름 가드가 그것을 본다).
 */
export default async function BriefPage() {
  const session = await currentSession();
  if (!session) redirect("/");
  const { participant } = session;

  const to = guard(participant, "/brief", session.trialsDone);
  if (to) redirect(to);
  // 배정 전에는 보여줄 조건이 없다
  if (!participant.usage_condition) redirect("/pre");

  const condition = participant.usage_condition as UsageCondition;
  const scene = briefScene();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-12">
      <p className="text-xs text-muted">{STAGE_LABELS[3]}</p>
      <p className="mt-1.5 text-sm font-bold text-accent">{BRIEF_KICKER}</p>

      <h1 className="mt-4 flex items-center gap-2 text-xl font-bold break-keep">
        <span aria-hidden>📌</span>
        {BRIEF_TITLE}
      </h1>

      {/* 결제 방식 — 이 실험의 조절변수. 눈에 걸리도록 안내 상자에 담는다 */}
      <NoticeCard className="mt-5">
        <strong className="font-bold text-warn-strong">{usageBrief(condition)}</strong>
      </NoticeCard>

      {/* 상황 제시문 — 두 조건 공통 */}
      <div className="card-shadow mt-4 space-y-2.5 rounded-xl border border-line bg-card px-4 py-4 text-sm leading-relaxed break-keep sm:px-5">
        {scene.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="mt-8">
        <BriefContinue />
      </div>
    </main>
  );
}
