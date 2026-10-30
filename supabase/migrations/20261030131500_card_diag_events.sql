-- Temporary diagnostic for the isolated card test. Removed at cleanup.
create table if not exists public.card_diag_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id uuid,
  action text,
  detail jsonb
);
alter table public.card_diag_events enable row level security;
revoke all on public.card_diag_events from anon, authenticated;
