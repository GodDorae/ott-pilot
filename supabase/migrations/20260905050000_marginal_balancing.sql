-- 배정을 '36개 셀 전체 균형' → '축별(marginal) 균형'으로 바꾼다
--
-- 왜 바꾸는가
--   셀은 2 × 6 × 3 = 36개다. 셀 단위로 균형을 맞추면 36명이 모여야 한 바퀴가 돌고,
--   그 전까지는 각 셀이 0 또는 1이라 어느 셀을 고르든 '가장 적은 칸'이어서 사실상
--   무작위가 된다. 실제로 10명을 넣어보니 시퀀스 분포가 {0:3, 1:2, 2:2, 3:1, 4:0, 5:2}로
--   나왔다 — 기조 문서 3단계가 요구하는 1:1:1:1:1:1 이 파일럿 표본에서 안 나오는 것이다.
--
-- 그래서 세 축을 각각 독립적으로 균형시킨다.
--   · 이용조건 2개    → 1:1
--   · 시퀀스 6개      → 1:1:1:1:1:1
--   · 세트매칭 3개    → 1:1:1
--   각 축에서 지금까지 가장 적게 쓰인 값을 고르고, 동률이면 그중 무작위.
--
-- 3원 교차(2×6×3)까지 균형시키지는 않는다. 이용조건은 피험자 간 변수이고
-- 시퀀스·세트매칭은 순서/자극물 효과를 상쇄하기 위한 통제 요인이라, 이 셋의
-- 교차 셀마다 같은 인원을 채워야 할 분석상의 이유가 없다. 축별 균형이면
-- n = 6 만 넘어도 시퀀스가 고르게 채워진다.

create or replace function public.assign_next_cell()
returns table(cell smallint, pending_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  pick_usage    smallint;
  pick_sequence smallint;
  pick_mapping  smallint;
  picked_cell   smallint;
  new_id        uuid;
  ttl interval := interval '20 minutes';
begin
  perform pg_advisory_xact_lock(hashtext('ott_pilot_cell_assignment'));

  -- 만료된 진행 중 마커 정리 (이탈자 슬롯 복구)
  delete from public.pending_assignments p where p.created_at < now() - ttl;

  -- 이용조건 축 (cell / 18)
  select x.i into pick_usage
  from generate_series(0, 1) as x(i)
  order by (
      (select count(*)
         from public.participants p
        where p.is_dev = false
          and p.usage_condition is not null
          and (case p.usage_condition when 'SVOD' then 0 else 1 end) = x.i)
      + (select count(*) from public.pending_assignments q where q.cell / 18 = x.i)
    ) asc, random()
  limit 1;

  -- 시퀀스 축 ((cell % 18) / 3)
  select x.i into pick_sequence
  from generate_series(0, 5) as x(i)
  order by (
      (select count(*)
         from public.participants p
        where p.is_dev = false and p.sequence_index = x.i)
      + (select count(*) from public.pending_assignments q where (q.cell % 18) / 3 = x.i)
    ) asc, random()
  limit 1;

  -- 세트매칭 축 (cell % 3)
  select x.i into pick_mapping
  from generate_series(0, 2) as x(i)
  order by (
      (select count(*)
         from public.participants p
        where p.is_dev = false and p.mapping_index = x.i)
      + (select count(*) from public.pending_assignments q where q.cell % 3 = x.i)
    ) asc, random()
  limit 1;

  picked_cell := pick_usage * 18 + pick_sequence * 3 + pick_mapping;

  insert into public.pending_assignments(cell)
  values (picked_cell)
  returning id into new_id;

  return query select picked_cell, new_id;
end;
$$;

revoke all on function public.assign_next_cell() from public, anon, authenticated;
