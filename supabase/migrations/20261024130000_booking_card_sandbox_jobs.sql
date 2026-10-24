-- Isolated Stripe SANDBOX lifecycle tests only. No booking/customer/catalogue
-- writes, no changes to production stock, COD checkout, closing workers or policy.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE public.booking_card_sandbox_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  claimed_at timestamptz,
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed')),
  result jsonb,
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '10 minutes')
);
ALTER TABLE public.booking_card_sandbox_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_card_sandbox_jobs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.booking_card_sandbox_jobs TO service_role;
GRANT UPDATE (status,finished_at,result) ON public.booking_card_sandbox_jobs TO service_role;
COMMENT ON TABLE public.booking_card_sandbox_jobs IS
  'Trusted management-only sandbox card tests. Results contain no secrets/customer data. Stable id supplies Stripe idempotency.';
CREATE FUNCTION public.claim_booking_card_sandbox(p_token_hash text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  UPDATE public.booking_card_sandbox_jobs SET claimed_at = now(), status = 'running'
  WHERE token_hash = p_token_hash AND status = 'pending' AND claimed_at IS NULL AND expires_at > now()
  RETURNING id;
$$;
REVOKE ALL ON FUNCTION public.claim_booking_card_sandbox(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_booking_card_sandbox(text) TO service_role;
