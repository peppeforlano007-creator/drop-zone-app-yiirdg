-- One-off data fix: item wrongly marked as returned (Cosori fryer, Annalisa Senatore).
-- Restores the item to "picked up" and gives back its 80 loyalty points. Scoped to a single item.
DO $$
DECLARE
  v_item uuid := 'fe584381-e917-4d99-9630-cd094e0b0051';
  v_user uuid := '7223a8dd-5f50-4376-9acd-0291adcb0a43';
  v_deleted integer;
  v_updated integer;
BEGIN
  -- Pre-check: the item must still be in the expected wrong state.
  IF NOT EXISTS (SELECT 1 FROM public.order_items
                  WHERE id = v_item AND user_id = v_user
                    AND returned_to_sender IS TRUE AND pickup_status = 'picked_up') THEN
    RAISE EXCEPTION 'Item not in expected state, aborting';
  END IF;

  UPDATE public.order_items
     SET returned_to_sender = false, returned_at = NULL, return_reason = NULL
   WHERE id = v_item;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  DELETE FROM public.loyalty_ledger
   WHERE order_item_id = v_item AND user_id = v_user AND kind = 'deduct' AND points = 80;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_updated = 1 AND v_deleted = 1 THEN
    PERFORM set_config('app.loyalty_server_update', 'on', true);
    UPDATE public.profiles
       SET loyalty_points = COALESCE(loyalty_points, 0) + 80,
           points_total   = COALESCE(points_total, 0) + 80,
           points_balance = COALESCE(points_balance, 0) + 80
     WHERE user_id = v_user;
    PERFORM set_config('app.loyalty_server_update', 'off', true);
  ELSE
    RAISE EXCEPTION 'Unexpected row counts (% / %), aborting', v_updated, v_deleted;
  END IF;
END $$;
