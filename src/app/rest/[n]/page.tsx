import { notFound, redirect } from "next/navigation";
import RestInterstitial from "@/components/RestInterstitial";
import { countTrials } from "@/lib/db";
import { currentParticipant } from "@/lib/session";
import { guard } from "@/lib/flow";
import { TOTAL_STEPS } from "@/lib/experiment";

/**
 * Trial 사이의 짧은 휴식. n = 방금 끝낸 trial 번호 (1 또는 2)
 *
 * 3초는 이 연구의 이전 버전(세현이논문/ott-survey-react)이 안내 인터스티셜에 쓴 값과
 * 같다 — S6Notice 의 useCountdown(3).
 */
export const REST_SECONDS = 3;

export default async function RestPage({ params }: PageProps<"/rest/[n]">) {
  const { n } = await params;
  const done = Number(n);
  if (!Number.isInteger(done) || done < 1 || done >= TOTAL_STEPS) notFound();

  const participant = await currentParticipant();
  if (!participant) redirect("/");

  const trialsDone = participant.is_dev ? done : await countTrials(participant.id);
  const to = guard(participant, "/rest/" + done, trialsDone);
  if (to) redirect(to);

  return (
    <main className="flex flex-1 flex-col">
      <RestInterstitial
        next={"/stimulus/" + (done + 1)}
        seconds={REST_SECONDS}
        trialsDone={done}
        totalTrials={TOTAL_STEPS}
      />
    </main>
  );
}
