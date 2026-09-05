-- 파일럿 / 본실험 단계 분리
--
-- 왜 지금 해두는가
--   테이블을 새로 만들 필요는 없다. 두 단계는 스키마가 같으니 행을 나누면 된다.
--   다만 배정 카운터만은 지금 고쳐야 한다. assign_next_cell() 이 지금은 is_dev 만 빼고
--   모든 참여자를 세기 때문에, 파일럿 응답이 테이블에 남은 채 본실험을 시작하면
--   본실험 첫 참여자들이 '파일럿 누적치 기준으로 가장 적은 칸'에 배정된다.
--   즉 본실험의 카운터밸런싱이 조용히 깨지고, 나중에 되돌릴 방법이 없다.
--
-- is_pilot(boolean) → phase(text) 로 바꾼다. 나중에 사전평정 조사 같은 단계가
-- 하나 더 붙을 수 있어서, 참/거짓보다 이름표가 낫다.

alter table public.participants
  add column if not exists phase text;

update public.participants
   set phase = case when is_pilot then 'pilot' else 'main' end
 where phase is null;

alter table public.participants
  alter column phase set default 'pilot',
  alter column phase set not null;

alter table public.participants
  drop constraint if exists participants_phase_check;
alter table public.participants
  add constraint participants_phase_check check (phase in ('pilot', 'main'));

create index if not exists participants_phase_idx
  on public.participants (phase, is_dev);

-- 뷰가 참조하므로 먼저 떼어낸다
drop view if exists public.pilot_export;

alter table public.participants
  drop column if exists is_pilot;

-- 진행 중 마커도 단계별로 나눈다 (파일럿 진행 중 마커가 본실험 카운트에 섞이면 안 된다)
alter table public.pending_assignments
  add column if not exists phase text not null default 'pilot';

alter table public.pending_assignments
  drop constraint if exists pending_assignments_phase_check;
alter table public.pending_assignments
  add constraint pending_assignments_phase_check check (phase in ('pilot', 'main'));

create index if not exists pending_assignments_phase_idx
  on public.pending_assignments (phase, cell);

-- 단계별로 따로 세는 배정 함수 ------------------------------------------------
drop function if exists public.assign_next_cell();

create or replace function public.assign_next_cell(p_phase text default 'pilot')
returns table(cell smallint, pending_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  pick_usage    smallint;
  pick_sequence smallint;
  pick_mapping  smallint;
  picked_cell   smallint;
  new_id        uuid;
  ttl interval := interval '20 minutes';
begin
  if p_phase not in ('pilot', 'main') then
    raise exception 'phase 값이 올바르지 않습니다: %', p_phase;
  end if;

  -- 잠금도 단계별로 나눈다 (두 단계를 동시에 돌릴 일은 없지만, 서로 막지 않게)
  perform pg_advisory_xact_lock(hashtext('ott_cell_assignment_' || p_phase));

  delete from public.pending_assignments q
   where q.created_at < now() - ttl
     and q.phase = p_phase;

  -- 이용조건 축 (cell / 18)
  select x.i into pick_usage
  from generate_series(0, 1) as x(i)
  order by (
      (select count(*)
         from public.participants p
        where p.is_dev = false
          and p.phase = p_phase
          and p.usage_condition is not null
          and (case p.usage_condition when 'SVOD' then 0 else 1 end) = x.i)
      + (select count(*) from public.pending_assignments q
          where q.phase = p_phase and q.cell / 18 = x.i)
    ) asc, random()
  limit 1;

  -- 시퀀스 축 ((cell % 18) / 3)
  select x.i into pick_sequence
  from generate_series(0, 5) as x(i)
  order by (
      (select count(*)
         from public.participants p
        where p.is_dev = false and p.phase = p_phase and p.sequence_index = x.i)
      + (select count(*) from public.pending_assignments q
          where q.phase = p_phase and (q.cell % 18) / 3 = x.i)
    ) asc, random()
  limit 1;

  -- 세트매칭 축 (cell % 3)
  select x.i into pick_mapping
  from generate_series(0, 2) as x(i)
  order by (
      (select count(*)
         from public.participants p
        where p.is_dev = false and p.phase = p_phase and p.mapping_index = x.i)
      + (select count(*) from public.pending_assignments q
          where q.phase = p_phase and q.cell % 3 = x.i)
    ) asc, random()
  limit 1;

  picked_cell := pick_usage * 18 + pick_sequence * 3 + pick_mapping;

  insert into public.pending_assignments(cell, phase)
  values (picked_cell, p_phase)
  returning id into new_id;

  return query select picked_cell, new_id;
end;
$$;

revoke all on function public.assign_next_cell(text) from public, anon, authenticated;

-- 분석용 뷰 — 단계를 컬럼으로 실어 한 곳에서 뽑고 필요할 때 나눈다 ------------
create view public.survey_export as
select
  p.phase,
  p.participant_code,
  p.assignment_seq,

  p.usage_condition,
  p.preferred_genre,

  -- 1-2 사전설문
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

  -- 4-1 조작점검
  p.mc_usage_answer,
  p.mc_usage_correct,
  array_to_string(p.mc_rationale_answer, '|') as mc_rationale_answer,
  p.mc_rationale_correct,

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
  r.dwell_ms
from public.participants p
join public.screen_responses r on r.participant_id = p.id
where p.is_dev = false
order by p.phase, p.assignment_seq, r.step_index;

revoke all on public.survey_export from anon, authenticated;
