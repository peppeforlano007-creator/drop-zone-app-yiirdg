-- Drop di prova NASCOSTO per il test reale da ~1 EUR (solo account di test + admin). Rimosso a fine test.
DROP POLICY IF EXISTS hide_card_test_pickup_point ON public.pickup_points;
CREATE POLICY hide_card_test_pickup_point ON public.pickup_points AS RESTRICTIVE FOR SELECT USING (
  id <> '7e570000-0000-4000-8000-000000000001'::uuid
  OR (SELECT auth.uid()) = '68353694-fb8a-45ec-90db-e0d07658070a'::uuid
  OR COALESCE(((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin', false));
DROP POLICY IF EXISTS hide_card_test_drop ON public.drops;
CREATE POLICY hide_card_test_drop ON public.drops AS RESTRICTIVE FOR SELECT USING (
  id <> '7e570000-0000-4000-8000-000000000004'::uuid
  OR (SELECT auth.uid()) = '68353694-fb8a-45ec-90db-e0d07658070a'::uuid
  OR COALESCE(((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin', false));

INSERT INTO public.pickup_points
SELECT (jsonb_populate_record(p, jsonb_build_object('id','7e570000-0000-4000-8000-000000000001','name','TEST – non usare','manager_name','TEST','email','test@example.invalid','created_at',now(),'updated_at',now()))).*
FROM public.pickup_points p WHERE id='0ed22a26-bdb3-493c-9c88-8f437c3c6827';

INSERT INTO public.supplier_lists
SELECT (jsonb_populate_record(s, jsonb_build_object('id','7e570000-0000-4000-8000-000000000002','name','TEST – non usare','created_at',now(),'updated_at',now()))).*
FROM public.supplier_lists s WHERE id='25359747-f583-47de-99f6-91d39cbbcfd1';

INSERT INTO public.products (id,name,brand,stock,status,condition,image_url,original_price,supplier_id,supplier_list_id)
SELECT '7e570000-0000-4000-8000-000000000003','TEST – non usare (articolo di prova)',brand,3,'active',condition,image_url,2.00,supplier_id,'7e570000-0000-4000-8000-000000000002'
FROM public.products WHERE id='fa311029-6aff-4c5e-b7a6-812d24c7c48e';

INSERT INTO public.drops
SELECT (jsonb_populate_record(d, jsonb_build_object(
  'id','7e570000-0000-4000-8000-000000000004','name','TEST – non usare','status','active',
  'pickup_point_id','7e570000-0000-4000-8000-000000000001','supplier_list_id','7e570000-0000-4000-8000-000000000002',
  'current_value',0,'current_discount',45,'final_discount_percentage',null,'completed_at',null,
  'start_time',now(),'end_time',now()+interval '2 days','created_at',now(),'updated_at',now(),
  'approved_at',now(),'activated_at',now()))).*
FROM public.drops d WHERE id='8fb46826-80be-4690-892b-8140081e5384';

UPDATE public.profiles SET pickup_point_id='7e570000-0000-4000-8000-000000000001'
 WHERE user_id='68353694-fb8a-45ec-90db-e0d07658070a';

INSERT INTO public.booking_card_test_scopes(user_id,drop_id,purpose,expires_at)
VALUES ('68353694-fb8a-45ec-90db-e0d07658070a','7e570000-0000-4000-8000-000000000004','isolated_synthetic_test',now()+interval '1 day');
