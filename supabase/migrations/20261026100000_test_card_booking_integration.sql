-- Physical goods, TEST ONLY. No enrolments, no historical writes, no live mode.
-- Existing COD signatures/discount/inventory/closing functions are not replaced.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.booking_card_test_scopes (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  drop_id uuid NOT NULL REFERENCES public.drops(id),
  expires_at timestamptz NOT NULL,
  purpose text NOT NULL CHECK (purpose = 'isolated_synthetic_test'),
  PRIMARY KEY(user_id,drop_id)
);
ALTER TABLE public.booking_card_test_scopes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_card_test_scopes FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.booking_card_test_scopes TO service_role;

CREATE TABLE public.booking_card_attempts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  drop_id uuid NOT NULL REFERENCES public.drops(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  pickup_point_id uuid NOT NULL REFERENCES public.pickup_points(id),
  original_cents integer NOT NULL CHECK(original_cents BETWEEN 1 AND 99999999),
  group_bps integer NOT NULL CHECK(group_bps BETWEEN 0 AND 10000),
  authorized_cents integer NOT NULL CHECK(authorized_cents BETWEEN 1 AND 99999999),
  drop_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
  -- Reserved identity, NOT a booking or inventory reservation.
  target_booking_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  intent_id text UNIQUE CHECK(intent_id ~ '^pi_[A-Za-z0-9]+$'),
  booking_id uuid UNIQUE REFERENCES public.bookings(id),
  state text NOT NULL DEFAULT 'creating' CHECK(state IN (
    'creating','awaiting_authorization','booked','release_pending',
    'capture_pending','captured','released','review')),
  capture_before timestamptz,
  final_cents integer CHECK(final_cents BETWEEN 0 AND 99999999),
  final_group_bps integer CHECK(final_group_bps BETWEEN 0 AND 10000),
  final_loyalty_bps integer CHECK(final_loyalty_bps BETWEEN 0 AND 10000),
  frozen_at timestamptz,
  settled_at timestamptz,
  last_checked_at timestamptz,
  last_error text CHECK(length(last_error)<=80),
  release_reason text CHECK(length(release_reason)<=80),
  CHECK(booking_id IS NULL OR booking_id=target_booking_id),
  CHECK(expires_at>created_at AND expires_at<=created_at+interval '10 minutes')
);
CREATE UNIQUE INDEX booking_card_one_open_checkout ON public.booking_card_attempts
  (user_id,product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid))
  WHERE state NOT IN ('released','captured');
ALTER TABLE public.booking_card_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_card_attempts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.booking_card_attempts TO service_role;

