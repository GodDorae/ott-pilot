-- 성실성 확인 문항 (attention check)
--
-- 화면마다 측정 문항 끝에 "'그렇다(4)'를 선택해 주세요" 문항을 하나 둔다.
-- 문항을 읽지 않고 같은 값만 찍고 넘어가는 응답을 걸러내기 위한 것이다.
--
-- 틀렸다고 진행을 막지는 않는다 — 막으면 참여자가 정답을 맞출 때까지 고쳐서
-- 걸러내려던 응답이 그대로 통과해 버린다. 값만 기록하고 분석에서 제외 여부를 정한다.

alter table public.screen_responses
  add column if not exists attention_check smallint
    check (attention_check between 1 and 5),
  add column if not exists attention_passed boolean;

comment on column public.screen_responses.attention_check is
  '성실성 확인 문항 응답값. 정답은 4.';
comment on column public.screen_responses.attention_passed is
  'attention_check = 4 여부. 화면 3개 중 몇 개를 통과했는지로 성실성을 본다.';

drop view if exists public.survey_export;

create view public.survey_export as
select
  p.phase,
  p.instrument_version,
  p.participant_code,
  p.assignment_seq,

  p.usage_condition,
  p.preferred_genre,
  (p.display_name is not null) as has_display_name,
  p.is_mobile,

  coalesce(array_length(p.seen_title_ids, 1), 0) as seen_count,
  array_to_string(p.seen_title_ids, '|') as seen_title_ids,

  (p.screened_out_at is not null) as screened_out,
  p.screened_out_reason,

  p.age_group,
  p.gender,
  p.ott_platform,
  p.ott_platform_other,
  p.ott_tenure,
  p.rec_selection_freq,
  p.primary_device,
  p.primary_device_other,
  p.viewing_timeslot,

  p.sequence_index,
  p.mapping_index,
  array_to_string(p.presentation_order, '>') as presentation_order,

  -- 성실성 — 화면 3개 중 통과 수 (참여자 단위)
  (select count(*) from public.screen_responses a
    where a.participant_id = p.id and a.attention_passed) as attention_passed_count,

  p.mc_usage_answer,
  p.mc_usage_correct,

  p.rank_content,
  p.rank_collab,
  p.rank_context,
  p.open_reason,
  p.open_opinion,

  (p.followup_email is not null or p.followup_phone is not null) as followup_agreed,

  p.consent_agreed_at,
  p.started_at,
  p.assigned_at,
  p.posttest_at,
  p.completed_at,

  r.step_index,
  r.rationale_type,
  r.set_id,
  array_to_string(r.title_ids, '|') as title_ids,
  r.pu1, r.pu2, r.pu3,
  round(((r.pu1 + r.pu2 + r.pu3)::numeric / 3), 3) as pu_mean,
  r.ai1, r.ai2, r.ai3,
  round(((r.ai1 + r.ai2 + r.ai3)::numeric / 3), 3) as ai_mean,
  -- 성실성 — 화면 단위
  r.attention_check,
  r.attention_passed,
  r.dwell_ms
from public.participants p
join public.screen_responses r on r.participant_id = p.id
where p.is_dev = false
order by p.phase, p.assignment_seq, r.step_index;

revoke all on public.survey_export from anon, authenticated;
