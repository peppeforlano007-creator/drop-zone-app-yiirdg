-- Dormant saved-card support for the private card test. No client can read or
-- write these tables; only the card edge function (service_role) does.
create table if not exists public.booking_saved_cards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique check (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  consent_text_version text not null,
  consented_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
-- One decision per booking attempt, written BEFORE Stripe is called so a retry
-- always creates the identical PaymentIntent (same idempotency key, same body).
create table if not exists public.booking_card_save_requests (
  attempt_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  save_card boolean not null,
  customer_id text check (customer_id is null or customer_id ~ '^cus_[A-Za-z0-9]+$'),
  created_at timestamptz not null default now()
);
alter table public.booking_saved_cards enable row level security;
alter table public.booking_card_save_requests enable row level security;
revoke all on public.booking_saved_cards, public.booking_card_save_requests from public, anon, authenticated;
grant select, insert, update, delete on public.booking_saved_cards, public.booking_card_save_requests to service_role;
