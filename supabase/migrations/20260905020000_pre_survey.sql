-- 사전 문항 추가 — A. 인구 통계학적 정보 / B. OTT 이용 현황
--
-- 원 설문(구글 폼) 섹션 2~3에 해당한다. 자극물 노출 전에 받는 통제변수·공변량이며,
-- 참여자 1명당 1행이므로 participants 에 컬럼으로 붙인다.
-- 값은 분석 도구에서 읽기 쉬운 ASCII 슬러그로 저장하고, 한글 라벨은 앱이 갖는다.

alter table public.participants
  -- 연구참여 동의 (소개 화면의 통계법 고지 확인 시점)
  add column if not exists consent_agreed_at timestamptz,

  -- A-1 연령대
  add column if not exists age_group text
    check (age_group in ('10s', '20s', '30s', '40s', '50s_plus')),

  -- A-2 성별
  add column if not exists gender text
    check (gender in ('female', 'male')),

  -- B-1 주 이용 OTT 플랫폼
  add column if not exists ott_platform text
    check (ott_platform in ('netflix', 'tving', 'coupangplay', 'wavve', 'watcha', 'none', 'other')),
  add column if not exists ott_platform_other text,

  -- B-2 이용 기간
  add column if not exists ott_tenure text
    check (ott_tenure in ('under_1m', '1_6m', '6m_1y', 'over_1y', 'never')),

  -- B-3 추천 콘텐츠 선택 빈도
  add column if not exists rec_selection_freq text
    check (rec_selection_freq in ('rarely', 'sometimes', 'often', 'always')),

  -- B-4 주 이용 기기
  add column if not exists primary_device text
    check (primary_device in ('smartphone', 'tablet', 'pc', 'tv', 'other')),
  add column if not exists primary_device_other text,

  -- B-5 주 감상 시간대
  add column if not exists viewing_timeslot text
    check (viewing_timeslot in ('morning', 'afternoon', 'evening', 'late_night', 'irregular'));

-- 'other' 를 고르지 않았는데 기타 입력이 남아 있는 상태를 막는다
alter table public.participants
  drop constraint if exists participants_platform_other_chk;
alter table public.participants
  add constraint participants_platform_other_chk
  check (ott_platform_other is null or ott_platform = 'other');

alter table public.participants
  drop constraint if exists participants_device_other_chk;
alter table public.participants
  add constraint participants_device_other_chk
  check (primary_device_other is null or primary_device = 'other');

-- 분석용 뷰 갱신 — 사전 문항을 앞쪽에 함께 내보낸다.
-- create or replace 로는 컬럼을 중간에 끼워넣을 수 없어 drop 후 재생성한다.
drop view if exists public.pilot_export;

create view public.pilot_export as
select
  p.participant_code,
  p.assignment_seq,
  p.usage_condition,
  p.preferred_genre,
  p.age_group,
  p.gender,
  p.ott_platform,
  p.ott_platform_other,
  p.ott_tenure,
  p.rec_selection_freq,
  p.primary_device,
  p.primary_device_other,
  p.viewing_timeslot,
  p.order_index,
  p.mapping_index,
  array_to_string(p.presentation_order, '>') as presentation_order,
  p.consent_agreed_at,
  p.started_at,
  p.completed_at,
  r.step_index,
  r.rationale_type,
  r.set_id,
  array_to_string(r.title_ids, '|') as title_ids,
  r.pu1, r.pu2, r.pu3,
  round(((r.pu1 + r.pu2 + r.pu3)::numeric / 3), 3) as pu_mean,
  r.ai1, r.ai2, r.ai3,
  round(((r.ai1 + r.ai2 + r.ai3)::numeric / 3), 3) as ai_mean,
  r.manipulation_answer,
  r.manipulation_correct,
  r.dwell_ms
from public.participants p
join public.screen_responses r on r.participant_id = p.id
order by p.assignment_seq, r.step_index;

revoke all on public.pilot_export from anon, authenticated;
