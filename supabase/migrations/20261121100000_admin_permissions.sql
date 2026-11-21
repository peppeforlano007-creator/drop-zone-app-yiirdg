-- Admin a sezioni limitate (livello app).
-- admin_permissions NULL = admin completo (tutti gli admin esistenti restano completi).
-- Un array = elenco delle sezioni della dashboard consentite.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_permissions text[];

-- true se il chiamante è un admin senza limitazioni (o il server / service role).
CREATE OR REPLACE FUNCTION public.is_full_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public','pg_temp' AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN true
    WHEN COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin' AND admin_permissions IS NULL
    )
  END
$$;

-- Solo un admin completo può modificare i permessi o dare/togliere il ruolo admin.
CREATE OR REPLACE FUNCTION public.protect_admin_permissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp' AS $$
BEGIN
  IF public.is_full_admin() THEN
    RETURN NEW;
  END IF;
  NEW.admin_permissions := OLD.admin_permissions;
  IF (OLD.role = 'admin') <> (NEW.role = 'admin') THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_admin_permissions ON public.profiles;
CREATE TRIGGER trg_protect_admin_permissions
BEFORE UPDATE OF admin_permissions, role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_permissions();
