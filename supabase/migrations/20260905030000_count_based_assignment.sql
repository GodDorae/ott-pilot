-- 조건 배정을 시퀀스(nextval) 기반 → 카운트 기반으로 전환
--
-- 왜 바꾸는가
--   시퀀스 방식은 배정 번호를 받아간 참여자가 중간에 이탈하면 그 셀이 영구히 빈다.
--   18명마다 균형이 맞는다는 보장이 이탈자 수만큼 깨진다.
--   (이 연구의 이전 버전에서 같은 문제를 겪고 카운트 기반으로 전환한 기록이 있다.)
--
-- 새 동작
--   · 18개 셀 = 이용조건(2) × 제시순서(3) × 세트매칭(3)
--     cell = usage_index*9 + order_index*3 + mapping_index  (0..17)
--   · assign_next_cell(): (완료자 수 + 진행 중 수)가 가장 적은 셀을 고른다.
--     동시 호출은 pg_advisory_xact_lock 으로 직렬화.
--   · pending_assignments: 배정 직후 넣는 진행 중 마커.
--     완료 시 지우고, 못 지운 이탈자 마커는 TTL 로 만료되어 셀이 되살아난다.
--   · 배정 시점도 뒤로 미룬다 — 사전 문항을 다 끝낸 참여자만 셀을 차지한다.
--     그래서 assignment 컬럼들이 nullable 이 된다.
--
-- assignment_seq 는 배정 기준이 아니라 '몇 번째로 들어온 참여자'를 나타내는
-- 도착 순번으로만 남는다.

-- 1) 배정 컬럼을 nullable 로 (사전 문항 완료 후에 채워진다)
alter table public.participants
  alter column usage_condition    drop not null,
  alter column order_index        drop not null,
  alter column mapping_index      drop not null,
  alter column presentation_order drop not null,
  alter column set_mapping        drop not null;

-- 2) 진행 중 마커 참조 + 개발용 세션 표시
alter table public.participants
  add column if not exists pending_id uuid,
  add column if not exists assigned_at timestamptz,
  -- /dev 미리보기로 만들어진 세션. 분석에서 제외하고 셀도 차지하지 않는다.
  add column if not exists is_dev boolean not null default false;

-- 3) 진행 중 마커
create table if not exists public.pending_assignments (
  id         uuid primary key default gen_random_uuid(),
  cell       smallint not null check (cell between 0 and 17),
  created_at timestamptz not null default now()
);

create index if not exists pending_assignments_cell_created_idx
  on public.pending_assignments (cell, created_at);

alter table public.pending_assignments enable row level security;
revoke all on public.pending_assignments from anon, authenticated;

-- 4) 가장 적게 채워진 셀 배정
create or replace function public.assign_next_cell()
returns table(cell smallint, pending_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  picked_cell smallint;
  new_id uuid;
  -- 설문 소요시간이 5~10분이므로 넉넉히 20분.
  -- 너무 짧으면 아직 진행 중인 참여자의 셀이 중복 배정되고(경미·자기교정),
  -- 너무 길면 이탈자 셀이 되살아나는 데 오래 걸린다.
  ttl interval := interval '20 minutes';
begin
  -- 동시 호출 직렬화. 트랜잭션 종료(=함수 리턴) 시 자동 해제.
  perform pg_advisory_xact_lock(hashtext('ott_pilot_cell_assignment'));

  -- 만료된 진행 중 마커 정리 (이탈자 셀 복구)
  delete from public.pending_assignments p where p.created_at < now() - ttl;

  -- 18개 셀 각각의 (배정된 실참여자 + 진행 중) 합계를 세고 가장 적은 셀을 고른다.
  -- 동률이면 셀 번호가 작은 쪽. is_dev 세션은 세지 않는다.
  select c.n into picked_cell
  from generate_series(0, 17) as c(n)
  order by (
      (select count(*)
         from public.participants p
        where p.is_dev = false
          and p.usage_condition is not null
          and (case p.usage_condition when 'SVOD' then 0 else 1 end) * 9
              + p.order_index * 3 + p.mapping_index = c.n)
      +
      (select count(*) from public.pending_assignments q where q.cell = c.n)
    ) asc,
    c.n asc
  limit 1;

  insert into public.pending_assignments(cell)
  values (picked_cell)
  returning id into new_id;

  return query select picked_cell, new_id;
end;
$$;

revoke all on function public.assign_next_cell() from public, anon, authenticated;

-- 5) 완료 시 진행 중 마커 제거
create or replace function public.clear_pending_assignment(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.pending_assignments where id = p_id;
$$;

revoke all on function public.clear_pending_assignment(uuid) from public, anon, authenticated;

-- 6) completed_at 을 찍을 때 진행 중 마커까지 같이 정리한다
create or replace function public.complete_participant(pid uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  done timestamptz;
  pend uuid;
begin
  update public.participants
     set completed_at = now()
   where id = pid
     and completed_at is null
  returning completed_at, pending_id into done, pend;

  if pend is not null then
    delete from public.pending_assignments where id = pend;
  end if;

  return done;
end;
$$;

revoke all on function public.complete_participant(uuid) from public, anon, authenticated;

-- 7) 분석용 뷰는 개발용 세션을 제외한다
drop view if exists public.pilot_export;

create view public.pilot_export as
select
  p.participant_code,
  p.assignment_seq,
  p.usage_condition,
  p.preferred_genre,
  p.age_group,
  p.gender,
  p.ott_platform,
  p.ott_platform_other,
  p.ott_tenure,
  p.rec_selection_freq,
  p.primary_device,
  p.primary_device_other,
  p.viewing_timeslot,
  p.order_index,
  p.mapping_index,
  array_to_string(p.presentation_order, '>') as presentation_order,
  p.consent_agreed_at,
  p.started_at,
  p.assigned_at,
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
where p.is_dev = false
order by p.assignment_seq, r.step_index;

revoke all on public.pilot_export from anon, authenticated;
