-- Stock is REMAINING inventory, not original capacity. No inventory backfill.
-- Keep both published RPC signatures. Exactly one trigger owns reservation/release.
-- Existing payment, pickup, discount and RLS rules remain in place.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Inspecting production found no real variants / historical variant bookings.
-- Fail closed if that changes before deployment: the old trigger never consumed
-- variant stock, so blindly restoring those historical variants would invent units.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.product_variants v ON v.id = b.variant_id
    WHERE (v.size IS NOT NULL OR v.color IS NOT NULL)
      AND b.status IN ('active', 'confirmed', 'completed')
  ) THEN
    RAISE EXCEPTION 'Historical variant bookings require an inventory audit before this migration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'public.bookings'::regclass AND NOT t.tgisinternal
      AND t.tgfoid = 'public.handle_booking_stock_restore()'::regprocedure
      AND t.tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'A second stock-restoration trigger is attached; audit before migration';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_stock_on_booking()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_variant public.product_variants%ROWTYPE;
  v_reserve boolean := false;
  v_release boolean := false;
  v_product_id uuid;
  v_variant_id uuid;
  v_drop_id uuid;
  v_matches integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- A booking cannot be moved to different merchandise/destinations in place.
    -- This also prevents clients bypassing inventory by changing only identifiers.
    IF NEW.product_id IS DISTINCT FROM OLD.product_id
       OR NEW.variant_id IS DISTINCT FROM OLD.variant_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.drop_id IS DISTINCT FROM OLD.drop_id
       OR NEW.pickup_point_id IS DISTINCT FROM OLD.pickup_point_id THEN
      RAISE EXCEPTION 'BOOKING_IDENTITY_IMMUTABLE: Annulla e crea una nuova prenotazione.';
    END IF;
    v_reserve := COALESCE(NEW.status IN ('active', 'confirmed', 'completed'), false)
      AND NOT COALESCE(OLD.status IN ('active', 'confirmed', 'completed'), false);
    v_release := OLD.status IN ('active', 'confirmed') AND NEW.status = 'cancelled';
  ELSIF TG_OP = 'INSERT' THEN
    v_reserve := COALESCE(NEW.status IN ('active', 'confirmed', 'completed'), false);
  ELSE
    -- Deleting delivered/completed bookings does not put physical goods on sale.
    v_release := OLD.status IN ('active', 'confirmed');
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id; v_variant_id := OLD.variant_id; v_drop_id := OLD.drop_id;
  ELSE
    v_product_id := NEW.product_id; v_variant_id := NEW.variant_id; v_drop_id := NEW.drop_id;
  END IF;

  -- Consistent lock order: drop -> product -> variant. BEFORE other booking
  -- triggers, so discount SUMs are serialized too, including direct old-client INSERTs.
  PERFORM 1 FROM public.drops WHERE id = v_drop_id FOR UPDATE;
  IF NOT COALESCE(v_reserve, false) AND NOT COALESCE(v_release, false) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  SELECT * INTO v_product FROM public.products WHERE id = v_product_id FOR UPDATE;
  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; -- Parent ON DELETE CASCADE.
    RAISE EXCEPTION 'Prodotto non trovato' USING ERRCODE = 'P0002';
  END IF;

  IF v_variant_id IS NOT NULL THEN
    SELECT * INTO v_variant FROM public.product_variants
    WHERE id = v_variant_id AND product_id = v_product_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variante non trovata' USING ERRCODE = 'P0002';
    END IF;
    IF v_variant.size IS NULL AND v_variant.color IS NULL THEN
      v_variant_id := NULL; -- Historical phantom variants share parent stock.
      IF TG_OP = 'INSERT' THEN NEW.variant_id := NULL; END IF;
    END IF;
  END IF;

  IF v_reserve THEN
    -- Older clients may send size/color instead of the variant UUID.
    IF v_variant_id IS NULL AND EXISTS (
      SELECT 1 FROM public.product_variants
      WHERE product_id = v_product_id AND (size IS NOT NULL OR color IS NOT NULL)
    ) THEN
      SELECT count(*) INTO v_matches FROM public.product_variants
      WHERE product_id = v_product_id AND (size IS NOT NULL OR color IS NOT NULL)
        AND size IS NOT DISTINCT FROM NULLIF(NEW.selected_size, '')
        AND color IS NOT DISTINCT FROM NULLIF(NEW.selected_color, '');
      IF v_matches <> 1 THEN
        RAISE EXCEPTION 'VARIANT_REQUIRED: Seleziona una variante disponibile.';
      END IF;
      SELECT * INTO v_variant FROM public.product_variants
      WHERE product_id = v_product_id AND (size IS NOT NULL OR color IS NOT NULL)
        AND size IS NOT DISTINCT FROM NULLIF(NEW.selected_size, '')
        AND color IS NOT DISTINCT FROM NULLIF(NEW.selected_color, '') FOR UPDATE;
      v_variant_id := v_variant.id;
      NEW.variant_id := v_variant_id;
    END IF;

    -- Product row lock serializes stock and duplicate checking across all drops.
    IF EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.user_id = NEW.user_id AND b.product_id = v_product_id
        AND b.status IS DISTINCT FROM 'cancelled'
        AND b.id IS DISTINCT FROM NEW.id
        AND (
          b.variant_id IS NOT DISTINCT FROM v_variant_id
          OR (v_variant_id IS NULL AND EXISTS (
            SELECT 1 FROM public.product_variants v WHERE v.id = b.variant_id
              AND v.product_id = v_product_id AND v.size IS NULL AND v.color IS NULL
          ))
        )
    ) THEN
      RAISE EXCEPTION 'BOOKING_DUPLICATE: Hai già prenotato questo prodotto.';
    END IF;
    IF v_product.stock <= 0 OR (v_variant_id IS NOT NULL AND v_variant.stock <= 0) THEN
      RAISE EXCEPTION 'STOCK_UNAVAILABLE: Prodotto o variante esauriti.';
    END IF;
    IF v_variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET stock = stock - 1, updated_at = now()
      WHERE id = v_variant_id;
      NEW.selected_size := v_variant.size;
      NEW.selected_color := v_variant.color;
    END IF;
    UPDATE public.products SET stock = stock - 1, updated_at = now()
    WHERE id = v_product_id;
  ELSIF v_release THEN
    IF v_variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET stock = stock + 1,
        status = CASE WHEN status = 'sold_out' THEN 'active' ELSE status END,
        updated_at = now() WHERE id = v_variant_id;
    END IF;
    -- Increment the stored remaining stock; NEVER sum untouched historical
    -- variant capacity or reset the parent to 1.
    UPDATE public.products SET stock = stock + 1,
      status = CASE WHEN status = 'sold_out' THEN 'active' ELSE status END,
      updated_at = now() WHERE id = v_product_id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_stock_on_booking ON public.bookings;
