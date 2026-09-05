-- 화면 표시용 호칭
--
-- 자극물 화면의 몰입도를 높이기 위해 OTT 앱처럼 프로필 이름을 노출한다.
--
-- 실명이 아니라 '화면에 표시될 호칭'을 받는다. 소개 화면에서 모든 응답을 익명으로
-- 처리한다고 고지했으므로, 실명을 받아 저장하면 그 고지와 어긋난다.
-- 그래서 화면에서도 실명일 필요가 없다고 안내하고, 분석용 뷰(survey_export)에는
-- 호칭 자체를 싣지 않는다 — 입력 여부(has_display_name)만 나간다.
-- 논문 아카이브용으로 넘기기 전에 이 컬럼은 지우는 것이 안전하다.

alter table public.participants
  add column if not exists display_name text
    check (display_name is null or char_length(display_name) between 1 and 12);

comment on column public.participants.display_name is
  '자극물 화면에 표시한 호칭(실명 아님). 분석에 쓰지 않으며 CSV 에도 나가지 않는다.';

drop view if exists public.survey_export;

create view public.survey_export as
select
  p.phase,
  p.instrument_version,
  p.participant_code,
  p.assignment_seq,

  p.usage_condition,
  p.preferred_genre,
  -- 호칭 자체는 싣지 않는다 (익명성). 개인화가 실제로 걸렸는지만 확인할 수 있게 한다.
  (p.display_name is not null) as has_display_name,

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
