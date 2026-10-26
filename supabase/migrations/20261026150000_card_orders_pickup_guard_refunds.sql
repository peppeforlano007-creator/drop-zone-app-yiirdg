-- Card orders, server-side pickup guard and operator refunds of captured card
-- payments. Dormant: no card booking exists while booking_card_rollout is
-- disabled. Never touches COD rows, complete_expired_drops() or the published
-- capture-drop-payments worker. Refunds are NOT part of the no-show policy.

-- 1. One order + one order item per confirmed card booking (idempotent).
CREATE FUNCTION public.create_card_order_for_booking(p_booking_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE b public.bookings; p record; o uuid; existing uuid;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND OR b.payment_method<>'card' OR b.payment_status<>'captured' OR b.status<>'confirmed' THEN
    RAISE EXCEPTION 'CARD_ORDER_NOT_ELIGIBLE';
  END IF;
  SELECT order_id INTO existing FROM public.order_items WHERE booking_id=b.id LIMIT 1;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  SELECT name, supplier_id INTO p FROM public.products WHERE id=b.product_id;
  IF p.supplier_id IS NULL THEN RAISE EXCEPTION 'CARD_ORDER_SUPPLIER_MISSING'; END IF;
  INSERT INTO public.orders(order_number,drop_id,supplier_id,pickup_point_id,status,total_value,commission_amount)
    VALUES('ORD-CARD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),b.drop_id,p.supplier_id,b.pickup_point_id,
      'confirmed',b.final_price,round(b.final_price*0.05,2))
    RETURNING id INTO o;
  INSERT INTO public.order_items(order_id,booking_id,product_id,user_id,product_name,selected_size,selected_color,
      original_price,discount_percentage,final_price,pickup_status)
    VALUES(o,b.id,b.product_id,b.user_id,p.name,b.selected_size,b.selected_color,
      b.original_price,b.discount_percentage,b.final_price,'pending');
  RETURN o;
END $$;

-- 2. The existing verified-result writer now also creates the card order, in
-- the same transaction as the booking confirmation (so never one without the other).
CREATE OR REPLACE FUNCTION public.record_test_card_result(p_attempt_id uuid,p_intent_id text,p_result text,p_received integer)
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
    PERFORM public.create_card_order_for_booking(a.booking_id);
  ELSIF p_result='released' AND a.state IN ('release_pending','capture_pending') AND p_received=0 THEN
    UPDATE public.booking_card_attempts SET state='released',settled_at=now(),last_error=NULL WHERE id=a.id RETURNING * INTO a;
    IF a.booking_id IS NOT NULL THEN
      IF a.final_cents=0 AND a.frozen_at IS NOT NULL THEN
        UPDATE public.bookings SET payment_status='captured',status='confirmed',final_price=0,
          discount_percentage=a.final_group_bps::numeric/100,loyalty_discount=a.final_loyalty_bps::numeric/100,updated_at=now() WHERE id=a.booking_id;
        PERFORM public.create_card_order_for_booking(a.booking_id);
      ELSE
        UPDATE public.bookings SET payment_status='failed',status='cancelled',updated_at=now() WHERE id=a.booking_id;
      END IF;
    END IF;
  ELSE RAISE EXCEPTION 'SETTLEMENT_STATE_INVALID'; END IF;
  RETURN a;
END $$;

-- 3. Server-side pickup guard: a card item cannot leave 'pending' pickup unless
-- its card payment is settled. Touches only items whose booking is a card booking.
CREATE FUNCTION public.guard_card_item_pickup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pm text; ps text;
BEGIN
  IF NEW.pickup_status IS NOT DISTINCT FROM OLD.pickup_status AND NEW.picked_up_at IS NOT DISTINCT FROM OLD.picked_up_at THEN
    RETURN NEW;
  END IF;
  SELECT payment_method,payment_status INTO pm,ps FROM public.bookings WHERE id=NEW.booking_id;
  IF pm='card' AND ps NOT IN ('captured') AND (NEW.pickup_status IS DISTINCT FROM 'pending' OR NEW.picked_up_at IS NOT NULL) THEN
    RAISE EXCEPTION 'CARD_PAYMENT_NOT_CAPTURED';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_card_item_pickup BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_card_item_pickup();

-- 4. Refunds of already captured card payments: operator-requested, one per
-- attempt, recorded only after the server independently verifies Stripe.
CREATE TABLE public.booking_card_refunds (
  attempt_id uuid PRIMARY KEY REFERENCES public.booking_card_attempts(id),
  booking_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  requested_by uuid NOT NULL,
  reason text NOT NULL CHECK (reason ~ '^[A-Z_]{1,40}$'),
  state text NOT NULL DEFAULT 'requested' CHECK (state IN ('requested','refunded','review')),
  refund_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
ALTER TABLE public.booking_card_refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_card_refunds FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.request_test_card_refund(p_attempt_id uuid,p_admin_id uuid,p_reason text)
RETURNS public.booking_card_refunds LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.booking_card_attempts; r public.booking_card_refunds; picked boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=p_admin_id AND role='admin') THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  SELECT * INTO a FROM public.booking_card_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ATTEMPT_NOT_FOUND'; END IF;
  SELECT * INTO r FROM public.booking_card_refunds WHERE attempt_id=a.id;
  IF FOUND THEN RETURN r; END IF;
  IF a.state<>'captured' OR a.final_cents IS NULL OR a.final_cents<1 THEN RAISE EXCEPTION 'REFUND_NOT_AVAILABLE'; END IF;
  -- A collected item is refunded only after it was returned to the sender.
  SELECT (pickup_status<>'pending' OR picked_up_at IS NOT NULL) AND NOT coalesce(returned_to_sender,false) INTO picked
    FROM public.order_items WHERE booking_id=a.booking_id LIMIT 1;
  IF coalesce(picked,false) THEN RAISE EXCEPTION 'REFUND_ITEM_ALREADY_COLLECTED'; END IF;
  IF p_reason !~ '^[A-Z_]{1,40}$' THEN RAISE EXCEPTION 'REFUND_REASON_INVALID'; END IF;
  INSERT INTO public.booking_card_refunds(attempt_id,booking_id,amount_cents,requested_by,reason)
    VALUES(a.id,a.booking_id,a.final_cents,p_admin_id,p_reason) RETURNING * INTO r;
  RETURN r;
END $$;

CREATE FUNCTION public.record_test_card_refund(p_attempt_id uuid,p_refund_id text,p_amount integer)
RETURNS public.booking_card_refunds LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.booking_card_refunds;
BEGIN
  SELECT * INTO r FROM public.booking_card_refunds WHERE attempt_id=p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REFUND_NOT_REQUESTED'; END IF;
  IF r.state='refunded' THEN
    IF r.refund_id IS NOT DISTINCT FROM p_refund_id AND r.amount_cents=p_amount THEN RETURN r; END IF;
    RAISE EXCEPTION 'REFUND_IMMUTABLE';
  END IF;
  IF p_amount<>r.amount_cents OR p_refund_id !~ '^re_[A-Za-z0-9]+$' THEN RAISE EXCEPTION 'REFUND_AMOUNT_MISMATCH'; END IF;
  UPDATE public.booking_card_refunds SET state='refunded',refund_id=p_refund_id,settled_at=now() WHERE attempt_id=r.attempt_id RETURNING * INTO r;
  UPDATE public.bookings SET payment_status='refunded',updated_at=now() WHERE id=r.booking_id;
  RETURN r;
END $$;

CREATE FUNCTION public.note_test_card_refund_review(p_attempt_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  UPDATE public.booking_card_refunds SET state='review' WHERE attempt_id=p_attempt_id AND state='requested';
$$;

-- 5. The booking guard learns exactly one new transition: captured -> refunded,
-- only once a refund was verified and recorded. Everything else is unchanged.
CREATE OR REPLACE FUNCTION public.guard_test_card_booking() RETURNS trigger
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
  IF a.state='captured' AND OLD.payment_status='captured' AND NEW.payment_status='refunded'
    AND EXISTS(SELECT 1 FROM public.booking_card_refunds WHERE attempt_id=a.id AND state='refunded')
    AND NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.final_price=OLD.final_price
    AND NEW.discount_percentage=OLD.discount_percentage
    AND NEW.loyalty_discount IS NOT DISTINCT FROM OLD.loyalty_discount THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'CARD_SETTLEMENT_NOT_VERIFIED';
END $$;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT oid::regprocedure signature, proname FROM pg_proc WHERE pronamespace='public'::regnamespace
    AND proname IN ('create_card_order_for_booking','guard_card_item_pickup','request_test_card_refund','record_test_card_refund','note_test_card_refund_review')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',r.signature);
    IF r.proname NOT IN ('guard_card_item_pickup') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',r.signature);
    END IF;
  END LOOP;
END $$;
