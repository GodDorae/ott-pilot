-- 설문 기조 문서(4단계 흐름)에 맞춘 구조 변경
--
-- 바뀌는 것
--  1) 제시 순서: 3×3 라틴방격(3행) → 완전 카운터밸런싱 3! = 6개 시퀀스
--     order_index(0-2) → sequence_index(0-5). 배정 셀은 2×6×3 = 36개가 된다.
--  2) 4단계 사후 문항 추가
--     · 4-1 조작점검: 배정받은 조절변수(SVOD/TVOD) 인지 여부
--     · 4-2 독립변수 3조건 상대 순위 (1/2/3위, 중복 불가)
--     · 4-3 주관식 (선택 이유 / 경험 의견)
--  3) 인구통계(A-1 연령대, A-2 성별)는 4-4 로 이동 — 컬럼은 그대로 쓰고 수집 시점만 바뀐다.
--
-- 기존 화면별 조작점검(screen_responses.manipulation_*)은 그대로 둔다.
-- 그건 독립변수(근거유형) 조작이 전달됐는지 보는 것이고, 4-1 은 조절변수용이라 별개다.

-- 1) 제시 순서 6개 시퀀스 -----------------------------------------------------
-- 컬럼을 rename 해도 기존 check 제약(0-2)은 따라붙으므로 먼저 떼어낸다.
alter table public.participants
  drop constraint if exists participants_order_index_check;

alter table public.participants
  rename column order_index to sequence_index;

alter table public.participants
  add constraint participants_sequence_index_check
  check (sequence_index is null or sequence_index between 0 and 5);

-- 2) 사후 문항 컬럼 -----------------------------------------------------------
alter table public.participants
  -- 4-1 조작점검: 본인이 배정받았다고 생각하는 이용조건
  add column if not exists mc_usage_answer text
    check (mc_usage_answer in ('SVOD', 'TVOD', 'unsure')),
  add column if not exists mc_usage_correct boolean,

  -- 4-2 순위 (1 = 1위). 세 값이 서로 달라야 한다.
  add column if not exists rank_content smallint check (rank_content between 1 and 3),
  add column if not exists rank_collab  smallint check (rank_collab  between 1 and 3),
  add column if not exists rank_context smallint check (rank_context between 1 and 3),

  -- 4-3 주관식
  add column if not exists open_reason  text,
  add column if not exists open_opinion text,

  -- 각 단계 완료 시점 (중간 이탈 지점 파악용)
  add column if not exists posttest_at timestamptz;

alter table public.participants
  drop constraint if exists participants_rank_distinct_chk;
alter table public.participants
  add constraint participants_rank_distinct_chk check (
    (rank_content is null and rank_collab is null and rank_context is null)
    or (
      rank_content is not null and rank_collab is not null and rank_context is not null
      and rank_content <> rank_collab
      and rank_collab  <> rank_context
      and rank_content <> rank_context
    )
  );

-- 3) 배정 셀 36개로 확장 ------------------------------------------------------
-- cell = usage_index*18 + sequence_index*3 + mapping_index  (0..35)
alter table public.pending_assignments
  drop constraint if exists pending_assignments_cell_check;
alter table public.pending_assignments
  add constraint pending_assignments_cell_check check (cell between 0 and 35);

create or replace function public.assign_next_cell()
returns table(cell smallint, pending_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  picked_cell smallint;
  new_id uuid;
  ttl interval := interval '20 minutes';
begin
  perform pg_advisory_xact_lock(hashtext('ott_pilot_cell_assignment'));

  delete from public.pending_assignments p where p.created_at < now() - ttl;

  -- 36개 셀 각각의 (배정된 실참여자 + 진행 중) 합계를 세고 가장 적은 셀을 고른다.
  -- 동률이면 무작위로 골라, 표본이 36의 배수가 아닐 때 앞쪽 셀만 계속 채워지는 것을 막는다.
  select c.n into picked_cell
  from generate_series(0, 35) as c(n)
  order by (
      (select count(*)
         from public.participants p
        where p.is_dev = false
          and p.usage_condition is not null
          and (case p.usage_condition when 'SVOD' then 0 else 1 end) * 18
              + p.sequence_index * 3 + p.mapping_index = c.n)
      +
      (select count(*) from public.pending_assignments q where q.cell = c.n)
    ) asc,
    random()
  limit 1;

  insert into public.pending_assignments(cell)
  values (picked_cell)
  returning id into new_id;

  return query select picked_cell, new_id;
end;
$$;

revoke all on function public.assign_next_cell() from public, anon, authenticated;

-- 4) 분석용 뷰 갱신 -----------------------------------------------------------
drop view if exists public.pilot_export;

create view public.pilot_export as
select
  p.participant_code,
  p.assignment_seq,

  -- 조절변수 + 개인화
  p.usage_condition,
  p.preferred_genre,

  -- 1-2 사전설문 (B. OTT 이용 현황)
  p.ott_platform,
  p.ott_platform_other,
  p.ott_tenure,
  p.rec_selection_freq,
  p.primary_device,
  p.primary_device_other,
  p.viewing_timeslot,

  -- 4-4 인구통계
  p.age_group,
  p.gender,

  -- 배정
  p.sequence_index,
  p.mapping_index,
  array_to_string(p.presentation_order, '>') as presentation_order,

  -- 4-1 조작점검 (조절변수)
  p.mc_usage_answer,
  p.mc_usage_correct,

  -- 4-2 순위
  p.rank_content,
  p.rank_collab,
  p.rank_context,

  -- 4-3 주관식
  p.open_reason,
  p.open_opinion,

  p.consent_agreed_at,
  p.started_at,
  p.assigned_at,
  p.posttest_at,
  p.completed_at,

  -- 3단계 반복측정 (참여자당 3행)
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
where p.is_dev = false
order by p.assignment_seq, r.step_index;

revoke all on public.pilot_export from anon, authenticated;
