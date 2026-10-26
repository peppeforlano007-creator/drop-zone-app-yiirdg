-- Durable single-use capabilities for the test-only card reconciler.
-- Empty attempt table => NO network call. The new-authorizations kill switch
-- deliberately does not abandon an already authorized amount.
CREATE TABLE public.booking_card_reconcile_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',
  claimed_at timestamptz,
  CHECK(expires_at>created_at AND expires_at<=created_at+interval '5 minutes')
);
ALTER TABLE public.booking_card_reconcile_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_card_reconcile_jobs FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.claim_booking_card_reconcile(p_token_hash text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  WITH claimed AS (
    UPDATE public.booking_card_reconcile_jobs SET claimed_at=now()
    WHERE token_hash=p_token_hash AND claimed_at IS NULL AND expires_at>now() RETURNING id
  ) SELECT EXISTS(SELECT 1 FROM claimed);
$$;
REVOKE ALL ON FUNCTION public.claim_booking_card_reconcile(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.claim_booking_card_reconcile(text) TO service_role;

CREATE FUNCTION public.enqueue_booking_card_reconcile()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE token text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.booking_card_attempts WHERE state IN
    ('creating','awaiting_authorization','booked','capture_pending','release_pending')) THEN RETURN; END IF;
  -- pgcrypto is explicitly schema-qualified. Raw tokens exist only in transit,
  -- never in the job table/results. No reusable server credential leaves SQL.
  token:=encode(extensions.gen_random_bytes(32),'hex');
  INSERT INTO public.booking_card_reconcile_jobs(token_hash) VALUES(encode(extensions.digest(token,'sha256'),'hex'));
  PERFORM net.http_post(
    url:='https://sippdylyuzejudmzbwdn.supabase.co/functions/v1/reconcile-booking-cards-test',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:=jsonb_build_object('token',token),timeout_milliseconds:=10000
  );
END $$;
REVOKE ALL ON FUNCTION public.enqueue_booking_card_reconcile() FROM PUBLIC,anon,authenticated,service_role;
-- Owned by the migration role; no client/admin-in-app can enqueue payment work.
SELECT cron.schedule('rdn-test-card-reconcile-v1','* * * * *','SELECT public.enqueue_booking_card_reconcile()');
