-- Pulizia finale dei dati di test del pagamento live (1,10 EUR) e attivazione mancati ritiri per tutti.
-- Pulizia dati di test carta (solo righe con id 7e570000-... e gruppo chat del punto ritiro di test).
UPDATE public.profiles SET pickup_point_id = '0ed22a26-bdb3-493c-9c88-8f437c3c6827'
 WHERE user_id = '68353694-fb8a-45ec-90db-e0d07658070a' AND pickup_point_id = '7e570000-0000-4000-8000-000000000001';

DO $$
DECLARE
  pp uuid := '7e570000-0000-4000-8000-000000000001';
  bk uuid[]; od uuid[]; at uuid[]; gr uuid[]; dr uuid[];
BEGIN
  SELECT array_agg(id) INTO dr FROM public.drops WHERE pickup_point_id = pp OR id::text LIKE '7e570000%';
  SELECT array_agg(id) INTO bk FROM public.bookings WHERE drop_id = ANY(dr) OR pickup_point_id = pp;
  SELECT array_agg(id) INTO od FROM public.orders WHERE drop_id = ANY(dr) OR pickup_point_id = pp;
  SELECT array_agg(id) INTO at FROM public.booking_card_attempts WHERE drop_id = ANY(dr) OR pickup_point_id = pp;
  SELECT array_agg(id) INTO gr FROM public.chat_groups WHERE pickup_point_id = pp;

  DELETE FROM public.booking_card_refunds WHERE attempt_id = ANY(at) OR booking_id = ANY(bk);
  DELETE FROM public.booking_card_save_requests WHERE attempt_id = ANY(at);
  DELETE FROM public.booking_card_attempts WHERE id = ANY(at);
  DELETE FROM public.booking_card_test_scopes WHERE drop_id = ANY(dr);
  DELETE FROM public.booking_no_show_events WHERE order_id = ANY(od);
  DELETE FROM public.user_coupons WHERE booking_id = ANY(bk);
  DELETE FROM public.order_items WHERE order_id = ANY(od) OR booking_id = ANY(bk);
  DELETE FROM public.orders WHERE id = ANY(od);
  ALTER TABLE public.bookings DISABLE TRIGGER a_card_payment_guard;
  DELETE FROM public.bookings WHERE id = ANY(bk);
  ALTER TABLE public.bookings ENABLE TRIGGER a_card_payment_guard;
  DELETE FROM public.chat_messages WHERE group_id = ANY(gr) OR drop_id = ANY(dr);
  DELETE FROM public.chat_read_receipts WHERE group_id = ANY(gr);
  DELETE FROM public.chat_group_members WHERE group_id = ANY(gr);
  DELETE FROM public.chat_groups WHERE id = ANY(gr);
  DELETE FROM public.drop_interests WHERE drop_id = ANY(dr) OR pickup_point_id = pp;
  DELETE FROM public.wishlists WHERE drop_id = ANY(dr) OR product_id::text LIKE '7e570000%';
  DELETE FROM public.user_interests WHERE pickup_point_id = pp OR product_id::text LIKE '7e570000%' OR supplier_list_id::text LIKE '7e570000%';
  DELETE FROM public.list_shares WHERE pickup_point_id = pp OR supplier_list_id::text LIKE '7e570000%';
  DELETE FROM public.pickup_access_activation_jobs WHERE pickup_point_id = pp;
  DELETE FROM public.drops WHERE id = ANY(dr);
  DELETE FROM public.product_variants WHERE product_id::text LIKE '7e570000%';
  DELETE FROM public.products WHERE id::text LIKE '7e570000%';
  DELETE FROM public.supplier_lists WHERE id::text LIKE '7e570000%';
  DELETE FROM public.pickup_points WHERE id = pp;
END $$;

DROP POLICY IF EXISTS hide_card_test_pickup_point ON public.pickup_points;
DROP POLICY IF EXISTS hide_card_test_drop ON public.drops;
DROP TABLE IF EXISTS public.card_diag_events;
DELETE FROM public.booking_saved_cards WHERE user_id = '68353694-fb8a-45ec-90db-e0d07658070a';

-- Mancati ritiri per tutti, conteggio solo da ora. Carta obbligatoria dal 2° mancato ritiro.
-- live_open resta false: pagamento con carta aperto solo a chi ha 2+ mancati ritiri.
UPDATE public.booking_card_rollout
   SET mode = 'live', collect_no_shows = true, collect_since = now(), enforce_no_show_card = true, live_open = false
 WHERE singleton = true;
