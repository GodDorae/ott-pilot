-- 3단계 시작 전 안내 화면
--
-- 이용조건(SVOD/TVOD) 조작을 참여자에게 실제로 전달하는 화면이다.
-- 자극물 화면의 '구매' 배지만으로는 조건이 무엇인지 분명하지 않아서,
-- 3단계에 들어가기 직전에 상황과 결제 방식을 글로 한 번 읽게 한다.
--
-- 통과 시각을 남기는 이유
--   1) 흐름 강제 — 이 화면을 건너뛴 참여자가 자극물로 바로 들어가면
--      조작을 전달받지 못한 채 평가하게 된다. 컬럼이 없으면 어디까지 왔는지
--      판단할 근거가 없어 순서를 강제할 수 없다.
--   2) 검증 — assigned_at 과의 차이로 안내를 얼마나 읽었는지 볼 수 있다.
--      조작점검(3-4) 을 틀린 응답을 해석할 때 필요하다.

alter table public.participants
  add column if not exists brief_seen_at timestamptz;

comment on column public.participants.brief_seen_at is
  '3단계 안내 화면을 읽고 넘어간 시각. assigned_at 과의 차이가 안내 체류 시간.';

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

  -- 시청 경험 — 단계별 편수와 원자료
  coalesce(array_length(p.seen_title_ids, 1), 0) as watched_count,
  (select count(*) from jsonb_each_text(coalesce(p.title_familiarity, '{}'::jsonb)) f
    where f.value = 'heard') as heard_count,
  (select count(*) from jsonb_each_text(coalesce(p.title_familiarity, '{}'::jsonb)) f
    where f.value = 'unknown') as unknown_count,
  array_to_string(p.seen_title_ids, '|') as seen_title_ids,
  p.title_familiarity::text as title_familiarity,

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
  p.open_feeling,
  p.open_notable,
  p.open_missing,

  (p.followup_email is not null or p.followup_phone is not null) as followup_agreed,

  p.consent_agreed_at,
  p.started_at,
  p.assigned_at,
  p.brief_seen_at,
  -- 3단계 안내를 읽은 시간(초)
  round(extract(epoch from (p.brief_seen_at - p.assigned_at))::numeric, 1) as brief_dwell_sec,
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
