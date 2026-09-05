-- OTT 추천 근거유형 실험 · 파일럿 스키마
--
-- 보안 모델: RLS를 켜고 정책을 만들지 않는다.
--   → anon / authenticated 키로는 아무것도 읽거나 쓸 수 없다.
--   → 모든 읽기·쓰기는 Next.js 서버 라우트에서 service_role 키로만 수행한다.
--   설문 응답은 개인정보에 준해 다루고, 브라우저에 DB 권한을 절대 노출하지 않는다.

-- 배정 번호 시퀀스 (라틴방격 · 세트매칭 · 이용조건 균형 배정의 기준)
create sequence if not exists public.participant_assignment_seq;

create or replace function public.next_assignment_seq()
returns bigint
language sql
security definer
set search_path = public
as $$ select nextval('public.participant_assignment_seq'); $$;

revoke all on function public.next_assignment_seq() from public, anon, authenticated;

-- 참여자 --------------------------------------------------------------------
create table if not exists public.participants (
  id                 uuid primary key default gen_random_uuid(),
  assignment_seq     bigint      not null unique,
  participant_code   text        not null unique,

  -- 독립변수 2 · 이용조건 (피험자 간)
  usage_condition    text        not null check (usage_condition in ('SVOD', 'TVOD')),

  -- 카운터밸런싱 배정
  order_index        smallint    not null check (order_index between 0 and 2),
  mapping_index      smallint    not null check (mapping_index between 0 and 2),
  presentation_order text[]      not null,
  set_mapping        jsonb       not null,

  -- 개인화 장치 (문서 0.4) — 참여자가 선택한 선호 장르
  preferred_genre    text        check (preferred_genre in
                       ('action','romance','comedy','thriller','drama','scifi')),

  -- 맥락 인식 조건 문구를 만든 시점 정보 (분석 시 재현용)
  context_snapshot   jsonb,

  is_pilot           boolean     not null default true,
  user_agent         text,
  started_at         timestamptz not null default now(),
  completed_at       timestamptz
);

-- 화면별 응답 (참여자 1명 × 3화면 = 3행) ------------------------------------
create table if not exists public.screen_responses (
  id                   uuid primary key default gen_random_uuid(),
  participant_id       uuid     not null references public.participants(id) on delete cascade,

  step_index           smallint not null check (step_index between 1 and 3),
  rationale_type       text     not null check (rationale_type in ('content','collab','context')),
  genre                text     not null,
  set_id               text     not null check (set_id in ('A','B','C')),
  title_ids            text[]   not null,

  -- 매개변수 · 지각된 추천 유용성 (7점)
  pu1 smallint check (pu1 between 1 and 7),
  pu2 smallint check (pu2 between 1 and 7),
  pu3 smallint check (pu3 between 1 and 7),

  -- 종속변수 · 추천 수용의도 (7점)
  ai1 smallint check (ai1 between 1 and 7),
  ai2 smallint check (ai2 between 1 and 7),
  ai3 smallint check (ai3 between 1 and 7),

  -- 조작점검
  manipulation_answer  text,
  manipulation_correct boolean,

  dwell_ms             integer,
  created_at           timestamptz not null default now(),

  unique (participant_id, step_index)
);

create index if not exists screen_responses_participant_idx
  on public.screen_responses (participant_id);

-- 분석용 와이드 뷰 (CSV 내보내기 → SPSS/jamovi 직행) ------------------------
create or replace view public.pilot_export as
select
  p.participant_code,
  p.assignment_seq,
  p.usage_condition,
  p.preferred_genre,
  p.order_index,
  p.mapping_index,
  array_to_string(p.presentation_order, '>') as presentation_order,
  p.started_at,
  p.completed_at,
  r.step_index,
  r.rationale_type,
  r.set_id,
  array_to_string(r.title_ids, '|') as title_ids,
  r.pu1, r.pu2, r.pu3,
  round(((r.pu1 + r.pu2 + r.pu3)::numeric / 3), 3) as pu_mean,
  r.ai1, r.ai2, r.ai3,
  round(((r.ai1 + r.ai2 + r.ai3)::numeric / 3), 3) as ai_mean,
  r.manipulation_answer,
  r.manipulation_correct,
  r.dwell_ms
from public.participants p
join public.screen_responses r on r.participant_id = p.id
order by p.assignment_seq, r.step_index;

-- RLS: 켜두고 정책 없음 → 브라우저 키로는 접근 불가, service_role 만 통과
alter table public.participants     enable row level security;
alter table public.screen_responses enable row level security;

revoke all on public.participants     from anon, authenticated;
revoke all on public.screen_responses from anon, authenticated;
revoke all on public.pilot_export     from anon, authenticated;
