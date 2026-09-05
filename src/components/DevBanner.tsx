import { currentParticipant, isDevSession } from "@/lib/session";
import { assignmentToCell, GENRE_LABELS, type Genre, type UsageCondition } from "@/lib/experiment";
import { overridesToQuery } from "@/lib/devsession";
import DevBannerView from "./DevBannerView";

/**
 * 미리보기 배너의 서버 쪽 — 세션 조건을 읽어 표시용 클라이언트 컴포넌트에 넘긴다.
 *
 * survey_dev 쿠키가 없으면 DB를 조회하지 않고 즉시 빠지므로,
 * 실제 참여자에게는 쿼리가 한 번도 붙지 않는다.
 * (단계 번호는 경로에서 나오는데 레이아웃은 경로를 모르므로 클라이언트가 계산한다.)
 */
export default async function DevBanner() {
  if (!(await isDevSession())) return null;

  const p = await currentParticipant();
  if (!p?.is_dev) return null;

  const usage = (p.usage_condition as UsageCondition) ?? "SVOD";
  const sequenceIndex = p.sequence_index ?? 0;
  const mappingIndex = p.mapping_index ?? 0;
  const genre = (p.preferred_genre as Genre) ?? "action";

  return (
    <DevBannerView
      query={overridesToQuery({ usage, sequenceIndex, mappingIndex, genre })}
      usage={p.usage_condition ?? "-"}
      sequenceIndex={p.sequence_index}
      mappingIndex={p.mapping_index}
      cell={p.usage_condition ? assignmentToCell(usage, sequenceIndex, mappingIndex) : null}
      genreLabel={p.preferred_genre ? GENRE_LABELS[p.preferred_genre as Genre] : "-"}
    />
  );
}
