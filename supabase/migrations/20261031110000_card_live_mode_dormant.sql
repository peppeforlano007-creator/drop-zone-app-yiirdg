-- Live card mode, DORMANT: nothing changes while mode stays 'test' or 'disabled'.
-- 'live' is reachable only by a deliberate owner update of booking_card_rollout.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.booking_card_rollout DROP CONSTRAINT IF EXISTS booking_card_rollout_mode_check;
ALTER TABLE public.booking_card_rollout ADD CONSTRAINT booking_card_rollout_mode_check
  CHECK (mode = ANY (ARRAY['disabled'::text, 'test'::text, 'live'::text]));
-- live_open=false: in live mode only users with an active scope (private group) or with
-- 2+ missed pickups (card mandatory) can pay by card. true = every customer.
ALTER TABLE public.booking_card_rollout ADD COLUMN IF NOT EXISTS live_open boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.card_user_allowed(p_user uuid, p_drop uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.booking_card_rollout r
    WHERE r.singleton AND (
      (r.mode = 'test' AND EXISTS (SELECT 1 FROM public.booking_card_test_scopes s
          WHERE s.user_id = p_user AND s.drop_id = p_drop AND s.expires_at > now()))
      OR (r.mode = 'live' AND (
          r.live_open
          OR EXISTS (SELECT 1 FROM public.booking_card_test_scopes s
              WHERE s.user_id = p_user AND s.drop_id = p_drop AND s.expires_at > now())
          OR (SELECT count(*) FROM public.booking_no_show_events e
              WHERE e.user_id = p_user AND e.voided_at IS NULL) >= 2))
    ));
$$;
REVOKE ALL ON FUNCTION public.card_user_allowed(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.card_user_allowed(uuid, uuid) TO service_role;

-- Replace the "mode='test' AND test scope" clause of the three card functions with
-- card_user_allowed(). Done by exact text replacement; each must match or we abort.
DO $do$
DECLARE def text; newdef text; r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('begin_test_card_booking',
     E'IF NOT EXISTS(SELECT 1 FROM public.booking_card_rollout WHERE singleton AND mode=''test'')\n    OR NOT EXISTS(SELECT 1 FROM public.booking_card_test_scopes WHERE user_id=p_user_id AND drop_id=p_drop_id AND expires_at>now())\n    THEN RAISE',
     E'IF NOT public.card_user_allowed(p_user_id,p_drop_id)\n    THEN RAISE'),
    ('finalize_test_card_booking',
     E'IF NOT EXISTS(SELECT 1 FROM public.booking_card_rollout WHERE singleton AND mode=''test'')\n    OR NOT EXISTS(SELECT 1 FROM public.booking_card_test_scopes WHERE user_id=a.user_id AND drop_id=a.drop_id AND expires_at>now())\n    OR d.status',
     E'IF NOT public.card_user_allowed(a.user_id,a.drop_id)\n    OR d.status'),
    ('guard_test_card_booking',
     E'OR NOT EXISTS(SELECT 1 FROM public.booking_card_rollout WHERE singleton AND mode=''test'')\n      OR NOT EXISTS(SELECT 1 FROM public.booking_card_test_scopes WHERE user_id=a.user_id AND drop_id=a.drop_id AND expires_at>now())\n      THEN RAISE',
     E'OR NOT public.card_user_allowed(a.user_id,a.drop_id)\n      THEN RAISE')
  ) AS t(fname, old_txt, new_txt) LOOP
    SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p
      WHERE p.pronamespace = 'public'::regnamespace AND p.proname = r.fname;
    IF position(r.old_txt IN def) = 0 THEN RAISE EXCEPTION 'pattern not found in %', r.fname; END IF;
    newdef := replace(def, r.old_txt, r.new_txt);
    EXECUTE newdef;
  END LOOP;
END
$do$;
