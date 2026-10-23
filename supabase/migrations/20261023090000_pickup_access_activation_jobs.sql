-- Owner-approved, single-use activation jobs. No browser/user can enqueue jobs.
-- Credentials stay inside the Edge Function environment. Tokens are generated
-- within Postgres and sent by pg_net, never returned to clients.
CREATE TABLE public.pickup_access_activation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  pickup_point_id uuid NOT NULL REFERENCES public.pickup_points(id),
  email text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  claimed_at timestamptz,
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed')),
  result jsonb
);
ALTER TABLE public.pickup_access_activation_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pickup_access_activation_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.pickup_access_activation_jobs TO service_role;

CREATE FUNCTION public.claim_pickup_access_activation(p_token_hash text)
RETURNS TABLE(id uuid, pickup_point_id uuid, email text)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  UPDATE public.pickup_access_activation_jobs j
  SET claimed_at = now(), status = 'running'
  WHERE j.token_hash = p_token_hash AND j.status = 'pending'
    AND j.expires_at > now()
  RETURNING j.id, j.pickup_point_id, j.email;
$$;
REVOKE ALL ON FUNCTION public.claim_pickup_access_activation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pickup_access_activation(text) TO service_role;
