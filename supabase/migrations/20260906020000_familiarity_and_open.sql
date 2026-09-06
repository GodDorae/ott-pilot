-- 시청 경험 3점 확인 + 주관식 3문항
--
-- 1) 시청 경험 (2-2)
--    "봤다 / 안 봤다" 이분법으로는 자극물의 전제를 확인하기에 모자랐다.
--    이름은 아는데 안 본 작품은 '모르는 작품'과 다르게 반응할 수 있어서,
--    전혀 모른다 / 이름만 들어봤다 / 시청한 적 있다 세 단계로 받는다.
--    12편 전부에 답하게 하므로 무응답과 '모른다'가 섞이지 않는다.
--
--    title_familiarity 는 작품 id → 단계 의 jsonb 다. 작품 목록이 바뀌어도
--    컬럼을 새로 파지 않아도 되고, 어떤 작품에 무엇을 답했는지 그대로 남는다.
--    seen_title_ids 는 그중 '시청한 적 있다' 만 추린 것 — 기존 분석/뷰가 그대로 쓴다.
--
-- 2) 주관식 (4-2)
--    한 문항으로 뭉뚱그려 받던 것을 세 문항으로 나눈다.
--    느낀 점 / 눈에 들어온 것 / 더 있었으면 한 것 — 물어보는 대상이 다르므로
--    한 칸에 몰아 받으면 셋 중 하나만 적고 끝난다.

alter table public.participants
  add column if not exists title_familiarity jsonb,
  add column if not exists open_feeling text,
  add column if not exists open_notable text,
  add column if not exists open_missing text;

comment on column public.participants.title_familiarity is
  '작품 id → unknown | heard | watched. 선호 장르 12편 전부에 대한 응답.';
comment on column public.participants.seen_title_ids is
  'title_familiarity 중 watched 인 작품 id (자극물 전제 확인용).';
comment on column public.participants.open_feeling is
  '4-2-1 추천 화면을 보고 든 생각·느낌.';
comment on column public.participants.open_notable is
  '4-2-2 특별히 눈에 들어온 내용.';
comment on column public.participants.open_missing is
  '4-2-3 제공된 내용 외에 더 있었으면 한 것.';

-- 뷰가 컬럼을 참조하므로 먼저 내린다
drop view if exists public.survey_export;

-- 세 문항으로 갈음한다
alter table public.participants drop column if exists open_opinion;

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
