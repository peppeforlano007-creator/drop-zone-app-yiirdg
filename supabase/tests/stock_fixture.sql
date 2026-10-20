-- LOCAL PostgreSQL ONLY. Never run this bootstrap on the connected project.
-- Narrow copy of production columns/constraints used by inventory functions.
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.pickup_points(id uuid PRIMARY KEY,status text);
CREATE TABLE public.profiles(user_id uuid PRIMARY KEY REFERENCES auth.users,pickup_point_id uuid REFERENCES pickup_points);
CREATE TABLE public.supplier_lists(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),supplier_id uuid NOT NULL REFERENCES auth.users,
 name text NOT NULL,min_discount numeric(5,2) NOT NULL,max_discount numeric(5,2) NOT NULL,
 min_reservation_value numeric(10,2) NOT NULL,max_reservation_value numeric(10,2) NOT NULL);
CREATE TABLE public.drops(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),supplier_list_id uuid NOT NULL REFERENCES supplier_lists,
 pickup_point_id uuid NOT NULL REFERENCES pickup_points,name text NOT NULL,
 current_discount numeric(5,2) NOT NULL,current_value numeric(10,2) DEFAULT 0,target_value numeric(10,2) NOT NULL,
 status text DEFAULT 'active',end_time timestamptz NOT NULL,updated_at timestamptz DEFAULT now());
CREATE TABLE public.products(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),supplier_list_id uuid NOT NULL REFERENCES supplier_lists,
 supplier_id uuid NOT NULL REFERENCES auth.users,name text NOT NULL,image_url text NOT NULL,
 original_price numeric(10,2) NOT NULL CHECK(original_price>0),stock integer NOT NULL CHECK(stock>=0),
 status text DEFAULT 'active',updated_at timestamptz DEFAULT now());
CREATE TABLE public.product_variants(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_id uuid NOT NULL REFERENCES products ON DELETE CASCADE,
 size text,color text,stock integer NOT NULL CHECK(stock>=0),status text DEFAULT 'active',
 updated_at timestamptz DEFAULT now(),UNIQUE(product_id,size,color));
CREATE TABLE public.bookings(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users,
 product_id uuid NOT NULL REFERENCES products ON DELETE CASCADE,
 drop_id uuid NOT NULL REFERENCES drops ON DELETE CASCADE,
 pickup_point_id uuid NOT NULL REFERENCES pickup_points,
 selected_size text,selected_color text,original_price numeric(10,2) NOT NULL,
 discount_percentage numeric(5,2) NOT NULL,final_price numeric(10,2) NOT NULL,
 payment_status text DEFAULT 'pending' CHECK(payment_status IN ('pending','authorized','captured','failed','refunded')),
 status text DEFAULT 'active' CHECK(status IN ('active','confirmed','completed','cancelled')),
 created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),
 payment_method text DEFAULT 'cod' CHECK(payment_method='cod'),
 variant_id uuid REFERENCES product_variants ON DELETE SET NULL,loyalty_discount numeric DEFAULT 0);
-- Same calculation/eligibility as the inspected production discount triggers.
CREATE FUNCTION public.handle_booking_drop_discount() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d public.drops; s public.supplier_lists; val numeric; disc numeric;
BEGIN
 SELECT * INTO d FROM public.drops WHERE id=NEW.drop_id;
 SELECT * INTO s FROM public.supplier_lists WHERE id=d.supplier_list_id;
 val:=coalesce(d.current_value,0)+NEW.final_price;
 disc:=CASE WHEN val<=s.min_reservation_value THEN s.min_discount
 WHEN val>=s.max_reservation_value THEN s.max_discount ELSE
 s.min_discount+(s.max_discount-s.min_discount)*(val-s.min_reservation_value)/(s.max_reservation_value-s.min_reservation_value) END;
 UPDATE public.drops SET current_value=val,current_discount=disc WHERE id=d.id;
 RETURN NEW;
END $$;
CREATE FUNCTION public.update_drop_discount() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE did uuid; d public.drops; s public.supplier_lists; val numeric; disc numeric;
BEGIN
 IF TG_OP='DELETE' THEN did:=OLD.drop_id; ELSE did:=NEW.drop_id; END IF;
 SELECT * INTO d FROM public.drops WHERE id=did;
 IF d.status='completed' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 SELECT * INTO s FROM public.supplier_lists WHERE id=d.supplier_list_id;
 SELECT coalesce(sum(final_price),0) INTO val FROM public.bookings
 WHERE drop_id=did AND payment_status IN ('authorized','pending') AND status='active';
 disc:=CASE WHEN val<=s.min_reservation_value THEN s.min_discount
 WHEN val>=s.max_reservation_value THEN s.max_discount ELSE
 s.min_discount+(s.max_discount-s.min_discount)*(val-s.min_reservation_value)/(s.max_reservation_value-s.min_reservation_value) END;
 UPDATE public.drops SET current_value=val,current_discount=disc WHERE id=did;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER trigger_booking_update_drop_discount AFTER INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.handle_booking_drop_discount();
CREATE TRIGGER trigger_update_drop_discount AFTER INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_drop_discount();
CREATE TRIGGER trigger_update_drop_discount_on_delete AFTER DELETE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_drop_discount();
CREATE FUNCTION public.prevent_booking_on_closed_drops() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d public.drops;
BEGIN
 SELECT * INTO d FROM public.drops WHERE id=NEW.drop_id;
 IF d.status NOT IN ('active','approved') THEN RAISE EXCEPTION 'Drop non attivo'; END IF;
 IF d.end_time<now() THEN RAISE EXCEPTION 'Drop terminato'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_drop_status_before_booking BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_on_closed_drops();
CREATE FUNCTION public.handle_booking_stock_restore() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
\ir ../migrations/20261019121000_align_pickup_guard_with_status_column.sql
CREATE TRIGGER booking_pickup_destination_guard BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.validate_booking_pickup_destination();
INSERT INTO public.pickup_points VALUES(md5('local-pickup')::uuid,'active');
INSERT INTO auth.users SELECT md5('local-user-'||i)::uuid FROM generate_series(1,30) i;
INSERT INTO public.profiles SELECT id,md5('local-pickup')::uuid FROM auth.users;
INSERT INTO public.supplier_lists VALUES(md5('local-list')::uuid,md5('local-user-1')::uuid,'local fixture context',10,50,10,1000);
