-- 시청 경험 확인 문항
--
-- 자극물 작품은 '이미 알고 있는 작품이면 안 된다'는 기준으로 고른 것들이다
-- (인수인계 문서 1.1 기준 1번 — 저인지도). 그 가정이 참여자마다 실제로 성립하는지
-- 확인하지 않으면, 평가가 추천 근거유형 때문인지 원래 그 작품을 좋아해서인지 갈라낼 수 없다.
--
-- 장르 선택 직후, 그 장르에서 보게 될 12편을 보여주고 본 적 있는 작품을 고르게 한다.
-- 세트가 4편(온전히 3 + peek 1)이고 3세트를 모두 보므로, 장르 12편이 곧 노출 전체다.
--
-- 비워 두는 것과 '본 작품 없음'을 구분해야 하므로, 응답하면 빈 배열이라도 저장한다.

alter table public.participants
  add column if not exists seen_title_ids text[];

comment on column public.participants.seen_title_ids is
  '선택한 장르 12편 중 이미 본 적 있다고 답한 작품의 id. 빈 배열 = 본 작품 없음, null = 미응답.';

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

  -- 시청 경험 — 저인지도 가정이 참여자마다 성립했는지
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
  r.dwell_ms
from public.participants p
join public.screen_responses r on r.participant_id = p.id
where p.is_dev = false
order by p.phase, p.assignment_seq, r.step_index;

revoke all on public.survey_export from anon, authenticated;
