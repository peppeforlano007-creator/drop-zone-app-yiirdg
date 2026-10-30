-- Owner decision: every booking takes ONE unit from stock, and any customer may book as many
-- units of the same article as they like until stock runs out. Stock accounting is unchanged
-- (the booking_inventory_guard trigger still decrements/restores one unit per booking and
-- still rejects bookings when stock is 0). Only the "one booking per customer per article" rules go.

DROP INDEX IF EXISTS public.idx_unique_user_product_drop_active;

DO $$
DECLARE
  def text;
  s int;
  e int;
  marker_end constant text := E'BOOKING_DUPLICATE: Hai già prenotato questo prodotto.'';\n    END IF;\n';
BEGIN
  -- 1) stock trigger: remove the duplicate guard block only.
  def := pg_get_functiondef('public.update_stock_on_booking()'::regprocedure);
  s := strpos(def, E'    IF EXISTS (\n      SELECT 1 FROM public.bookings b\n      WHERE b.user_id = NEW.user_id');
  e := strpos(def, marker_end);
  IF s = 0 OR e = 0 OR e < s THEN RAISE EXCEPTION 'duplicate guard block not found in update_stock_on_booking'; END IF;
  def := substr(def, 1, s - 1) || substr(def, e + length(marker_end));
  IF def ILIKE '%BOOKING_DUPLICATE%' THEN RAISE EXCEPTION 'update_stock_on_booking still has BOOKING_DUPLICATE'; END IF;
  EXECUTE def;

  -- 2) card checkout start: remove the same guard.
  def := pg_get_functiondef('public.begin_test_card_booking(uuid,uuid,uuid,uuid,uuid)'::regprocedure);
  s := strpos(def, E'  IF EXISTS(SELECT 1 FROM public.bookings WHERE user_id=p_user_id AND product_id=p_product_id\n    AND variant_id IS NOT DISTINCT FROM p_variant_id AND status IS DISTINCT FROM ''cancelled'') THEN RAISE EXCEPTION ''BOOKING_DUPLICATE''; END IF;\n');
  IF s = 0 THEN RAISE EXCEPTION 'duplicate guard not found in begin_test_card_booking'; END IF;
  def := substr(def, 1, s - 1) || substr(def, s + length(E'  IF EXISTS(SELECT 1 FROM public.bookings WHERE user_id=p_user_id AND product_id=p_product_id\n    AND variant_id IS NOT DISTINCT FROM p_variant_id AND status IS DISTINCT FROM ''cancelled'') THEN RAISE EXCEPTION ''BOOKING_DUPLICATE''; END IF;\n'));
  IF def ILIKE '%BOOKING_DUPLICATE%' THEN RAISE EXCEPTION 'begin_test_card_booking still has BOOKING_DUPLICATE'; END IF;
  EXECUTE def;
END $$;

-- 3) A card checkout in progress still blocks a second simultaneous checkout of the same
-- article (double tap), but a finished, booked attempt no longer blocks the next unit.
DROP INDEX IF EXISTS public.booking_card_one_open_checkout;
CREATE UNIQUE INDEX booking_card_one_open_checkout ON public.booking_card_attempts
  (user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE state IN ('creating', 'awaiting_authorization');
