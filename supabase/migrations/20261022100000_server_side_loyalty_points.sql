-- Loyalty points assigned server-side when a pickup point marks an item picked up / returned.
-- Why: protect_profile_sensitive_columns() silently reverts loyalty columns for every non-admin
-- JWT, so the pickup-point app's direct profile update never took effect.
-- Compatible with already published clients: they keep sending their (ignored) profile update.
-- Admin sessions are skipped: the admin screens still write points themselves.

CREATE TABLE IF NOT EXISTS public.loyalty_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  order_item_id uuid NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('award', 'deduct')),
  points        integer NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_item_id, kind)
);

ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read loyalty ledger" ON public.loyalty_ledger;
CREATE POLICY "Admins can read loyalty ledger" ON public.loyalty_ledger
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Protection trigger: let the server-side loyalty function through (transaction-local flag).
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_caller_role text;
BEGIN
  IF current_setting('app.loyalty_server_update', true) = 'on' THEN
    RETURN NEW;
  END IF;

  v_caller_role := COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '');

  IF v_caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF OLD.role IS NOT NULL THEN
    NEW.role := OLD.role;
  END IF;

  NEW.account_blocked   := OLD.account_blocked;
  NEW.blocked_at        := OLD.blocked_at;
  NEW.blocked_reason    := OLD.blocked_reason;
  NEW.loyalty_points    := OLD.loyalty_points;
  NEW.orders_picked_up  := OLD.orders_picked_up;
  NEW.orders_returned   := OLD.orders_returned;
  NEW.items_returned    := OLD.items_returned;
  NEW.rating_stars      := OLD.rating_stars;
  NEW.points_total      := OLD.points_total;
  NEW.points_balance    := OLD.points_balance;
  NEW.loyalty_level     := OLD.loyalty_level;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_item_loyalty_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role     text;
  v_points   integer;
  v_award    integer;
  v_inserted integer;
  v_current  integer;
BEGIN
  v_role := COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '');
  IF v_role = 'admin' OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Item picked up -> award round(final_price), once per item.
  IF NEW.pickup_status = 'picked_up'
     AND OLD.pickup_status IS DISTINCT FROM 'picked_up'
     AND COALESCE(NEW.returned_to_sender, false) = false THEN
    v_points := GREATEST(0, ROUND(COALESCE(NEW.final_price, 0))::integer);
    INSERT INTO loyalty_ledger (user_id, order_item_id, kind, points)
    VALUES (NEW.user_id, NEW.id, 'award', v_points)
    ON CONFLICT (order_item_id, kind) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted = 1 AND v_points > 0 THEN
      PERFORM set_config('app.loyalty_server_update', 'on', true);
      UPDATE profiles
         SET loyalty_points = COALESCE(loyalty_points, 0) + v_points,
             points_total   = COALESCE(loyalty_points, 0) + v_points,
             points_balance = COALESCE(loyalty_points, 0) + v_points
       WHERE user_id = NEW.user_id;
      PERFORM set_config('app.loyalty_server_update', 'off', true);
    END IF;
  END IF;

  -- Item returned -> take back what was awarded for this item, once.
  IF COALESCE(NEW.returned_to_sender, false) = true
     AND COALESCE(OLD.returned_to_sender, false) = false THEN
    SELECT points INTO v_award FROM loyalty_ledger
     WHERE order_item_id = NEW.id AND kind = 'award';
    IF v_award IS NOT NULL THEN
      INSERT INTO loyalty_ledger (user_id, order_item_id, kind, points)
      VALUES (NEW.user_id, NEW.id, 'deduct', v_award)
      ON CONFLICT (order_item_id, kind) DO NOTHING;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      IF v_inserted = 1 AND v_award > 0 THEN
        SELECT COALESCE(loyalty_points, 0) INTO v_current FROM profiles WHERE user_id = NEW.user_id;
        PERFORM set_config('app.loyalty_server_update', 'on', true);
        UPDATE profiles
           SET loyalty_points = GREATEST(0, COALESCE(v_current, 0) - v_award),
               points_total   = GREATEST(0, COALESCE(v_current, 0) - v_award),
               points_balance = GREATEST(0, COALESCE(v_current, 0) - v_award)
         WHERE user_id = NEW.user_id;
        PERFORM set_config('app.loyalty_server_update', 'off', true);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_apply_item_loyalty_points ON public.order_items;
CREATE TRIGGER trg_apply_item_loyalty_points
  AFTER UPDATE OF pickup_status, returned_to_sender ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.apply_item_loyalty_points();
