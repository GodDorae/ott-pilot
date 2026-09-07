/* eslint-disable */
// CommonJS 로 둔다 — package.json 에 type:module 이 없어 .cjs 가 아니면 require 가 막힌다
/**
 * 조건 배분 검사 — 실제 참여자와 같은 방식으로 설문을 끝까지 돌려 배정이 설계대로
 * 나오는지 본다. audit.cjs 와 달리 흔적을 지우지 않는다: Supabase 에 그대로 남겨
 * 관리자 화면·CSV 로도 확인할 수 있게 한다.
 *
 *   실행: node scripts/balance.cjs [명수] [기준url]
 *   보기: node scripts/balance.cjs 36 https://ott-sehyeon-graduation.vercel.app
 *
 * ── 무엇을 보장한다고 했는지 ──────────────────────────────────────────
 * assign_next_cell(phase) 은 **축별(marginal) 균형**을 보장한다 (36셀 전체 균형이
 * 아니다 — 20260905050000_marginal_balancing.sql 의 판단).
 *   · 이용조건 2개  → 1:1
 *   · 시퀀스  6개   → 1:1:1:1:1:1
 *   · 세트매칭 3개  → 1:1:1
 * 각 축에서 "지금까지 가장 적게 쓰인 값"을 고르고 동률이면 무작위. 세는 대상은
 * 같은 phase 의 실참여자 + 진행 중 마커(pending)다. 그러므로 한 명씩 끝까지 마치며
 * 넣으면 각 축의 칸 수는 floor/ceil(N/k) 로 딱 떨어져야 한다.
 *
 * 3원 교차(2×6×3=36셀)는 균형시키지 않는다. 이 검사도 셀 분포는 **보고만** 하고
 * 통과 조건으로 삼지 않는다 — 안 하기로 한 것을 검사하면 없는 실패가 생긴다.
 */
const fs = require("fs");
const path = require("path");

const PROJECT = path.join(__dirname, "..");
const N = Number(process.argv[2] || 36);
const B = process.argv[3] || process.env.BALANCE_BASE || "http://localhost:4100";
/** 동시 접속 검사 인원 */
const CONCURRENT = 12;
/** 중도 이탈 검사 인원 */
const DROPOUTS = 3;

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(PROJECT, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const PHASE = (env.SURVEY_PHASE || "pilot").trim();
const PW = env.ADMIN_PASSWORD;
const SH = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
  "content-type": "application/json",
  Prefer: "return=representation",
};
const rest = (q) => fetch(env.SUPABASE_URL + "/rest/v1/" + q, { headers: SH }).then((r) => r.json());
const del = (q) =>
  fetch(env.SUPABASE_URL + "/rest/v1/" + q, { method: "DELETE", headers: SH });

// ── 설계 상수 (src/lib/experiment.ts 와 같아야 한다) ─────────────────────
const USAGE = ["SVOD", "TVOD"];
const SEQUENCES = [
  ["content", "collab", "context"],
  ["collab", "context", "content"],
  ["context", "content", "collab"],
  ["content", "context", "collab"],
  ["collab", "content", "context"],
  ["context", "collab", "content"],
];
const SET_MAPPINGS = [
  { content: "A", collab: "B", context: "C" },
  { content: "B", collab: "C", context: "A" },
  { content: "C", collab: "A", context: "B" },
];
const GENRES = ["action", "romance", "comedy", "thriller", "drama", "scifi"];

let pass = 0;
const fails = [];
let section = "";
function S(name) {
  section = name;
  console.log("\n" + "─".repeat(72) + "\n" + name);
}
function ck(name, ok, detail) {
  if (ok) {
    pass++;
    console.log("  ✓ " + name);
  } else {
    fails.push(section + " › " + name + (detail ? "  [" + detail + "]" : ""));
    console.log("  ✗ " + name + (detail ? "  → " + detail : ""));
  }
}
function note(text) {
  console.log("    " + text);
}

// ── 참여자 한 명 ─────────────────────────────────────────────────────────
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const likert = () => 1 + Math.floor(Math.random() * 5);

