/* eslint-disable */
// CommonJS 로 둔다 — package.json 에 type:module 이 없어 .cjs 가 아니면 require 가 막힌다
/**
 * 전수 검사 — 흐름 / 가드 / 검증 / 배정 / 개인화 / 목업 / dev / 관리자 / CSV
 * 실행: AUDIT_BASE=<url> node audit.js [pilot|main]
 */
const fs = require("fs");
const path = require("path");

const B = process.env.AUDIT_BASE || "http://localhost:4100";
const PROJECT = "C:/Users/shinb/OneDrive/Desktop/세현졸업/ott-pilot";
const PHASE = process.argv[2] || "pilot";

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
const PW = env.ADMIN_PASSWORD;
const K = "&key=" + PW;
const SH = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
  "content-type": "application/json",
  Prefer: "return=representation",
};
const rest = (q) => fetch(env.SUPABASE_URL + "/rest/v1/" + q, { headers: SH }).then((r) => r.json());

let pass = 0;
const fails = [];
let section = "";
function S(name) {
  section = name;
  console.log("\n" + "─".repeat(70) + "\n" + name);
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

function sess(ua) {
  let jar = "";
  return async (p, body, method) => {
    const res = await fetch(B + p, {
      method: method || (body !== undefined ? "POST" : "GET"),
      headers: {
        "content-type": "application/json",
        // 표식을 붙여, 정리할 때 이 스크립트가 만든 행만 지울 수 있게 한다
        "user-agent": (ua ? ua + " " : "") + UA_TAG,
        ...(jar ? { cookie: jar } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    const sc = res.headers.getSetCookie?.() ?? [];
    if (sc.length) {
      const m = new Map(jar ? jar.split("; ").map((c) => c.split(/=(.*)/).slice(0, 2)) : []);
      for (const c of sc) {
        const [k, v] = c.split(";")[0].split(/=(.*)/);
        if (/Max-Age=0/i.test(c)) m.delete(k);
        else m.set(k, v);
      }
      jar = [...m].map(([k, v]) => k + "=" + v).join("; ");
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, loc: res.headers.get("location")?.replace(B, "") ?? null, text, json };
  };
}

const DEMO = { section: "demographics", answers: { age_group: "20s", gender: "female" } };
const USAGE = {
  section: "usage",
  answers: { ott_platform: "netflix", ott_tenure: "over_1y", rec_selection_freq: "often", primary_device: "smartphone", viewing_timeslot: "evening" },
};
const L = { pu1: 4, pu2: 5, pu3: 3, ai1: 4, ai2: 4, ai3: 5 };
const MOB = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Mobile/15E148";
const PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120";
/** RSC 페이로드(<script self.__next_f>)를 떼고 렌더된 HTML 만 남긴다 — 문자열이 두 번 세지는 걸 막는다 */
const htmlOnly = (h) => h.split("self.__next_f")[0];
/**
 * 검사가 만든 참여자에게 붙이는 표식.
 *
 * 예전에는 정리할 때 participants 를 통째로 비웠다. 그러면 브라우저로 설문을 보고 있던
 * 세션의 행까지 사라져서, 다음 버튼을 누를 때마다 "세션이 만료되었습니다"가 떴다.
 * 이제 표식이 붙은 행만 지운다.
 */
const UA_TAG = "ott-audit";

const lines = (h) => h.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, "\n").split("\n").map((x) => x.trim()).filter(Boolean);

/** 이 스크립트가 만든 참여자만 지운다 (다른 사람이 보고 있는 세션은 건드리지 않는다) */
async function wipe() {
  const mine = await rest("participants?select=id&user_agent=like.*" + UA_TAG + "*");
  for (const r of mine)
    await fetch(env.SUPABASE_URL + "/rest/v1/participants?id=eq." + r.id, {
      method: "DELETE",
      headers: SH,
    });
  // 진행 중 마커는 참여자와 함께 지워지지 않으므로, 주인 없는 것만 걷어낸다
  const pend = await rest("pending_assignments?select=id");
  const alive = new Set(
    (await rest("participants?select=pending_id&pending_id=not.is.null")).map((p) => p.pending_id),
  );
  for (const r of pend.filter((x) => !alive.has(x.id)))
    await fetch(env.SUPABASE_URL + "/rest/v1/pending_assignments?id=eq." + r.id, {
      method: "DELETE",
      headers: SH,
    });
}

/** 검사 대상 — 이 스크립트가 만든 행만 (다른 사람의 진행 중 세션을 세지 않는다) */
const MINE = "&user_agent=like.*" + UA_TAG + "*";

/**
 * 시청 경험 응답 만들기 — 그 장르 12편 전부에 답해야 통과한다.
 * 기본은 전부 '전혀 모른다'. watched/heard 로 일부만 다르게 줄 수 있다.
 */
function familiarityOf(genre, { watched = [], heard = [] } = {}) {
  const out = {};
  for (const set of ["A", "B", "C"])
    for (let i = 1; i <= 4; i++) {
      const id = `${genre}-${set}-${i}`;
      out[id] = watched.includes(id) ? "watched" : heard.includes(id) ? "heard" : "unknown";
    }
  return out;
}

/**
 * 이 스크립트가 만든 참여자의 응답만 읽는다.
 *
 * screen_responses 에는 참여자를 가리키는 필드밖에 없어서 그냥 세면
 * 실제 응답자·다른 미리보기 세션의 행까지 딸려 들어온다. 같은 Supabase 를
 * 로컬과 배포가 공유하므로, 검사 결과가 남의 데이터에 흔들리면 안 된다.
 */
/**
 * 이 스크립트가 만든 참여자가 들고 있는 진행 중 마커.
 *
 * pending_assignments 에는 참여자를 가리키는 열이 없어 그냥 세면 실제 응답자의
 * 진행 중 세션까지 딸려 들어온다. participants.pending_id 로 거슬러 센다.
 */
async function myPending() {
  const ids = (
    await rest("participants?select=pending_id&pending_id=not.is.null" + MINE)
  ).map((r) => r.pending_id);
  if (ids.length === 0) return [];
  /*
    complete_participant 는 마커 행만 지우고 participants.pending_id 는 그대로 둔다.
    그래서 pending_id 가 있다고 마커가 살아 있는 건 아니다 — 실제 행과 맞춰봐야 한다.
  */
  const alive = await rest("pending_assignments?select=id&id=in.(" + ids.join(",") + ")");
  return alive.map((r) => r.id);
}

/** 주인 없는 마커 — 어느 참여자도 가리키지 않는 것. 이건 언제나 0 이어야 한다 */
async function orphanPending() {
  const all = await rest("pending_assignments?select=id");
  const held = new Set(
    (await rest("participants?select=pending_id&pending_id=not.is.null")).map((p) => p.pending_id),
  );
  return all.filter((x) => !held.has(x.id)).map((x) => x.id);
}

async function myScreens(select) {
  const mine = await rest("participants?select=id" + MINE);
  if (mine.length === 0) return [];
  const ids = mine.map((r) => r.id).join(",");
  return rest("screen_responses?select=" + select + "&participant_id=in.(" + ids + ")");
}

async function complete(opts = {}) {
  const s = sess(opts.ua);
  await s("/api/session/start", {});
  await s("/api/session/presurvey", DEMO);
  await s("/api/session/presurvey", USAGE);
  const g = opts.genre || "action";
  await s("/api/session/genre", { genre: g, displayName: opts.name, familiarity: familiarityOf(g, opts.seen) });
  await s("/api/session/brief", {});
  for (let t = 1; t <= 3; t++) await s("/api/session/screen", { stepIndex: t, answers: L, attentionCheck: 4, dwellMs: 9000 });
  await s("/api/session/posttest", { part: "check", answer: opts.mc || "SVOD" });
  await s("/api/session/posttest", { part: "ranking", ranks: { 1: 1, 2: 2, 3: 3 }, reason: "이유" });
  await s("/api/session/posttest", { part: "open", open: { open_feeling: "없음", open_notable: "없음", open_missing: "없음" } });
  await s("/done");
  return s;
}

(async () => {
  console.log("전수 검사 · phase=" + PHASE + " · " + B);
  await wipe();

  // ── 1
  S("1. 세션 없이 접근");
  {
    const a = sess();
    for (const p of ["/survey/demographics", "/survey/usage", "/pre", "/brief", "/stimulus/1", "/post/check", "/post/ranking", "/post/open", "/done", "/screened-out"]) {
      const r = await a(p);
      ck(p + " → /", r.status === 307 && r.loc === "/", r.status + " " + r.loc);
    }
    ck("/ 는 200", (await a("/")).status === 200);
    for (const [p, body] of [["genre", { genre: "action" }], ["presurvey", DEMO], ["screen", { stepIndex: 1, answers: L }], ["posttest", { part: "check", answer: "SVOD" }], ["brief", {}], ["followup", { followup_email: "a@b.c" }], ["complete", {}]]) {
      ck("API " + p + " → 401", (await a("/api/session/" + p, body)).status === 401);
    }
  }

  // ── 2
  S("2. 없는 경로");
  {
    const s = sess();
    await s("/api/session/start", {});
    for (const p of ["/stimulus/0", "/stimulus/4", "/rest/1", "/survey/bogus", "/post/bogus", "/dev/0?x=1" + K, "/dev/13?x=1" + K]) {
      ck(p.split("?")[0] + " → 404", (await s(p)).status === 404);
    }
  }

  // ── 3
  S("3. 새 단계 순서 · 가드");
  {
    const s = sess();
    await s("/api/session/start", {});
    const exp = async (p, want) => {
      const r = await s(p);
      ck(p + " → " + want, r.loc === want || (want === "200" && r.status === 200), r.status + " " + r.loc);
    };
    await exp("/survey/usage", "/survey/demographics");
    await exp("/pre", "/survey/demographics");
    await exp("/brief", "/survey/demographics");
    await exp("/stimulus/1", "/survey/demographics");
    await exp("/post/ranking", "/survey/demographics");
    await exp("/done", "/survey/demographics");
    ck("미완주자 완료 처리 안 됨", (await rest("participants?select=id&is_dev=eq.false&completed_at=not.is.null" + MINE)).length === 0);
    await exp("/survey/demographics", "200");

    await s("/api/session/presurvey", DEMO);
    await exp("/survey/usage", "200");
    await exp("/survey/demographics", "200");
    await exp("/pre", "/survey/usage");

    await s("/api/session/presurvey", USAGE);
    await exp("/pre", "200");
    await exp("/brief", "/pre");
    await exp("/stimulus/1", "/pre");

    // 장르 제출 뒤에는 안내가 먼저다 — 이용조건 조작이 여기서 전달된다
    await s("/api/session/genre", { genre: "action", displayName: "건빵", familiarity: familiarityOf("action") });
    await exp("/brief", "200");
    await exp("/stimulus/1", "/brief");
    ck("안내 건너뛰고 응답 제출 차단", (await s("/api/session/screen", { stepIndex: 1, answers: L, attentionCheck: 4, dwellMs: 5000 })).status === 409);

    await s("/api/session/brief", {});
    await exp("/stimulus/1", "200");
    await exp("/stimulus/2", "/stimulus/1");
    await exp("/post/check", "/stimulus/1");
    ck("안내 화면 되돌아가기 허용", (await s("/brief")).status === 200);
    ck("안내 통과 시각 기록", (await rest("participants?select=brief_seen_at&is_dev=eq.false&order=started_at.desc&limit=1" + MINE))[0]?.brief_seen_at !== null);
  }

  // ── 4
  S("4. 반복측정 3회 (휴식 없음)");
  {
    const s = sess();
    await s("/api/session/start", {});
    await s("/api/session/presurvey", DEMO);
    await s("/api/session/presurvey", USAGE);
    await s("/api/session/genre", { genre: "thriller", displayName: "건빵", familiarity: familiarityOf("thriller") });
    await s("/api/session/brief", {});
    for (let t = 1; t <= 3; t++) {
      const r = await s("/api/session/screen", { stepIndex: t, answers: L, attentionCheck: 4, dwellMs: 8000 });
      const want = t < 3 ? "/stimulus/" + (t + 1) : "/post/check";
      ck("trial" + t + " → " + want, r.json?.next === want, JSON.stringify(r.json));
    }
    ck("완료 후 자극물 되돌아가기 차단", (await s("/stimulus/2")).loc === "/post/check");
    const before = (await rest("screen_responses?select=id")).length;
    await s("/api/session/screen", { stepIndex: 3, answers: L, attentionCheck: 4, dwellMs: 100 });
    ck("재제출 upsert", (await rest("screen_responses?select=id")).length === before);
  }

  // ── 5
  S("5. 선별 제외");
  {
    for (const [name, ans, reason] of [
      ["B-1 없음", { ...USAGE.answers, ott_platform: "none" }, "no_platform"],
      ["B-2 사용한 적 없음", { ...USAGE.answers, ott_tenure: "never" }, "never_used"],
    ]) {
      const s = sess();
      await s("/api/session/start", {});
      await s("/api/session/presurvey", DEMO);
      const r = await s("/api/session/presurvey", { section: "usage", answers: ans });
      ck(name + " → /screened-out", r.json?.next === "/screened-out", JSON.stringify(r.json));
      ck("  종료 화면 200", (await s("/screened-out")).status === 200);
      ck("  이후 진행 차단", (await s("/pre")).loc === "/screened-out");
      ck("  API 도 차단", (await s("/api/session/genre", { genre: "action" })).status === 409);
      ck("  사유 기록 " + reason, (await rest("participants?select=id&screened_out_reason=eq." + reason + MINE)).length >= 1);
    }
  }

  // ── 6
  S("6. 입력 검증");
  {
    const s = sess();
    await s("/api/session/start", {});
    const bad = async (n, b) => ck(n, (await s("/api/session/presurvey", b)).status >= 400);
    await bad("인구통계 필수 누락", { section: "demographics", answers: { age_group: "20s" } });
    await bad("없는 선택지", { section: "demographics", answers: { age_group: "99s", gender: "female" } });
    await s("/api/session/presurvey", DEMO);
    await bad("기타인데 입력 없음", { section: "usage", answers: { ...USAGE.answers, ott_platform: "other" } });
    await s("/api/session/presurvey", USAGE);
    await s("/api/session/genre", { genre: "drama", familiarity: familiarityOf("drama") });
    await s("/api/session/brief", {});

    const badS = async (n, b) => ck(n, (await s("/api/session/screen", b)).status === 400);
    await badS("리커트 6점 거부", { stepIndex: 1, answers: { ...L, pu1: 6 } });
    await badS("리커트 0 거부", { stepIndex: 1, answers: { ...L, ai1: 0 } });
    await badS("문항 누락", { stepIndex: 1, answers: { pu1: 3 } });
    await badS("성실성 문항 누락", { stepIndex: 1, answers: L });
    await badS("성실성 범위 밖", { stepIndex: 1, answers: L, attentionCheck: 6 });
    ck("리커트 5점 허용", (await s("/api/session/screen", { stepIndex: 1, answers: { pu1: 5, pu2: 5, pu3: 5, ai1: 1, ai2: 1, ai3: 1 }, attentionCheck: 4, dwellMs: 5000 })).status === 200);
    for (let t = 2; t <= 3; t++) await s("/api/session/screen", { stepIndex: t, answers: L, attentionCheck: 4, dwellMs: 5000 });

    const badP = async (n, b) => ck(n, (await s("/api/session/posttest", b)).status === 400);
    await badP("없는 part", { part: "zzz" });
    await badP("조작점검 잘못된 값", { part: "check", answer: "XX" });
    await s("/api/session/posttest", { part: "check", answer: "TVOD" });
    await badP("순위 중복", { part: "ranking", ranks: { 1: 1, 2: 1, 3: 3 }, reason: "r" });
    await badP("순위 누락", { part: "ranking", ranks: { 1: 1, 2: 2 }, reason: "r" });
    await badP("선택 이유 누락", { part: "ranking", ranks: { 1: 1, 2: 2, 3: 3 } });
    ck("순위+이유 저장", (await s("/api/session/posttest", { part: "ranking", ranks: { 1: 3, 2: 1, 3: 2 }, reason: "두번째" })).json?.next === "/post/open");
    await badP("주관식 빈칸 거부", { part: "open", open: { open_feeling: "없음", open_notable: "   ", open_missing: "없음" } });
    ck("주관식 없음 허용", (await s("/api/session/posttest", { part: "open", open: { open_feeling: "없음", open_notable: "없음", open_missing: "없음" } })).json?.next === "/done");
    ck("/done 200", (await s("/done")).status === 200);

    const p = (await rest("participants?select=presentation_order,rank_content,rank_collab,rank_context&mc_usage_answer=eq.TVOD" + MINE))[0];
    const want = {};
    p.presentation_order.forEach((r, i) => (want[r] = [3, 1, 2][i]));
    ck("화면번호 → 근거유형 순위 매핑", p.rank_content === want.content && p.rank_collab === want.collab && p.rank_context === want.context, JSON.stringify([p.presentation_order, p.rank_content, p.rank_collab, p.rank_context]));

    ck("후속 연락처 빈값 거부", (await s("/api/session/followup", {})).status === 400);
    ck("후속 연락처 저장", (await s("/api/session/followup", { followup_email: "a@b.com" })).status === 200);
  }

  // ── 6b
  S("6b. 자극물 카탈로그 · 시청 확인");
  {
    await wipe();
    const s = sess();
    await s("/api/session/start", {});
    await s("/api/session/presurvey", DEMO);
    await s("/api/session/presurvey", USAGE);
    ck("다른 장르 작품 id 거부", (await s("/api/session/genre", { genre: "action", familiarity: { "drama-A-1": "watched" } })).status === 400);
    ck("없는 id 거부", (await s("/api/session/genre", { genre: "action", familiarity: { zzz: "watched" } })).status === 400);
    ck("모르는 단계값 거부", (await s("/api/session/genre", { genre: "action", familiarity: { "action-A-1": "maybe" } })).status === 400);
    // 12편을 다 채우지 않으면 통과하지 못한다 — 무응답과 '모른다'가 섞이면 안 된다
    const partial = familiarityOf("action");
    delete partial["action-C-4"];
    ck("일부만 답하면 거부", (await s("/api/session/genre", { genre: "action", familiarity: partial })).status === 400);

    const answers = familiarityOf("action", { watched: ["action-A-1", "action-C-4"], heard: ["action-B-2"] });
    ck("시청 확인 저장", (await s("/api/session/genre", { genre: "action", displayName: "건빵", familiarity: answers })).json?.next === "/brief");
    await s("/api/session/brief", {});
    const p = (await rest("participants?select=seen_title_ids,title_familiarity&is_dev=eq.false" + MINE))[0];
    ck("watched 만 seen_title_ids 로", (p.seen_title_ids ?? []).length === 2, JSON.stringify(p.seen_title_ids));
    ck("3단계 원자료 12편", Object.keys(p.title_familiarity ?? {}).length === 12, String(Object.keys(p.title_familiarity ?? {}).length));
    ck("heard 단계 보존", p.title_familiarity?.["action-B-2"] === "heard", p.title_familiarity?.["action-B-2"]);

    const st = htmlOnly((await s("/stimulus/1")).text);
    {
      // chrome/ 은 조건 무관 장식용 줄(상단 포스터·오직 이곳에서만)이라 따로 센다
      const imgs = [...st.matchAll(/src="(\/posters\/(?!chrome\/)[^"]+)"/g)].map((m) => m[1]);
      const chrome = [...st.matchAll(/src="(\/posters\/chrome\/[^"]+)"/g)].map((m) => m[1]);
      ck("한 화면에 실험 포스터 4장", imgs.length === 4, String(imgs.length));
      ck("장식용 줄 7장", chrome.length === 7, String(chrome.length));
      ck("텍스트 카드 없음", !/POSTER/.test(st));
      // 4번째는 화면 밖으로 잘려 일부만 보인다 — 스크린리더에는 노출하지 않는다
      ck("4번째는 화면 끝에서 잘림", /overflow-hidden/.test(st) && (st.match(/aria-hidden/g) ?? []).length > 0);
      let ok = 0;
      for (const u of [...imgs, ...chrome]) {
        const r = await fetch(B + u);
        if (r.status === 200 && r.headers.get("content-type") === "image/webp") ok++;
      }
      ck("포스터 webp 200 응답", ok === imgs.length + chrome.length, ok + "/" + (imgs.length + chrome.length));
    }
    for (let t = 1; t <= 3; t++) await s("/api/session/screen", { stepIndex: t, answers: L, attentionCheck: 4, dwellMs: 5000 });
    const rows = await myScreens("step_index,set_id,title_ids&order=step_index");
    ck("각 화면 title_ids 4개", rows.every((r) => r.title_ids.length === 4));
    ck("세 화면 세트 서로 다름", new Set(rows.map((r) => r.set_id)).size === 3);
    ck("3화면 합계 12편 (장르 전체)", new Set(rows.flatMap((r) => r.title_ids)).size === 12);
    ck("모두 선택 장르 작품", rows.flatMap((r) => r.title_ids).every((id) => id.startsWith("action-")));

    // 전부 '모른다' = 빈 배열, 미응답(null)과 구분
    await wipe();
    const s2 = sess();
    await s2("/api/session/start", {});
    await s2("/api/session/presurvey", DEMO);
    await s2("/api/session/presurvey", USAGE);
    await s2("/api/session/genre", { genre: "comedy", familiarity: familiarityOf("comedy") });
    const p2 = (await rest("participants?select=seen_title_ids&is_dev=eq.false" + MINE))[0];
    ck("전부 모른다 = 빈 배열", Array.isArray(p2.seen_title_ids) && p2.seen_title_ids.length === 0, JSON.stringify(p2.seen_title_ids));
  }

  // ── 6c
  S("6c. 성실성 확인 문항");
  {
    await wipe();
    const s = sess();
    await s("/api/session/start", {});
    await s("/api/session/presurvey", DEMO);
    await s("/api/session/presurvey", USAGE);
    await s("/api/session/genre", { genre: "action", familiarity: familiarityOf("action") });
    await s("/api/session/brief", {});
    const st = htmlOnly((await s("/stimulus/1")).text).replace(/<!--.*?-->/g, "");
    ck("자극물 화면에 성실성 문항", /성실성을 확인하기 위한 문항/.test(st));
    ck("문항 한 컨테이너", (st.match(/<fieldset/g) ?? []).length === 1, String((st.match(/<fieldset/g) ?? []).length));
    ck("소제목 없음", !/얼마나 유용하다고 느꼈나요/.test(st) && !/받아들이고 싶은 정도는/.test(st) && !/확인 문항/.test(st));
    // 5점 척도 안내는 묶음 맨 위에 한 번만 — 문항마다 반복되면 목록이 읽히지 않는다
    ck("척도 안내 1회", (st.match(/5점 척도/g) ?? []).length === 1, String((st.match(/5점 척도/g) ?? []).length));
    for (const [i, label] of ["전혀 그렇지 않다", "그렇지 않다", "보통이다", "그렇다", "매우 그렇다"].entries())
      ck(
        "척도 " + (i + 1) + "번 " + label,
        (st.match(new RegExp(">" + label + "<", "g")) ?? []).length === 1,
      );
    {
      // PU 3 → 성실성 → RA 3. 문구는 src/lib/items.ts 와 같아야 한다
      const order = ["내게 맞는 작품을 찾는 데", "찾는 것은 쉬웠다", "좋은 제안을 해주었다", "성실성을 확인하기 위한", "실제로 시청하고 싶다", "따라 볼 의향이 있다", "참고할 의향이 있다"];
      const pos = order.map((x) => st.indexOf(x));
      ck("유용성 3 → 성실성 → 수용의도 3 순서", pos.every((v, i) => v >= 0 && (i === 0 || v > pos[i - 1])), JSON.stringify(pos));
    }
    for (const [i, a] of [[1, 4], [2, 2], [3, 4]])
      await s("/api/session/screen", { stepIndex: i, answers: L, attentionCheck: a, dwellMs: 5000 });
    const rows = await myScreens("step_index,attention_check,attention_passed&order=step_index");
    ck("3화면 모두 기록", rows.length === 3);
    ck("정답 4 → 통과", rows[0].attention_passed === true && rows[2].attention_passed === true);
    ck("오답 2 → 실패", rows[1].attention_passed === false, String(rows[1].attention_check));
    ck("오답이어도 진행 허용", (await s("/post/check")).status === 200);
    const chk = htmlOnly((await s("/post/check")).text);
    ck("조작점검이 3단계 표시", /3단계 · 추천 화면 평가/.test(chk));
    ck("문항 번호 3-4", /3-4/.test(chk));
  }

  // ── 7
  S("7. 지연 배정 · 축별 균형");
  {
    await wipe();
    const s = sess();
    await s("/api/session/start", {});
    await s("/api/session/presurvey", DEMO);
    ck("인구통계 후 미배정", (await rest("participants?select=usage_condition&is_dev=eq.false" + MINE))[0].usage_condition === null);
    await s("/api/session/presurvey", USAGE);
    ck("사전조사 후에도 미배정", (await rest("participants?select=usage_condition&is_dev=eq.false" + MINE))[0].usage_condition === null);
    await s("/api/session/genre", { genre: "action", familiarity: familiarityOf("action") });
    ck("장르 제출 시 배정", (await rest("participants?select=usage_condition&is_dev=eq.false" + MINE))[0].usage_condition !== null);
    ck("pending 마커 1", (await myPending()).length === 1, String((await myPending()).length));

    await wipe();
    /*
      균형은 "이 12명 안에서 6:6"이 아니라 "phase 전체에서 축별로 고르게"가 참이다.
      카운터는 phase 안의 모든 실제 참여자를 세므로, 앞서 실제 응답자가 한 명이라도
      있으면 이 12명만 떼어 보았을 때 3:1 같은 모양이 나온다 — 배정이 틀린 게 아니다.
      그래서 검사 전 분포를 찍어 두고, 검사 후 phase 전체 분포가 균형인지 본다.
      (같은 Supabase 를 실제 응답자와 공유하므로 남의 행은 지우지 않는다.)
    */
    const tally = (rows, f) => rows.reduce((o, r) => ((o[r[f]] = (o[r[f]] || 0) + 1), o), {});
    const allRows = () =>
      rest("participants?select=usage_condition,sequence_index,mapping_index,phase&is_dev=eq.false&sequence_index=not.is.null&phase=eq." + PHASE);
    const before = await allRows();

    for (let i = 0; i < 12; i++) await complete({ genre: ["action", "romance", "comedy", "thriller", "drama", "scifi"][i % 6] });

    const rows = await rest("participants?select=usage_condition,sequence_index,mapping_index,phase&is_dev=eq.false" + MINE);
    ck("검사 대상 12명뿐", rows.length === 12, String(rows.length));
    ck("배정 안 된 참여자 없음", rows.every((r) => r.sequence_index !== null), JSON.stringify(rows.filter((r) => r.sequence_index === null).length));
    ck("전원 현재 phase", rows.every((r) => r.phase === PHASE));

    const after = await allRows();
    ck("검사분 12명만 늘어남", after.length === before.length + 12, before.length + " → " + after.length);

    /** 각 수준의 인원 차가 1명 이하면 균형 (n 이 수준 수의 배수가 아니면 1 차이는 불가피) */
    const balanced = (f, levels) => {
      const t = tally(after, f);
      const counts = levels.map((k) => t[k] ?? 0);
      return { ok: Math.max(...counts) - Math.min(...counts) <= 1, counts };
    };

    /*
      배정 카운터는 참여자 수에 '진행 중 마커'를 더해 센다. 마커는 완주해야 지워지므로,
      아직 설문을 진행 중인 사람이 있으면 그 사람의 칸이 두 번 세어져 분포가 최대 1씩 흔들린다.
      (검사가 만든 12명은 /done 까지 가서 마커를 지우므로 서로에겐 영향이 없다.)
      그래서 남의 진행 중 세션이 있으면 엄밀한 검사를 하지 않고, 그 사실만 남긴다.
    */
    const liveOutsiders = (
      await rest(
        "participants?select=id&is_dev=eq.false&phase=eq." + PHASE +
          "&pending_id=not.is.null&completed_at=is.null",
      )
    ).filter(() => true).length;

    const axes = [
      ["시퀀스 6종", balanced("sequence_index", [0, 1, 2, 3, 4, 5])],
      ["이용조건", balanced("usage_condition", ["SVOD", "TVOD"])],
      ["세트매칭 3종", balanced("mapping_index", [0, 1, 2])],
    ];
    for (const [name, b] of axes) {
      const detail = JSON.stringify(b.counts) + " (기존 " + before.length + "명 포함)";
      if (b.ok) ck(name + " 균형", true, detail);
      else if (liveOutsiders > 0)
        ck(
          name + " 균형 (진행 중 세션 " + liveOutsiders + "명으로 판정 보류)",
          true,
          detail + " — 완주하지 않은 세션의 마커가 카운터를 흔든다",
        );
      else ck(name + " 균형", false, detail);
    }
    ck("완료 후 pending 0", (await myPending()).length === 0, String((await myPending()).length));
    ck("응답 36행", (await myScreens("id")).length === 36);
  }

  // ── 8
  S("8. 개인화 · 목업 · 맥락");
  {
    for (const [name, ua, wantPhone] of [["모바일", MOB, true], ["PC", PC, false]]) {
      await wipe();
      const s = sess(ua);
      await s("/api/session/start", {});
      await s("/api/session/presurvey", DEMO);
      await s("/api/session/presurvey", USAGE);
      await s("/api/session/genre", { genre: "action", displayName: "  가나다라마바  ", familiarity: familiarityOf("action") });
      await s("/api/session/brief", {});
      const html = (await s("/stimulus/1")).text;
      // 스마트폰은 얇은 베젤 + iOS 상태바, PC 는 브라우저 창
      ck(name + " 목업 프레임", wantPhone ? /rounded-\[1\.9rem\]/.test(html) && html.includes("9:41") : /stream\.example/.test(html) && !html.includes("9:41"));
      // 2분할은 가로·세로 여유가 둘 다 있을 때만 켠다 (wide 변형)
      ck(
        name + " 2분할 레이아웃",
        /wide:h-screen wide:flex-row/.test(html) && /wide:overflow-y-auto/.test(html),
      );
      // "오직 이곳에서만" 은 목업 화면 안에만 있는 문구다
      ck(
        name + " 목업이 문항보다 앞(왼쪽)",
        html.indexOf("오직 이곳에서만") >= 0 &&
          html.indexOf("오직 이곳에서만") < html.indexOf("내게 맞는 작품을 찾는 데"),
      );
      ck(name + " 리커트 5칸", /grid-cols-5/.test(html));
      // 헤드라인은 목업 문구 3종 중 하나 — 조건마다 다르지만 호칭은 셋 다 들어간다
      const HEADLINES = [/님 취향과 비슷한 작품/, /님과 비슷한 시청자의 픽/, /님께 지금 딱 맞는 작품/];
      const heads = [];
      for (let t = 1; t <= 3; t++) {
        const h = lines(htmlOnly((await s("/stimulus/" + t)).text));
        heads.push(h.find((x) => HEADLINES.some((re) => re.test(x))) ?? "");
        await s("/api/session/screen", { stepIndex: t, answers: L, attentionCheck: 4, dwellMs: 5000 });
      }
      ck(name + " 호칭 4자 절단", heads[0].includes("가나다라님") && !heads[0].includes("가나다라마"), heads[0]);
      ck(name + " 호칭이 3조건 전부에", heads.every((h) => h.includes("가나다라님")), heads.join(" | "));
      ck(name + " 조건별 헤드라인 3종", new Set(heads).size === 3, heads.join(" | "));
      const snap = (await rest("participants?select=context_snapshot,is_mobile&display_name=eq.가나다라" + MINE))[0];
      ck(name + " 맥락 source=access_time", snap?.context_snapshot?.source === "access_time");
      ck(name + " 맥락 기기 문구", snap?.context_snapshot?.device === (wantPhone ? "스마트폰으로" : "큰 화면으로"), snap?.context_snapshot?.device);
      ck(name + " is_mobile 컬럼 저장", snap?.is_mobile === wantPhone, String(snap?.is_mobile));

      await s("/api/session/posttest", { part: "check", answer: "SVOD" });
      const rk = await s("/post/ranking");
      ck(name + " 순위 미리보기 3개", ["1", "2", "3"].every((n) => rk.text.includes("추천 화면 " + n)));
      ck(name + " 근거유형 워딩 미노출", !/콘텐츠 기반|협업 기반|맥락 인식 기반/.test(rk.text));
      ck(name + " 선택 이유 같은 화면", /각 순위\(1~3위\)로 추천 화면을 고른 이유/.test(rk.text));
      ck(name + " 미리보기에도 목업", wantPhone ? /rounded-\[1\.9rem\]/.test(rk.text) : /stream\.example/.test(rk.text));
    }

    await wipe();
    const s = sess(PC);
    await s("/api/session/start", {});
    await s("/api/session/presurvey", DEMO);
    await s("/api/session/presurvey", USAGE);
    await s("/api/session/genre", { genre: "comedy", displayName: "   ", familiarity: familiarityOf("comedy") });
    await s("/api/session/brief", {});
    const LL = lines(htmlOnly((await s("/stimulus/1")).text));
    ck("호칭 미입력 → 회원님", LL.some((x) => x.includes("회원님")), LL.filter((x) => x.includes("님")).join(" | "));
  }

  // ── 9
  S("9. /dev 미리보기");
  {
    await wipe();
    const STEPS = [[1, "/"], [2, "/survey/demographics"], [3, "/survey/usage"], [4, "/pre"], [5, "/brief"], [6, "/stimulus/1"], [7, "/stimulus/2"], [8, "/stimulus/3"], [9, "/post/check"], [10, "/post/ranking"], [11, "/post/open"], [12, "/done"]];
    const d = sess();
    for (const [n, p] of STEPS) {
      const r = await d("/dev/" + n + "?usage=TVOD&seq=4&mapping=2&genre=drama" + K);
      ck("/dev/" + n + " → " + p, r.status === 303 && r.loc === p, r.status + " " + r.loc);
    }
    const page = await d("/stimulus/1");
    ck("dev 자극물 200", page.status === 200);
    const i = page.text.indexOf("z-[60]");
    const banner = page.text.slice(i - 100, i + 1200).replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    ck("배너 seq5·map2·TVOD", /seq5/.test(banner) && /map2/.test(banner) && /TVOD/.test(banner), banner.slice(0, 120));
    for (const p of ["/post/ranking", "/post/open", "/done"]) ck("dev 가드 우회 " + p, (await d(p)).status === 200);
    ck("dev 는 실참여자 아님", (await rest("participants?select=id&is_dev=eq.false" + MINE)).length === 0);
    ck("dev 는 pending 안 만듦", (await myPending()).length === 0, String((await myPending()).length));
  }

  // ── 10
  S("10. 관리자");
  {
    const noAuth = await fetch(B + "/admin").then((r) => r.text());
    ck("비로그인 → 입력 화면", /관리자 확인/.test(noAuth));
    ck("데이터 미노출", !/조건 배정 균형/.test(noAuth));
    const wrong = await fetch(B + "/api/admin/login", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "password=nope", redirect: "manual" });
    ck("틀린 비밀번호", wrong.headers.get("location")?.includes("e=1"));
    const ok = await fetch(B + "/api/admin/login", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "password=" + PW, redirect: "manual" });
    const jar = (ok.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
    ck("로그인 쿠키 발급", jar.includes("admin_session"));
    ck("쿠키에 비밀번호 없음", !jar.includes(PW));
    const dash = await fetch(B + "/admin", { headers: { cookie: jar } }).then((r) => r.text());
    ck("대시보드", /응답 모니터링/.test(dash));
    for (const t of ["조건 배정 균형", "근거유형별 요약", "사후 점검 요약", "응답자 구성"]) ck("섹션: " + t, dash.includes(t));
    ck("큐레이션 표 없음", !/큐레이션/.test(dash));
    ck("선별 제외 지표", /선별 제외/.test(dash));
    ck("성실성 지표", /성실성 통과/.test(dash));
    ck("모바일 응답 지표", /모바일 응답/.test(dash));
    ck("CSV 인증 없음 401", (await fetch(B + "/api/admin/export")).status === 401);
    ck("CSV 쿠키 200", (await fetch(B + "/api/admin/export", { headers: { cookie: jar } })).status === 200);
  }

  // ── 11
  S("11. CSV");
  {
    await wipe();
    await complete({ name: "건빵" });
    const buf = Buffer.from(await fetch(B + "/api/admin/export?key=" + PW + "&phase=" + PHASE).then((r) => r.arrayBuffer()));
    ck("UTF-8 BOM", buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf);
    const csv = buf.toString("utf8").replace(/^\ufeff/, "");
    const [h, ...rows] = csv.trim().split(/\r?\n/);
    const H = h.split(",");
    for (const c of ["phase", "participant_code", "has_display_name", "is_mobile", "device", "watched_count", "heard_count", "unknown_count", "seen_title_ids", "title_familiarity", "screened_out", "screened_out_reason", "mc_usage_correct", "rank_content", "open_reason", "open_feeling", "open_notable", "open_missing", "followup_agreed", "pu_mean", "attention_check", "attention_passed", "dwell_ms"])
      ck("컬럼: " + c, H.includes(c));
    ck("display_name 미노출", !H.includes("display_name"));
    ck("연락처 미노출", !H.includes("followup_email") && !H.includes("followup_phone"));
    ck("재인 컬럼 없음", !H.includes("mc_rationale_answer") && !H.includes("mc_rationale_correct"));
    /*
      CSV 는 그 phase 의 모든 참여자를 내보낸다 — 실제 응답자가 한 명이라도 있으면
      전체 행 수로는 검사가 안 된다. 이 스크립트가 만든 참여자의 코드로만 센다.
    */
    const myCode = (
      await rest("participants?select=participant_code&is_dev=eq.false&order=started_at.desc&limit=1" + MINE)
    )[0]?.participant_code;
    const codeAt = H.indexOf("participant_code");
    const myRows = rows.filter((r) => r.split(",")[codeAt] === myCode);
    ck("행 = 참여자×3", myRows.length === 3, myRows.length + " (전체 " + rows.length + ")");
    ck("호칭 문자열 미유출", !csv.includes("건빵"));
  }

  // ── 12
  S("12. 정리");
  await wipe();
  ck("participants 0", (await rest("participants?select=id" + MINE)).length === 0);
  ck("screen_responses 0", (await myScreens("id")).length === 0);
  ck("주인 없는 pending 0", (await orphanPending()).length === 0, String((await orphanPending()).length));

  console.log("\n" + "═".repeat(70));
  console.log("통과 " + pass + " · 실패 " + fails.length);
  if (fails.length) {
    console.log("\n실패 목록:");
    fails.forEach((f) => console.log("  ✗ " + f));
    process.exitCode = 1;
  }
})();