-- All attempt writes go through these narrow service-only functions. No service
-- direct UPDATE/INSERT grant, no client access, and no client-supplied price.
CREATE FUNCTION public.begin_test_card_booking(p_id uuid,p_user_id uuid,p_product_id uuid,p_drop_id uuid,p_variant_id uuid DEFAULT NULL)
RETURNS public.booking_card_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.booking_card_attempts; d public.drops; p public.products; pickup uuid; amount numeric; bps integer;
BEGIN
  SELECT * INTO d FROM public.drops WHERE id=p_drop_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DROP_NOT_FOUND'; END IF;
  SELECT * INTO a FROM public.booking_card_attempts WHERE id=p_id;
  IF FOUND THEN
    IF a.user_id<>p_user_id OR a.product_id<>p_product_id OR a.drop_id<>p_drop_id
      OR a.variant_id IS DISTINCT FROM p_variant_id THEN RAISE EXCEPTION 'ATTEMPT_IDENTITY_MISMATCH'; END IF;
    RETURN a;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.booking_card_rollout WHERE singleton AND mode='test')
    OR NOT EXISTS(SELECT 1 FROM public.booking_card_test_scopes WHERE user_id=p_user_id AND drop_id=p_drop_id AND expires_at>now())
    THEN RAISE EXCEPTION 'CARD_TEST_DISABLED'; END IF;
  IF d.status<>'active' OR d.end_time<=now() THEN RAISE EXCEPTION 'DROP_NOT_OPEN'; END IF;
  SELECT pickup_point_id INTO pickup FROM public.profiles WHERE user_id=p_user_id AND NOT coalesce(account_blocked,false);
  IF pickup IS NULL OR pickup<>d.pickup_point_id THEN RAISE EXCEPTION 'PICKUP_OR_ACCOUNT_INVALID'; END IF;
  IF EXISTS(SELECT 1 FROM public.booking_no_show_events WHERE user_id=p_user_id AND voided_at IS NULL
    GROUP BY user_id HAVING count(*)>=5) THEN RAISE EXCEPTION 'ACCOUNT_BLOCKED'; END IF;
  SELECT * INTO p FROM public.products WHERE id=p_product_id AND supplier_list_id=d.supplier_list_id FOR UPDATE;
  IF NOT FOUND OR p.status<>'active' OR p.stock<=0 THEN RAISE EXCEPTION 'STOCK_UNAVAILABLE'; END IF;
  IF p_variant_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.product_variants
    WHERE id=p_variant_id AND product_id=p_product_id AND stock>0 AND status='active'
    AND (size IS NOT NULL OR color IS NOT NULL)) THEN RAISE EXCEPTION 'VARIANT_INVALID'; END IF;
  IF p_variant_id IS NULL AND EXISTS(SELECT 1 FROM public.product_variants
    WHERE product_id=p_product_id AND (size IS NOT NULL OR color IS NOT NULL)) THEN RAISE EXCEPTION 'VARIANT_REQUIRED'; END IF;
  IF EXISTS(SELECT 1 FROM public.bookings WHERE user_id=p_user_id AND product_id=p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id AND status IS DISTINCT FROM 'cancelled') THEN RAISE EXCEPTION 'BOOKING_DUPLICATE'; END IF;
  IF d.current_discount NOT BETWEEN 0 AND 100 OR p.original_price*100<>round(p.original_price*100)
    OR p.original_price*100 NOT BETWEEN 1 AND 99999999 THEN RAISE EXCEPTION 'PRICE_INVALID'; END IF;
  bps:=round(d.current_discount*100)::integer;
  amount:=round(p.original_price*100*(10000-bps)/10000);
  IF amount<1 THEN RAISE EXCEPTION 'ZERO_AUTHORIZATION_NOT_SUPPORTED'; END IF;
  INSERT INTO public.booking_card_attempts(id,user_id,product_id,drop_id,variant_id,pickup_point_id,original_cents,group_bps,authorized_cents,drop_end)
    VALUES(p_id,p_user_id,p_product_id,p_drop_id,p_variant_id,pickup,(p.original_price*100)::integer,bps,amount::integer,d.end_time) RETURNING * INTO a;
  RETURN a;
END $$;

CREATE FUNCTION public.attach_test_card_intent(p_attempt_id uuid,p_intent_id text)
RETURNS public.booking_card_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.booking_card_attempts;
BEGIN
  SELECT * INTO a FROM public.booking_card_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ATTEMPT_NOT_FOUND'; END IF;
  IF a.intent_id IS NOT NULL THEN
    IF a.intent_id<>p_intent_id THEN RAISE EXCEPTION 'INTENT_IMMUTABLE'; END IF;
    RETURN a;
  END IF;
  IF a.state NOT IN ('creating','release_pending') THEN RAISE EXCEPTION 'ATTEMPT_STATE_INVALID'; END IF;
  UPDATE public.booking_card_attempts SET intent_id=p_intent_id,
    state=CASE WHEN state='creating' THEN 'awaiting_authorization' ELSE state END
    WHERE id=a.id RETURNING * INTO a;
  RETURN a;
END $$;

-- Extend only the method check. The guard below rejects EVERY card insert/update
-- outside a server-finalized test attempt, including legacy SECURITY DEFINER RPCs.
ALTER TABLE public.bookings DROP CONSTRAINT bookings_payment_method_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_method_check CHECK(payment_method IN ('cod','card'));

