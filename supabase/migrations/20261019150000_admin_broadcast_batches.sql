-- Atomic, idempotent in-app broadcasts. Existing push delivery is unchanged.
CREATE TABLE public.admin_notification_broadcasts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_key text NOT NULL CHECK (length(request_key) BETWEEN 8 AND 128),
  payload jsonb NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  batch_count integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (created_by, request_key)
);
ALTER TABLE public.admin_notification_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_broadcasts_read ON public.admin_notification_broadcasts
  FOR SELECT TO authenticated USING (created_by = auth.uid() AND public.is_admin());
REVOKE ALL ON public.admin_notification_broadcasts FROM anon, authenticated;
GRANT SELECT ON public.admin_notification_broadcasts TO authenticated;

CREATE OR REPLACE FUNCTION public.send_admin_notification_broadcast(
  p_request_key text, p_payload jsonb, p_dry_run boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role text := p_payload->>'role';
  v_pickup uuid := nullif(p_payload->>'pickup_point_id', '')::uuid;
  v_related uuid := nullif(p_payload->>'related_id', '')::uuid;
  v_type text := p_payload->>'type';
  v_broadcast public.admin_notification_broadcasts%ROWTYPE;
  v_batch uuid[];
  v_count integer := 0;
  v_batches integer := 0;
  v_rows integer;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'BROADCAST_ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 8 AND 128
     OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR coalesce(length(btrim(p_payload->>'title')), 0) NOT BETWEEN 1 AND 100
     OR coalesce(length(btrim(p_payload->>'message')), 0) NOT BETWEEN 1 AND 300
     OR v_type IS NULL OR v_type NOT IN ('general', 'drop_activated', 'drop_ending')
     OR (v_role IS NOT NULL AND v_role NOT IN ('consumer', 'supplier', 'pickup_point'))
     OR (v_type <> 'general' AND (v_related IS NULL OR p_payload->>'related_type' IS DISTINCT FROM 'drop'))
     OR (v_type = 'general' AND (v_related IS NOT NULL OR p_payload->>'related_type' IS NOT NULL)) THEN
    RAISE EXCEPTION 'BROADCAST_INVALID_PAYLOAD' USING ERRCODE = '22023';
  END IF;
  IF v_related IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.drops WHERE id = v_related) THEN
    RAISE EXCEPTION 'BROADCAST_DROP_NOT_FOUND' USING ERRCODE = '22023';
  END IF;
  IF NOT p_dry_run THEN
    INSERT INTO public.admin_notification_broadcasts(created_by, request_key, payload)
    VALUES (v_actor, p_request_key, p_payload)
    ON CONFLICT (created_by, request_key) DO NOTHING;
    SELECT * INTO v_broadcast FROM public.admin_notification_broadcasts
    WHERE created_by = v_actor AND request_key = p_request_key FOR UPDATE;
    IF v_broadcast.payload IS DISTINCT FROM p_payload THEN
      RAISE EXCEPTION 'BROADCAST_REQUEST_CONFLICT' USING ERRCODE = '22023';
    END IF;
    -- A committed row means the entire broadcast committed. Failed requests roll back.
    IF NOT FOUND THEN RAISE EXCEPTION 'BROADCAST_NOT_FOUND'; END IF;
    IF v_broadcast.completed THEN
      RETURN jsonb_build_object('recipients', v_broadcast.recipient_count,
        'batches', v_broadcast.batch_count, 'reused', true);
    END IF;
  END IF;

  -- Cursor snapshots all eligible accounts; the REST response row cap does not apply.
  FOR v_batch IN
    SELECT array_agg(u.user_id ORDER BY u.user_id)
    FROM (
      SELECT user_id, (row_number() OVER (ORDER BY user_id) - 1) / 1000 AS batch_no
      FROM (SELECT DISTINCT user_id FROM public.profiles
        WHERE (v_role IS NULL OR role = v_role)
          AND (v_pickup IS NULL OR pickup_point_id = v_pickup)) eligible
    ) u GROUP BY u.batch_no ORDER BY u.batch_no
  LOOP
    IF NOT p_dry_run THEN
      INSERT INTO public.notifications(user_id, title, message, type, read, related_id, related_type)
      SELECT user_id, btrim(p_payload->>'title'), btrim(p_payload->>'message'), v_type, false,
        v_related, p_payload->>'related_type' FROM unnest(v_batch) AS recipients(user_id);
      GET DIAGNOSTICS v_rows = ROW_COUNT;
    ELSE
      v_rows := cardinality(v_batch);
    END IF;
    v_count := v_count + v_rows;
    v_batches := v_batches + 1;
  END LOOP;
  IF NOT p_dry_run THEN
    UPDATE public.admin_notification_broadcasts
    SET recipient_count = v_count, batch_count = v_batches, completed = true
    WHERE id = v_broadcast.id;
  END IF;
  RETURN jsonb_build_object('recipients', v_count, 'batches', v_batches, 'reused', false, 'dry_run', p_dry_run);
END;
$$;
REVOKE ALL ON FUNCTION public.send_admin_notification_broadcast(text, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_admin_notification_broadcast(text, jsonb, boolean) TO authenticated;
