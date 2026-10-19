-- New bookings only. Never rewrite existing bookings, orders, or profile preferences.
CREATE OR REPLACE FUNCTION public.validate_booking_pickup_destination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  profile_pickup uuid;
  drop_pickup uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'PICKUP_POINT_USER_MISMATCH: Utente non valido per la prenotazione.';
  END IF;

  SELECT p.pickup_point_id INTO profile_pickup
  FROM public.profiles p WHERE p.user_id = NEW.user_id
  FOR SHARE;
  IF profile_pickup IS NULL THEN
    RAISE EXCEPTION 'PICKUP_POINT_REQUIRED: Seleziona un punto di ritiro nel profilo prima di prenotare.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pickup_points p WHERE p.id = profile_pickup AND p.is_active = true) THEN
    RAISE EXCEPTION 'PICKUP_POINT_INACTIVE: Seleziona un punto di ritiro attivo nel profilo.';
  END IF;

  SELECT d.pickup_point_id INTO drop_pickup
  FROM public.drops d WHERE d.id = NEW.drop_id
  FOR SHARE;
  IF drop_pickup IS NULL OR profile_pickup IS DISTINCT FROM drop_pickup
     OR NEW.pickup_point_id IS DISTINCT FROM drop_pickup THEN
    RAISE EXCEPTION 'PICKUP_POINT_MISMATCH: Il punto del profilo, del drop e della prenotazione devono coincidere.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_booking_pickup_destination() FROM PUBLIC;

CREATE TRIGGER booking_pickup_destination_guard
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking_pickup_destination();
