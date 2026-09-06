import { notFound, redirect } from "next/navigation";
import OttScreen from "@/components/OttScreen";
import DeviceFrame from "@/components/DeviceFrame";
import SplitScreen from "@/components/SplitScreen";
import { NoticeCard } from "@/components/Notice";
import StimulusForm from "@/components/StimulusForm";
import { currentSession } from "@/lib/session";
import { guard } from "@/lib/flow";
import { getRail } from "@/lib/stimuli";
import { buildContextSnapshot, railHeadline, rationaleBanner, usageNotice } from "@/lib/copy";
import {
  TOTAL_STEPS,
  type RationaleType,
  type SetId,
  type UsageCondition,
} from "@/lib/experiment";

/**
 * 자극물 화면 1개 = 근거유형 1수준.
 *
 * 왼쪽에 자극물(목업), 오른쪽에 측정 문항을 놓는다. 넓은 화면에서는 문항을 끝까지
 * 내려도 자극물이 왼쪽에 남아 있어, 배너 문구를 다시 보면서 답할 수 있다.
 *
 * 어떤 근거유형과 어떤 포스터 세트가 나올지는 전부 DB의 배정에서 유도한다.
 */
export default async function StimulusPage({ params }: PageProps<"/stimulus/[step]">) {
  const { step } = await params;
  const stepIndex = Number(step);
  if (!Number.isInteger(stepIndex) || stepIndex < 1 || stepIndex > TOTAL_STEPS) {
    notFound();
  }

  const session = await currentSession();
  if (!session) redirect("/");
  const { participant } = session;

  // 사전 문항이 끝나기 전에 자극물을 보여주지 않고, trial 을 앞질러 갈 수도 없다
  const trialsDone = participant.is_dev ? stepIndex - 1 : session.trialsDone;
  const to = guard(participant, "/stimulus/" + stepIndex, trialsDone);
  if (to) redirect(to);
  if (!participant.preferred_genre) redirect("/pre");
  if (!participant.presentation_order || !participant.set_mapping) redirect("/pre");

  const rationale = participant.presentation_order[stepIndex - 1] as RationaleType;
  const setId = participant.set_mapping[rationale] as SetId;
  const genre = participant.preferred_genre;
  const titles = getRail(genre, setId);

  // 사전 문항 직후 저장한 맥락 정보를 재사용해 3화면 간 문구가 흔들리지 않게 한다
  const ctx = participant.context_snapshot ?? buildContextSnapshot(new Date(), false);

  return (
    <main className="flex flex-1 flex-col">
      <SplitScreen
        left={
          <div className="flex flex-col items-center gap-3">
            {/*
              화면 번호와 이용조건은 목업 **위**에 놓는다.
              아래에 두었을 때는 포스터에 시선을 뺏겨 읽지 않고 지나갔다.
              이용조건은 이 연구의 조절변수라, 못 읽고 넘어가면 조건이 걸리지 않는다.
            */}
            <div className="w-full max-w-xs space-y-2.5">
              <h2 className="text-base font-bold break-keep">추천 화면 {stepIndex}</h2>
              <NoticeCard>
                {usageNotice(participant.usage_condition as UsageCondition).detail}
              </NoticeCard>
            </div>

            <DeviceFrame isMobile={ctx.isMobile}>
              <OttScreen
                rationale={rationale}
                headline={railHeadline(rationale, participant.display_name)}
                banner={rationaleBanner(rationale, genre, ctx, participant.display_name)}
                titles={titles}
                usageCondition={participant.usage_condition as UsageCondition}
                displayName={participant.display_name}
                isMobile={ctx.isMobile}
              />
            </DeviceFrame>
          </div>
        }
        right={
          <>
            {/* 진행 표시 */}
            <div className="mb-5 flex items-center gap-2">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <span key={i} className="step-dot" data-on={i < stepIndex} />
              ))}
              <span className="shrink-0 text-xs text-muted tabular-nums">
                {stepIndex} / {TOTAL_STEPS}
              </span>
            </div>

            {/* key: 단계가 바뀌면 폼을 리마운트해 이전 화면의 응답이 남지 않게 한다 */}
            <StimulusForm key={stepIndex} stepIndex={stepIndex} />
          </>
        }
      />
    </main>
  );
}
