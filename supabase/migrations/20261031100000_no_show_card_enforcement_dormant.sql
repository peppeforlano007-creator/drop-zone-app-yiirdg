-- Enforcement of the missed-pickup policy for cash-on-pickup bookings. DORMANT:
-- the flag defaults to false, so create_booking_atomic behaves exactly as before.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.booking_card_rollout
  ADD COLUMN IF NOT EXISTS enforce_no_show_card boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.create_booking_atomic(p_user_id uuid, p_product_id uuid, p_variant_id uuid DEFAULT NULL::uuid, p_drop_id uuid DEFAULT NULL::uuid, p_pickup_point_id uuid DEFAULT NULL::uuid, p_original_price numeric DEFAULT 0, p_discount_percentage numeric DEFAULT 0, p_final_price numeric DEFAULT 0, p_payment_method text DEFAULT 'cod'::text, p_payment_status text DEFAULT 'pending'::text, p_status text DEFAULT 'active'::text)
 RETURNS SETOF bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_profile_pickup uuid;
  v_drop_status text;
  v_booking public.bookings;
  v_enforce boolean;
  v_blocked boolean;
  v_events integer;
BEGIN
  SELECT pickup_point_id, COALESCE(account_blocked, false) INTO v_profile_pickup, v_blocked
    FROM public.profiles WHERE user_id = p_user_id;
  IF v_profile_pickup IS NULL THEN
    RAISE EXCEPTION 'PICKUP_POINT_REQUIRED: Devi selezionare un punto di ritiro nel tuo profilo prima di prenotare.';
  END IF;

  -- Missed-pickup policy (only when the owner has switched it on).
  IF p_payment_method = 'cod' THEN
    SELECT enforce_no_show_card INTO v_enforce FROM public.booking_card_rollout WHERE singleton = true;
    IF COALESCE(v_enforce, false) THEN
      SELECT count(*)::integer INTO v_events FROM public.booking_no_show_events
        WHERE user_id = p_user_id AND voided_at IS NULL;
      IF v_blocked OR v_events >= 5 THEN
        RAISE EXCEPTION 'ACCOUNT_BLOCKED: Il tuo account è bloccato per ordini non ritirati. Contatta l''assistenza.';
      END IF;
      IF v_events >= 2 THEN
        RAISE EXCEPTION 'CARD_REQUIRED: Dopo 2 ordini non ritirati serve il pagamento con carta per prenotare.';
      END IF;
    END IF;
  END IF;

  SELECT status INTO v_drop_status FROM public.drops WHERE id = p_drop_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Drop non trovato' USING ERRCODE = 'P0002'; END IF;
  IF v_drop_status <> 'active' THEN RAISE EXCEPTION 'Drop non attivo o già terminato'; END IF;
  INSERT INTO public.bookings (
    user_id, product_id, variant_id, drop_id, pickup_point_id,
    original_price, discount_percentage, final_price, payment_method, payment_status, status
  ) VALUES (
    p_user_id, p_product_id, p_variant_id, p_drop_id, p_pickup_point_id,
    p_original_price, p_discount_percentage, p_final_price, p_payment_method, p_payment_status, p_status
  ) RETURNING * INTO v_booking;
  RETURN NEXT v_booking;
END;
$function$;
