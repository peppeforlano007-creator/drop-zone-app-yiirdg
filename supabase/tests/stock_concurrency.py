"""LOCAL ONLY: independent PostgreSQL sessions competing for synthetic stock.
Requires stock_fixture.sql + exact migration on /tmp port 55432. No remote DSN.
"""
import concurrent.futures
import json
import subprocess
import uuid
from decimal import Decimal

PSQL = ['psql', '-h', '/tmp', '-p', '55432', '-U', 'newly', '-d', 'rdn_release_gate_v2', '-v', 'ON_ERROR_STOP=1', '-tAc']

def sql(query, check=True):
    result = subprocess.run(PSQL + [query], capture_output=True, text=True)
    if check and result.returncode:
        raise AssertionError(result.stderr)
    return result

def scalar(query):
    return sql(query).stdout.strip()

def fixture(stock, second_product=False):
    ids = [str(uuid.uuid4()) for _ in range(4)]
    lid, did, pid, pid2 = ids
    pickup = scalar('SELECT id FROM public.pickup_points LIMIT 1')
    users = json.loads(scalar('SELECT json_agg(id) FROM auth.users'))
    sql(f"""INSERT INTO public.supplier_lists VALUES('{lid}','{users[0]}','local concurrency',10,50,10,10000);
    INSERT INTO public.drops(id,supplier_list_id,pickup_point_id,name,current_discount,target_value,status,end_time)
      VALUES('{did}','{lid}','{pickup}','local concurrency',10,10000,'active',now()+interval '1 day');
    INSERT INTO public.products(id,supplier_list_id,supplier_id,name,image_url,original_price,stock)
      VALUES('{pid}','{lid}','{users[0]}','local concurrency','no-network',20,{stock});""")
    if second_product:
        sql(f"INSERT INTO public.products(id,supplier_list_id,supplier_id,name,image_url,original_price,stock) VALUES('{pid2}','{lid}','{users[0]}','local concurrency 2','no-network',20,{stock})")
    return did, pid, pid2, pickup, users

def book(context, index, same_user=False, second_product=False):
    did, pid, pid2, pickup, users = context
    user = users[0 if same_user else index]
    product = pid2 if second_product and index % 2 else pid
    return sql(f"SELECT id FROM public.create_booking_atomic('{user}','{product}',NULL,'{did}','{pickup}',20,50,10)", check=False)

results = []
for quantity in (1, 5):
    context = fixture(quantity)
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        replies = list(pool.map(lambda i: book(context, i), range(12)))
    success = sum(r.returncode == 0 for r in replies)
    assert success == quantity, [r.stderr for r in replies]
    assert all(r.returncode == 0 or 'STOCK_UNAVAILABLE:' in r.stderr for r in replies)
    did, pid, *_ = context
    assert scalar(f"SELECT stock FROM public.products WHERE id='{pid}'") == '0'
    assert Decimal(scalar(f"SELECT current_value FROM public.drops WHERE id='{did}'")) == quantity * 10
    results.append({'race': f'{quantity} units / 12 buyers', 'success': success, 'stock': 0})

context = fixture(5)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    replies = list(pool.map(lambda i: book(context, i, same_user=True), range(8)))
assert sum(r.returncode == 0 for r in replies) == 1
assert all(r.returncode == 0 or 'BOOKING_DUPLICATE:' in r.stderr for r in replies)
did, pid, *_ = context
assert scalar(f"SELECT stock FROM public.products WHERE id='{pid}'") == '4'
bid = scalar(f"SELECT id FROM public.bookings WHERE product_id='{pid}'")
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    list(pool.map(lambda _: sql(f"UPDATE public.bookings SET status='cancelled' WHERE id='{bid}'"), range(8)))
assert scalar(f"SELECT stock FROM public.products WHERE id='{pid}'") == '5'
results.append({'race': '8 duplicate requests + 8 cancellation retries', 'bookings': 1, 'restored_units': 1})

context = fixture(10, second_product=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
    replies = list(pool.map(lambda i: book(context, i, second_product=True), range(20)))
assert all(r.returncode == 0 for r in replies), [r.stderr for r in replies]
did, pid, pid2, *_ = context
assert scalar(f"SELECT sum(stock) FROM public.products WHERE id IN ('{pid}','{pid2}')") == '0'
assert Decimal(scalar(f"SELECT current_value FROM public.drops WHERE id='{did}'")) == 200
results.append({'race': '20 buyers / two products / same drop', 'success': 20, 'drop_value': 200})
print(json.dumps({'passed_races': len(results), 'results': results}, indent=2))