CREATE FUNCTION public.guard_test_card_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.booking_card_attempts; bid uuid;
BEGIN
  IF TG_OP='DELETE' THEN bid:=OLD.id; ELSE bid:=NEW.id; END IF;
  SELECT * INTO a FROM public.booking_card_attempts WHERE target_booking_id=bid;
  IF TG_OP='INSERT' THEN
    IF NEW.payment_method IS DISTINCT FROM 'card' AND NOT FOUND THEN RETURN NEW; END IF;
    IF a.id IS NULL OR (coalesce(auth.jwt()->>'role','')<>'service_role')
      OR a.state<>'awaiting_authorization' OR a.intent_id IS NULL
      OR a.capture_before IS NULL OR a.capture_before<=a.drop_end+interval '6 hours'
      OR NOT EXISTS(SELECT 1 FROM public.booking_card_rollout WHERE singleton AND mode='test')
      OR NOT EXISTS(SELECT 1 FROM public.booking_card_test_scopes WHERE user_id=a.user_id AND drop_id=a.drop_id AND expires_at>now())
      THEN RAISE EXCEPTION 'CARD_SERVER_PROOF_REQUIRED'; END IF;
    IF NEW.user_id<>a.user_id OR NEW.product_id<>a.product_id OR NEW.drop_id<>a.drop_id
      OR NEW.variant_id IS DISTINCT FROM a.variant_id OR NEW.pickup_point_id<>a.pickup_point_id
      OR NEW.payment_method<>'card' OR NEW.payment_status<>'authorized' OR NEW.status<>'active'
      OR NEW.original_price<>a.original_cents::numeric/100 OR NEW.final_price<>a.authorized_cents::numeric/100
      OR NEW.discount_percentage<>a.group_bps::numeric/100 OR coalesce(NEW.loyalty_discount,0)<>0
      THEN RAISE EXCEPTION 'CARD_BOOKING_MISMATCH'; END IF;
    RETURN NEW;
  END IF;
  IF a.id IS NULL THEN
    IF TG_OP='DELETE' THEN
      IF OLD.payment_method='card' THEN RAISE EXCEPTION 'CARD_LINK_MISSING'; END IF;
      RETURN OLD;
    END IF;
    IF OLD.payment_method='card' OR NEW.payment_method='card' THEN RAISE EXCEPTION 'CARD_LINK_MISSING'; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='DELETE' OR coalesce(auth.jwt()->>'role','')<>'service_role' THEN RAISE EXCEPTION 'CARD_SERVER_UPDATE_REQUIRED'; END IF;
  IF (to_jsonb(NEW)-ARRAY['status','payment_status','final_price','discount_percentage','loyalty_discount','updated_at'])
    IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','payment_status','final_price','discount_percentage','loyalty_discount','updated_at'])
    THEN RAISE EXCEPTION 'CARD_IDENTITY_IMMUTABLE'; END IF;
  IF a.state='captured' AND NEW.payment_status='captured' AND NEW.status='confirmed'
    AND NEW.final_price=a.final_cents::numeric/100 AND NEW.discount_percentage=a.final_group_bps::numeric/100
    AND NEW.loyalty_discount=a.final_loyalty_bps::numeric/100 THEN RETURN NEW; END IF;
  IF a.state='released' AND a.final_cents=0 AND a.frozen_at IS NOT NULL AND NEW.payment_status='captured'
    AND NEW.status='confirmed' AND NEW.final_price=0 AND NEW.discount_percentage=a.final_group_bps::numeric/100
    AND NEW.loyalty_discount=a.final_loyalty_bps::numeric/100 THEN RETURN NEW; END IF;
  IF a.state='released' AND NEW.status='cancelled' AND NEW.payment_status='failed'
    AND NEW.final_price=OLD.final_price AND NEW.discount_percentage=OLD.discount_percentage
    AND NEW.loyalty_discount IS NOT DISTINCT FROM OLD.loyalty_discount THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'CARD_SETTLEMENT_NOT_VERIFIED';
END $$;
CREATE TRIGGER a_card_payment_guard BEFORE INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_test_card_booking();

