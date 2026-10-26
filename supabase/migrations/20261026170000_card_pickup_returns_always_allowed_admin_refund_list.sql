-- 1. Pickup points must ALWAYS be able to register a return (reso) or a missed
-- pickup on an item, whatever the card state. The pickup guard therefore never
-- blocks an update that records a return; it still blocks collecting/readying a
-- card item whose payment is not captured.
CREATE OR REPLACE FUNCTION public.guard_card_item_pickup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pm text; ps text;
BEGIN
  IF NEW.pickup_status IS NOT DISTINCT FROM OLD.pickup_status AND NEW.picked_up_at IS NOT DISTINCT FROM OLD.picked_up_at THEN
    RETURN NEW;
  END IF;
  IF coalesce(NEW.returned_to_sender,false) THEN RETURN NEW; END IF;
  SELECT payment_method,payment_status INTO pm,ps FROM public.bookings WHERE id=NEW.booking_id;
  IF pm='card' AND ps NOT IN ('captured') AND (NEW.pickup_status IS DISTINCT FROM 'pending' OR NEW.picked_up_at IS NOT NULL) THEN
    RAISE EXCEPTION 'CARD_PAYMENT_NOT_CAPTURED';
  END IF;
  RETURN NEW;
END $$;

-- 2. Admin-only read list for the refund screen. No Stripe ids leave the database.
CREATE FUNCTION public.admin_list_card_refunds()
RETURNS TABLE(attempt_id uuid, booking_id uuid, product_name text, customer_name text, amount_cents integer,
  captured_at timestamptz, item_collected boolean, item_returned boolean, refund_state text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='admin') THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;
  RETURN QUERY
  SELECT a.id, a.booking_id, coalesce(oi.product_name,'Articolo'),
    coalesce(nullif(trim(coalesce(p.full_name,'')),''), 'Cliente'),
    a.final_cents, a.settled_at,
    coalesce(oi.pickup_status<>'pending' OR oi.picked_up_at IS NOT NULL,false),
    coalesce(oi.returned_to_sender,false),
    coalesce(r.state,'none')
  FROM public.booking_card_attempts a
  LEFT JOIN public.order_items oi ON oi.booking_id=a.booking_id
  LEFT JOIN public.profiles p ON p.user_id=a.user_id
  LEFT JOIN public.booking_card_refunds r ON r.attempt_id=a.id
  WHERE a.state='captured' AND a.final_cents>0
  ORDER BY a.settled_at DESC NULLS LAST
  LIMIT 200;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_card_refunds() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_list_card_refunds() TO authenticated,service_role;
