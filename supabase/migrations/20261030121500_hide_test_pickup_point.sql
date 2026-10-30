-- Temporary: the isolated card-test pickup point must be invisible to real customers.
-- Restrictive policy: only the test account and admins can read this one row. Removed at test cleanup.
drop policy if exists "hide_card_test_pickup_point" on public.pickup_points;
create policy "hide_card_test_pickup_point" on public.pickup_points
  as restrictive for select
  using (
    id <> '7e570000-0000-4000-8000-000000000001'::uuid
    or (select auth.uid()) = '68353694-fb8a-45ec-90db-e0d07658070a'::uuid
    or coalesce(((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin', false)
  );
