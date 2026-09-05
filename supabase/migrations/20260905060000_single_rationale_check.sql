-- 독립변수 조작점검을 trial 마다 → 마지막에 한 번으로
--
-- 왜 바꾸는가
--   한 trial 안에서는 포스터 소재가 달라도 근거유형은 하나로 고정된다. 같은 유형이
--   3편 내내 이어지므로 trial 마다 묻는 것은 같은 질문을 세 번 하는 셈이고,
--   응답 부담만 늘린다. 4단계에서 한 번만 확인한다.
--
-- 마지막 한 번짜리 문항은 형태가 달라야 한다
--   모든 참여자가 세 유형을 다 보기 때문에 "무엇이었나요?"를 한 번 묻는 것은 성립하지
--   않는다. 그래서 실제 제시된 설명 3개 + 제시되지 않은 방해자극(distractor) 2개를
--   함께 보여주고 고르게 하는 재인(recognition) 과제로 만든다.
--   정답 = 실제 3개를 모두 고르고 방해자극을 하나도 고르지 않은 경우.

-- 1) 뷰가 해당 컬럼을 참조하므로 먼저 떼어낸다 (아래에서 다시 만든다)
drop view if exists public.pilot_export;

-- 화면별 조작점검 컬럼 제거 (수집을 중단하므로 남겨둘 이유가 없다)
alter table public.screen_responses
  drop column if exists manipulation_answer,
  drop column if exists manipulation_correct;

-- 2) 독립변수 재인 조작점검 (참여자당 1건)
alter table public.participants
  add column if not exists mc_rationale_answer text[],
  add column if not exists mc_rationale_correct boolean;

-- 3) 분석용 뷰 재생성
create view public.pilot_export as
select
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

  -- 4-1 조작점검 (조절변수 + 독립변수)
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
order by p.assignment_seq, r.step_index;

revoke all on public.pilot_export from anon, authenticated;
