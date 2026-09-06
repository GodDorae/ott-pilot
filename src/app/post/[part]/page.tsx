import { notFound, redirect } from "next/navigation";
import OttScreen from "@/components/OttScreen";
import DeviceFrame from "@/components/DeviceFrame";
import { OpenEndedForm, RankingForm, UsageCheckForm } from "@/components/PostTestForms";
import { currentSession } from "@/lib/session";
import { guard } from "@/lib/flow";
import { STAGE_LABELS, stepByPath } from "@/lib/steps";
import { getRail } from "@/lib/stimuli";
import { buildContextSnapshot, railHeadline, rationaleBanner } from "@/lib/copy";
import { TOTAL_STEPS, type RationaleType, type SetId, type UsageCondition } from "@/lib/experiment";

/** 4단계 사후 점검 */
const PARTS = {
  check: {
    title: "확인 문항",
    lead: "화면 평가를 마쳤습니다. 마지막으로 하나만 확인하겠습니다.",
  },
  ranking: {
    title: "추천 화면 순위",
    lead: "앞서 보신 세 화면을 다시 보여드립니다. 서로 비교해 순위를 매겨 주세요.",
  },
  open: {
    title: "주관식 응답",
    lead: "마지막입니다. 세 문항 모두 자유롭게 적어 주세요.",
  },
} as const;

export default async function PostPage({ params }: PageProps<"/post/[part]">) {
  const { part } = await params;
  const meta = PARTS[part as keyof typeof PARTS];
  if (!meta) notFound();

  // 단계 라벨은 steps.ts 정의를 따른다 — 조작점검은 3단계 마지막 스텝이다
  const step = stepByPath("/post/" + part);
  const stage = step?.stage ?? 4;

  const session = await currentSession();
  if (!session) redirect("/");
  const { participant } = session;

  const trialsDone = participant.is_dev ? TOTAL_STEPS : session.trialsDone;
  const to = guard(participant, "/post/" + part, trialsDone);
  if (to) redirect(to);

  /**
   * 순위 화면에서는 앞서 본 세 화면을 제시된 순서대로 축소해 다시 보여준다.
   * 참여자에게 근거유형 이름을 노출하지 않으려는 것 — 화면 자체로 구분하게 한다.
   */
  let previews: React.ReactNode[] = [];
  if (part === "ranking" && participant.preferred_genre && participant.presentation_order) {
    const genre = participant.preferred_genre;
    const ctx = participant.context_snapshot ?? buildContextSnapshot(new Date(), false);

    previews = participant.presentation_order.map((r) => {
      const rationale = r as RationaleType;
      const setId = participant.set_mapping?.[rationale] as SetId;
      return (
        <DeviceFrame key={rationale} compact>
          <OttScreen
            rationale={rationale}
            headline={railHeadline(rationale, participant.display_name)}
            banner={rationaleBanner(rationale, genre, ctx, participant.display_name)}
            titles={getRail(genre, setId)}
            usageCondition={participant.usage_condition as UsageCondition}
            displayName={participant.display_name}
          />
        </DeviceFrame>
      );
    });
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10">
      <p className="text-xs text-muted">{STAGE_LABELS[stage]}</p>
      <h1 className="mt-1.5 text-lg font-bold break-keep">{meta.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted break-keep">{meta.lead}</p>

      <div className="mt-6">
        {part === "check" && <UsageCheckForm />}
        {part === "ranking" && <RankingForm previews={previews} />}
        {part === "open" && <OpenEndedForm />}
      </div>
    </main>
  );
}
