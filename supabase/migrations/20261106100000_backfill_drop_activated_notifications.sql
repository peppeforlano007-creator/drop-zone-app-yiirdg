-- One-off: the two Megastore (Andria) drops were activated from the admin app, which read only
-- 1000 of the 2015 customers (PostgREST row cap). This sends the missing push messages and
-- creates the missing in-app notifications, only for customers who never got them.
-- Does NOT touch booking_card_rollout.
DO $$
DECLARE
  pp uuid := '0ed22a26-bdb3-493c-9c88-8f437c3c6827';
  d record;
  chunk jsonb;
  n integer := 0;
BEGIN
  -- 1) Push, only to customers with no notification row yet for that drop (never reached by the app).
  FOR d IN
    SELECT id, name FROM public.drops
     WHERE id IN ('287305cc-e539-4157-b2b8-7e3bcff351a2','95e14213-0f59-44db-bfb3-f4834b03fe6f')
       AND status = 'active'
  LOOP
    FOR chunk IN
      SELECT jsonb_agg(jsonb_build_object(
               'to', t.push_token,
               'sound', 'default',
               'title', 'Nuovo Drop Disponibile! 🎉',
               'body', format('Il drop "%s" è ora attivo. Controlla ora!', d.name),
               'data', jsonb_build_object('type','drop_activated','dropId', d.id),
               'priority', 'high'))
        FROM (
          SELECT p.push_token, row_number() OVER (ORDER BY p.user_id) AS rn
            FROM public.profiles p
           WHERE p.role = 'consumer' AND p.pickup_point_id = pp
             AND p.push_token LIKE 'ExponentPushToken%'
             AND NOT EXISTS (SELECT 1 FROM public.notifications x
                              WHERE x.user_id = p.user_id AND x.related_id = d.id AND x.type = 'drop_activated')
        ) t
       GROUP BY (t.rn - 1) / 100
    LOOP
      PERFORM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
        body := chunk);
      n := n + 1;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'push batches queued: %', n;

  -- 2) Remove the duplicated rows of the drop activated twice (keep the earliest per customer).
  DELETE FROM public.notifications a
   USING public.notifications b
   WHERE a.related_id = '95e14213-0f59-44db-bfb3-f4834b03fe6f' AND a.type = 'drop_activated'
     AND b.related_id = a.related_id AND b.type = a.type AND b.user_id = a.user_id
     AND (b.created_at, b.ctid) < (a.created_at, a.ctid);

  -- 3) In-app notifications for everyone still missing.
  INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type, read)
  SELECT p.user_id, 'Nuovo Drop Disponibile! 🎉',
         format('Il drop "%s" è ora attivo. Controlla ora per non perdere le migliori offerte!', dr.name),
         'drop_activated', dr.id, 'drop', false
    FROM public.drops dr
    JOIN public.profiles p ON p.pickup_point_id = pp AND p.role = 'consumer'
   WHERE dr.id IN ('287305cc-e539-4157-b2b8-7e3bcff351a2','95e14213-0f59-44db-bfb3-f4834b03fe6f')
     AND NOT EXISTS (SELECT 1 FROM public.notifications x
                      WHERE x.user_id = p.user_id AND x.related_id = dr.id AND x.type = 'drop_activated');
END $$;
