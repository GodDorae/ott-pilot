import { redirect } from "next/navigation";
import { currentParticipant } from "@/lib/session";

/**
 * 선별 제외 종료 화면.
 *
 * 연구 대상은 'OTT 플랫폼을 사용해 본 경험이 있는 분' 이다. B-1 에서 이용 플랫폼이
 * 없거나 B-2 에서 사용한 적이 없다고 답하면 자극물로 넘어가지 않고 여기서 끝난다.
 * 탈락처럼 느껴지지 않도록 사유를 담담히 적고, 응답에 감사를 표한다.
 */
const REASON_TEXT: Record<string, string> = {
  no_platform: "현재 이용 중인 OTT 플랫폼이 없다고 응답해 주셨습니다.",
  never_used: "OTT 서비스를 사용해 본 적이 없다고 응답해 주셨습니다.",
};

export default async function ScreenedOutPage() {
  const participant = await currentParticipant();
  if (!participant) redirect("/");
  if (!participant.screened_out_at && !participant.is_dev) {
    redirect("/");
  }

  const reason = participant.screened_out_reason
    ? REASON_TEXT[participant.screened_out_reason]
    : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
      <h1 className="text-xl font-bold break-keep">참여해 주셔서 감사합니다</h1>

      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted break-keep">
        {reason && <p>{reason}</p>}
        <p>
          이번 조사는 OTT 플랫폼을 사용해 보신 분들의 경험을 묻는 연구여서, 여기서 응답을
          마무리하겠습니다.
        </p>
        <p>시간 내어 답변해 주셔서 고맙습니다.</p>
      </div>

      <p className="mt-8 text-xs text-muted">이 창은 닫으셔도 됩니다.</p>
    </main>
  );
}