CREATE FUNCTION public.finalize_test_card_booking(p_attempt_id uuid,p_intent_id text,p_amount_cents integer,p_capture_before timestamptz)
RETURNS public.booking_card_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.booking_card_attempts; did uuid; d public.drops;
BEGIN
  SELECT drop_id INTO did FROM public.booking_card_attempts WHERE id=p_attempt_id;
  SELECT * INTO d FROM public.drops WHERE id=did FOR UPDATE;
  SELECT * INTO a FROM public.booking_card_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ATTEMPT_NOT_FOUND'; END IF;
  IF a.intent_id IS DISTINCT FROM p_intent_id OR a.authorized_cents IS DISTINCT FROM p_amount_cents THEN RAISE EXCEPTION 'AUTHORIZATION_MISMATCH'; END IF;
  IF a.booking_id IS NOT NULL OR a.state NOT IN ('awaiting_authorization') THEN RETURN a; END IF;
  IF p_capture_before IS NULL OR p_capture_before<=a.drop_end+interval '6 hours' THEN RAISE EXCEPTION 'AUTHORIZATION_WINDOW_TOO_SHORT'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.booking_card_rollout WHERE singleton AND mode='test')
    OR NOT EXISTS(SELECT 1 FROM public.booking_card_test_scopes WHERE user_id=a.user_id AND drop_id=a.drop_id AND expires_at>now())
    OR d.status<>'active' OR d.end_time<=now() OR d.end_time IS DISTINCT FROM a.drop_end OR a.expires_at<=now()
    OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=a.user_id AND NOT coalesce(account_blocked,false))
    OR (SELECT count(*) FROM public.booking_no_show_events WHERE user_id=a.user_id AND voided_at IS NULL)>=5
    THEN
    UPDATE public.booking_card_attempts SET state='release_pending',release_reason='CHECKOUT_NO_LONGER_ELIGIBLE' WHERE id=a.id RETURNING * INTO a;
    RETURN a;
  END IF;
  UPDATE public.booking_card_attempts SET capture_before=p_capture_before WHERE id=a.id;
  BEGIN
    -- ONLY this INSERT reserves stock. Existing triggers own decrement/discount.
    INSERT INTO public.bookings(id,user_id,product_id,variant_id,drop_id,pickup_point_id,
      original_price,discount_percentage,final_price,payment_method,payment_status,status)
    VALUES(a.target_booking_id,a.user_id,a.product_id,a.variant_id,a.drop_id,a.pickup_point_id,
      a.original_cents::numeric/100,a.group_bps::numeric/100,a.authorized_cents::numeric/100,'card','authorized','active');
    UPDATE public.booking_card_attempts SET booking_id=target_booking_id,state='booked',last_error=NULL
      WHERE id=a.id RETURNING * INTO a;
  EXCEPTION WHEN OTHERS THEN
    -- INSERT/stock/discount all roll back together. Persist the required release
    -- instead of losing it in an exception/retry gap. Never log raw DB messages.
    UPDATE public.booking_card_attempts SET state='release_pending',release_reason='BOOKING_REJECTED',last_error='BOOKING_INSERT_FAILED'
      WHERE id=a.id RETURNING * INTO a;
  END;
  RETURN a;
END $$;

CREATE FUNCTION public.prepare_test_card_settlement(p_attempt_id uuid)
RETURNS public.booking_card_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.booking_card_attempts; d public.drops; did uuid; points integer; gb integer; lb integer; final numeric;
BEGIN
  SELECT drop_id INTO did FROM public.booking_card_attempts WHERE id=p_attempt_id;
  SELECT * INTO d FROM public.drops WHERE id=did FOR UPDATE;
  SELECT * INTO a FROM public.booking_card_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ATTEMPT_NOT_FOUND'; END IF;
  IF a.state<>'booked' THEN RETURN a; END IF;
  -- Reconciliation is independent of the new-authorizations switch or scope TTL.
  -- Wait for the existing closing process to publish its final price, never
  -- guess it or overwrite the COD worker. Freeze ONCE before any Stripe write.
  IF d.status<>'completed' OR d.end_time>now() OR d.final_discount_percentage IS NULL THEN RETURN a; END IF;
  IF d.end_time IS DISTINCT FROM a.drop_end OR d.final_discount_percentage NOT BETWEEN 0 AND 100
    OR a.capture_before<=now() THEN
    UPDATE public.booking_card_attempts SET state='release_pending',release_reason='CLOSING_OR_WINDOW_INVALID' WHERE id=a.id RETURNING * INTO a; RETURN a;
  END IF;
  SELECT coalesce(points_total,loyalty_points,0) INTO points FROM public.profiles WHERE user_id=a.user_id;
  gb:=round(d.final_discount_percentage*100)::integer;
  lb:=CASE WHEN points>=700 THEN 1000 WHEN points>=300 THEN 600 WHEN points>=100 THEN 300 ELSE 0 END;
  final:=round(a.original_cents::numeric*(10000-gb)*(10000-lb)/100000000);
  IF final>a.authorized_cents THEN
    UPDATE public.booking_card_attempts SET state='release_pending',release_reason='NEW_CONSENT_REQUIRED' WHERE id=a.id RETURNING * INTO a; RETURN a;
  END IF;
  UPDATE public.booking_card_attempts SET final_cents=final::integer,final_group_bps=gb,final_loyalty_bps=lb,frozen_at=now(),
    state=CASE WHEN final=0 THEN 'release_pending' ELSE 'capture_pending' END,
    release_reason=CASE WHEN final=0 THEN 'ZERO_FINAL_PRICE' ELSE NULL END WHERE id=a.id RETURNING * INTO a;
  RETURN a;
END $$;

