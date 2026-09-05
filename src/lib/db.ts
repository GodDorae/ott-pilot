/**
 * 데이터 접근 계층 (서버 전용)
 *
 * 드라이버 2개:
 *   - supabase : SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 가 있을 때. 실제 수집용.
 *   - local    : 없을 때. .data/*.jsonl 에 append. 환경변수 없이도 흐름을 끝까지
 *                돌려볼 수 있게 하는 개발용 폴백이며, 실제 데이터 수집에 쓰지 말 것.
 *
 * service_role 키는 서버에서만 쓴다. 절대 클라이언트 컴포넌트에서 import 하지 말 것.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  SEQUENCES,
  SET_MAPPINGS,
  USAGE_CONDITIONS,
  assignmentToCell,
  cellToAssignment,
  type Genre,
  type RationaleType,
  type SetId,
  type UsageCondition,
} from "./experiment";
import type { ContextSnapshot } from "./copy";
import { INSTRUMENT_VERSION, SURVEY_PHASE, type Phase } from "./phase";

export type ParticipantRow = {
  id: string;
  /** 도착 순번 — 배정 기준이 아니라 '몇 번째 참여자'라는 표시일 뿐 */
  assignment_seq: number;
  participant_code: string;

  // 배정은 사전 문항을 다 끝낸 뒤에 이뤄지므로, 그 전까지 전부 null 이다
  usage_condition: string | null;
  sequence_index: number | null;
  mapping_index: number | null;
  presentation_order: string[] | null;
  set_mapping: Record<string, string> | null;
  pending_id: string | null;
  assigned_at: string | null;

  /** /dev 미리보기 세션 — 분석 제외, 배정 셀도 차지하지 않음 */
  is_dev: boolean;
  preferred_genre: Genre | null;
  /** 자극물 화면에 표시할 호칭(실명 아님). 분석에 쓰지 않는다. */
  display_name: string | null;
  context_snapshot: ContextSnapshot | null;
  /** 파일럿 / 본실험 */
  phase: Phase;
  /** 응답 수집 당시의 문항 구성·순서 버전 */
  instrument_version: string | null;
  user_agent: string | null;
  started_at: string;
  completed_at: string | null;

  // 연구참여 동의 + 사전 문항 (A. 인구통계 / B. OTT 이용 현황)
  consent_agreed_at: string | null;
  age_group: string | null;
  gender: string | null;
  ott_platform: string | null;
  ott_platform_other: string | null;
  ott_tenure: string | null;
  rec_selection_freq: string | null;
  primary_device: string | null;
  primary_device_other: string | null;
  viewing_timeslot: string | null;

  // 4단계 사후 문항
  mc_usage_answer: string | null;
  mc_usage_correct: boolean | null;
  mc_rationale_answer: string[] | null;
  mc_rationale_correct: boolean | null;
  rank_content: number | null;
  rank_collab: number | null;
  rank_context: number | null;
  open_reason: string | null;
  open_opinion: string | null;
  posttest_at: string | null;
};

export type ScreenResponseInput = {
  participantId: string;
  stepIndex: number;
  rationaleType: RationaleType;
  genre: Genre;
  setId: SetId;
  titleIds: string[];
  answers: Record<string, number>;
  dwellMs: number | null;
};

export type ScreenResponseRow = {
  id: string;
  participant_id: string;
  step_index: number;
  rationale_type: string;
  genre: string;
  set_id: string;
  title_ids: string[];
  pu1: number | null;
  pu2: number | null;
  pu3: number | null;
  ai1: number | null;
  ai2: number | null;
  ai3: number | null;
  dwell_ms: number | null;
  created_at: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const dbDriver: "supabase" | "local" =
  SUPABASE_URL && SERVICE_KEY ? "supabase" : "local";

/**
 * 배포 환경인데 Supabase 설정이 없는 상태.
 *
 * 이때 로컬 폴백으로 조용히 넘어가면 응답이 서버의 임시 디스크에 쌓였다가 사라진다.
 * 참여자는 정상으로 보이는 화면을 끝까지 마치는데 데이터만 없어지는, 가장 나쁜 실패다.
 * 그래서 아예 시작하지 못하게 막고 화면에 사유를 띄운다.
 */
export const dbMisconfigured =
  process.env.NODE_ENV === "production" && dbDriver === "local";

function assertConfigured() {
  if (dbMisconfigured) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다. " +
        "배포 환경에서는 로컬 폴백으로 응답을 받지 않습니다.",
    );
  }
}

