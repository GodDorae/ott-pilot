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

async function complete(opts = {}) {
  const s = sess(opts.ua);
  await s("/api/session/start", {});
  await s("/api/session/presurvey", DEMO);
  await s("/api/session/presurvey", USAGE);
  await s("/api/session/genre", { genre: opts.genre || "action", displayName: opts.name, seenTitleIds: opts.seen ?? [] });
  for (let t = 1; t <= 3; t++) await s("/api/session/screen", { stepIndex: t, answers: L, attentionCheck: 4, dwellMs: 9000 });
  await s("/api/session/posttest", { part: "check", answer: opts.mc || "SVOD" });
  await s("/api/session/posttest", { part: "ranking", ranks: { 1: 1, 2: 2, 3: 3 }, reason: "이유" });
  await s("/api/session/posttest", { part: "open", open: { open_opinion: "없음" } });
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
    for (const p of ["/survey/demographics", "/survey/usage", "/pre", "/stimulus/1", "/post/check", "/post/ranking", "/post/open", "/done", "/screened-out"]) {
      const r = await a(p);
      ck(p + " → /", r.status === 307 && r.loc === "/", r.status + " " + r.loc);
    }
    ck("/ 는 200", (await a("/")).status === 200);
    for (const [p, body] of [["genre", { genre: "action" }], ["presurvey", DEMO], ["screen", { stepIndex: 1, answers: L }], ["posttest", { part: "check", answer: "SVOD" }], ["followup", { followup_email: "a@b.c" }], ["complete", {}]]) {
      ck("API " + p + " → 401", (await a("/api/session/" + p, body)).status === 401);
    }
  }

  // ── 2
  S("2. 없는 경로");
  {
    const s = sess();
    await s("/api/session/start", {});
    for (const p of ["/stimulus/0", "/stimulus/4", "/rest/1", "/survey/bogus", "/post/bogus", "/dev/0?x=1" + K, "/dev/12?x=1" + K]) {
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
    await exp("/stimulus/1", "/pre");

    await s("/api/session/genre", { genre: "action", displayName: "건빵", seenTitleIds: [] });
    await exp("/stimulus/1", "200");
    await exp("/stimulus/2", "/stimulus/1");
    await exp("/post/check", "/stimulus/1");
  }

  // ── 4
  S("4. 반복측정 3회 (휴식 없음)");
  {
    const s = sess();
    await s("/api/session/start", {});
    await s("/api/session/presurvey", DEMO);
    await s("/api/session/presurvey", USAGE);
    await s("/api/session/genre", { genre: "thriller", displayName: "건빵", seenTitleIds: [] });
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
    await s("/api/session/genre", { genre: "drama", seenTitleIds: [] });

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
    await badP("주관식 빈칸 거부", { part: "open", open: { open_opinion: "   " } });
    ck("주관식 없음 허용", (await s("/api/session/posttest", { part: "open", open: { open_opinion: "없음" } })).json?.next === "/done");
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
    ck("다른 장르 작품 id 거부", (await s("/api/session/genre", { genre: "action", seenTitleIds: ["drama-A-1"] })).status === 400);
    ck("없는 id 거부", (await s("/api/session/genre", { genre: "action", seenTitleIds: ["zzz"] })).status === 400);
    ck("시청 확인 저장", (await s("/api/session/genre", { genre: "action", displayName: "건빵", seenTitleIds: ["action-A-1", "action-C-4"] })).json?.next === "/stimulus/1");
    const p = (await rest("participants?select=seen_title_ids&is_dev=eq.false" + MINE))[0];
    ck("저장값 2편", (p.seen_title_ids ?? []).length === 2, JSON.stringify(p.seen_title_ids));

    const st = htmlOnly((await s("/stimulus/1")).text);
    {
      const imgs = [...st.matchAll(/src="(\/posters\/[^"]+)"/g)].map((m) => m[1]);
      ck("한 화면에 포스터 4장", imgs.length === 4, String(imgs.length));
      ck("텍스트 카드 없음", !/POSTER/.test(st));
      ck("4번째는 peek(반투명)", /opacity-45/.test(st));
      let ok = 0;
      for (const u of imgs) {
        const r = await fetch(B + u);
        if (r.status === 200 && r.headers.get("content-type") === "image/webp") ok++;
      }
      ck("포스터 webp 200 응답", ok === imgs.length, ok + "/" + imgs.length);
    }
    for (let t = 1; t <= 3; t++) await s("/api/session/screen", { stepIndex: t, answers: L, attentionCheck: 4, dwellMs: 5000 });
    const rows = await rest("screen_responses?select=step_index,set_id,title_ids&order=step_index");
    ck("각 화면 title_ids 4개", rows.every((r) => r.title_ids.length === 4));
    ck("세 화면 세트 서로 다름", new Set(rows.map((r) => r.set_id)).size === 3);
    ck("3화면 합계 12편 (장르 전체)", new Set(rows.flatMap((r) => r.title_ids)).size === 12);
    ck("모두 선택 장르 작품", rows.flatMap((r) => r.title_ids).every((id) => id.startsWith("action-")));

    // '본 작품 없음' = 빈 배열, 미응답과 구분
    await wipe();
    const s2 = sess();
    await s2("/api/session/start", {});
    await s2("/api/session/presurvey", DEMO);
    await s2("/api/session/presurvey", USAGE);
    await s2("/api/session/genre", { genre: "comedy", seenTitleIds: [] });
    const p2 = (await rest("participants?select=seen_title_ids&is_dev=eq.false" + MINE))[0];
    ck("본 작품 없음 = 빈 배열", Array.isArray(p2.seen_title_ids) && p2.seen_title_ids.length === 0, JSON.stringify(p2.seen_title_ids));
  }

  // ── 6c
  S("6c. 성실성 확인 문항");
  {
    await wipe();
    const s = sess();
    await s("/api/session/start", {});
    await s("/api/session/presurvey", DEMO);
    await s("/api/session/presurvey", USAGE);
    await s("/api/session/genre", { genre: "action", seenTitleIds: [] });
    const st = htmlOnly((await s("/stimulus/1")).text).replace(/<!--.*?-->/g, "");
    ck("자극물 화면에 성실성 문항", /성실성을 확인하기 위한 문항/.test(st));
    ck("문항 한 컨테이너", (st.match(/<fieldset/g) ?? []).length === 1, String((st.match(/<fieldset/g) ?? []).length));
    ck("소제목 없음", !/얼마나 유용하다고 느꼈나요/.test(st) && !/받아들이고 싶은 정도는/.test(st) && !/확인 문항/.test(st));
    ck("척도 라벨 1회", (st.match(/<span>전혀 그렇지 않다<\/span>/g) ?? []).length === 1);
    {
      const order = ["볼 만한 작품을 찾는 데", "내 취향을 잘 반영", "작품을 고를 때 유용", "성실성을 확인하기 위한", "시청해 보고 싶다", "실제로 재생해", "시청 목록에 추가"];
      const pos = order.map((x) => st.indexOf(x));
      ck("유용성 3 → 성실성 → 수용의도 3 순서", pos.every((v, i) => v >= 0 && (i === 0 || v > pos[i - 1])), JSON.stringify(pos));
    }
    for (const [i, a] of [[1, 4], [2, 2], [3, 4]])
      await s("/api/session/screen", { stepIndex: i, answers: L, attentionCheck: a, dwellMs: 5000 });
    const rows = await rest("screen_responses?select=step_index,attention_check,attention_passed&order=step_index");
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
    await s("/api/session/genre", { genre: "action", seenTitleIds: [] });
    ck("장르 제출 시 배정", (await rest("participants?select=usage_condition&is_dev=eq.false" + MINE))[0].usage_condition !== null);
    ck("pending 마커 1", (await rest("pending_assignments?select=id")).length === 1);

    await wipe();
    for (let i = 0; i < 12; i++) await complete({ genre: ["action", "romance", "comedy", "thriller", "drama", "scifi"][i % 6] });
    const rows = await rest("participants?select=usage_condition,sequence_index,mapping_index,phase&is_dev=eq.false" + MINE);
    // 남은 행이 섞이면 분포가 어긋나 보인다 — 원인을 분명히 하려고 먼저 확인한다
    ck("검사 대상 12명뿐", rows.length === 12, String(rows.length));
    ck("배정 안 된 참여자 없음", rows.every((r) => r.sequence_index !== null), JSON.stringify(rows.filter((r) => r.sequence_index === null).length));
    const t = (f) => rows.reduce((o, r) => ((o[r[f]] = (o[r[f]] || 0) + 1), o), {});
    const seq = t("sequence_index"), usg = t("usage_condition"), map = t("mapping_index");
    ck("시퀀스 6종 각 2명", Object.keys(seq).length === 6 && Object.values(seq).every((v) => v === 2), JSON.stringify(seq));
    ck("이용조건 6:6", usg.SVOD === 6 && usg.TVOD === 6, JSON.stringify(usg));
    ck("세트매칭 각 4명", Object.values(map).every((v) => v === 4), JSON.stringify(map));
    ck("전원 현재 phase", rows.every((r) => r.phase === PHASE));
    ck("완료 후 pending 0", (await rest("pending_assignments?select=id")).length === 0);
    ck("응답 36행", (await rest("screen_responses?select=id")).length === 36);
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
      await s("/api/session/genre", { genre: "action", displayName: "  가나다라마바  ", seenTitleIds: [] });
      const html = (await s("/stimulus/1")).text;
      ck(name + " 목업 프레임", wantPhone ? /rounded-\[2rem\]/.test(html) : /stream\.example/.test(html));
      ck(name + " 2분할 레이아웃", /md:h-screen md:flex-row/.test(html) && /md:overflow-y-auto/.test(html));
      ck(name + " 목업이 문항보다 앞(왼쪽)", html.indexOf("STREAM") >= 0 && html.indexOf("STREAM") < html.indexOf("볼 만한 작품을 찾는 데"));
      ck(name + " 리커트 5칸", /grid-cols-5/.test(html));
      const heads = [];
      let greetLine = null;
      for (let t = 1; t <= 3; t++) {
        const h = lines((await s("/stimulus/" + t)).text);
        const kk = h.findIndex((x) => /이에요, |반가워요, |이네요, /.test(x));
        if (t === 1) greetLine = h[kk];
        heads.push(h[kk + 1]);
        await s("/api/session/screen", { stepIndex: t, answers: L, attentionCheck: 4, dwellMs: 5000 });
      }
      ck(name + " 호칭 4자 절단", greetLine?.includes("가나다라님"), greetLine);
      ck(name + " 호칭이 3조건 전부에", heads.every((h) => h?.includes("가나다라님")), heads.join(" | "));
      const snap = (await rest("participants?select=context_snapshot,is_mobile&display_name=eq.가나다라" + MINE))[0];
      ck(name + " 맥락 source=access_time", snap?.context_snapshot?.source === "access_time");
      ck(name + " 맥락 기기 문구", snap?.context_snapshot?.device === (wantPhone ? "스마트폰으로" : "큰 화면으로"), snap?.context_snapshot?.device);
      ck(name + " is_mobile 컬럼 저장", snap?.is_mobile === wantPhone, String(snap?.is_mobile));

      await s("/api/session/posttest", { part: "check", answer: "SVOD" });
      const rk = await s("/post/ranking");
      ck(name + " 순위 미리보기 3개", ["1", "2", "3"].every((n) => rk.text.includes("추천 화면 " + n)));
      ck(name + " 근거유형 워딩 미노출", !/콘텐츠 기반|협업 기반|맥락 인식 기반/.test(rk.text));
      ck(name + " 선택 이유 같은 화면", /1위로 고른 추천 화면/.test(rk.text));
      ck(name + " 미리보기에도 목업", wantPhone ? /rounded-\[2rem\]/.test(rk.text) : /stream\.example/.test(rk.text));
    }

    await wipe();
    const s = sess(PC);
    await s("/api/session/start", {});
    await s("/api/session/presurvey", DEMO);
    await s("/api/session/presurvey", USAGE);
    await s("/api/session/genre", { genre: "comedy", displayName: "   ", seenTitleIds: [] });
    const LL = lines((await s("/stimulus/1")).text);
    const k = LL.findIndex((x) => /이에요, |반가워요, |이네요, /.test(x));
    ck("호칭 미입력 → 회원님", LL[k]?.includes("회원님"), LL[k]);
  }

  // ── 9
  S("9. /dev 미리보기");
  {
    await wipe();
    const STEPS = [[1, "/"], [2, "/survey/demographics"], [3, "/survey/usage"], [4, "/pre"], [5, "/stimulus/1"], [6, "/stimulus/2"], [7, "/stimulus/3"], [8, "/post/check"], [9, "/post/ranking"], [10, "/post/open"], [11, "/done"]];
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
    ck("dev 는 pending 안 만듦", (await rest("pending_assignments?select=id")).length === 0);
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
    for (const c of ["phase", "participant_code", "has_display_name", "is_mobile", "device", "seen_count", "seen_title_ids", "screened_out", "screened_out_reason", "mc_usage_correct", "rank_content", "open_reason", "open_opinion", "followup_agreed", "pu_mean", "attention_check", "attention_passed", "dwell_ms"])
      ck("컬럼: " + c, H.includes(c));
    ck("display_name 미노출", !H.includes("display_name"));
    ck("연락처 미노출", !H.includes("followup_email") && !H.includes("followup_phone"));
    ck("재인 컬럼 없음", !H.includes("mc_rationale_answer") && !H.includes("mc_rationale_correct"));
    ck("행 = 참여자×3", rows.length === 3, String(rows.length));
    ck("호칭 문자열 미유출", !csv.includes("건빵"));
  }

  // ── 12
  S("12. 정리");
  await wipe();
  ck("participants 0", (await rest("participants?select=id" + MINE)).length === 0);
  ck("screen_responses 0", (await rest("screen_responses?select=id")).length === 0);
  ck("pending 0", (await rest("pending_assignments?select=id")).length === 0);

  console.log("\n" + "═".repeat(70));
  console.log("통과 " + pass + " · 실패 " + fails.length);
  if (fails.length) {
    console.log("\n실패 목록:");
    fails.forEach((f) => console.log("  ✗ " + f));
    process.exitCode = 1;
  }
})();
