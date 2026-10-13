-- Update handle_item_return to deduct loyalty points on return
CREATE OR REPLACE FUNCTION handle_item_return(
  p_user_id UUID,
  p_order_item_id UUID,
  p_return_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_points_to_deduct INTEGER;
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_result JSON;
BEGIN
  -- Get the order item
  SELECT * INTO v_item
  FROM order_items
  WHERE id = p_order_item_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Articolo non trovato');
  END IF;

  IF v_item.returned_to_sender = true THEN
    RETURN json_build_object('success', false, 'message', 'Articolo già reso');
  END IF;

  -- Mark item as returned
  UPDATE order_items
  SET
    returned_to_sender = true,
    return_reason = p_return_reason,
    returned_at = NOW(),
    updated_at = NOW()
  WHERE id = p_order_item_id;

  -- Calculate points to deduct (1 point per euro of final_price)
  v_points_to_deduct := FLOOR(COALESCE(v_item.final_price, 0));

  -- Get current points_total (with fallback to loyalty_points)
  SELECT COALESCE(points_total, loyalty_points, 0) INTO v_current_points
  FROM profiles
  WHERE user_id = p_user_id;

  -- New points cannot go below 0
  v_new_points := GREATEST(0, v_current_points - v_points_to_deduct);

  -- Update points_total
  UPDATE profiles
  SET
    points_total = v_new_points,
    orders_returned = COALESCE(orders_returned, 0) + 1,
    items_returned = COALESCE(items_returned, 0) + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Build result message
  IF v_points_to_deduct > 0 THEN
    v_result := json_build_object(
      'success', true,
      'message', format('Reso registrato. Punti scalati: -%s (saldo attuale: %s)', v_points_to_deduct, v_new_points),
      'points_deducted', v_points_to_deduct,
      'new_points_total', v_new_points
    );
  ELSE
    v_result := json_build_object(
      'success', true,
      'message', 'Reso registrato correttamente.',
      'points_deducted', 0,
      'new_points_total', v_new_points
    );
  END IF;

  RETURN v_result;
END;
$$;