let cached: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!cached) {
    cached = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

// 로컬 폴백 저장소 ----------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), ".data");
const P_FILE = path.join(DATA_DIR, "participants.jsonl");
const R_FILE = path.join(DATA_DIR, "screen_responses.jsonl");

async function readJsonl<T>(file: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as T);
  } catch {
    return [];
  }
}

async function appendJsonl(file: string, row: unknown) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.appendFile(file, JSON.stringify(row) + "\n", "utf8");
}

/** 로컬 폴백은 파일 전체를 다시 써서 upsert 를 흉내낸다 (소규모에서만 안전) */
async function rewriteJsonl(file: string, rows: unknown[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const body = rows.map((r) => JSON.stringify(r)).join("\n");
  await fs.writeFile(file, rows.length ? body + "\n" : "", "utf8");
}

// 도착 순번 ------------------------------------------------------------------
export async function nextAssignmentSeq(): Promise<number> {
  if (dbDriver === "supabase") {
    const { data, error } = await sb().rpc("next_assignment_seq");
    if (error) throw new Error("next_assignment_seq 실패: " + error.message);
    return Number(data);
  }
  const rows = await readJsonl<ParticipantRow>(P_FILE);
  return rows.length + 1;
}

// 참여자 ---------------------------------------------------------------------

/**
 * 세션 생성. 이 시점에는 조건을 배정하지 않는다 (assignAssignment 참고).
 * 소개 화면의 동의 체크 시점이 consent_agreed_at 이 된다.
 */
export async function createParticipant(input: {
  participantCode: string;
  assignmentSeq: number;
  userAgent: string | null;
  isDev?: boolean;
}): Promise<ParticipantRow> {
  assertConfigured();
  const row = {
    assignment_seq: input.assignmentSeq,
    participant_code: input.participantCode,
    user_agent: input.userAgent,
    phase: SURVEY_PHASE,
    instrument_version: INSTRUMENT_VERSION,
    is_dev: input.isDev ?? false,
    consent_agreed_at: new Date().toISOString(),
  };

  if (dbDriver === "supabase") {
    const { data, error } = await sb().from("participants").insert(row).select().single();
    if (error) throw new Error("participants insert 실패: " + error.message);
    return data as ParticipantRow;
  }

  const full = {
    ...row,
    id: crypto.randomUUID(),
    usage_condition: null,
    sequence_index: null,
    mapping_index: null,
    presentation_order: null,
    set_mapping: null,
    pending_id: null,
    assigned_at: null,
    preferred_genre: null,
    display_name: null,
    context_snapshot: null,
    started_at: new Date().toISOString(),
    completed_at: null,
  } as unknown as ParticipantRow;
  await appendJsonl(P_FILE, full);
  return full;
}

/**
 * 조건 배정 — 사전 문항을 다 끝낸 참여자에게만 셀을 준다.
 *
 * 이렇게 미루는 이유: 배정과 동시에 그 셀이 '차지된' 것으로 세어지는데,
 * 동의만 누르고 나가버린 사람까지 셀을 차지하면 균형이 그만큼 어긋난다.
 * 이미 배정된 참여자는 그대로 돌려준다 (새로고침·뒤로가기에도 조건 유지).
 */
export async function assignAssignment(
  participantId: string,
  /** /dev 미리보기에서 조건을 직접 지정할 때 */
  forcedCell?: number,
): Promise<ParticipantRow> {
  const existing = await getParticipant(participantId);
  if (!existing) throw new Error("참여자를 찾을 수 없습니다.");
  if (existing.usage_condition && forcedCell === undefined) return existing;

  let cell: number;
  let pendingId: string | null = null;

  if (forcedCell !== undefined) {
    // 미리보기 세션은 진행 중 마커를 만들지 않는다 (실제 배정 카운트를 흔들지 않도록)
    cell = forcedCell;
  } else if (dbDriver === "supabase") {
    const { data, error } = await sb().rpc("assign_next_cell", { p_phase: SURVEY_PHASE });
    if (error) throw new Error("assign_next_cell 실패: " + error.message);
    const row = (Array.isArray(data) ? data[0] : data) as
      | { cell: number; pending_id: string }
      | undefined;
    if (!row || typeof row.cell !== "number" || !row.pending_id) {
      throw new Error("assign_next_cell 응답이 올바르지 않습니다: " + JSON.stringify(data));
    }
    cell = row.cell;
    pendingId = row.pending_id;
  } else {
    // 로컬 폴백: DB 함수와 같은 축별 균형 (pending 개념은 없음)
    const rows = (await readJsonl<ParticipantRow>(P_FILE)).filter(
      (r) => !r.is_dev && r.usage_condition && r.phase === SURVEY_PHASE,
    );
    const leastUsed = (size: number, of: (r: ParticipantRow) => number) => {
      const counts = Array.from({ length: size }, () => 0);
      for (const r of rows) counts[of(r)] += 1;
      const min = Math.min(...counts);
      const candidates = counts.flatMap((c, i) => (c === min ? [i] : []));
      return candidates[Math.floor(Math.random() * candidates.length)];
    };
    cell = assignmentToCell(
      USAGE_CONDITIONS[leastUsed(USAGE_CONDITIONS.length, (r) =>
        USAGE_CONDITIONS.indexOf(r.usage_condition as UsageCondition),
      )],
      leastUsed(SEQUENCES.length, (r) => r.sequence_index ?? 0),
      leastUsed(SET_MAPPINGS.length, (r) => r.mapping_index ?? 0),
    );
  }

  const a = cellToAssignment(cell);
  const patch: Partial<ParticipantRow> = {
    usage_condition: a.usageCondition,
    sequence_index: a.sequenceIndex,
    mapping_index: a.mappingIndex,
    presentation_order: a.order,
    set_mapping: a.setMapping,
    pending_id: pendingId,
    assigned_at: new Date().toISOString(),
  };
  await patchParticipant(participantId, patch);
  return { ...existing, ...patch } as ParticipantRow;
}

/** 4단계 사후 문항 저장 — 컬럼명은 posttest.ts / presurvey.ts 정의에서만 나온다 */
export function savePostTest(
  id: string,
  patch: Record<string, string | number | boolean | string[] | null>,
) {
  return patchParticipant(id, patch as Partial<ParticipantRow>);
}

/**
 * 저장된 trial 수 — 3단계 어디까지 왔는지 판단하는 기준.
 * (participants 에 따로 카운터를 두지 않고 응답 행 수를 세서 단일 진실 원천을 유지한다)
 */
export async function countTrials(participantId: string): Promise<number> {
  if (dbDriver === "supabase") {
    const { count, error } = await sb()
      .from("screen_responses")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", participantId);
    if (error) throw new Error("trial 수 조회 실패: " + error.message);
    return count ?? 0;
  }
  const rows = await readJsonl<ScreenResponseRow>(R_FILE);
  return rows.filter((r) => r.participant_id === participantId).length;
}

/** 맥락 인식 조건 문구를 만든 근거를 기록해 둔다 (분석 시 재현용) */
export function saveContextSnapshot(id: string, snapshot: ContextSnapshot) {
  return patchParticipant(id, { context_snapshot: snapshot });
}

export async function getParticipant(id: string): Promise<ParticipantRow | null> {
  if (dbDriver === "supabase") {
    const { data, error } = await sb().from("participants").select().eq("id", id).maybeSingle();
    if (error) throw new Error("participants select 실패: " + error.message);
    return (data as ParticipantRow) ?? null;
  }
  const rows = await readJsonl<ParticipantRow>(P_FILE);
  return rows.find((r) => r.id === id) ?? null;
}

async function patchParticipant(id: string, patch: Partial<ParticipantRow>) {
  if (dbDriver === "supabase") {
    const { error } = await sb().from("participants").update(patch).eq("id", id);
    if (error) throw new Error("participants update 실패: " + error.message);
    return;
  }
  const rows = await readJsonl<ParticipantRow>(P_FILE);
  await rewriteJsonl(
    P_FILE,
    rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  );
}

export function setPreferredGenre(id: string, genre: Genre) {
  return patchParticipant(id, { preferred_genre: genre });
}

/** 화면 표시용 호칭 저장 (2-2 개인화 단계) */
export function setDisplayName(id: string, displayName: string | null) {
  return patchParticipant(id, { display_name: displayName });
}

/** 사전 문항 한 섹션 분량 저장 — 컬럼명은 presurvey.ts 의 정의에서만 나온다 */
export function savePreSurvey(id: string, patch: Record<string, string | null>) {
  return patchParticipant(id, patch as Partial<ParticipantRow>);
}

/**
 * completed_at 은 DB 시각으로 찍는다 (started_at 과 같은 시계여야 소요시간이 맞는다).
 * 같은 RPC 가 진행 중 마커(pending_assignments)까지 지워 셀 카운트를 정확히 맞춘다.
 * 로컬 폴백에는 DB 시계가 없으므로 프로세스 시각을 쓴다 — 개발용이라 무해.
 */
export async function completeParticipant(id: string) {
  if (dbDriver === "supabase") {
    const { error } = await sb().rpc("complete_participant", { pid: id });
    if (error) throw new Error("complete_participant 실패: " + error.message);
    return;
  }
  return patchParticipant(id, { completed_at: new Date().toISOString() });
}

// 화면 응답 ------------------------------------------------------------------
export async function saveScreenResponse(input: ScreenResponseInput) {
  const row = {
    participant_id: input.participantId,
    step_index: input.stepIndex,
    rationale_type: input.rationaleType,
    genre: input.genre,
    set_id: input.setId,
    title_ids: input.titleIds,
    pu1: input.answers.pu1 ?? null,
    pu2: input.answers.pu2 ?? null,
    pu3: input.answers.pu3 ?? null,
    ai1: input.answers.ai1 ?? null,
    ai2: input.answers.ai2 ?? null,
    ai3: input.answers.ai3 ?? null,
    dwell_ms: input.dwellMs,
  };

  if (dbDriver === "supabase") {
    const { error } = await sb()
      .from("screen_responses")
      .upsert(row, { onConflict: "participant_id,step_index" });
    if (error) throw new Error("screen_responses upsert 실패: " + error.message);
    return;
  }

  const rows = await readJsonl<ScreenResponseRow>(R_FILE);
  const idx = rows.findIndex(
    (r) => r.participant_id === row.participant_id && r.step_index === row.step_index,
  );
  const full = {
    ...row,
    id: idx >= 0 ? rows[idx].id : crypto.randomUUID(),
    created_at: new Date().toISOString(),
  } as ScreenResponseRow;
  if (idx >= 0) {
    rows[idx] = full;
    await rewriteJsonl(R_FILE, rows);
  } else {
    await appendJsonl(R_FILE, full);
  }
}

// 관리자 조회 ----------------------------------------------------------------
/**
 * 관리자·CSV용 전체 조회. /dev 미리보기 세션(is_dev)은 결과에서 뺀다.
 * phase 를 주면 그 단계만, "all" 이면 전부 돌려준다.
 */
export async function listAll(phase: Phase | "all" = SURVEY_PHASE): Promise<{
  participants: ParticipantRow[];
  responses: ScreenResponseRow[];
}> {
  let participants: ParticipantRow[];
  let responses: ScreenResponseRow[];

  if (dbDriver === "supabase") {
    const [p, r] = await Promise.all([
      sb().from("participants").select().order("assignment_seq"),
      sb().from("screen_responses").select().order("created_at"),
    ]);
    if (p.error) throw new Error(p.error.message);
    if (r.error) throw new Error(r.error.message);
    participants = (p.data ?? []) as ParticipantRow[];
    responses = (r.data ?? []) as ScreenResponseRow[];
  } else {
    [participants, responses] = await Promise.all([
      readJsonl<ParticipantRow>(P_FILE),
      readJsonl<ScreenResponseRow>(R_FILE),
    ]);
    participants.sort((a, b) => a.assignment_seq - b.assignment_seq);
  }

  const real = participants.filter(
    (p) => !p.is_dev && (phase === "all" || p.phase === phase),
  );
  const realIds = new Set(real.map((p) => p.id));

  return {
    participants: real,
    responses: responses.filter((r) => realIds.has(r.participant_id)),
  };
}

/**
 * /dev 미리보기 세션 삭제.
 *
 * 쿠키 없이 /dev 에 들어올 때마다 미리보기 행이 하나씩 생긴다. 그냥 두면 계속 쌓이므로,
 * 새 미리보기 세션을 만들 때마다 이 함수로 오래된 것들을 걷어낸다 (ensureDevSession 참고).
 *
 * @param before 이 시각 이전에 시작된 미리보기 세션만 삭제. 없으면 전부.
 *
 * screen_responses 는 FK on delete cascade 로 함께 지워진다.
 */
export async function deleteDevSessions(before?: Date): Promise<number> {
  if (dbDriver === "supabase") {
    let q = sb().from("participants").delete().eq("is_dev", true);
    if (before) q = q.lt("started_at", before.toISOString());
    const { data, error } = await q.select("id");
    if (error) throw new Error("미리보기 세션 삭제 실패: " + error.message);
    return (data ?? []).length;
  }

  const participants = await readJsonl<ParticipantRow>(P_FILE);
  const stale = (p: ParticipantRow) =>
    p.is_dev && (!before || new Date(p.started_at) < before);
  const devIds = new Set(participants.filter(stale).map((p) => p.id));
  if (devIds.size === 0) return 0;
  await rewriteJsonl(
    P_FILE,
    participants.filter((p) => !devIds.has(p.id)),
  );
  const responses = await readJsonl<ScreenResponseRow>(R_FILE);
  await rewriteJsonl(
    R_FILE,
    responses.filter((r) => !devIds.has(r.participant_id)),
  );
  return devIds.size;
}
