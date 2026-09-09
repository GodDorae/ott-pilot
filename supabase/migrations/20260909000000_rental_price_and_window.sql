-- 개별 대여 조건 변경 — 5,500원 48시간 → 4,000원, 결제 후 30일 내 시청 시작, 시작 후 48시간
--
-- 스키마는 그대로다. 화면·문항 문구는 앱 코드(copy.ts / brief.ts / checks.ts / posttest.ts)에
-- 있고, 여기서는 그 문구를 그대로 옮겨 적어 둔 컬럼 설명만 맞춘다.
--
-- ⚠️ 이 변경은 조절변수(이용조건) 조작 자체를 바꾼다. 이전에 수집된 응답은 5,500원·48시간
--    조건에서 받은 것이라 나란히 놓고 분석하면 안 된다. participants.instrument_version 이
--    판 1(이전) / 판 2(이번) 로 갈라 주므로 그 값으로 나눠서 본다.

comment on column public.participants.price_realistic is
  '4,000원이 실제 OTT 에서 볼 법한 금액으로 느껴졌는지 (1~5). TVOD 조건만, 파일럿 전용.';
comment on column public.participants.price_burden is
  '4,000원이 선택에 부담으로 느껴졌는지 (1~5). TVOD 조건만, 파일럿 전용.';
