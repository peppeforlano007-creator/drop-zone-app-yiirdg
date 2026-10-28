-- Missed-pickup policy v2 (still dormant: collection is OFF and mode is 'disabled').
--  * A missed pickup is the WHOLE order: every item of that customer/order was sent back
--    with the explicit reason 'Non ritirato dal cliente' and none was collected.
--    One item sent back while the customer collected others is a normal return.
--  * Card required from the 3rd order (after 2 missed pickups); block at 5.
--  * Reaching 5 blocks the account; the admin tool voids the events and unblocks.
-- Nothing here changes bookings, stock, prices, loyalty, the COD constraint or the
-- drop-completion function. Counting starts only at collect_since (no backfill).
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.observe_booking_no_show()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_collect boolean;
  v_since timestamptz;
  v_role text;
  v_pickup text;
  v_count integer;
BEGIN
  SELECT collect_no_shows, collect_since INTO v_collect, v_since
    FROM public.booking_card_rollout WHERE singleton = true;
  IF v_collect IS DISTINCT FROM true OR now() < v_since THEN RETURN NEW; END IF;

  IF OLD.returned_to_sender IS TRUE OR NEW.returned_to_sender IS DISTINCT FROM true
     OR NEW.return_reason IS DISTINCT FROM 'Non ritirato dal cliente'
     OR OLD.picked_up_at IS NOT NULL OR NEW.picked_up_at IS NOT NULL
     OR OLD.pickup_status = 'picked_up' OR NEW.pickup_status = 'picked_up'
     OR OLD.user_id IS DISTINCT FROM NEW.user_id
     OR OLD.order_id IS DISTINCT FROM NEW.order_id
     OR NEW.user_id IS NULL OR NEW.order_id IS NULL THEN RETURN NEW; END IF;

  v_role := COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_pickup := auth.jwt() -> 'app_metadata' ->> 'pickup_point_id';
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND v_role <> 'admin'
     AND NOT (v_role = 'pickup_point' AND EXISTS (
       SELECT 1 FROM public.orders o WHERE o.id = NEW.order_id
         AND o.pickup_point_id::text = v_pickup
     )) THEN RETURN NEW; END IF;

  -- Whole order only: nothing collected, every item sent back as not collected.
  IF EXISTS (SELECT 1 FROM public.order_items i
              WHERE i.order_id = NEW.order_id AND i.user_id = NEW.user_id
                AND (i.picked_up_at IS NOT NULL OR i.pickup_status = 'picked_up'
                     OR i.returned_to_sender IS NOT TRUE
                     OR i.return_reason IS DISTINCT FROM 'Non ritirato dal cliente'))
  THEN RETURN NEW; END IF;

  INSERT INTO public.booking_no_show_events(user_id, order_id, first_item_id)
    VALUES (NEW.user_id, NEW.order_id, NEW.id)
    ON CONFLICT (user_id, order_id) DO NOTHING;

  IF FOUND THEN
    SELECT count(*)::integer INTO v_count FROM public.booking_no_show_events
      WHERE user_id = NEW.user_id AND voided_at IS NULL;
    IF v_count >= 5 THEN
      PERFORM set_config('app.loyalty_server_update', 'on', true);
      UPDATE public.profiles
         SET account_blocked = true,
             blocked_at = COALESCE(blocked_at, now()),
             blocked_reason = COALESCE(NULLIF(blocked_reason, ''), '5 ordini non ritirati')
       WHERE user_id = NEW.user_id AND COALESCE(account_blocked, false) = false;
      PERFORM set_config('app.loyalty_server_update', 'off', true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.observe_booking_no_show() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.preview_booking_card_requirement(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_count integer; v_blocked boolean; v_mode text; v_collect boolean;
BEGIN
  SELECT COALESCE(account_blocked, false) INTO v_blocked
    FROM public.profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
  SELECT count(*)::integer INTO v_count FROM public.booking_no_show_events
    WHERE user_id = p_user_id AND voided_at IS NULL;
  SELECT mode, collect_no_shows INTO v_mode, v_collect
    FROM public.booking_card_rollout WHERE singleton = true;
  RETURN jsonb_build_object(
    'rollout_mode', COALESCE(v_mode, 'disabled'),
    'collection_enabled', COALESCE(v_collect, false),
    'enforcement_enabled', false,
    'scope', 'observed_future_events_only',
    'no_show_count', v_count,
    'card_after_no_shows', 2,
    'block_after_no_shows', 5,
    'would_require_card', v_count >= 2 AND v_count < 5 AND NOT v_blocked,
    'would_block', v_blocked OR v_count >= 5
  );
END;
$$;
REVOKE ALL ON FUNCTION public.preview_booking_card_requirement(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_booking_card_requirement(uuid) TO service_role;

-- Admin list: every customer with at least one active missed pickup, plus blocked ones.
CREATE OR REPLACE FUNCTION public.admin_list_no_show_customers()
RETURNS TABLE (
  user_id uuid, full_name text, email text, phone text,
  no_show_count integer, last_no_show_at timestamptz,
  account_blocked boolean, blocked_at timestamptz, blocked_reason text
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.full_name::text, p.email::text, p.phone::text,
           COALESCE(e.n, 0)::integer, e.last_at,
           COALESCE(p.account_blocked, false), p.blocked_at, p.blocked_reason::text
      FROM public.profiles p
      LEFT JOIN (SELECT ev.user_id AS uid, count(*) AS n, max(ev.occurred_at) AS last_at
                   FROM public.booking_no_show_events ev
                  WHERE ev.voided_at IS NULL GROUP BY ev.user_id) e ON e.uid = p.user_id
     WHERE COALESCE(e.n, 0) >= 1
     ORDER BY COALESCE(p.account_blocked, false) DESC, COALESCE(e.n, 0) DESC, e.last_at DESC NULLS LAST;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_no_show_customers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_no_show_customers() TO authenticated;

-- Admin unblock: voids the active missed pickups (fresh start) and lifts the block.
CREATE OR REPLACE FUNCTION public.admin_unblock_no_show_customer(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.booking_no_show_events
     SET voided_at = now(), void_reason = 'Sbloccato dall''amministratore'
   WHERE user_id = p_user_id AND voided_at IS NULL;
  PERFORM set_config('app.loyalty_server_update', 'on', true);
  UPDATE public.profiles
     SET account_blocked = false, blocked_at = NULL, blocked_reason = NULL
   WHERE user_id = p_user_id;
  PERFORM set_config('app.loyalty_server_update', 'off', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_unblock_no_show_customer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unblock_no_show_customer(uuid) TO authenticated;

-- service_role must be able to void events through the function only (no table UPDATE grant needed).
