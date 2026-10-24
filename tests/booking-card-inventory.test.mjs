// Offline compatibility test of the existing inventory/discount triggers.
// The card-method constraint is widened ONLY in this disposable database.
// No Stripe integration or new production booking path is claimed by this test.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const modulePath = process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Set PGLITE_MODULE to an isolated @electric-sql/pglite installation');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };
async function load(url) {
  const text = await readFile(url, 'utf8');
  // Expand the one psql include in the existing local-only fixture.
  const parts = text.split(/^(\\ir .+)$/m);
  for (const part of parts) {
    if (part.startsWith('\\ir ')) await load(new URL(part.slice(4).trim(), url));
    else if (part.trim()) await db.exec(part);
  }
}
try {
  await load(new URL('../supabase/tests/stock_fixture.sql', import.meta.url));
  await db.exec('begin');
  await load(new URL('../supabase/migrations/20261020100000_remaining_booking_stock.sql', import.meta.url));
  await db.exec('commit');
  // Demonstrate why production needs a reviewed constraint change before cards.
  const constraint = (await db.query("select pg_get_constraintdef(oid) d from pg_constraint where conrelid='public.bookings'::regclass and conname='bookings_payment_method_check'")).rows[0].d;
  ok(constraint.includes("'cod'") && !constraint.includes("'card'"), 'production-compatible fixture initially permits COD only');
  await db.exec(`alter table public.bookings drop constraint bookings_payment_method_check;
    alter table public.bookings add constraint bookings_payment_method_check check(payment_method in ('cod','card'));
    insert into public.drops(id,supplier_list_id,pickup_point_id,name,current_discount,current_value,target_value,status,end_time)
      values(md5('card-test-drop')::uuid,md5('local-list')::uuid,md5('local-pickup')::uuid,'offline card test',10,0,1000,'active',now()+interval '1 day');
    insert into public.products(id,supplier_list_id,supplier_id,name,image_url,original_price,stock)
      values(md5('card-test-product')::uuid,md5('local-list')::uuid,md5('local-user-1')::uuid,'offline product','no-network',20,2);`);
  const reserve = userNumber => db.query(`select * from public.create_booking_atomic(
    md5($1)::uuid,md5('card-test-product')::uuid,null,md5('card-test-drop')::uuid,
    md5('local-pickup')::uuid,20,10,18,'card','authorized','active')`, [`local-user-${userNumber}`]);
  const state = async () => (await db.query(`select p.stock,d.current_value,d.current_discount,
    (select count(*)::int from public.bookings where drop_id=d.id) bookings from public.products p
    cross join public.drops d where p.id=md5('card-test-product')::uuid and d.id=md5('card-test-drop')::uuid`)).rows[0];
  // No booking is inserted while a hypothetical checkout remains unconfirmed.
  ok((await state()).stock === 2 && Number((await state()).current_value) === 0, 'opening checkout alone changes nothing');
  const first = (await reserve(1)).rows[0];
  let s = await state();
  ok(s.stock === 1 && Number(s.current_value) === 18 && Number(s.current_discount) > 10,
    'authorized booking consumes exactly one and raises progress/discount immediately');
  try { await reserve(1); assert.fail('duplicate accepted'); }
  catch (e) { ok(e.message.startsWith('BOOKING_DUPLICATE:'), 'duplicate authorization finalization cannot duplicate booking'); }
  s = await state();
  ok(s.stock === 1 && Number(s.current_value) === 18 && s.bookings === 1, 'failed duplicate rolls back stock/value changes');
  await reserve(2);
  s = await state();
  ok(s.stock === 0 && Number(s.current_value) === 36 && s.bookings === 2, 'second customer reserves last item');
  try { await reserve(3); assert.fail('oversell accepted'); }
  catch (e) { ok(e.message.startsWith('STOCK_UNAVAILABLE:'), 'authorized payment cannot bypass sold-out inventory'); }
  await db.query("update public.bookings set status='cancelled' where id=$1", [first.id]);
  await db.query("update public.bookings set status='cancelled' where id=$1", [first.id]);
  s = await state();
  ok(s.stock === 1 && Number(s.current_value) === 18, 'repeated cancellation restores only one unit and removes its contribution');
  console.log(`PASS: ${checks} isolated inventory/discount assertions. No production bookings or card payments.`);
} finally { await db.close(); }
