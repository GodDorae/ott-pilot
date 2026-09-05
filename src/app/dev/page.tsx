import {
  GENRES,
  GENRE_LABELS,
  RATIONALE_LABELS,
  SEQUENCES,
  SET_MAPPINGS,
  TOTAL_CELLS,
  USAGE_CONDITIONS,
  assignmentToCell,
  type RationaleType,
} from "@/lib/experiment";
import { overridesToQuery, parseOverrides } from "@/lib/devsession";
import { devAccessAllowed } from "@/lib/devaccess";
import Link from "next/link";
import { STAGE_LABELS, STEPS } from "@/lib/steps";
import { buildContextSnapshot } from "@/lib/copy";

/**
 * 미리보기 인덱스 — 단계를 골라 바로 들어갈 수 있고, 그 전에 조건을 지정할 수 있다.
 *
 * 조건 선택은 링크(쿼리스트링)로만 동작한다. 클라이언트 상태가 없으니
 * 링크를 그대로 복사해 지도교수님께 보내면 같은 화면이 열린다.
 */
export const dynamic = "force-dynamic";

export default async function DevIndexPage({ searchParams }: PageProps<"/dev">) {
  const sp = await searchParams;
  const flat = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") flat.set(k, v);
  }

  const key = flat.get("key");
  if (!(await devAccessAllowed(key))) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-16">
        <h1 className="text-lg font-bold">접근 권한이 없습니다</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted break-keep">
          배포 환경에서는 <a href="/admin" className="text-accent underline">관리자 화면</a>
          에서 먼저 로그인해야 합니다.
        </p>
      </main>
    );
  }

  const o = parseOverrides(flat);
  const keySuffix = key ? "&key=" + encodeURIComponent(key) : "";
  const query = overridesToQuery(o) + keySuffix;
  const cell = assignmentToCell(o.usage, o.sequenceIndex, o.mappingIndex);

  /** 조건 하나만 바꾼 /dev 링크 */
  const swap = (patch: Partial<typeof o>) =>
    "/dev?" + overridesToQuery({ ...o, ...patch }) + keySuffix;

  const chip = (active: boolean) =>
    "rounded-lg border px-3 py-2 text-xs font-bold transition " +
    (active
      ? "border-accent bg-accent text-white"
      : "border-line bg-card hover:border-muted/50");

  const previewCtx = buildContextSnapshot(new Date(), true);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold tracking-widest text-accent">
        DEV PREVIEW
      </span>
      <h1 className="mt-3 text-xl font-bold break-keep">설문 단계 미리보기</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted break-keep">
        설문을 처음부터 채우지 않고 각 단계를 바로 열어볼 수 있습니다. 사전 문항은 기본값으로
        미리 채워지고, 조건은 아래에서 직접 지정합니다. 여기서 만든 세션은{" "}
        <code>is_dev</code> 로 표시되어 분석 데이터와 배정 카운트에서 제외됩니다.
      </p>

      {/* 조건 지정 */}
      <section className="mt-7 rounded-xl border border-line bg-card p-4 sm:p-5">
        <p className="text-sm font-bold">조건 지정</p>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold text-muted">
              이용조건 <span className="font-normal">(피험자 간)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {USAGE_CONDITIONS.map((u) => (
                <Link key={u} href={swap({ usage: u })} className={chip(o.usage === u)}>
                  {u === "SVOD" ? "SVOD 구독 포함" : "TVOD 5,500원 대여"}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-muted">
              제시 순서 <span className="font-normal">(3! = 6개 시퀀스)</span>
            </p>
            <div className="flex flex-col gap-2">
              {SEQUENCES.map((order, i) => (
                <Link
                  key={i}
                  href={swap({ sequenceIndex: i })}
                  className={chip(o.sequenceIndex === i) + " text-left"}
                >
                  Seq {i + 1}. {order.map((r) => RATIONALE_LABELS[r]).join(" → ")}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-muted">세트 매칭</p>
            <div className="flex flex-col gap-2">
              {SET_MAPPINGS.map((m, i) => (
                <Link
                  key={i}
                  href={swap({ mappingIndex: i })}
                  className={chip(o.mappingIndex === i) + " text-left"}
                >
                  {i}.{" "}
                  {(Object.keys(m) as RationaleType[])
                    .map((r) => RATIONALE_LABELS[r] + " = " + m[r])
                    .join(" · ")}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-muted">
              선호 장르 <span className="font-normal">(포스터 세트를 결정)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <Link key={g} href={swap({ genre: g })} className={chip(o.genre === g)}>
                  {GENRE_LABELS[g]}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 border-t border-line pt-3 font-mono text-[11px] leading-relaxed text-muted">
          cell {cell} / {TOTAL_CELLS} · 아래 링크에 <span className="text-accent">?{overridesToQuery(o)}</span>{" "}
          가 붙습니다
        </p>
      </section>

      {/* 단계 목록 — 기조 문서의 4단계로 묶어서 */}
      {([1, 2, 3, 4] as const).map((stage) => (
        <section key={stage} className="mt-6">
          <p className="mb-2 text-xs font-bold text-muted">{STAGE_LABELS[stage]}</p>
          <ul className="flex flex-col gap-2">
            {STEPS.filter((s) => s.stage === stage).map((s) => (
              <li key={s.n}>
                {/* /dev/<n> 은 페이지가 아니라 쿠키를 심고 리디렉트하는 Route Handler 라
                    Link 로 클라이언트 이동하면 안 된다 */}
                <a
                  href={"/dev/" + s.n + "?" + query}
                  className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 transition hover:border-accent/50"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-white tabular-nums">
                    {s.n}
                  </span>
                  <span className="w-7 shrink-0 font-mono text-[11px] text-muted uppercase">
                    {s.id}
                  </span>
                  <span className="text-sm font-bold break-keep">{s.label}</span>
                  <span className="ml-auto shrink-0 font-mono text-[11px] text-muted">
                    {s.path}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-8 rounded-xl border border-dashed border-line p-4">
        <p className="text-xs font-bold">지금 조건에서 맥락 배너 문구</p>
        <p className="mt-1.5 text-sm leading-relaxed break-keep">{previewCtx.phrase}</p>
        <p className="mt-1.5 text-[11px] text-muted break-keep">
          모바일 접속 기준으로 지금 시각에 맞춰 만든 문구입니다.
          실제 참여자는 접속한 기기와 시각에 따라 달라집니다.
        </p>
      </section>

      <div className="mt-8 flex gap-4 border-t border-line pt-6 text-sm">
        <Link href="/" className="text-accent underline">
          ← 실제 설문 시작 (/)
        </Link>
        <a href="/admin" className="text-muted underline">
          관리자 화면
        </a>
      </div>
    </main>
  );
}
