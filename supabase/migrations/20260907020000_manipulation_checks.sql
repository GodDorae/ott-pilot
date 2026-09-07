-- 조작점검 문항 묶음 추가
--
-- 대원칙: 조작점검은 PU·RA 뒤에 붙는다. 주의력 점검(성실성 확인)만 예외로 원래 자리를 지킨다.
--
-- 화면 단위 (screen_responses)
--   mc_rationale_*   근거유형 조작점검 4지선다 — 모든 화면
--   wording_*        문구 자연스러움 5점 + 3점 이하일 때 이유 — 파일럿
--   scope_understood 하단 문구가 가로 나열 전체에 해당하는지 — 첫 화면만, 파일럿
--   genre_fit        선호 장르 적합도 5점 — 파일럿
--
-- 참여자 단위 (participants)
--   brief_understood     이용 방식 안내 이해도 5점 — 3단계 안내 화면, 파일럿
--   price_*              5,500원 현실성·부담 5점 + 이유 — TVOD 조건에서만, 파일럿
--   counterfactual_info  반대 조건이었다면 더 필요했을 정보 (개방형)
--   open_gap             평소 이용과 다르게 느낀 점
--   open_purpose         이 설문이 무엇을 확인하려는 실험이라 생각했는지 (의심 점검, 마지막)
--
-- ⚠️ 근거유형 조작점검을 화면마다 묻는 것의 대가
--   첫 화면 직후 참여자는 "추천 근거가 조작된다" 는 것을 알게 된다. 2·3화면은 그 사실을
--   아는 상태에서 보므로 첫 화면과 조건이 다르다 — 제시 순서 카운터밸런싱으로 상쇄되지
--   않는 종류의 오염이다. 파일럿에서 근거가 전달되는지 확인하려는 것이므로 감수한다.
--   본실험에서 유지할지는 파일럿 결과를 보고 정한다.

alter table public.screen_responses
  add column if not exists mc_rationale_answer text
    check (mc_rationale_answer in ('content', 'collab', 'context', 'unsure')),
  add column if not exists mc_rationale_correct boolean,
  add column if not exists wording_natural smallint
    check (wording_natural between 1 and 5),
  add column if not exists wording_reason text,
  add column if not exists scope_understood text
    check (scope_understood in ('yes', 'no', 'unsure')),
  add column if not exists genre_fit smallint
    check (genre_fit between 1 and 5);

comment on column public.screen_responses.mc_rationale_answer is
  '근거유형 조작점검 — 무엇에 가장 가까웠나. unsure = 잘 모르겠다.';
comment on column public.screen_responses.mc_rationale_correct is
  'mc_rationale_answer 가 그 화면의 실제 근거유형과 같은지.';
comment on column public.screen_responses.wording_natural is
  '화면 문구가 자연스러웠는지 (1~5). 파일럿 전용.';
comment on column public.screen_responses.wording_reason is
  'wording_natural 3점 이하일 때 받는 이유.';
comment on column public.screen_responses.scope_understood is
  '하단 문구가 가로 나열 작품 전체에 해당한다고 이해했는지. 첫 화면에서만, 파일럿 전용.';
comment on column public.screen_responses.genre_fit is
  '추천작이 선택한 선호 장르와 잘 맞았는지 (1~5). 파일럿 전용.';

alter table public.participants
  add column if not exists brief_understood smallint
    check (brief_understood between 1 and 5),
  add column if not exists price_realistic smallint
    check (price_realistic between 1 and 5),
  add column if not exists price_burden smallint
    check (price_burden between 1 and 5),
  add column if not exists price_reason text,
  add column if not exists counterfactual_info text,
  add column if not exists open_gap text,
  add column if not exists open_purpose text;

comment on column public.participants.brief_understood is
  '이용 방식 안내를 읽고 이후 이용 방식을 이해했는지 (1~5). 파일럿 전용.';
comment on column public.participants.price_realistic is
  '5,500원이 실제 OTT 에서 볼 법한 금액으로 느껴졌는지 (1~5). TVOD 조건만, 파일럿 전용.';
comment on column public.participants.price_burden is
  '5,500원이 선택에 부담으로 느껴졌는지 (1~5). TVOD 조건만, 파일럿 전용.';
comment on column public.participants.price_reason is
  '금액에 대한 이유 (선택 입력).';
comment on column public.participants.counterfactual_info is
  '반대 이용조건이었다면 추천 이유를 확인하는 데 더 필요했을 정보 (개방형).';
comment on column public.participants.open_gap is
  '평소 OTT 이용과 비교해 다르게 느낀 점.';
comment on column public.participants.open_purpose is
  '이 설문이 무엇을 비교·확인하려는 실험이라 생각했는지 (의심 점검). 반드시 마지막 문항.';

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

  -- 3단계 안내 이해도
  p.brief_understood,

  -- 이용조건 조작점검
  p.mc_usage_answer,
  p.mc_usage_correct,
  p.price_realistic,
  p.price_burden,
  p.price_reason,
  p.counterfactual_info,

  p.rank_content,
  p.rank_collab,
  p.rank_context,
  p.open_reason,

  -- 주관식 (마지막이 의심 점검)
  p.open_feeling,
  p.open_notable,
  p.open_missing,
  p.open_gap,
  p.open_purpose,

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
  -- 근거유형 조작점검을 몇 화면에서 맞혔는지 (참여자 단위)
  (select count(*) from public.screen_responses a
    where a.participant_id = p.id and a.mc_rationale_correct) as mc_rationale_correct_count,

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

  -- 화면 단위 조작점검
  r.mc_rationale_answer,
  r.mc_rationale_correct,
  r.wording_natural,
  r.wording_reason,
  r.scope_understood,
  r.genre_fit,

  coalesce(array_length(r.unclear_items, 1), 0) as unclear_count,
  array_to_string(r.unclear_items, '|') as unclear_items,
  r.unclear_reason,
  r.dwell_ms
from public.participants p
join public.screen_responses r on r.participant_id = p.id
where p.is_dev = false
order by p.phase, p.assignment_seq, r.step_index;

revoke all on public.survey_export from anon, authenticated;
