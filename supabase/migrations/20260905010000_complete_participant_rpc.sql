-- completed_at 을 DB 시각으로 찍는다.
--
-- 이전에는 앱 서버가 자기 로컬 시각을 보냈다. started_at 은 DB 의 now() 기본값이라
-- 두 시각의 기준 시계가 달라, 시계 차이만큼 소요시간이 틀어졌다(음수까지 나옴).
-- 참여 소요시간은 파일럿에서 확인해야 할 지표이므로 한쪽 시계로 통일한다.

create or replace function public.complete_participant(pid uuid)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  update public.participants
     set completed_at = now()
   where id = pid
     and completed_at is null
  returning completed_at;
$$;

revoke all on function public.complete_participant(uuid) from public, anon, authenticated;
