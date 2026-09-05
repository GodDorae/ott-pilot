-- 측정 도구 버전 기록
--
-- 본실험은 구성과 순서가 달라질 수 있다. 그런데 단계 순서·문항 구성은 스키마가 아니라
-- 앱 코드에 있어서, 바꿔도 DB에는 흔적이 남지 않는다. 그러면 나중에 파일럿과 본실험
-- 응답을 나란히 놓았을 때 어느 쪽이 어떤 문항지로 받은 것인지 구분할 수 없다.
--
-- 참여자마다 그때의 도구 버전을 찍어 둔다. 값은 앱의 INSTRUMENT_VERSION 상수에서 온다.

alter table public.participants
  add column if not exists instrument_version text;

comment on column public.participants.instrument_version is
  '응답 수집 당시의 문항 구성·단계 순서 버전 (src/lib/phase.ts 의 INSTRUMENT_VERSION)';

-- 분석용 뷰에 함께 실어 CSV 에서 바로 보이게 한다
drop view if exists public.survey_export;

create view public.survey_export as
select
  p.phase,
  p.instrument_version,
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