CREATE FUNCTION public.request_test_card_release(p_attempt_id uuid,p_reason text)
RETURNS public.booking_card_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.booking_card_attempts; did uuid;
BEGIN
  SELECT drop_id INTO did FROM public.booking_card_attempts WHERE id=p_attempt_id;
  PERFORM 1 FROM public.drops WHERE id=did FOR UPDATE;
  SELECT * INTO a FROM public.booking_card_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ATTEMPT_NOT_FOUND'; END IF;
  IF p_reason NOT IN ('CUSTOMER_CANCELLED','CHECKOUT_EXPIRED','AUTHORIZATION_INVALID','DROP_CLOSED','AUTHORIZATION_EXPIRING') THEN RAISE EXCEPTION 'RELEASE_REASON_INVALID'; END IF;
  IF a.state IN ('creating','awaiting_authorization','booked') THEN
    UPDATE public.booking_card_attempts SET state='release_pending',release_reason=p_reason WHERE id=a.id RETURNING * INTO a;
  END IF;
  RETURN a;
END $$;

-- Called ONLY after the server independently retrieved and verified Stripe's
-- terminal result. Failing this DB write leaves a retryable attempt: next pass
-- retrieves Stripe first and records the existing result, never captures again.
CREATE FUNCTION public.record_test_card_result(p_attempt_id uuid,p_intent_id text,p_result text,p_received integer)
RETURNS public.booking_card_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.booking_card_attempts; did uuid;
BEGIN
  SELECT drop_id INTO did FROM public.booking_card_attempts WHERE id=p_attempt_id;
  PERFORM 1 FROM public.drops WHERE id=did FOR UPDATE;
  SELECT * INTO a FROM public.booking_card_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND OR a.intent_id IS DISTINCT FROM p_intent_id THEN RAISE EXCEPTION 'INTENT_MISMATCH'; END IF;
  IF a.state IN ('captured','released') THEN
    IF (a.state='captured' AND p_result='captured' AND p_received=a.final_cents)
      OR (a.state='released' AND p_result='released' AND p_received=0) THEN RETURN a; END IF;
    RAISE EXCEPTION 'SETTLEMENT_IMMUTABLE';
  END IF;
  IF p_result='captured' AND a.state='capture_pending' AND a.final_cents>0 AND p_received=a.final_cents THEN
    UPDATE public.booking_card_attempts SET state='captured',settled_at=now(),last_error=NULL WHERE id=a.id RETURNING * INTO a;
    UPDATE public.bookings SET payment_status='captured',status='confirmed',final_price=a.final_cents::numeric/100,
      discount_percentage=a.final_group_bps::numeric/100,loyalty_discount=a.final_loyalty_bps::numeric/100,updated_at=now() WHERE id=a.booking_id;
  ELSIF p_result='released' AND a.state IN ('release_pending','capture_pending') AND p_received=0 THEN
    UPDATE public.booking_card_attempts SET state='released',settled_at=now(),last_error=NULL WHERE id=a.id RETURNING * INTO a;
    IF a.booking_id IS NOT NULL THEN
      IF a.final_cents=0 AND a.frozen_at IS NOT NULL THEN
        UPDATE public.bookings SET payment_status='captured',status='confirmed',final_price=0,
          discount_percentage=a.final_group_bps::numeric/100,loyalty_discount=a.final_loyalty_bps::numeric/100,updated_at=now() WHERE id=a.booking_id;
      ELSE
        UPDATE public.bookings SET payment_status='failed',status='cancelled',updated_at=now() WHERE id=a.booking_id;
      END IF;
    END IF;
  ELSE RAISE EXCEPTION 'SETTLEMENT_STATE_INVALID'; END IF;
  RETURN a;
END $$;

CREATE FUNCTION public.note_test_card_check(p_attempt_id uuid,p_code text,p_review boolean DEFAULT false)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  UPDATE public.booking_card_attempts SET last_checked_at=now(),last_error=p_code,
    state=CASE WHEN p_review AND state NOT IN ('captured','released') THEN 'review' ELSE state END
    WHERE id=p_attempt_id AND (p_code IS NULL OR p_code ~ '^[A-Z_]{1,80}$');
$$;

-- No implicit public EXECUTE on any helper, including the trigger function.
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT oid::regprocedure signature FROM pg_proc WHERE pronamespace='public'::regnamespace
    AND proname IN ('begin_test_card_booking','attach_test_card_intent','guard_test_card_booking','finalize_test_card_booking',
      'prepare_test_card_settlement','request_test_card_release','record_test_card_result','note_test_card_check')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',r.signature);
    IF r.signature::text NOT LIKE 'guard_test_card_booking(%' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',r.signature);
    END IF;
  END LOOP;
END $$;
