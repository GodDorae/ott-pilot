-- 요청 반영 일괄 변경
--
--  · 리커트 7점 → 5점 (화면별 유용성 3 + 수용의도 3)
--  · 화면 표시용 호칭 12자 → 4자
--  · 선별 제외(screen-out) 기록 — B-1 '없음', B-2 '사용한 적 없음'
--  · 후속 인터뷰 연락처 (선택 입력)
--  · 4-2 순위 선택 이유를 순위 화면에서 함께 받으므로 컬럼 의미만 정리
--
-- 4-1-2 독립변수 재인 과제는 '보류'라 화면에서만 빼고 컬럼(mc_rationale_*)은 남긴다.
-- 다시 넣기로 하면 화면만 되살리면 된다.

-- 1) 리커트 5점 -----------------------------------------------------------
alter table public.screen_responses
  drop constraint if exists screen_responses_pu1_check,
  drop constraint if exists screen_responses_pu2_check,
  drop constraint if exists screen_responses_pu3_check,
  drop constraint if exists screen_responses_ai1_check,
  drop constraint if exists screen_responses_ai2_check,
  drop constraint if exists screen_responses_ai3_check;

alter table public.screen_responses
  add constraint screen_responses_pu1_check check (pu1 between 1 and 5),
  add constraint screen_responses_pu2_check check (pu2 between 1 and 5),
  add constraint screen_responses_pu3_check check (pu3 between 1 and 5),
  add constraint screen_responses_ai1_check check (ai1 between 1 and 5),
  add constraint screen_responses_ai2_check check (ai2 between 1 and 5),
  add constraint screen_responses_ai3_check check (ai3 between 1 and 5);

-- 2) 호칭 4자 -------------------------------------------------------------
alter table public.participants
  drop constraint if exists participants_display_name_check;
alter table public.participants
  add constraint participants_display_name_check
  check (display_name is null or char_length(display_name) between 1 and 4);

-- 3) 선별 제외 ------------------------------------------------------------
alter table public.participants
  add column if not exists screened_out_at timestamptz,
  add column if not exists screened_out_reason text
    check (screened_out_reason in ('no_platform', 'never_used'));

comment on column public.participants.screened_out_reason is
  'no_platform = B-1 에서 이용 플랫폼 없음 / never_used = B-2 에서 사용한 적 없음';

-- 4) 후속 인터뷰 연락처 (선택) --------------------------------------------
-- 개인정보라 분석용 뷰에는 싣지 않는다. 인터뷰 대상자 선정이 끝나면 지울 것.
alter table public.participants
  add column if not exists followup_email text,
  add column if not exists followup_phone text;

comment on column public.participants.followup_email is
  '후속 인터뷰용 연락처(선택). 분석에 쓰지 않으며 CSV 에도 나가지 않는다.';

-- 5) 분석용 뷰 갱신 -------------------------------------------------------
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
