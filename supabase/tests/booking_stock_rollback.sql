-- Safe integration test: synthetic catalogue/drop/bookings ONLY, all rolled back
-- inside an exception subtransaction. No existing product/profile is updated.
-- pg_notify/realtime emissions are transactional and discarded with the fixtures.
-- Run only after confirming every attached trigger has no external HTTP effects.
DO $test$
DECLARE
  users uuid[]; pickup uuid; supplier uuid; list_id uuid:=gen_random_uuid();
  drop_id uuid:=gen_random_uuid(); v_product_ids uuid[]; variant_m uuid:=gen_random_uuid();
  variant_l uuid:=gen_random_uuid(); phantom uuid:=gen_random_uuid();
  bid uuid; bids uuid[]:=ARRAY[]::uuid[]; b public.bookings; result json;
  i integer; n integer; s integer; val numeric; disc numeric; checks integer:=0;
BEGIN
  SELECT p.pickup_point_id INTO pickup FROM public.profiles p
  JOIN public.pickup_points pp ON pp.id=p.pickup_point_id AND pp.status='active'
  JOIN auth.users u ON u.id=p.user_id
  GROUP BY p.pickup_point_id HAVING count(*)>=8 LIMIT 1;
  IF pickup IS NULL THEN RAISE EXCEPTION 'No eligible fixture context; no production changes made'; END IF;
  SELECT array_agg(user_id) INTO users FROM (
    SELECT DISTINCT p.user_id FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
    WHERE pickup_point_id=pickup ORDER BY p.user_id LIMIT 8
  ) x;
  SELECT supplier_id INTO supplier FROM public.supplier_lists LIMIT 1;
  IF supplier IS NULL THEN supplier:=users[1]; END IF;
  SELECT array_agg(gen_random_uuid()) INTO v_product_ids FROM generate_series(1,6);
  BEGIN
    INSERT INTO public.supplier_lists(id,supplier_id,name,min_discount,max_discount,min_reservation_value,max_reservation_value)
    VALUES(list_id,supplier,'[ROLLBACK STOCK TEST]',10,50,10,100);
    INSERT INTO public.drops(id,supplier_list_id,pickup_point_id,name,current_discount,current_value,target_value,status,end_time)
    VALUES(drop_id,list_id,pickup,'[ROLLBACK STOCK TEST]',10,0,100,'active',now()+interval '1 day');
    FOR i IN 1..6 LOOP
      INSERT INTO public.products(id,supplier_list_id,supplier_id,name,image_url,original_price,stock)
      VALUES(v_product_ids[i],list_id,supplier,'[ROLLBACK STOCK TEST]','test-no-network',20,
        CASE i WHEN 1 THEN 5 WHEN 2 THEN 1 WHEN 3 THEN 3 ELSE 2 END);
    END LOOP;
    FOR i IN 1..5 LOOP
      SELECT * INTO b FROM public.create_booking_atomic(users[i],v_product_ids[1],NULL,drop_id,pickup,20,50,10);
      bids:=array_append(bids,b.id);
      SELECT stock INTO s FROM public.products WHERE id=v_product_ids[1];
      ASSERT s=5-i, '5-unit stock does not decrease exactly one'; checks:=checks+1;
      IF i=1 THEN
        BEGIN
          PERFORM public.create_booking_atomic(users[1],v_product_ids[1],NULL,drop_id,pickup,20,50,10);
          RAISE EXCEPTION 'Duplicate accepted';
        EXCEPTION WHEN raise_exception THEN
          IF SQLERRM NOT LIKE 'BOOKING_DUPLICATE:%' THEN RAISE; END IF;
        END;
        ASSERT (SELECT stock=4 FROM public.products WHERE id=v_product_ids[1]); checks:=checks+1;
      END IF;
    END LOOP;
    BEGIN
      PERFORM public.create_booking_atomic(users[6],v_product_ids[1],NULL,drop_id,pickup,20,50,10);
      RAISE EXCEPTION 'Oversell accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'STOCK_UNAVAILABLE:%' THEN RAISE; END IF;
    END;
    ASSERT public.get_product_available_stock(v_product_ids[1])=0; checks:=checks+1;
    SELECT current_value,current_discount INTO val,disc FROM public.drops WHERE id=drop_id;
    ASSERT val=50 AND disc=round(10+40::numeric*40/90,2), 'Discount/value regression'; checks:=checks+1;
    UPDATE public.bookings SET status='cancelled' WHERE id=bids[1];
    ASSERT (SELECT stock=1 FROM public.products WHERE id=v_product_ids[1]); checks:=checks+1;
    ASSERT (SELECT current_value=40 FROM public.drops WHERE id=drop_id); checks:=checks+1;
    UPDATE public.bookings SET status='cancelled',payment_status='refunded' WHERE id=bids[1];
    DELETE FROM public.bookings WHERE id=bids[1];
    ASSERT (SELECT stock=1 FROM public.products WHERE id=v_product_ids[1]), 'Double restoration'; checks:=checks+1;
    UPDATE public.bookings SET status='cancelled' WHERE id=bids[2];
    UPDATE public.bookings SET status='active' WHERE id=bids[2];
    ASSERT (SELECT stock=1 FROM public.products WHERE id=v_product_ids[1]), 'Reactivation not reserved'; checks:=checks+1;
    UPDATE public.bookings SET status='confirmed' WHERE id=bids[2];
    UPDATE public.bookings SET status='completed' WHERE id=bids[2];
    DELETE FROM public.bookings WHERE id=bids[2];
    ASSERT (SELECT stock=1 FROM public.products WHERE id=v_product_ids[1]), 'Completed goods relisted'; checks:=checks+1;
    DELETE FROM public.bookings WHERE id=bids[3];
    ASSERT (SELECT stock=2 FROM public.products WHERE id=v_product_ids[1]), 'Active deletion not restored'; checks:=checks+1;

    SELECT * INTO b FROM public.create_booking_atomic(users[1],v_product_ids[2],NULL,drop_id,pickup,20,50,10);
    ASSERT (SELECT stock=0 FROM public.products WHERE id=v_product_ids[2]); checks:=checks+1;
    BEGIN
      PERFORM public.create_booking_atomic(users[2],v_product_ids[2],NULL,drop_id,pickup,20,50,10);
      RAISE EXCEPTION 'Single-unit oversell accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'STOCK_UNAVAILABLE:%' THEN RAISE; END IF;
    END;
    UPDATE public.bookings SET status='cancelled' WHERE id=b.id;
    ASSERT (SELECT stock=1 FROM public.products WHERE id=v_product_ids[2]); checks:=checks+1;

    INSERT INTO public.product_variants(id,product_id,size,stock)
    VALUES(variant_m,v_product_ids[3],'M',2),(variant_l,v_product_ids[3],'L',1),(phantom,v_product_ids[4],NULL,2);
    SELECT * INTO b FROM public.create_booking_atomic(users[1],v_product_ids[3],variant_m,drop_id,pickup,20,50,10);
    bid:=b.id;
    ASSERT b.selected_size='M' AND (SELECT stock=1 FROM public.product_variants WHERE id=variant_m)
      AND (SELECT stock=2 FROM public.products WHERE id=v_product_ids[3]); checks:=checks+1;
    PERFORM public.create_booking_atomic(users[2],v_product_ids[3],variant_m,drop_id,pickup,20,50,10);
    BEGIN
      PERFORM public.create_booking_atomic(users[3],v_product_ids[3],variant_m,drop_id,pickup,20,50,10);
      RAISE EXCEPTION 'Variant oversell accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'STOCK_UNAVAILABLE:%' THEN RAISE; END IF;
    END;
    ASSERT (SELECT stock=1 FROM public.products WHERE id=v_product_ids[3]); checks:=checks+1;
    PERFORM public.create_booking_atomic(users[1],v_product_ids[3],variant_l,drop_id,pickup,20,50,10);
    UPDATE public.bookings SET status='cancelled' WHERE id=bid;
    UPDATE public.bookings SET status='cancelled' WHERE id=bid;
    ASSERT (SELECT stock=1 FROM public.products WHERE id=v_product_ids[3])
      AND (SELECT stock=1 FROM public.product_variants WHERE id=variant_m)
      AND (SELECT stock=0 FROM public.product_variants WHERE id=variant_l); checks:=checks+1;
    BEGIN
      PERFORM public.create_booking_atomic(users[3],v_product_ids[3],NULL,drop_id,pickup,20,50,10);
      RAISE EXCEPTION 'Missing variant accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'VARIANT_REQUIRED:%' THEN RAISE; END IF;
    END;
    INSERT INTO public.bookings(user_id,product_id,drop_id,pickup_point_id,selected_size,original_price,discount_percentage,final_price)
    VALUES(users[3],v_product_ids[3],drop_id,pickup,'M',20,50,10) RETURNING * INTO b;
    ASSERT b.variant_id=variant_m AND (SELECT stock=0 FROM public.products WHERE id=v_product_ids[3]); checks:=checks+1;
    SELECT * INTO b FROM public.create_booking_atomic(users[1],v_product_ids[4],phantom,drop_id,pickup,20,50,10);
    ASSERT b.variant_id IS NULL AND (SELECT stock=1 FROM public.products WHERE id=v_product_ids[4])
      AND (SELECT stock=2 FROM public.product_variants WHERE id=phantom); checks:=checks+1;
    BEGIN
      PERFORM public.create_booking_atomic(users[1],v_product_ids[4],NULL,drop_id,pickup,20,50,10);
      RAISE EXCEPTION 'Phantom duplicate accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'BOOKING_DUPLICATE:%' THEN RAISE; END IF;
    END;
    UPDATE public.bookings SET status='cancelled' WHERE id=b.id;
    ASSERT (SELECT stock=2 FROM public.products WHERE id=v_product_ids[4]); checks:=checks+1;

    result:=public.check_and_decrement_stock(v_product_ids[5],users[1],drop_id,pickup,20,50,10,NULL,NULL);
    ASSERT (result->>'success')::boolean AND (result->>'new_stock')::integer=1
      AND (SELECT stock=1 FROM public.products WHERE id=v_product_ids[5]); checks:=checks+1;
    INSERT INTO public.bookings(user_id,product_id,drop_id,pickup_point_id,original_price,discount_percentage,final_price)
    VALUES(users[1],v_product_ids[6],drop_id,pickup,20,50,10) RETURNING id INTO bid;
    ASSERT (SELECT stock=1 FROM public.products WHERE id=v_product_ids[6]); checks:=checks+1;
    BEGIN
      UPDATE public.bookings SET product_id=v_product_ids[5] WHERE id=bid;
      RAISE EXCEPTION 'Inventory transfer accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'BOOKING_IDENTITY_IMMUTABLE:%' THEN RAISE; END IF;
    END;
    ASSERT (SELECT stock=1 FROM public.products WHERE id=v_product_ids[6]); checks:=checks+1;
    BEGIN
      PERFORM public.create_booking_atomic(users[2],v_product_ids[6],NULL,drop_id,gen_random_uuid(),20,50,10);
      RAISE EXCEPTION 'Wrong pickup accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'PICKUP_POINT_MISMATCH:%' THEN RAISE; END IF;
    END;
    ASSERT (SELECT stock=1 FROM public.products WHERE id=v_product_ids[6]), 'Rejected insert changed stock'; checks:=checks+1;
    DELETE FROM public.products WHERE id=v_product_ids[3];
    ASSERT NOT EXISTS(SELECT 1 FROM public.bookings WHERE product_id=v_product_ids[3]), 'Parent cascade blocked'; checks:=checks+1;
    UPDATE public.drops SET status='expired' WHERE id=drop_id;
    BEGIN
      PERFORM public.create_booking_atomic(users[2],v_product_ids[6],NULL,drop_id,pickup,20,50,10);
      RAISE EXCEPTION 'Closed drop accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'Drop non attivo%' THEN RAISE; END IF;
    END;
    ASSERT (SELECT stock=1 FROM public.products WHERE id=v_product_ids[6]); checks:=checks+1;
    -- Discard ALL fixture writes and transactional notifications, even on success.
    RAISE EXCEPTION USING ERRCODE='ZST01',MESSAGE='Rollback test fixtures';
  EXCEPTION WHEN SQLSTATE 'ZST01' THEN NULL;
  END;
  ASSERT NOT EXISTS(SELECT 1 FROM public.supplier_lists WHERE id=list_id), 'Fixture leak';
  ASSERT NOT EXISTS(SELECT 1 FROM public.drops WHERE id=drop_id), 'Fixture leak';
  ASSERT NOT EXISTS(SELECT 1 FROM public.products WHERE id=ANY(v_product_ids)), 'Fixture leak';
  PERFORM set_config('rdn.stock_test_result',json_build_object('passed',checks,'fixture_rows_committed',0)::text,true);
END $test$;
SELECT current_setting('rdn.stock_test_result')::json AS stock_test_result;
