-- Second isolated test drop for card decline / 3DS tests. Hidden from everyone
-- except the test account and admins; usable by card only through its scope row.
DROP POLICY IF EXISTS hide_card_test_drop ON public.drops;
CREATE POLICY hide_card_test_drop ON public.drops FOR SELECT USING (
  id NOT IN ('7e570000-0000-4000-8000-000000000004'::uuid,'7e570000-0000-4000-8000-000000000005'::uuid)
  OR (SELECT auth.uid()) = '68353694-fb8a-45ec-90db-e0d07658070a'::uuid
  OR COALESCE(((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin', false));

INSERT INTO public.products (id,name,brand,stock,status,condition,image_url,original_price,supplier_id,supplier_list_id)
SELECT '7e570000-0000-4000-8000-000000000006','TEST – non usare (articolo di prova 2)',brand,3,'active',condition,image_url,original_price,supplier_id,supplier_list_id
FROM public.products WHERE id='7e570000-0000-4000-8000-000000000003';

INSERT INTO public.drops
SELECT (jsonb_populate_record(d, jsonb_build_object(
  'id','7e570000-0000-4000-8000-000000000005','status','active','current_value',0,'current_discount',45,
  'final_discount_percentage',null,'completed_at',null,
  'start_time',now(),'end_time',now()+interval '3 days','created_at',now(),'updated_at',now(),
  'approved_at',now(),'activated_at',now()))).*
FROM public.drops d WHERE id='7e570000-0000-4000-8000-000000000004';

INSERT INTO public.booking_card_test_scopes(user_id,drop_id,purpose,expires_at)
VALUES ('68353694-fb8a-45ec-90db-e0d07658070a','7e570000-0000-4000-8000-000000000005','isolated_synthetic_test',now()+interval '2 days');
