-- 근거유형 재인 과제 컬럼 제거 + 접속 기기 기록
--
--  · 옛 4-1-2(재인 과제)는 쓰지 않기로 확정됐다. 보류가 아니라 제외이므로 컬럼도 지운다.
--  · 참여자가 모바일로 응답했는지 PC로 응답했는지를 컬럼으로 남긴다.
--    지금도 user_agent 와 context_snapshot.isMobile 에 들어 있지만, 둘 다 분석에서
--    바로 쓰기 불편하다(문자열 파싱 / jsonb 접근). 분석용 불리언 컬럼을 따로 둔다.
--    이 값은 자극물 목업(폰/브라우저)과 맥락 문구(스마트폰으로/큰 화면으로)를 함께 결정하므로,
--    '참여자가 무엇을 봤는가'를 재현하는 데도 필요하다.

-- 뷰가 참조하므로 먼저 떼어낸다
drop view if exists public.survey_export;

alter table public.participants
  drop column if exists mc_rationale_answer,
  drop column if exists mc_rationale_correct;

alter table public.participants
  add column if not exists is_mobile boolean;

comment on column public.participants.is_mobile is
  '응답 기기 — true 면 모바일, false 면 PC·태블릿. 세션 시작 시 user-agent 로 판정.';

create view public.survey_export as
select
  p.phase,
  p.instrument_version,
  p.participant_code,
  p.assignment_seq,

  p.usage_condition,
  p.preferred_genre,
  (p.display_name is not null) as has_display_name,

  -- 응답 기기 (목업·맥락 문구를 함께 결정한다)
  p.is_mobile,

  -- 선별
  (p.screened_out_at is not null) as screened_out,
  p.screened_out_reason,

  -- 1단계 사전조사
  p.age_group,
  p.gender,
  p.ott_platform,
  p.ott_platform_other,
  p.ott_tenure,
  p.rec_selection_freq,
  p.primary_device,
  p.primary_device_other,
  p.viewing_timeslot,

  -- 배정
  p.sequence_index,
  p.mapping_index,
  array_to_string(p.presentation_order, '>') as presentation_order,

  -- 4-1 조작점검 (조절변수)
  p.mc_usage_answer,
  p.mc_usage_correct,

  -- 4-2 순위 + 선택 이유
  p.rank_content,
  p.rank_collab,
  p.rank_context,
  p.open_reason,

  -- 4-3 주관식
  p.open_opinion,

  -- 후속 인터뷰 참여 의사 (연락처 자체는 싣지 않는다)
  (p.followup_email is not null or p.followup_phone is not null) as followup_agreed,

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
