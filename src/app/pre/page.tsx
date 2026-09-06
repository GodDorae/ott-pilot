import { redirect } from "next/navigation";
import GenrePicker from "@/components/GenrePicker";
import { currentSession } from "@/lib/session";
import { guard } from "@/lib/flow";
import { GENRES } from "@/lib/experiment";
import { genreTitles } from "@/lib/stimuli";

/**
 * 선호 장르 선택.
 * 여기서 고른 장르가 3화면 전체의 포스터 세트를 결정하며, 그 자체가 이 실험의
 * 개인화 장치다 (문서 0.4). 정밀 매칭 수치("취향 92% 일치" 등)는 쓰지 않는다.
 */
export default async function PrePage() {
  const session = await currentSession();
  if (!session) redirect("/");
  const { participant } = session;

  const trialsDone = session.trialsDone;
  const to = guard(participant, "/pre", trialsDone);
  if (to) redirect(to);

  // 장르를 바꿀 때마다 요청하지 않도록 목록을 통째로 넘긴다 (6장르 × 12편)
  const titlesByGenre = Object.fromEntries(
    GENRES.map((g) => [g, genreTitles(g)]),
  ) as Record<(typeof GENRES)[number], ReturnType<typeof genreTitles>>;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-12">
      <p className="text-xs text-muted">2단계 · 2-2</p>
      <h1 className="mt-2 text-xl font-bold break-keep">
        화면을 준비하기 전에 몇 가지만 알려 주세요
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted break-keep">
        고른 장르에 맞춰 이후 화면에 나올 작품이 정해집니다.
      </p>

      <div className="mt-8">
        <GenrePicker
          initial={participant.preferred_genre}
          initialName={participant.display_name}
          initialFamiliarity={participant.title_familiarity}
          titlesByGenre={titlesByGenre}
        />
      </div>
    </main>
  );
}
