import { notFound, redirect } from "next/navigation";
import { OpenEndedForm, RankingForm, UsageCheckForm } from "@/components/PostTestForms";
import { countTrials } from "@/lib/db";
import { currentParticipant } from "@/lib/session";
import { guard } from "@/lib/flow";
import { STAGE_LABELS } from "@/lib/steps";

/** 4단계 사후 점검 — 4-1 조작점검 / 4-2 순위 / 4-3 주관식 */
const PARTS = {
  check: {
    ref: "4-1",
    title: "조작 점검",
    lead: "방금 보신 화면들에 대해 확인 문항 두 개만 답해 주세요.",
  },
  ranking: { ref: "4-2", title: "추천 방식 순위", lead: "세 가지 추천 방식을 서로 비교해 순위를 매겨 주세요." },
  open: { ref: "4-3", title: "주관식 응답", lead: "느낀 점을 자유롭게 적어 주세요. 분량은 짧아도 괜찮습니다." },
} as const;

export default async function PostPage({ params }: PageProps<"/post/[part]">) {
  const { part } = await params;
  const meta = PARTS[part as keyof typeof PARTS];
  if (!meta) notFound();

  const participant = await currentParticipant();
  if (!participant) redirect("/");

  const trialsDone = participant.is_dev ? 3 : await countTrials(participant.id);
  const to = guard(participant, "/post/" + part, trialsDone);
  if (to) redirect(to);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10">
      <p className="text-xs text-muted">{STAGE_LABELS[4]}</p>
      <h1 className="mt-1.5 text-lg font-bold break-keep">{meta.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted break-keep">{meta.lead}</p>

      <div className="mt-6">
        {part === "check" && <UsageCheckForm />}
        {part === "ranking" && <RankingForm />}
        {part === "open" && <OpenEndedForm />}
      </div>
    </main>
  );
}
