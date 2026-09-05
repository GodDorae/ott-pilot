import { notFound, redirect } from "next/navigation";
import Rail from "@/components/Rail";
import StimulusForm from "@/components/StimulusForm";
import { currentParticipant } from "@/lib/session";
import { guard } from "@/lib/flow";
import { countTrials } from "@/lib/db";
import { getRail } from "@/lib/stimuli";
import {
  buildContextSnapshot,
  greeting,
  railHeadline,
  rationaleBanner,
} from "@/lib/copy";
import {
  TOTAL_STEPS,
  type RationaleType,
  type SetId,
  type UsageCondition,
} from "@/lib/experiment";

/**
 * 자극물 화면 1개 = 근거유형 1수준.
 * 어떤 근거유형과 어떤 포스터 세트가 나올지는 전부 DB의 배정에서 유도한다.
 */
export default async function StimulusPage({
  params,
}: PageProps<"/stimulus/[step]">) {
  const { step } = await params;
  const stepIndex = Number(step);
  if (!Number.isInteger(stepIndex) || stepIndex < 1 || stepIndex > TOTAL_STEPS) {
    notFound();
  }

  const participant = await currentParticipant();
  if (!participant) redirect("/");

  // 사전 문항이 끝나기 전에 자극물을 보여주지 않고, trial 을 앞질러 갈 수도 없다
  const trialsDone = participant.is_dev ? stepIndex - 1 : await countTrials(participant.id);
  const to = guard(participant, "/stimulus/" + stepIndex, trialsDone);
  if (to) redirect(to);
  if (!participant.preferred_genre) redirect("/pre");
  // 조건 배정은 장르 선택 시점에 일어난다 — 없으면 그 단계로 되돌린다
  if (!participant.presentation_order || !participant.set_mapping) redirect("/pre");

  const rationale = participant.presentation_order[stepIndex - 1] as RationaleType;
  const setId = participant.set_mapping[rationale] as SetId;
  const genre = participant.preferred_genre;
  const titles = getRail(genre, setId);

  // 사전 문항 직후 저장한 맥락 정보를 재사용해 3화면 간 문구가 흔들리지 않게 한다
  const ctx =
    participant.context_snapshot ??
    buildContextSnapshot(new Date(), {
      primaryDevice: participant.primary_device,
      primaryDeviceOther: participant.primary_device_other,
      viewingTimeslot: participant.viewing_timeslot,
    });

  return (
    <main className="flex-1">
      {/* 진행 표시 */}
      <div className="mx-auto w-full max-w-xl px-5 pt-6">
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span key={i} className="step-dot" data-on={i < stepIndex} />
          ))}
          <span className="shrink-0 text-xs text-muted tabular-nums">
            {stepIndex} / {TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* 자극물 */}
      <div className="mx-auto mt-5 w-full max-w-xl px-0 sm:px-5">
        <div className="overflow-hidden sm:rounded-2xl">
          <Rail
            headline={railHeadline(rationale, genre, participant.display_name)}
            banner={rationaleBanner(rationale, genre, ctx, participant.display_name)}
            titles={titles}
            usageCondition={participant.usage_condition as UsageCondition}
            displayName={participant.display_name}
            // 인사말은 세션 시작 시각 기준 — 3화면 내내 같은 문구가 유지된다
            greetingText={greeting(new Date(participant.started_at), participant.display_name)}
          />
        </div>
      </div>

      {/* 측정 문항 */}
      <div className="mx-auto mt-6 w-full max-w-xl px-5 pb-10">
        {/* key: 단계가 바뀌면 폼을 리마운트해 이전 화면의 응답이 남지 않게 한다 */}
        <StimulusForm key={stepIndex} stepIndex={stepIndex} />
      </div>
    </main>
  );
}
