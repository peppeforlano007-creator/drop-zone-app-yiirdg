-- Dormant card cohort only. Existing COD cancellation/closing is untouched.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

-- The same drop -> attempt lock order as finalization/closing. A customer
-- cancellation wins BEFORE capture is frozen, or loses without touching Stripe.
-- clock_timestamp() is intentional: a transaction waiting on a lock may cross
-- the deadline; transaction-start now() would incorrectly accept that request.
CREATE FUNCTION public.request_test_card_customer_cancellation(p_attempt_id uuid,p_user_id uuid)
RETURNS public.booking_card_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.booking_card_attempts; d public.drops; did uuid;
BEGIN
  SELECT drop_id INTO did FROM public.booking_card_attempts WHERE id=p_attempt_id AND user_id=p_user_id;
  IF did IS NULL THEN RAISE EXCEPTION 'ATTEMPT_NOT_FOUND'; END IF;
  SELECT * INTO d FROM public.drops WHERE id=did FOR UPDATE;
  SELECT * INTO a FROM public.booking_card_attempts WHERE id=p_attempt_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ATTEMPT_NOT_FOUND'; END IF;
  -- Retries of an accepted request stay accepted even after closing/switch-off.
  IF a.release_reason='CUSTOMER_CANCELLED' AND a.state IN ('release_pending','released') THEN RETURN a; END IF;
  IF a.state IN ('capture_pending','captured') OR a.frozen_at IS NOT NULL THEN
    RAISE EXCEPTION 'SETTLEMENT_ALREADY_STARTED';
  END IF;
  IF a.state NOT IN ('creating','awaiting_authorization','booked') THEN
    RAISE EXCEPTION 'CANCELLATION_UNAVAILABLE';
  END IF;
  IF d.id IS NULL OR d.status<>'active' OR d.end_time<=clock_timestamp()
    OR d.end_time IS DISTINCT FROM a.drop_end THEN RAISE EXCEPTION 'CANCELLATION_DEADLINE_PASSED'; END IF;
  UPDATE public.booking_card_attempts SET state='release_pending',release_reason='CUSTOMER_CANCELLED',
    last_error=NULL WHERE id=a.id RETURNING * INTO a;
  -- No optimistic booking cancellation, inventory release, refund, or capture.
  -- Those effects require an independently retrieved Stripe cancellation result.
  RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.request_test_card_customer_cancellation(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.request_test_card_customer_cancellation(uuid,uuid) TO service_role;

-- Preserve the old service RPC signature while preventing a deadline bypass.
-- Internal recovery reasons may still release unsafe/expired holds after closing.
CREATE OR REPLACE FUNCTION public.request_test_card_release(p_attempt_id uuid,p_reason text)
RETURNS public.booking_card_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.booking_card_attempts; did uuid;
BEGIN
  SELECT drop_id INTO did FROM public.booking_card_attempts WHERE id=p_attempt_id;
  PERFORM 1 FROM public.drops WHERE id=did FOR UPDATE;
  SELECT * INTO a FROM public.booking_card_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ATTEMPT_NOT_FOUND'; END IF;
  IF p_reason='CUSTOMER_CANCELLED' THEN
    RETURN public.request_test_card_customer_cancellation(a.id,a.user_id);
  END IF;
  IF p_reason IS NULL OR p_reason NOT IN ('CHECKOUT_EXPIRED','AUTHORIZATION_INVALID','DROP_CLOSED','AUTHORIZATION_EXPIRING') THEN
    RAISE EXCEPTION 'RELEASE_REASON_INVALID';
  END IF;
  IF a.state IN ('creating','awaiting_authorization','booked') THEN
    UPDATE public.booking_card_attempts SET state='release_pending',release_reason=p_reason WHERE id=a.id RETURNING * INTO a;
  END IF;
  RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.request_test_card_release(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.request_test_card_release(uuid,text) TO service_role;
