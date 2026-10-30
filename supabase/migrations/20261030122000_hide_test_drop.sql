-- Temporary: the isolated card-test drop is visible only to the test account and admins. Removed at test cleanup.
drop policy if exists "hide_card_test_drop" on public.drops;
create policy "hide_card_test_drop" on public.drops
  as restrictive for select
  using (
    id <> '7e570000-0000-4000-8000-000000000004'::uuid
    or (select auth.uid()) = '68353694-fb8a-45ec-90db-e0d07658070a'::uuid
    or coalesce(((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin', false)
  );
