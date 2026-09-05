import { redirect } from "next/navigation";
import { completeParticipant } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { guard } from "@/lib/flow";
import { FollowupForm } from "@/components/PostTestForms";
import {
  GENRE_LABELS,
  RATIONALE_LABELS,
  TOTAL_STEPS,
  assignmentToCell,
  type Genre,
  type RationaleType,
  type UsageCondition,
} from "@/lib/experiment";

/**
 * 제출 완료 화면. 여기 도착한 시점에 completed_at 을 찍는다.
 * 후속 인터뷰 참여자 모집도 여기서 받는다 — 설문이 끝난 뒤라 응답에 영향을 주지 않는다.
 */
export default async function DonePage() {
  const session = await currentSession();
  if (!session) redirect("/");
  const { participant } = session;

  // 마지막 단계까지 실제로 마쳤는지 확인한다 (건너뛰고 들어와 완료 처리되는 것 방지)
  const trialsDone = participant.is_dev ? TOTAL_STEPS : session.trialsDone;
  const to = guard(participant, "/done", trialsDone);
  if (to) redirect(to);

  if (!participant.completed_at) {
    await completeParticipant(participant.id);
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-12">
      <h1 className="text-xl font-bold break-keep">응답이 저장되었습니다</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted break-keep">
        참여해 주셔서 감사합니다. 아래 참여 코드는 문의나 사례 지급 확인에 쓰입니다.
      </p>

      <div className="mt-6 rounded-xl border border-line bg-card p-5 text-center">
        <p className="text-xs text-muted">참여 코드</p>
        <p className="mt-1 text-2xl font-bold tracking-widest tabular-nums">
          {participant.participant_code}
        </p>
      </div>

      <FollowupForm
        initial={{
          followup_email: participant.followup_email,
          followup_phone: participant.followup_phone,
        }}
      />

      {/* 확인용 디버그 패널 — 본실험 전 제거 */}
      <section className="mt-10 rounded-xl border border-dashed border-line p-4">
        <p className="text-xs font-bold text-accent">확인용 (본실험 전 삭제)</p>
        <dl className="mt-3 space-y-1.5 text-xs text-muted">
          <div className="flex justify-between gap-4">
            <dt>도착 순번 / 배정 셀</dt>
            <dd className="font-medium text-fg tabular-nums">
              {participant.assignment_seq}
              {participant.usage_condition &&
                " / c" +
                  assignmentToCell(
                    participant.usage_condition as UsageCondition,
                    participant.sequence_index ?? 0,
                    participant.mapping_index ?? 0,
                  )}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>이용조건</dt>
            <dd className="font-medium text-fg">{participant.usage_condition}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>선호 장르</dt>
            <dd className="font-medium text-fg">
              {participant.preferred_genre
                ? GENRE_LABELS[participant.preferred_genre as Genre]
                : "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>
              제시 순서 (Seq{" "}
              {participant.sequence_index === null ? "-" : participant.sequence_index + 1})
            </dt>
            <dd className="text-right font-medium text-fg break-keep">
              {(participant.presentation_order ?? [])
                .map((r) => RATIONALE_LABELS[r as RationaleType])
                .join(" → ") || "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>맥락 문구</dt>
            <dd className="text-right font-medium text-fg break-keep">
              {participant.context_snapshot?.phrase ?? "-"}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