/**
 * 시청 경험 응답 — 그 장르 12편 전부에 답해야 통과한다.
 * 저인지도 가정에 맞춰 대부분 "전혀 모른다", 0~2편만 봤거나 들어본 것으로 둔다.
 */
function familiarityOf(genre) {
  const out = {};
  for (const set of ["A", "B", "C"])
    for (let i = 1; i <= 4; i++) {
      const r = Math.random();
      out[`${genre}-${set}-${i}`] = r < 0.06 ? "watched" : r < 0.18 ? "heard" : "unknown";
    }
  return out;
}

function session(ua) {
  let jar = "";
  return async (p, body, method) => {
    const res = await fetch(B + p, {
      method: method || (body !== undefined ? "POST" : "GET"),
      headers: {
        "content-type": "application/json",
        "user-agent": ua,
        ...(jar ? { cookie: jar } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of set) {
      const pair = c.split(";")[0];
      const name = pair.split("=")[0];
      const rest = jar
        .split("; ")
        .filter((x) => x && x.split("=")[0] !== name)
        .concat(pair);
      jar = rest.join("; ");
    }
    let json = null;
    const text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      /* HTML 응답 */
    }
    return { status: res.status, json, text };
  };
}

/** 사전조사 ~ 장르 제출까지 (= 조건이 배정되는 지점) */
async function upToAssignment(s, opts) {
  const r0 = await s("/api/session/start", {});
  if (r0.status !== 200) throw new Error("start " + r0.status + " " + r0.text.slice(0, 120));
  await s("/api/session/presurvey", {
    section: "demographics",
    answers: { age_group: pick(["10s", "20s", "30s", "40s", "50s_plus"]), gender: pick(["male", "female"]) },
  });
  await s("/api/session/presurvey", {
    section: "usage",
    answers: {
      // '없음'(none)·'사용한 적 없음'(never) 은 선별 제외로 빠지므로 넣지 않는다
      ott_platform: pick(["netflix", "tving", "coupangplay", "wavve", "watcha"]),
      ott_tenure: pick(["under_1m", "1_6m", "6m_1y", "over_1y"]),
      rec_selection_freq: pick(["rarely", "sometimes", "often", "always"]),
      primary_device: pick(["smartphone", "tablet", "pc", "tv"]),
      viewing_timeslot: pick(["morning", "afternoon", "evening", "late_night", "irregular"]),
    },
  });
  const r = await s("/api/session/genre", {
    genre: opts.genre,
    displayName: opts.name,
    familiarity: familiarityOf(opts.genre),
  });
  if (r.status !== 200) throw new Error("genre " + r.status + " " + r.text.slice(0, 200));
  return r;
}

/** 배정 이후 ~ 완료까지 */
async function finish(s, opts) {
  await s("/api/session/brief", PHASE === "pilot" ? { briefUnderstood: likert() } : {});
  for (let t = 1; t <= 3; t++) {
    await s("/api/session/screen", {
      stepIndex: t,
      answers: { pu1: likert(), pu2: likert(), pu3: likert(), ra1: likert(), ra2: likert(), ra3: likert() },
      // 대부분 맞히고 일부는 틀린다 (성실성 확인이 실제로 갈리는지 보려고)
      attentionCheck: Math.random() < 0.85 ? 4 : pick([1, 2, 3, 5]),
      unclearItems: Math.random() < 0.8 ? [] : [pick([1, 2, 3, 5, 6, 7])],
      unclearReason: "번호 표현이 조금 헷갈렸다",
      mcRationale: pick(["content", "collab", "context", "unsure"]),
      wordingNatural: likert(),
      wordingReason: "요일과 시간대를 말하는 게 조금 어색했다",
      scopeUnderstood: pick(["yes", "no", "unsure"]),
      genreFit: likert(),
      dwellMs: 9000 + Math.floor(Math.random() * 20000),
    });
  }
  await s("/api/session/posttest", {
    part: "check",
    answer: pick(["SVOD", "TVOD", "unsure"]),
    priceRealistic: likert(),
    priceBurden: likert(),
    priceReason: "",
    counterfactualInfo: "없음",
  });
  const ranks = [1, 2, 3].sort(() => Math.random() - 0.5);
  await s("/api/session/posttest", {
    part: "ranking",
    ranks: { 1: ranks[0], 2: ranks[1], 3: ranks[2] },
    reason: "첫 화면이 가장 설명이 분명했다",
  });
  await s("/api/session/posttest", {
    part: "open",
    open: {
      open_feeling: "추천 이유가 적혀 있어 눈이 갔다",
      open_notable: "장르를 짚어 준 문구",
      open_missing: "왜 그 작품인지 조금 더",
      open_gap: "평소에는 이유를 잘 안 본다",
      open_purpose: "추천 이유 방식을 비교하는 것 같다",
    },
  });
  if (opts.followup) await s("/api/session/followup", { followup_email: "a@b.co" });
  await s("/api/session/complete", {});
}

async function runOne(i, opts = {}) {
  const s = session(i % 3 === 0 ? DESKTOP_UA : MOBILE_UA);
  const genre = opts.genre ?? GENRES[i % GENRES.length];
  await upToAssignment(s, { genre, name: i % 4 === 0 ? undefined : "참여자" + i });
  if (opts.stopAfterAssignment) return s;
  await finish(s, { followup: i % 7 === 0 });
  return s;
}

// ── 분포 계산 ────────────────────────────────────────────────────────────
const tally = (rows, f) =>
  rows.reduce((o, r) => ((o[f(r)] = (o[f(r)] || 0) + 1), o), {});

/**
 * 이상적 균형에서 얼마나 벗어났는지로 본다.
 *
 * 한 명씩 끝까지 마치며 넣을 때만 칸 수가 floor/ceil 로 딱 떨어진다 (balanceCheck).
 * 참여자가 겹쳐 들어오면 배정 중인 사람이 participants 행과 pending 마커로 한동안
 * 두 번 세어지므로 ±1~2 가 생긴다 — 다음 참여자들이 적은 칸으로 가면서 스스로 메워지는
 * 종류의 오차라, 겹치는 상황에서는 이 검사를 쓴다.
 */
function spreadCheck(label, counts, levels, total) {
  const got = levels.map((l) => counts[l] || 0);
  const ideal = total / levels.length;
  const spread = Math.max(...got.map((c) => Math.abs(c - ideal)));
  ck(
    label + " 쏠림 ≤ 2 (" + levels.length + "칸 · 이상 " + ideal.toFixed(1) + ")",
    spread <= 2,
    levels.map((l, i) => l + ":" + got[i]).join(" ") + " · 최대 편차 " + spread.toFixed(1),
  );
}

function balanceCheck(label, counts, levels, total) {
  const got = levels.map((l) => counts[l] || 0);
  const lo = Math.floor(total / levels.length);
  const hi = Math.ceil(total / levels.length);
  const ok = got.every((c) => c === lo || c === hi) && got.reduce((a, b) => a + b, 0) === total;
  ck(
    label + " 축별 균형 (" + levels.length + "칸 · 기대 " + (lo === hi ? lo : lo + "~" + hi) + ")",
    ok,
    levels.map((l, i) => l + ":" + got[i]).join(" "),
  );
  return got;
}

(async () => {
  console.log(
    "조건 배분 검사 · phase=" + PHASE + " · " + B + "\n" + "  순차 " + N + "명 · 동시 " + CONCURRENT + "명 · 중도이탈 " + DROPOUTS + "명",
  );

  // ── 0
  S("0. DB 비우기");
  {
    await del("screen_responses?id=not.is.null");
    await del("participants?id=not.is.null");
    await del("pending_assignments?id=not.is.null");
    const p = await rest("participants?select=id");
    const r = await rest("screen_responses?select=id");
    const q = await rest("pending_assignments?select=id");
    ck("participants 0", p.length === 0, String(p.length));
    ck("screen_responses 0", r.length === 0, String(r.length));
    ck("pending_assignments 0", q.length === 0, String(q.length));
    const seq = await rest("participants?select=assignment_seq&order=assignment_seq.desc&limit=1");
    note("assignment_seq 는 시퀀스라 비워도 되돌아가지 않는다 — 실수집 직전에 따로 1로 재설정할 것");
  }

  // ── 1
  S("1. 순차 " + N + "명 — 한 명씩 끝까지");
  const t0 = Date.now();
  for (let i = 1; i <= N; i++) {
    await runOne(i);
    if (i % 6 === 0) note(i + "명 완료 (" + Math.round((Date.now() - t0) / 1000) + "초)");
  }
  const seqRows = await rest(
    "participants?select=id,assignment_seq,usage_condition,sequence_index,mapping_index,presentation_order,set_mapping,preferred_genre,completed_at,pending_id,phase,is_dev&is_dev=eq.false&phase=eq." +
      PHASE +
      "&order=assignment_seq",
  );
  ck("참여자 " + N + "명 기록", seqRows.length === N, String(seqRows.length));
  ck(
    "전원 완료",
    seqRows.every((r) => r.completed_at),
    String(seqRows.filter((r) => !r.completed_at).length) + "명 미완료",
  );
  {
    const q = await rest("pending_assignments?select=id");
    ck("진행 중 마커 0 (완료 시 정리)", q.length === 0, String(q.length));
  }
  balanceCheck("이용조건", tally(seqRows, (r) => r.usage_condition), USAGE, N);
  balanceCheck(
    "시퀀스",
    tally(seqRows, (r) => "Seq" + (r.sequence_index + 1)),
    SEQUENCES.map((_, i) => "Seq" + (i + 1)),
    N,
  );
  balanceCheck(
    "세트매칭",
    tally(seqRows, (r) => "M" + r.mapping_index),
    SET_MAPPINGS.map((_, i) => "M" + i),
    N,
  );

  // ── 2
  S("2. 배정 내용이 인덱스와 맞는지");
  {
    const badOrder = seqRows.filter(
      (r) => (r.presentation_order || []).join(">") !== SEQUENCES[r.sequence_index].join(">"),
    );
    ck("제시 순서 = SEQUENCES[sequence_index]", badOrder.length === 0, badOrder.length + "명 불일치");

    const sameMap = (a, b) =>
      a && ["content", "collab", "context"].every((k) => a[k] === b[k]);
    const badMap = seqRows.filter((r) => !sameMap(r.set_mapping, SET_MAPPINGS[r.mapping_index]));
    ck("세트 매칭 = SET_MAPPINGS[mapping_index]", badMap.length === 0, badMap.length + "명 불일치");

    // 세 근거유형이 정확히 한 번씩
    const badPerm = seqRows.filter((r) => {
      const o = [...(r.presentation_order || [])].sort().join(",");
      return o !== "collab,content,context";
    });
    ck("근거유형 3종이 화면마다 한 번씩", badPerm.length === 0, badPerm.length + "명 불일치");

    // 세트도 세 개가 한 번씩 (같은 세트가 두 화면에 오면 자극물이 겹친다)
    const badSets = seqRows.filter((r) => {
      const v = Object.values(r.set_mapping || {}).sort().join(",");
      return v !== "A,B,C";
    });
    ck("포스터 세트 3종이 한 번씩", badSets.length === 0, badSets.length + "명 불일치");

    const seqs = seqRows.map((r) => Number(r.assignment_seq));
    ck("배정 순번 중복 없음", new Set(seqs).size === seqs.length);
    ck(
      "배정 순번 연속",
      seqs.every((v, i) => i === 0 || v === seqs[i - 1] + 1),
      seqs[0] + "~" + seqs[seqs.length - 1],
    );
  }

  // ── 3
  S("3. 화면 기록 — 배정과 어긋나지 않는지");
  {
    const ids = seqRows.map((r) => r.id);
    const scr = await rest(
      "screen_responses?select=participant_id,step_index,rationale_type,set_id,title_ids&participant_id=in.(" +
        ids.join(",") +
        ")&order=participant_id,step_index",
    );
    ck("화면 기록 = 참여자×3", scr.length === N * 3, String(scr.length));
    const byP = new Map(seqRows.map((r) => [r.id, r]));
    const wrongOrder = [];
    const wrongSet = [];
    const railOf = new Map(); // (genre,set) → title_ids 문자열
    const railClash = [];
    for (const r of scr) {
      const p = byP.get(r.participant_id);
      if (!p) continue;
      if (p.presentation_order[r.step_index - 1] !== r.rationale_type) wrongOrder.push(r);
      if (p.set_mapping[r.rationale_type] !== r.set_id) wrongSet.push(r);
      const key = p.preferred_genre + "/" + r.set_id;
      const val = (r.title_ids || []).join("|");
      if (!railOf.has(key)) railOf.set(key, val);
      else if (railOf.get(key) !== val) railClash.push(key);
      if ((r.title_ids || []).length !== 4) railClash.push(key + " (4편 아님)");
    }
    ck("화면 근거유형 = 제시 순서의 그 자리", wrongOrder.length === 0, wrongOrder.length + "건");
    ck("화면 세트 = 그 근거유형에 매칭된 세트", wrongSet.length === 0, wrongSet.length + "건");
    ck(
      "같은 (장르, 세트) 는 늘 같은 4편",
      railClash.length === 0,
      [...new Set(railClash)].join(" "),
    );
    note("쓰인 (장르, 세트) 조합 " + railOf.size + "개");
  }

  // ── 4
  S("4. 동시 접속 " + CONCURRENT + "명 — 같은 순간에 배정을 요청");
  {
    const before = await rest(
      "participants?select=usage_condition,sequence_index,mapping_index&is_dev=eq.false&phase=eq." + PHASE,
    );
    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENT }, (_, i) => runOne(1000 + i)),
    );
    const bad = results.filter((r) => r.status === "rejected");
    ck(
      "전원 오류 없이 완료",
      bad.length === 0,
      bad.map((b) => String(b.reason).slice(0, 80)).join(" | "),
    );
    const after = await rest(
      "participants?select=usage_condition,sequence_index,mapping_index,assignment_seq&is_dev=eq.false&phase=eq." +
        PHASE,
    );
    ck("참여자 " + (N + CONCURRENT) + "명", after.length === N + CONCURRENT, String(after.length));
    const seqs = after.map((r) => Number(r.assignment_seq));
    ck("동시 배정에도 순번 중복 없음", new Set(seqs).size === seqs.length);

    /*
      동시 접속에서는 축별 칸이 정확히 floor/ceil 로 떨어지지 않을 수 있다.
      배정 중인 참여자는 participants 행과 pending 마커로 한동안 두 번 세어지고,
      그 상태로 다음 사람이 배정을 받기 때문이다. 자기교정되는 종류의 오차라
      "완전 균형" 대신 "이상적 균형에서 ±2 이내" 를 본다.
    */
    const total = after.length;
    spreadCheck("이용조건", tally(after, (r) => r.usage_condition), USAGE, total);
    spreadCheck(
      "시퀀스",
      tally(after, (r) => "Seq" + (r.sequence_index + 1)),
      SEQUENCES.map((_, i) => "Seq" + (i + 1)),
      total,
    );
    spreadCheck(
      "세트매칭",
      tally(after, (r) => "M" + r.mapping_index),
      SET_MAPPINGS.map((_, i) => "M" + i),
      total,
    );
    void before;
  }

  // ── 5
  S("5. 중도 이탈 " + DROPOUTS + "명 — 슬롯을 붙들고 있는지");
  const dropIds = [];
  {
    const cellOf = (r) =>
      USAGE.indexOf(r.usage_condition) * 18 + r.sequence_index * 3 + r.mapping_index;
    for (let i = 0; i < DROPOUTS; i++) await runOne(2000 + i, { stopAfterAssignment: true });
    const rows = await rest(
      "participants?select=id,pending_id,usage_condition,sequence_index,mapping_index,completed_at&is_dev=eq.false&completed_at=is.null&phase=eq." +
        PHASE,
    );
    ck("이탈자 " + DROPOUTS + "명 미완료로 남음", rows.length === DROPOUTS, String(rows.length));
    ck(
      "이탈자 전원 조건이 배정됨",
      rows.every((r) => r.usage_condition && r.sequence_index !== null),
    );
    const pend = await rest("pending_assignments?select=id,cell,phase");
    ck("진행 중 마커 " + DROPOUTS + "개 남음", pend.length === DROPOUTS, String(pend.length));
    const held = new Set(rows.map((r) => r.pending_id));
    ck(
      "마커가 이탈자의 것과 맞음",
      pend.every((q) => held.has(q.id)),
      pend.map((q) => q.cell).join(","),
    );
    ck(
      "마커 셀 = 이탈자 배정 셀",
      pend.every((q) => rows.some((r) => cellOf(r) === q.cell)),
      pend.map((q) => q.cell).join(",") + " vs " + rows.map(cellOf).join(","),
    );
    note("이 마커들이 카운터에 들어가므로, 다음 참여자는 같은 칸을 피해 배정된다 (TTL 20분)");
    for (const r of rows) dropIds.push(r);
  }

  // ── 6
  S("6. 이탈자를 세고 있는지 — 바로 다음 한 명");
  {
    const pend = await rest("pending_assignments?select=cell");
    const heldSeq = new Set(pend.map((q) => Math.floor((q.cell % 18) / 3)));
    const s = await runOne(3000, { stopAfterAssignment: true });
    const row = (
      await rest(
        "participants?select=id,pending_id,sequence_index,usage_condition,mapping_index&is_dev=eq.false&phase=eq." +
          PHASE +
          "&order=assignment_seq.desc&limit=1",
      )
    )[0];
    /*
      이탈자가 붙든 시퀀스는 카운터가 +1 된 상태다. 남은 시퀀스 중 더 적은 것이 있으면
      그쪽으로 가야 한다 — 붙든 칸을 그대로 다시 주면 마커를 세지 않는다는 뜻이다.
      (모든 시퀀스가 동률이면 붙든 칸도 정당한 선택이므로 그때는 검사하지 않는다.)
    */
    const rows = await rest(
      "participants?select=sequence_index&is_dev=eq.false&phase=eq." + PHASE,
    );
    const cnt = tally(rows, (r) => r.sequence_index);
    const min = Math.min(...SEQUENCES.map((_, i) => cnt[i] || 0));
    const maxCnt = Math.max(...SEQUENCES.map((_, i) => cnt[i] || 0));
    ck(
      "새 참여자가 가장 적은 시퀀스로 감",
      (cnt[row.sequence_index] || 0) <= min + 1,
      "받은 Seq" + (row.sequence_index + 1) + " · 분포 " + JSON.stringify(cnt),
    );
    ck("시퀀스 최대-최소 ≤ 2", maxCnt - min <= 2, maxCnt + " - " + min);
    dropIds.push(row);
    void s;
    void heldSeq;
  }

  // ── 7
  S("7. 분포 보고 (통과 조건 아님)");
  {
    const rows = await rest(
      "participants?select=usage_condition,sequence_index,mapping_index,completed_at,preferred_genre,is_mobile&is_dev=eq.false&phase=eq." +
        PHASE,
    );
    const done = rows.filter((r) => r.completed_at);
    const cell = (r) =>
      USAGE.indexOf(r.usage_condition) * 18 + r.sequence_index * 3 + r.mapping_index;
    const cells = tally(done, cell);
    const used = Object.keys(cells).length;
    note("완료 " + done.length + "명 · 채워진 셀 " + used + "/36 · 셀당 " +
      Math.min(...Object.values(cells)) + "~" + Math.max(...Object.values(cells)) + "명");
    note("3원 교차는 설계상 균형 대상이 아니다 (축별 균형만 보장) — 위 숫자는 참고용");
    const grid = [];
    for (const u of USAGE) {
      for (let s = 0; s < 6; s++) {
        const row = [];
        for (let m = 0; m < 3; m++) {
          const c = USAGE.indexOf(u) * 18 + s * 3 + m;
          row.push(String(cells[c] || 0));
        }
        grid.push("    " + u + " Seq" + (s + 1) + "  M0~M2: " + row.join(" "));
      }
    }
    console.log(grid.join("\n"));
    note("장르 분포: " + JSON.stringify(tally(done, (r) => r.preferred_genre)));
    note(
      "기기: mobile " +
        done.filter((r) => r.is_mobile).length +
        " · desktop " +
        done.filter((r) => !r.is_mobile).length,
    );
  }

  // ── 8
  S("8. CSV · 코드북");
  {
    const buf = Buffer.from(
      await fetch(B + "/api/admin/export?key=" + PW + "&phase=" + PHASE).then((r) =>
        r.arrayBuffer(),
      ),
    );
    const csv = buf.toString("utf8").replace(/^﻿/, "");
    const [h, ...rows] = csv.trim().split(/\r?\n/);
    const H = h.split(",");
    const done = (
      await rest(
        "participants?select=id&is_dev=eq.false&completed_at=not.is.null&phase=eq." + PHASE,
      )
    ).length;
    ck("CSV 행 = 완료자×3", rows.length === done * 3, rows.length + " vs " + done * 3);
    const at = (name) => H.indexOf(name);
    for (const c of ["usage_condition", "sequence_index", "mapping_index", "presentation_order", "rationale_type", "set_id"])
      ck("CSV 열: " + c, at(c) >= 0);
    // CSV 안에서도 축별 분포가 같은지 (뷰와 앱이 어긋나지 않았는지)
    const uniq = new Map();
    for (const line of rows) {
      const f = line.split(",");
      uniq.set(f[at("participant_code")], f[at("usage_condition")]);
    }
    const csvU = tally([...uniq.values()], (v) => v);
    const dbU = tally(
      await rest(
        "participants?select=usage_condition&is_dev=eq.false&completed_at=not.is.null&phase=eq." +
          PHASE,
      ),
      (r) => r.usage_condition,
    );
    ck(
      "CSV 이용조건 분포 = DB 분포",
      JSON.stringify(csvU) === JSON.stringify(dbU),
      JSON.stringify(csvU) + " vs " + JSON.stringify(dbU),
    );
  }

  // ── 9
  S("9. 이탈자 정리");
  {
    // 남겨 두면 다음 수집의 카운터에 20분간 섞인다. 완료자만 남긴다.
    for (const r of dropIds) {
      if (r.pending_id) await del("pending_assignments?id=eq." + r.pending_id);
      await del("participants?id=eq." + r.id);
    }
    const left = await rest(
      "participants?select=id&is_dev=eq.false&completed_at=is.null&phase=eq." + PHASE,
    );
    const pend = await rest("pending_assignments?select=id");
    ck("미완료자 0", left.length === 0, String(left.length));
    ck("진행 중 마커 0", pend.length === 0, String(pend.length));
    const rows = await rest(
      "participants?select=usage_condition,sequence_index,mapping_index&is_dev=eq.false&phase=eq." +
        PHASE,
    );
    note("Supabase 에 남는 완료자: " + rows.length + "명");
    /* 동시 접속분이 섞여 있으므로 정확한 floor/ceil 을 요구하지 않는다 (spreadCheck 주석) */
    spreadCheck("최종 이용조건", tally(rows, (r) => r.usage_condition), USAGE, rows.length);
    spreadCheck(
      "최종 시퀀스",
      tally(rows, (r) => "Seq" + (r.sequence_index + 1)),
      SEQUENCES.map((_, i) => "Seq" + (i + 1)),
      rows.length,
    );
    spreadCheck(
      "최종 세트매칭",
      tally(rows, (r) => "M" + r.mapping_index),
      SET_MAPPINGS.map((_, i) => "M" + i),
      rows.length,
    );
  }

  console.log("\n" + "═".repeat(72));
  console.log("통과 " + pass + " · 실패 " + fails.length);
  if (fails.length) {
    console.log("\n실패 목록:");
    for (const f of fails) console.log("  ✗ " + f);
    process.exitCode = 1;
  }
})().catch((e) => {
  console.error("\n검사 중단:", e);
  process.exitCode = 1;
});
