/**
 * 자극물 레일
 *
 *   [인사말]
 *   [레일 제목 — 조건별 헤드라인]
 *   [포스터 4개 — 앞 3개는 온전히, 마지막 1개는 화면 끝에서 일부만]
 *   [강조색 배너 — 근거유형 설명 문구]
 *   [이용조건 문구]
 *
 * 포스터는 현재 제목 텍스트 카드. Title.posterUrl 이 채워지면 이미지로 바뀐다.
 */

import type { Title } from "@/lib/stimuli";
import { VISIBLE_PER_SET } from "@/lib/stimuli";
import type { UsageCondition } from "@/lib/experiment";
import { honorific, usageNotice } from "@/lib/copy";

function Poster({
  title,
  peek = false,
  compact = false,
}: {
  title: Title;
  peek?: boolean;
  compact?: boolean;
}) {
  return (
    <figure
      className={
        "shrink-0 " +
        (peek
          ? compact
            ? "w-14 opacity-45"
            : "w-28 sm:w-36 opacity-45"
          : compact
            ? "w-20"
            : "w-40 sm:w-48")
      }
      aria-hidden={peek || undefined}
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-ott-surface ring-1 ring-ott-line">
        {title.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 외부 포스터 URL을 그대로 쓰므로 최적화 대상 아님
          <img src={title.posterUrl} alt={title.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col justify-between p-3">
            <span className="text-[10px] tracking-wider text-ott-muted">POSTER</span>
            <span
              className={
                (compact ? "text-[9px] " : "text-sm ") +
                "leading-snug font-medium text-ott-fg break-keep"
              }
            >
              {title.title}
            </span>
          </div>
        )}
      </div>

      {!peek && !compact && (
        <figcaption className="mt-2 space-y-0.5">
          <p className="text-sm font-medium text-ott-fg break-keep">{title.title}</p>
          {title.synopsis && (
            <p className="text-xs leading-relaxed text-ott-muted break-keep line-clamp-3">
              {title.synopsis}
            </p>
          )}
        </figcaption>
      )}
    </figure>
  );
}

export default function Rail({
  headline,
  banner,
  titles,
  usageCondition,
  displayName,
  greetingText,
  compact = false,
}: {
  headline: string;
  banner: string;
  /** 4편 — 앞 3편은 온전히, 마지막 1편은 peek */
  titles: Title[];
  usageCondition: UsageCondition;
  /** 화면에 표시할 호칭 (없으면 '회원') */
  displayName: string | null;
  /** 접속 시간대를 반영한 인사말 — 세 조건 모두 동일하게 들어간다 */
  greetingText: string;
  /** 순위 화면에서 세 화면을 나란히 줄여 보여줄 때 */
  compact?: boolean;
}) {
  const notice = usageNotice(usageCondition);
  const initial = honorific(displayName).slice(0, 1);
  const visible = titles.slice(0, VISIBLE_PER_SET);
  const peek = titles[VISIBLE_PER_SET];

  return (
    <section className="ott-screen bg-ott-bg text-ott-fg">
      {/* 서비스 헤더 — 실제 OTT 화면처럼 보이게 하는 최소 장치 */}
      <div className="flex items-center justify-between border-b border-ott-line px-4 py-3 sm:px-6">
        <span className="text-sm font-bold tracking-widest text-accent">STREAM</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-ott-line px-2.5 py-1 text-[11px] text-ott-muted">
            {notice.label}
          </span>
          {/* 프로필 칩 — 넷플릭스류 앱의 프로필 자리 */}
          <span
            aria-label={honorific(displayName) + " 프로필"}
            className="grid size-6 place-items-center rounded bg-accent text-[11px] font-bold text-white"
          >
            {initial}
          </span>
        </div>
      </div>

      <div className={compact ? "px-3 py-4" : "px-4 py-6 sm:px-6"}>
        {/* 인사말 — 접속 시간대 + 호칭. 근거유형과 무관하게 항상 같은 자리에 온다. */}
        <p className={(compact ? "text-[10px] " : "text-xs ") + "mb-1 text-ott-muted"}>
          {greetingText}
        </p>
        <h2
          className={
            (compact ? "mb-2 text-[11px] " : "mb-4 text-base sm:text-lg ") +
            "font-bold break-keep"
          }
        >
          {headline}
        </h2>

        {/* peek 포스터가 화면 끝에서 잘려 보이도록 가로 스크롤 컨테이너 */}
        <div className="-mr-4 overflow-x-auto pb-1 sm:-mr-6">
          <div className="flex gap-3 pr-10">
            {visible.map((t) => (
              <Poster key={t.id} title={t} compact={compact} />
            ))}
            {peek && <Poster title={peek} peek compact={compact} />}
          </div>
        </div>

        {/* 강조색 배너 — 근거유형 조작이 실제로 들어가는 지점 */}
        <div
          className={
            (compact ? "mt-3 px-2.5 py-2 " : "mt-6 px-4 py-3 ") +
            "rounded-lg border border-accent/40 bg-accent-soft"
          }
        >
          <p
            className={
              (compact ? "text-[10px] " : "text-sm ") +
              "flex items-start gap-2 leading-relaxed break-keep"
            }
          >
            <span
              aria-hidden
              className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-accent"
            />
            <span>{banner}</span>
          </p>
        </div>

        {/* 이용조건 — 피험자 간 변수 */}
        {!compact && (
          <p className="mt-3 text-xs leading-relaxed text-ott-muted break-keep">{notice.detail}</p>
        )}
      </div>
    </section>
  );
}
