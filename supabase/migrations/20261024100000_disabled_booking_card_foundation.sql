-- Phase 1 only. No booking/payment enforcement and no historical backfill.
-- This migration intentionally does not change bookings, inventory, prices,
-- profiles, the COD constraint, or the drop-completion function.
-- A later reviewed migration is required before live card payments are possible.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.booking_card_rollout (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  mode text NOT NULL DEFAULT 'disabled' CHECK (mode IN ('disabled', 'test')),
  collect_no_shows boolean NOT NULL DEFAULT false,
  collect_since timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.booking_card_rollout(singleton) VALUES (true);
ALTER TABLE public.booking_card_rollout ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_card_rollout FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.booking_card_rollout TO service_role;
COMMENT ON TABLE public.booking_card_rollout IS
  'Dormant physical-goods card rollout. Live mode deliberately unsupported. Collection off by default.';

CREATE TABLE public.booking_no_show_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  first_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  evidence_version text NOT NULL DEFAULT 'explicit_uncollected_v1'
    CHECK (evidence_version = 'explicit_uncollected_v1'),
  voided_at timestamptz,
  void_reason text,
  UNIQUE (user_id, order_id),
  CHECK ((voided_at IS NULL AND void_reason IS NULL) OR
         (voided_at IS NOT NULL AND length(trim(void_reason)) > 0 AND void_reason IS NOT NULL))
);
ALTER TABLE public.booking_no_show_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_no_show_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.booking_no_show_events TO service_role;
COMMENT ON TABLE public.booking_no_show_events IS
  'One future observed missed pickup per customer/order, never per item. Normal returns excluded. No backfill.';

CREATE FUNCTION public.observe_booking_no_show()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_collect boolean;
  v_since timestamptz;
  v_role text;
  v_pickup text;
BEGIN
  SELECT collect_no_shows, collect_since INTO v_collect, v_since
    FROM public.booking_card_rollout WHERE singleton = true;
  -- Fail closed for collection, but leave the existing operator action untouched.
  IF v_collect IS DISTINCT FROM true OR now() < v_since THEN RETURN NEW; END IF;

  -- Only the explicit no-show transition used by the published pickup client.
  -- A normal return, a previously collected item, or a correction is NOT evidence.
  IF OLD.returned_to_sender IS TRUE OR NEW.returned_to_sender IS DISTINCT FROM true
     OR NEW.return_reason IS DISTINCT FROM 'Non ritirato dal cliente'
     OR OLD.picked_up_at IS NOT NULL OR NEW.picked_up_at IS NOT NULL
     OR OLD.pickup_status = 'picked_up' OR NEW.pickup_status = 'picked_up'
     OR OLD.user_id IS DISTINCT FROM NEW.user_id
     OR OLD.order_id IS DISTINCT FROM NEW.order_id
     OR NEW.user_id IS NULL OR NEW.order_id IS NULL THEN RETURN NEW; END IF;

  -- SECURITY DEFINER RPCs in the legacy app are not proof of operator authority.
  -- Check the original JWT too; never let a consumer's privileged RPC create a strike.
  v_role := COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_pickup := auth.jwt() -> 'app_metadata' ->> 'pickup_point_id';
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND v_role <> 'admin'
     AND NOT (v_role = 'pickup_point' AND EXISTS (
       SELECT 1 FROM public.orders o WHERE o.id = NEW.order_id
         AND o.pickup_point_id::text = v_pickup
     )) THEN RETURN NEW; END IF;

  INSERT INTO public.booking_no_show_events(user_id, order_id, first_item_id)
    VALUES (NEW.user_id, NEW.order_id, NEW.id)
    ON CONFLICT (user_id, order_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.observe_booking_no_show() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER observe_booking_no_show_transition
  AFTER UPDATE OF returned_to_sender ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.observe_booking_no_show();

CREATE FUNCTION public.preview_booking_card_requirement(p_user_id uuid)
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
    'card_after_no_shows', 1,
    'block_after_no_shows', 5,
    'would_require_card', v_count >= 1 AND v_count < 5 AND NOT v_blocked,
    'would_block', v_blocked OR v_count >= 5
  );
END;
$$;
REVOKE ALL ON FUNCTION public.preview_booking_card_requirement(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_booking_card_requirement(uuid) TO service_role;

-- No new UPDATE on profiles: preserve existing account blocks and loyalty logic.
-- There is deliberately no trigger/RPC enforcing the preview decision on bookings.
