import { dbDriver, listAll } from "@/lib/db";
import {
  RATIONALE_LABELS,
  RATIONALE_TYPES,
  SEQUENCES,
  SET_MAPPINGS,
  TOTAL_CELLS,
  USAGE_CONDITIONS,
  type RationaleType,
} from "@/lib/experiment";
import Link from "next/link";
import { Fragment } from "react";
import { PRE_SECTIONS } from "@/lib/presurvey";
import { INSTRUMENT_VERSION, PHASES, PHASE_LABELS, SURVEY_PHASE, type Phase } from "@/lib/phase";
import AdminLogin from "@/components/AdminLogin";
import { adminPasswordMissing, isAdmin } from "@/lib/adminauth";

/** 관리자 화면에 분포를 띄울 사전 문항 (전부 띄우면 산만해져서 골랐다) */
const PRE_SUMMARY_QUESTIONS = [
  { id: "age_group", code: "A-1", title: "연령대" },
  { id: "gender", code: "A-2", title: "성별" },
  { id: "ott_platform", code: "B-1", title: "주 이용 플랫폼" },
  { id: "rec_selection_freq", code: "B-3", title: "추천 선택 빈도" },
  { id: "primary_device", code: "B-4", title: "주 이용 기기" },
  { id: "viewing_timeslot", code: "B-5", title: "주 감상 시간대" },
] as const;

/**
 * 응답 모니터링 화면. 비밀번호를 한 번 입력하면 쿠키로 유지된다.
 *
 * 여기서 봐야 하는 것:
 *  1) 조건 배정이 균형을 이루는가 (라틴방격 · 세트매칭 · 이용조건)
 *  2) 조작점검 정답률 — 낮으면 배너 문구/시각 강조를 다시 설계해야 한다
 */
