-- 문항 이해도 확인 (화면마다)
--
-- 자극물 화면의 측정 문항 6개(지각된 유용성 3 · 추천 수용의도 3) 아래에
-- "방금 응답하신 문항들의 의미가 명확하게 이해되셨나요?" 를 붙인다.
-- 어려웠던 문항 번호를 여러 개 고를 수 있고, 없으면 '없음' 을 고른다.
--
-- 왜 화면 단위인가
--   같은 문항이라도 어떤 추천 근거를 보고 답하느냐에 따라 읽히는 정도가 달라질 수 있다.
--   화면마다 받아 두면 "3번 화면에서만 2번 문항이 어려웠다" 같은 것을 볼 수 있다.
--   참여자 단위로 한 번만 받으면 그 구분이 사라진다.
--
-- 왜 배열인가
--   여러 개를 고를 수 있으므로 문항 번호 배열로 담는다. 빈 배열 = '없음' 을 고른 것,
--   null = 아직 답하지 않은 것. 둘을 구분해야 무응답과 "어려운 게 없었다" 가 섞이지 않는다.

alter table public.screen_responses
  add column if not exists unclear_items smallint[],
  add column if not exists unclear_reason text;

comment on column public.screen_responses.unclear_items is
  '이해하기 어려웠던 측정 문항 번호(1~6). 빈 배열 = 없음, null = 미응답.';
comment on column public.screen_responses.unclear_reason is
  '어려웠던 이유 (문항을 하나라도 골랐을 때만 받는다).';

drop view if exists public.survey_export;

-- 열 순서는 관리자 CSV(HEADERS)와 같다 — 두 경로에서 받은 파일을 그대로 이어 붙일 수 있게.
create view public.survey_export as
select
  p.phase,
  p.instrument_version,
  p.participant_code,
  p.assignment_seq,

  p.usage_condition,
  p.preferred_genre,
  case p.preferred_genre
    when 'action' then '액션'
    when 'romance' then '로맨스'
    when 'comedy' then '코미디'
    when 'thriller' then '스릴러'
    when 'drama' then '드라마'
    when 'scifi' then 'SF/판타지'
  end as preferred_genre_label,
  (p.display_name is not null) as has_display_name,
  p.is_mobile,
  case when p.is_mobile then 'mobile' else 'desktop' end as device,

  coalesce(array_length(p.seen_title_ids, 1), 0) as watched_count,
  (select count(*) from jsonb_each_text(coalesce(p.title_familiarity, '{}'::jsonb)) f
    where f.value = 'heard') as heard_count,
  (select count(*) from jsonb_each_text(coalesce(p.title_familiarity, '{}'::jsonb)) f
    where f.value = 'unknown') as unknown_count,
  array_to_string(p.seen_title_ids, '|') as seen_title_ids,
  p.title_familiarity::text as title_familiarity,

  p.age_group,
  p.gender,
  p.ott_platform,
  p.ott_platform_other,
  p.ott_tenure,
  p.rec_selection_freq,
  p.primary_device,
  p.primary_device_other,
  p.viewing_timeslot,

  (p.screened_out_at is not null) as screened_out,
  p.screened_out_reason,

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
  p.posttest_at,

  p.sequence_index,
  p.mapping_index,
  array_to_string(p.presentation_order, '>') as presentation_order,

  p.started_at,
  p.assigned_at,
  p.brief_seen_at,
  round(extract(epoch from (p.brief_seen_at - p.assigned_at))::numeric, 1) as brief_dwell_sec,
  p.completed_at,

  (select count(*) from public.screen_responses a
    where a.participant_id = p.id and a.attention_passed) as attention_passed_count,

  r.step_index,
  r.rationale_type,
  r.set_id,
  array_to_string(r.title_ids, '|') as title_ids,
  r.pu1, r.pu2, r.pu3,
  round(((r.pu1 + r.pu2 + r.pu3)::numeric / 3), 3) as pu_mean,
  r.ra1, r.ra2, r.ra3,
  round(((r.ra1 + r.ra2 + r.ra3)::numeric / 3), 3) as ra_mean,
  r.attention_check,
  r.attention_passed,
  -- 문항 이해도 — 어려웠다고 고른 문항 수와 번호
  coalesce(array_length(r.unclear_items, 1), 0) as unclear_count,
  array_to_string(r.unclear_items, '|') as unclear_items,
  r.unclear_reason,
  r.dwell_ms
from public.participants p
join public.screen_responses r on r.participant_id = p.id
where p.is_dev = false
order by p.phase, p.assignment_seq, r.step_index;

revoke all on public.survey_export from anon, authenticated;
