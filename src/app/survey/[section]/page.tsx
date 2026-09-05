import { notFound, redirect } from "next/navigation";
import PreSurveyForm from "@/components/PreSurveyForm";
import { currentParticipant } from "@/lib/session";
import type { ParticipantRow } from "@/lib/db";
import { guard } from "@/lib/flow";
import { PRE_SECTIONS, type SectionKey } from "@/lib/presurvey";
import { countTrials } from "@/lib/db";
import { STAGE_LABELS, STEPS } from "@/lib/steps";

/**
 * 선택형 문항 섹션.
 *   usage        1-2 사전설문 (자극물 노출 전)
 *   demographics 4-4 인구통계  (자극물 노출 후, 마지막)
 */
export default async function SurveyPage({ params }: PageProps<"/survey/[section]">) {
  const { section: key } = await params;
  const section = PRE_SECTIONS[key as SectionKey];
  if (!section) notFound();

  const participant = await currentParticipant();
  if (!participant) redirect("/");

  const trialsDone = participant.is_dev ? 3 : await countTrials(participant.id);
  const to = guard(participant, "/survey/" + section.key, trialsDone);
  if (to) redirect(to);

  const initial = Object.fromEntries(
    section.questions.flatMap((q) => {
      const rows: [string, string | null][] = [
        [q.id, (participant[q.id as keyof ParticipantRow] as string | null) ?? null],
      ];
      if (q.otherColumn) {
        rows.push([
          q.otherColumn,
          (participant[q.otherColumn as keyof ParticipantRow] as string | null) ?? null,
        ]);
      }
      return rows;
    }),
  );

  const step = STEPS.find((s) => s.path === "/survey/" + section.key);
  const stage = step?.stage ?? 1;
  const ref = step?.ref ?? "";

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10">
      <p className="text-xs text-muted">
        {STAGE_LABELS[stage]} · {ref}
      </p>
      <h1 className="mt-1.5 text-lg font-bold break-keep">{section.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted break-keep">{section.lead}</p>

      <div className="mt-6">
        <PreSurveyForm section={section} initial={initial} />
      </div>
    </main>
  );
}