export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-shadow rounded-xl border border-line bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const { phase: phaseParam, e } = await searchParams;

  if (adminPasswordMissing()) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-16">
        <h1 className="text-lg font-bold">ADMIN_PASSWORD 가 설정되지 않았습니다</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted break-keep">
          <code>.env.local</code> 에 <code>ADMIN_PASSWORD</code> 를 넣고 서버를 다시
          시작하세요.
        </p>
      </main>
    );
  }

  if (!(await isAdmin())) {
    return <AdminLogin failed={e === "1"} />;
  }

  // 보고 있는 단계 — 기본은 지금 수집 중인 단계
  const viewing: Phase | "all" =
    phaseParam === "all"
      ? "all"
      : PHASES.includes(phaseParam as Phase)
        ? (phaseParam as Phase)
        : SURVEY_PHASE;

  const { participants, responses } = await listAll(viewing);

  // 조건이 아직 배정되지 않은 참여자 (사전 문항 진행 중 · 선별 제외) — 어느 군에도 안 든다
  const unassigned = participants.filter((p) => !p.usage_condition).length;
  const completed = participants.filter((p) => p.completed_at);

  // 조작점검 정답률 — 조절변수(이용조건) 인지 여부, 참여자당 1건
  const checked = participants.filter((p) => p.mc_usage_answer);
  const accuracy = checked.length
    ? Math.round((checked.filter((p) => p.mc_usage_correct).length / checked.length) * 100)
    : null;

  /*
    화면 응답에는 이용조건이 없다 (participants 에만 있다). 이용조건별로 갈라 보려면
    참여자 id → 이용조건 표를 만들어 두고 화면 응답을 그것으로 걸러야 한다.
  */
  const usageOf = new Map(participants.map((p) => [p.id, p.usage_condition]));

  /** 이용조건별로 갈라 보는 세 묶음 — 계 · SVOD · TVOD */
  const GROUPS = [
    { key: "all" as const, label: "계" },
    ...USAGE_CONDITIONS.map((u) => ({ key: u, label: u })),
  ];

  // 근거유형별 평균 (표본이 작을 때는 어디까지나 눈대중용)
  const byRationale = RATIONALE_TYPES.flatMap((rt) =>
    GROUPS.map((g) => {
      const rows = responses.filter(
        (r) =>
          r.rationale_type === rt &&
          (g.key === "all" || usageOf.get(r.participant_id) === g.key),
      );
      const avg = (keys: ("pu1" | "pu2" | "pu3" | "ra1" | "ra2" | "ra3")[]) => {
        const nums = rows.flatMap((r) =>
          keys.map((k) => r[k]).filter((v): v is number => v !== null),
        );
        return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : "-";
      };
      return {
        rationale: rt,
        group: g.label,
        isTotal: g.key === "all",
        n: rows.length,
        pu: avg(["pu1", "pu2", "pu3"]),
        ra: avg(["ra1", "ra2", "ra3"]),
        dwell: (() => {
          const ms = rows.map((r) => r.dwell_ms).filter((v): v is number => v !== null);
          return ms.length
            ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length / 1000) + "초"
            : "-";
        })(),
      };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-accent">ADMIN</p>
          <h1 className="mt-1 text-xl font-bold">응답 모니터링</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dev"
            className="rounded-lg border border-line px-3 py-2.5 text-sm font-bold text-muted"
          >
            /dev 미리보기
          </Link>
          <a
            href={"/api/admin/export?phase=" + viewing}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white"
          >
            CSV 내려받기
          </a>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="px-2 py-2.5 text-sm text-muted underline">
              로그아웃
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-xs">
        <span className="text-muted">
          수집 중:{" "}
          <strong className="text-fg">{PHASE_LABELS[SURVEY_PHASE]}</strong>
          <span className="ml-1 font-mono text-[11px]">
            ({SURVEY_PHASE} · {INSTRUMENT_VERSION})
          </span>
        </span>
        <span className="text-line">|</span>
        <span className="text-muted">
          저장:{" "}
          <strong className={dbDriver === "supabase" ? "text-fg" : "text-accent"}>
            {dbDriver === "supabase" ? "Supabase" : "로컬 .data (개발용)"}
          </strong>
        </span>
        <span className="ml-auto flex items-center gap-1">
          <span className="text-muted">보기</span>
          {([...PHASES, "all"] as const).map((v) => (
            <a
              key={v}
              href={"/admin?phase=" + v}
              className={
                "rounded-md px-2 py-1 font-medium transition " +
                (viewing === v ? "bg-accent text-white" : "text-muted hover:bg-line/50")
              }
            >
              {v === "all" ? "전체" : PHASE_LABELS[v]}
            </a>
          ))}
        </span>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="시작한 참여자" value={String(participants.length)} />
        <Stat label="완료한 참여자" value={String(completed.length)} />
        <Stat
          label="저장된 화면 응답"
          value={String(responses.length)}
          hint="완료 시 1인 3건"
        />
        <Stat
          label="조작점검 정답률"
          value={accuracy === null ? "-" : accuracy + "%"}
          hint="4-1 이용조건 인지"
        />
        <Stat
          label="모바일 응답"
          value={(() => {
            const known = participants.filter((p) => p.is_mobile !== null);
            if (known.length === 0) return "-";
            const m = known.filter((p) => p.is_mobile).length;
            return m + " / " + known.length;
          })()}
          hint="나머지는 PC·태블릿"
        />
        <Stat
          label="성실성 통과"
          value={(() => {
            const done = responses.filter((r) => r.attention_passed !== null);
            if (done.length === 0) return "-";
            return Math.round((done.filter((r) => r.attention_passed).length / done.length) * 100) + "%";
          })()}
          hint="화면 단위 · 낮으면 응답 제외 검토"
        />
        <Stat
          label="이미 본 작품"
          value={(() => {
            const answered = participants.filter((p) => p.seen_title_ids !== null);
            if (answered.length === 0) return "-";
            const total = answered.reduce((a, p) => a + (p.seen_title_ids?.length ?? 0), 0);
            return (total / answered.length).toFixed(1) + "편";
          })()}
          hint="1인 평균 / 12편 중"
        />
        <Stat
          label="선별 제외"
          value={String(participants.filter((p) => p.screened_out_at).length)}
          hint="OTT 이용 경험 없음"
        />
        <Stat
          label="배정 전 이탈"
          value={String(participants.filter((p) => !p.usage_condition).length)}
          hint="셀을 차지하지 않음"
        />
      </section>

      {/* 배정 균형 */}
      <h2 className="mt-10 text-sm font-bold">조건 배정 균형</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted break-keep">
세 축(이용조건 2 · 시퀀스 6 · 세트매칭 3)을 각각 독립적으로 균형시킵니다. 각 축에서
        지금까지 가장 적게 쓰인 값을 고르고 동률이면 그중 무작위이므로, 표본이 작아도
        <strong className="text-fg">아래 합계 행</strong>이 고르게 채워집니다. 셀 단위(총{" "}
        {TOTAL_CELLS}개)까지 맞추지는 않으니 표 안쪽 숫자는 들쭉날쭉해도 정상입니다.
        배정은 사전 문항과 장르 선택을 끝낸 시점에 일어나므로, 그 전에 이탈한 사람은
        아무 칸도 차지하지 않습니다.
      </p>
      <div className="pretty-scroll mt-3 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">제시 순서 (3! = 6 시퀀스)</th>
              <th className="py-2 pr-3 font-medium">세트 매칭</th>
              {USAGE_CONDITIONS.map((u) => (
                <th key={u} className="py-2 pr-3 font-medium tabular-nums">
                  {u}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEQUENCES.map((order, oi) =>
              SET_MAPPINGS.map((mapping, mi) => (
                <tr key={oi + "-" + mi} className="border-b border-line/60">
                  <td className="py-2 pr-3 text-xs break-keep">
                    <span className="mr-1.5 font-mono text-muted">S{oi + 1}</span>
                    {order.map((r) => RATIONALE_LABELS[r]).join(" → ")}
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted">
                    {(Object.keys(mapping) as RationaleType[])
                      .map((r) => RATIONALE_LABELS[r].slice(0, 2) + "=" + mapping[r])
                      .join(" ")}
                  </td>
                  {USAGE_CONDITIONS.map((u) => (
                    <td key={u} className="py-2 pr-3 tabular-nums">
                      {
                        participants.filter(
                          (p) =>
                            p.sequence_index === oi &&
                            p.mapping_index === mi &&
                            p.usage_condition === u,
                        ).length
                      }
                    </td>
                  ))}
                </tr>
              )),
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line text-xs">
              <td className="py-2 pr-3 font-bold">시퀀스별 합계 (1:1:1:1:1:1 기대)</td>
              <td className="py-2 pr-3 text-muted" colSpan={1 + USAGE_CONDITIONS.length}>
                {SEQUENCES.map(
                  (_, si) =>
                    "S" +
                    (si + 1) +
                    " " +
                    participants.filter((p) => p.sequence_index === si).length,
                ).join(" · ")}
              </td>
            </tr>
            <tr className="text-xs">
              <td className="py-2 pr-3 font-bold">이용조건별 합계 (1:1 기대)</td>
              <td className="py-2 pr-3 text-muted" colSpan={1 + USAGE_CONDITIONS.length}>
                {USAGE_CONDITIONS.map(
                  (u) => u + " " + participants.filter((p) => p.usage_condition === u).length,
                ).join(" · ")}
              </td>
            </tr>
            <tr className="text-xs">
              <td className="py-2 pr-3 font-bold">세트매칭별 합계 (1:1:1 기대)</td>
              <td className="py-2 pr-3 text-muted" colSpan={1 + USAGE_CONDITIONS.length}>
                {SET_MAPPINGS.map(
                  (_, mi) =>
                    "M" + mi + " " + participants.filter((p) => p.mapping_index === mi).length,
                ).join(" · ")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/*
        근거유형별 요약 — 이용조건별로 갈라서 본다.

        이 연구의 가설이 "근거유형 효과가 이용조건에 따라 달라진다"(조절효과)이므로,
        전체 평균만 보면 정작 봐야 할 것이 안 보인다. 근거유형마다 계 · SVOD · TVOD
        세 줄을 붙여, 두 조건에서 순서가 뒤집히는지 눈으로 확인할 수 있게 한다.

        n 이 작은 동안 숫자를 해석하지 말 것 — 여기 있는 것은 수집이 굴러가는지
        보기 위한 눈대중이고, 검정은 CSV 로 따로 한다.
      */}
      <h2 className="mt-10 text-sm font-bold">근거유형별 요약</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted break-keep">
        조절효과를 보려면 두 이용조건을 갈라서 봐야 합니다. n 이 작을 때는 눈대중입니다.
      </p>
      <div className="pretty-scroll mt-3 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">근거유형</th>
              <th className="py-2 pr-3 font-medium">구분</th>
              <th className="py-2 pr-3 font-medium">n</th>
              <th className="py-2 pr-3 font-medium">유용성 평균</th>
              <th className="py-2 pr-3 font-medium">수용의도 평균</th>
              <th className="py-2 pr-3 font-medium">평균 체류시간</th>
            </tr>
          </thead>
          <tbody>
            {byRationale.map((row) => (
              <tr
                key={row.rationale + row.group}
                className={row.isTotal ? "border-t border-line" : "border-b border-line/40"}
              >
                {/* 근거유형 이름은 묶음의 첫 줄(계)에만 — 세 번 반복하면 표가 읽히지 않는다 */}
                <td className="py-2 pr-3 font-medium break-keep">
                  {row.isTotal ? RATIONALE_LABELS[row.rationale] : ""}
                </td>
                <td
                  className={
                    "py-2 pr-3 text-xs tabular-nums " +
                    (row.isTotal ? "font-bold" : "text-accent")
                  }
                >
                  {row.group}
                </td>
                <td className="py-2 pr-3 tabular-nums">{row.n}</td>
                <td className={"py-2 pr-3 tabular-nums " + (row.isTotal ? "font-bold" : "")}>
                  {row.pu}
                </td>
                <td className={"py-2 pr-3 tabular-nums " + (row.isTotal ? "font-bold" : "")}>
                  {row.ra}
                </td>
                <td className="py-2 pr-3 tabular-nums text-muted">{row.dwell}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4단계 사후 문항 요약 */}
      {/*
        사후 점검 요약 — 이용조건별로 갈라서 본다.

        순위는 세 근거유형을 직접 비교하게 한 문항이라, 조절효과가 있다면 두 조건에서
        1위가 갈린다. 전체 합계만 보면 그게 지워진다.

        1위 득표수와 평균 순위를 함께 적는다 — 1위만 보면 2·3위가 몰린 유형과
        고르게 퍼진 유형이 구분되지 않는다.
      */}
      <h2 className="mt-10 text-sm font-bold">사후 점검 요약</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted break-keep">
        칸마다 <span className="tabular-nums">1위 득표수 (평균 순위)</span> 입니다.
        순위를 제출한 참여자만 셉니다.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="card-shadow rounded-xl border border-line bg-card p-4">
          <p className="text-xs font-bold">
            <span className="text-accent">4-1</span> 추천 화면 순위
          </p>

          <div className="mt-2 grid grid-cols-[1fr_3.4rem_3.4rem_3.4rem] gap-x-2 text-xs">
            <span />
            {GROUPS.map((g) => (
              <span
                key={g.key}
                className={
                  "text-right text-[10px] font-bold " +
                  (g.key === "all" ? "text-muted" : "text-accent")
                }
              >
                {g.label}
              </span>
            ))}

            {RATIONALE_TYPES.map((rt) => {
              const col = ("rank_" + rt) as "rank_content" | "rank_collab" | "rank_context";
              return (
                <Fragment key={rt}>
                  <span className="break-keep">{RATIONALE_LABELS[rt]}</span>
                  {GROUPS.map((g) => {
                    const rows = participants.filter(
                      (p) =>
                        p[col] !== null &&
                        (g.key === "all" || p.usage_condition === g.key),
                    );
                    const firsts = rows.filter((p) => p[col] === 1).length;
                    const vals = rows.map((p) => p[col]).filter((v): v is number => v !== null);
                    const mean = vals.length
                      ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
                      : "-";
                    return (
                      <span
                        key={g.key}
                        className={
                          "text-right tabular-nums " +
                          (g.key === "all" ? "font-bold" : "text-muted")
                        }
                      >
                        {vals.length ? firsts + " (" + mean + ")" : "·"}
                      </span>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>

        {/*
          이용조건 조작점검 — 배정된 조건을 맞혔는지. 이건 조건별로 봐야 뜻이 있다.
          한쪽 조건에서만 정답률이 낮으면 그 조건의 안내 문구가 전달되지 않은 것이고,
          조절변수가 걸리지 않았다는 뜻이라 문구를 다시 설계해야 한다.
        */}
        <div className="card-shadow rounded-xl border border-line bg-card p-4">
          <p className="text-xs font-bold">
            <span className="text-accent">3-4-1</span> 이용조건 조작점검
          </p>
          <div className="mt-2 grid grid-cols-[1fr_3.4rem_3.4rem_3.4rem] gap-x-2 text-xs">
            <span />
            {GROUPS.map((g) => (
              <span
                key={g.key}
                className={
                  "text-right text-[10px] font-bold " +
                  (g.key === "all" ? "text-muted" : "text-accent")
                }
              >
                {g.label}
              </span>
            ))}

            {(
              [
                ["응답", (rows: typeof participants) => rows.length + "명"],
                [
                  "정답",
                  (rows: typeof participants) =>
                    rows.length
                      ? Math.round(
                          (rows.filter((p) => p.mc_usage_correct).length / rows.length) * 100,
                        ) + "%"
                      : "·",
                ],
              ] as const
            ).map(([label, render]) => (
              <Fragment key={label}>
                <span>{label}</span>
                {GROUPS.map((g) => {
                  const rows = participants.filter(
                    (p) =>
                      p.mc_usage_answer &&
                      (g.key === "all" || p.usage_condition === g.key),
                  );
                  return (
                    <span
                      key={g.key}
                      className={
                        "text-right tabular-nums " +
                        (g.key === "all" ? "font-bold" : "text-muted")
                      }
                    >
                      {render(rows)}
                    </span>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted break-keep">
            정답률이 한쪽 조건에서만 낮으면 그 조건의 안내 문구가 전달되지 않은 것입니다.
          </p>
        </div>
      </div>

      {/*
        응답자 구성 — 사전 문항 A·B 분포.

        이용조건별로 갈라서 보여준다. 이용조건은 피험자 간 변수라, 두 군의 구성이
        서로 다르면 근거유형 효과가 아니라 "두 군이 애초에 다른 사람들이었다" 로도
        설명될 수 있다. 무작위 배정이 그걸 막아 주는 장치이지만, 실제로 그렇게
        됐는지는 수집 중에 눈으로 확인해야 한다.

        조건이 배정되기 전(사전 문항 진행 중)이거나 선별 제외된 참여자는 어느 군에도
        속하지 않으므로 계 = SVOD + TVOD 가 아니다. 미배정 수를 따로 적어 둔다.
      */}
      <h2 className="mt-10 text-sm font-bold">응답자 구성</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted break-keep">
        표본이 한쪽으로 심하게 쏠려 있으면 모집 경로를 손봐야 합니다. 두 이용조건의
        구성이 크게 다르면 조건 효과와 표본 차이가 섞이므로 함께 봅니다.
      </p>
      <p className="mt-2 text-xs text-muted tabular-nums">
        {USAGE_CONDITIONS.map((u) => (
          <span key={u} className="mr-3">
            <span className="font-bold text-fg">{u}</span>{" "}
            {participants.filter((p) => p.usage_condition === u).length}명
          </span>
        ))}
        {unassigned > 0 && <span className="mr-3">미배정 {unassigned}명</span>}
        <span>계 {participants.length}명</span>
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {PRE_SUMMARY_QUESTIONS.map(({ id, code, title }) => {
          const q = Object.values(PRE_SECTIONS)
            .flatMap((s) => s.questions)
            .find((q) => q.id === id)!;
          const value = (p: (typeof participants)[number]) =>
            p[id as keyof typeof p] as string | null;
          const count = (choice: string | null, usage?: string) =>
            participants.filter(
              (p) =>
                (choice === null ? !value(p) : value(p) === choice) &&
                (usage === undefined || p.usage_condition === usage),
            ).length;

          return (
            <div key={id} className="card-shadow rounded-xl border border-line bg-card p-4">
              <p className="text-xs font-bold">
                <span className="text-accent">{code}</span> {title}
              </p>

              <div className="mt-2 grid grid-cols-[1fr_2.2rem_2.2rem_2.2rem] gap-x-2 text-xs">
                <span />
                <span className="text-right text-[10px] font-bold text-muted">계</span>
                {USAGE_CONDITIONS.map((u) => (
                  <span key={u} className="text-right text-[10px] font-bold text-accent">
                    {u}
                  </span>
                ))}

                {q.choices.map((c) => {
                  const total = count(c.value);
                  return (
                    <Fragment key={c.value}>
                      <span className={"break-keep " + (total ? "" : "text-muted")}>{c.label}</span>
                      <span className="text-right tabular-nums">{total || "·"}</span>
                      {USAGE_CONDITIONS.map((u) => {
                        const n = count(c.value, u);
                        return (
                          <span
                            key={u}
                            className={"text-right tabular-nums " + (n ? "text-muted" : "text-faint")}
                          >
                            {n || "·"}
                          </span>
                        );
                      })}
                    </Fragment>
                  );
                })}

                {count(null) > 0 && (
                  <>
                    <span className="mt-1 border-t border-line pt-1 text-muted break-keep">
                      미응답 (진행 중)
                    </span>
                    <span className="mt-1 border-t border-line pt-1 text-right text-muted tabular-nums">
                      {count(null)}
                    </span>
                    {USAGE_CONDITIONS.map((u) => (
                      <span
                        key={u}
                        className="mt-1 border-t border-line pt-1 text-right text-faint tabular-nums"
                      >
                        {count(null, u) || "·"}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </main>
  );
}
