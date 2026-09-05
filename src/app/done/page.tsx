import { redirect } from "next/navigation";
import { completeParticipant, countTrials } from "@/lib/db";
import { guard } from "@/lib/flow";
import { currentParticipant } from "@/lib/session";
import {
  GENRE_LABELS,
  RATIONALE_LABELS,
  assignmentToCell,
  type Genre,
  type RationaleType,
  type UsageCondition,
} from "@/lib/experiment";

/**
 * 제출 완료 화면 (기조 문서 4-4 이후). 여기 도착한 시점에 completed_at 을 찍는다.
 * 아래 배정 결과 패널은 흐름 점검용이며, 본실험 배포 전에 반드시 제거할 것.
 */
export default async function DonePage() {
  const participant = await currentParticipant();
  if (!participant) redirect("/");

  /*
   * 마지막 단계까지 실제로 마쳤는지 확인한다. 이게 없으면 동의만 누른 사람이
   * /done 으로 바로 들어와 아무 응답 없이 completed_at 이 찍히고, 완료자 수가 부풀려진다.
   */
  const trialsDone = participant.is_dev ? 3 : await countTrials(participant.id);
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
            <dt>제시 순서 (Seq {participant.sequence_index === null ? "-" : participant.sequence_index + 1})</dt>
            <dd className="text-right font-medium text-fg break-keep">
              {(participant.presentation_order ?? [])
                .map((r) => RATIONALE_LABELS[r as RationaleType])
                .join(" → ") || "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>세트 매칭 (순환 {participant.mapping_index ?? "-"})</dt>
            <dd className="text-right font-medium text-fg break-keep">
              {(() => {
                const m = participant.set_mapping;
                if (!m) return "-";
                return (Object.keys(m) as RationaleType[])
                  .map((r) => RATIONALE_LABELS[r] + "=" + m[r])
                  .join(", ");
              })()}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