CREATE TRIGGER booking_inventory_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_booking();

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_user_id uuid, p_product_id uuid, p_variant_id uuid DEFAULT NULL,
  p_drop_id uuid DEFAULT NULL, p_pickup_point_id uuid DEFAULT NULL,
  p_original_price numeric DEFAULT 0, p_discount_percentage numeric DEFAULT 0,
  p_final_price numeric DEFAULT 0, p_payment_method text DEFAULT 'cod',
  p_payment_status text DEFAULT 'pending', p_status text DEFAULT 'active'
)
RETURNS SETOF public.bookings
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_pickup uuid;
  v_drop_status text;
  v_booking public.bookings;
BEGIN
  SELECT pickup_point_id INTO v_profile_pickup FROM public.profiles WHERE user_id = p_user_id;
  IF v_profile_pickup IS NULL THEN
    RAISE EXCEPTION 'PICKUP_POINT_REQUIRED: Devi selezionare un punto di ritiro nel tuo profilo prima di prenotare.';
  END IF;
  SELECT status INTO v_drop_status FROM public.drops WHERE id = p_drop_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Drop non trovato' USING ERRCODE = 'P0002'; END IF;
  IF v_drop_status <> 'active' THEN RAISE EXCEPTION 'Drop non attivo o già terminato'; END IF;
  -- The BEFORE trigger owns both stock validation/decrement and duplicate guard.
  -- Never subtract booking counts from already-remaining inventory.
  INSERT INTO public.bookings (
    user_id, product_id, variant_id, drop_id, pickup_point_id,
    original_price, discount_percentage, final_price, payment_method, payment_status, status
  ) VALUES (
    p_user_id, p_product_id, p_variant_id, p_drop_id, p_pickup_point_id,
    p_original_price, p_discount_percentage, p_final_price, p_payment_method, p_payment_status, p_status
  ) RETURNING * INTO v_booking;
  RETURN NEXT v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_decrement_stock(
  p_product_id uuid, p_user_id uuid, p_drop_id uuid, p_pickup_point_id uuid,
  p_original_price numeric, p_discount_percentage numeric, p_final_price numeric,
  p_payment_method_id uuid, p_stripe_payment_method_id text
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_booking public.bookings; v_stock integer;
BEGIN
  -- Preserve this legacy signature/result. Card columns no longer exist in the
  -- current COD-only bookings schema. Do not reference removed payment columns
  -- or decrement again after the central booking trigger.
  SELECT * INTO v_booking FROM public.create_booking_atomic(
    p_user_id, p_product_id, NULL, p_drop_id, p_pickup_point_id,
    p_original_price, p_discount_percentage, p_final_price, 'cod', 'authorized', 'active'
  );
  SELECT stock INTO v_stock FROM public.products WHERE id = p_product_id;
  RETURN json_build_object('success', true, 'booking_id', v_booking.id, 'new_stock', v_stock);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_product_available_stock(product_id_param uuid)
RETURNS integer LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT greatest(coalesce((SELECT stock FROM public.products WHERE id = product_id_param), 0), 0);
$$;

-- Atomic release gate on the actual attached production triggers. All synthetic
-- data + NOTIFY events are rolled back in a nested subtransaction. A failed
-- assertion aborts the enclosing migration as well, leaving old functions intact.
DO $verify$
DECLARE
  v_pickup uuid; v_users uuid[]; v_supplier uuid;
  v_list uuid := gen_random_uuid(); v_drop uuid := gen_random_uuid();
  v_product uuid := gen_random_uuid(); v_b public.bookings; v_first uuid;
  i integer; v_count integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_proc p ON p.oid=t.tgfoid
    WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal
      AND c.relname IN ('bookings','products','product_variants','drops','supplier_lists')
      AND t.tgenabled <> 'D' AND p.prosrc ~* '(http|net\.)'
  ) THEN RAISE EXCEPTION 'External-effect trigger detected; cannot safely run rollback release gate'; END IF;
  SELECT p.pickup_point_id INTO v_pickup FROM public.profiles p
  JOIN public.pickup_points pp ON pp.id=p.pickup_point_id AND pp.status='active'
  JOIN auth.users u ON u.id=p.user_id
  GROUP BY p.pickup_point_id HAVING count(DISTINCT p.user_id)>=6 LIMIT 1;
  IF v_pickup IS NULL THEN RAISE EXCEPTION 'No eligible context for rollback release gate'; END IF;
  SELECT array_agg(user_id) INTO v_users FROM (
    SELECT DISTINCT p.user_id FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
    WHERE p.pickup_point_id=v_pickup ORDER BY p.user_id LIMIT 6
  ) x;
  SELECT supplier_id INTO v_supplier FROM public.supplier_lists LIMIT 1;
  IF v_supplier IS NULL THEN RAISE EXCEPTION 'No supplier for rollback release gate'; END IF;
  BEGIN
    INSERT INTO public.supplier_lists(id,supplier_id,name,min_discount,max_discount,min_reservation_value,max_reservation_value)
    VALUES(v_list,v_supplier,'[ROLLBACK STOCK RELEASE GATE]',10,50,10,100);
    INSERT INTO public.drops(id,supplier_list_id,pickup_point_id,name,current_discount,current_value,target_value,status,end_time)
    VALUES(v_drop,v_list,v_pickup,'[ROLLBACK STOCK RELEASE GATE]',10,0,100,'active',now()+interval '1 day');
    INSERT INTO public.products(id,supplier_list_id,supplier_id,name,image_url,original_price,stock)
    VALUES(v_product,v_list,v_supplier,'[ROLLBACK STOCK RELEASE GATE]','test-no-network',20,5);
    FOR i IN 1..5 LOOP
      SELECT * INTO v_b FROM public.create_booking_atomic(v_users[i],v_product,NULL,v_drop,v_pickup,20,50,10);
      IF i=1 THEN v_first:=v_b.id; END IF;
      IF NOT (SELECT stock=5-i FROM public.products WHERE id=v_product) THEN
        RAISE EXCEPTION 'Release gate: incorrect decrement';
      END IF;
    END LOOP;
    BEGIN
      PERFORM public.create_booking_atomic(v_users[6],v_product,NULL,v_drop,v_pickup,20,50,10);
      RAISE EXCEPTION 'Release gate: oversell accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'STOCK_UNAVAILABLE:%' THEN RAISE; END IF;
    END;
    IF NOT (SELECT current_value=50 AND current_discount=round(10+40::numeric*40/90,2)
            FROM public.drops WHERE id=v_drop) THEN
      RAISE EXCEPTION 'Release gate: discount/value mismatch';
    END IF;
    UPDATE public.bookings SET status='cancelled' WHERE id=v_first;
    UPDATE public.bookings SET status='cancelled' WHERE id=v_first;
    IF NOT (SELECT stock=1 FROM public.products WHERE id=v_product) THEN
      RAISE EXCEPTION 'Release gate: incorrect restoration';
    END IF;
    IF NOT (SELECT current_value=40 FROM public.drops WHERE id=v_drop) THEN
      RAISE EXCEPTION 'Release gate: incorrect cancellation value';
    END IF;
    RAISE EXCEPTION USING ERRCODE='ZST01',MESSAGE='Discard release-gate fixtures';
  EXCEPTION WHEN SQLSTATE 'ZST01' THEN NULL;
  END;
  SELECT count(*) INTO v_count FROM public.products WHERE id=v_product;
  IF v_count<>0 OR EXISTS(SELECT 1 FROM public.drops WHERE id=v_drop)
    OR EXISTS(SELECT 1 FROM public.supplier_lists WHERE id=v_list) THEN
    RAISE EXCEPTION 'Release gate: fixture rollback failed';
  END IF;
  RAISE NOTICE 'Stock release gate passed: 5 decrements, exhaustion rejection, discount/value, cancellation idempotency, zero committed fixtures';
END $verify$;
