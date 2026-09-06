-- 수용의도 컬럼 이름 통일 (ai → ra) + CSV·뷰 컬럼 일치
--
-- 1) ai1~ai3 → ra1~ra3
--    문항은 화면·논문에서 RA(추천 수용의도)로 부르는데 컬럼만 ai(adoption intention)라
--    분석할 때 매번 머릿속으로 바꿔야 했다. 이름을 하나로 맞춘다.
--    rename 이라 이미 들어온 응답은 그대로 남는다.
--
-- 2) 관리자 CSV 와 survey_export 뷰가 서로 다른 컬럼을 내보내고 있었다.
--      CSV 에만: preferred_genre_label, device
--      뷰 에만 : attention_passed_count, assigned_at, brief_seen_at, brief_dwell_sec
--    Supabase 에서 바로 뽑은 자료와 관리자 화면에서 받은 자료의 열이 달라지면,
--    나중에 둘을 합칠 때 열을 손으로 맞춰야 한다. 같은 순서·같은 이름으로 통일한다.

alter table public.screen_responses rename column ai1 to ra1;
alter table public.screen_responses rename column ai2 to ra2;
alter table public.screen_responses rename column ai3 to ra3;

comment on column public.screen_responses.ra1 is '추천 수용의도 RA1';
comment on column public.screen_responses.ra2 is '추천 수용의도 RA2';
comment on column public.screen_responses.ra3 is '추천 수용의도 RA3';

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

  -- 시청 경험 — 단계별 편수와 원자료
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
  -- 3단계 안내를 읽은 시간(초)
  round(extract(epoch from (p.brief_seen_at - p.assigned_at))::numeric, 1) as brief_dwell_sec,
  p.completed_at,

  -- 성실성 — 화면 3개 중 통과 수 (참여자 단위)
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
  -- 성실성 — 화면 단위
  r.attention_check,
  r.attention_passed,
  r.dwell_ms
from public.participants p
join public.screen_responses r on r.participant_id = p.id
where p.is_dev = false
order by p.phase, p.assignment_seq, r.step_index;

revoke all on public.survey_export from anon, authenticated;
