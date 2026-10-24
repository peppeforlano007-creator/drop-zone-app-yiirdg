-- Read-only Stripe sandbox diagnostic. No existing business tables are changed.
-- Trusted SQL management issues a random capability directly to pg_net. The
-- plaintext token is never selected, stored in this table, or sent to a client.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE public.booking_stripe_readiness_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  claimed_at timestamptz,
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '10 minutes')
);
ALTER TABLE public.booking_stripe_readiness_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_stripe_readiness_jobs FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE public.booking_stripe_readiness_jobs IS
  'Private one-use capabilities for a read-only Stripe test-key check. No booking/payment writes.';

CREATE FUNCTION public.claim_booking_stripe_readiness(p_token_hash text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH claimed AS (
    UPDATE public.booking_stripe_readiness_jobs
    SET claimed_at = now()
    WHERE token_hash = p_token_hash AND claimed_at IS NULL AND expires_at > now()
    RETURNING id
  ) SELECT EXISTS(SELECT 1 FROM claimed);
$$;
REVOKE ALL ON FUNCTION public.claim_booking_stripe_readiness(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_booking_stripe_readiness(text) TO service_role;
