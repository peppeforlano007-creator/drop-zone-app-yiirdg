// Isolated PostgreSQL WASM tests. No network, real users, orders or credentials.
// Run with: PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js bun tests/booking-card-database.test.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Set PGLITE_MODULE to an isolated @electric-sql/pglite installation');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const user = uid(1);
const secondUser = uid(2);
const pickup = uid(3);
let seq = 1000;
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const count = async () => Number((await query('select count(*) n from public.booking_no_show_events where voided_at is null'))[0].n);
const jwt = async claims => db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(claims)]);
const asPickup = () => jwt({ role: 'authenticated', app_metadata: { role: 'pickup_point', pickup_point_id: pickup } });
const mark = async id => db.query(`update public.order_items set returned_to_sender=true, returned_at=now(),
  return_reason='Non ritirato dal cliente' where id=$1`, [id]);
// One order with items for each listed customer (array of user ids, one entry per item).
const makeOrder = async (owners, point = pickup) => {
  const orderId = uid(++seq);
  await db.query('insert into public.orders values ($1,$2)', [orderId, point]);
  const items = [];
  for (const owner of owners) {
    const id = uid(++seq);
    await db.query('insert into public.order_items(id,order_id,user_id) values ($1,$2,$3)', [id, orderId, owner]);
    items.push(id);
  }
  return { orderId, items };
};
const preview = async u => (await query('select public.preview_booking_card_requirement($1) p', [u]))[0].p;

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as
      $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create table auth.users(id uuid primary key);
    create table public.profiles(user_id uuid primary key references auth.users(id),
      full_name text, email text, phone text,
      account_blocked boolean default false, blocked_at timestamptz, blocked_reason text);
    create table public.orders(id uuid primary key,pickup_point_id uuid);
    create table public.order_items(id uuid primary key,order_id uuid references public.orders(id),user_id uuid references auth.users(id),
      pickup_status text default 'pending',picked_up_at timestamptz,returned_to_sender boolean default false,
      returned_at timestamptz,return_reason text);
  `);
  for (const file of ['20261024100000_disabled_booking_card_foundation.sql', '20261028100000_no_show_whole_order_and_admin_tools.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  await db.query('insert into auth.users values ($1),($2)', [user, secondUser]);
  await db.query("insert into public.profiles(user_id,full_name) values ($1,'Uno'),($2,'Due')", [user, secondUser]);
  await asPickup();

  // Disabled: the operator action works, nothing is stored.
  const off = await makeOrder([user, user, user]);
  for (const id of off.items) await mark(id);
  ok(await count() === 0, 'collection off by default');
  const rollout = (await query('select * from public.booking_card_rollout'))[0];
  ok(rollout.mode === 'disabled' && rollout.collect_no_shows === false, 'mode/collection defaults');
  try { await db.exec("update public.booking_card_rollout set mode='live'"); assert.fail('live mode accepted'); }
  catch (e) { ok(e.code === '23514', 'live mode is structurally forbidden'); }

  // Observation turned on only inside this isolated database.
  await db.exec('update public.booking_card_rollout set collect_no_shows=true');

  // Whole order only: one or two items sent back are not a missed pickup, the last one completes it.
  const whole = await makeOrder([user, user, user]);
  await mark(whole.items[0]);
  ok(await count() === 0, 'one item sent back is not a missed pickup');
  await mark(whole.items[1]);
  ok(await count() === 0, 'two of three items sent back is not a missed pickup');
  await mark(whole.items[2]);
  ok(await count() === 1, 'every item sent back as not collected is one missed pickup');
  await mark(whole.items[2]); await mark(whole.items[0]);
  ok(await count() === 1, 'repeating the action never counts twice');

  // Customer showed up and bought something: never a missed pickup.
  const showed = await makeOrder([user, user, user]);
  await db.query("update public.order_items set pickup_status='picked_up',picked_up_at=now() where id=$1", [showed.items[0]]);
  await mark(showed.items[1]); await mark(showed.items[2]);
  ok(await count() === 1, 'a collected item means the customer showed up');
  const marked = await makeOrder([user, user]);
  await db.query('update public.order_items set returned_to_sender=true,returned_at=now(),return_reason=$2 where id=$1', [marked.items[0], 'Taglia sbagliata']);
  await mark(marked.items[1]);
  ok(await count() === 1, 'an ordinary return with another reason is not a missed pickup');

  // Another customer inside a shared supplier order is judged separately.
  const shared = await makeOrder([user, user, secondUser]);
  await mark(shared.items[0]); await mark(shared.items[1]);
  ok(await count() === 2 && (await preview(secondUser)).no_show_count === 0, 'customers in one order count separately');
  const two = await preview(user);
  ok(two.no_show_count === 2 && two.would_require_card && !two.would_block && !two.enforcement_enabled,
    'after the 2nd miss the next booking would require a card');

  // Roles: consumers, other pickup points and editable metadata create nothing.
  const guarded = [];
  for (let i = 0; i < 3; i++) guarded.push(await makeOrder([user]));
  await jwt({ role: 'authenticated', app_metadata: { role: 'consumer' } });
  await mark(guarded[0].items[0]);
  await jwt({ role: 'authenticated', app_metadata: { role: 'pickup_point', pickup_point_id: uid(999) } });
  await mark(guarded[1].items[0]);
  await jwt({ role: 'authenticated', user_metadata: { role: 'admin' } });
  await mark(guarded[2].items[0]);
  ok(await count() === 2, 'consumer, wrong point and editable metadata cannot create misses');

  // Thresholds: 2 misses -> card, 5 -> block (account blocked automatically).
  await asPickup();
  ok(!(await query('select account_blocked from public.profiles where user_id=$1', [user]))[0].account_blocked, 'not blocked at 2');
  for (const n of [3, 4]) { const o = await makeOrder([user]); await mark(o.items[0]); ok(await count() === n, 'miss recorded'); }
  ok(!(await query('select account_blocked from public.profiles where user_id=$1', [user]))[0].account_blocked, 'not blocked at 4');
  const fifth = await makeOrder([user]);
  await mark(fifth.items[0]);
  const blocked = await preview(user);
  const profile = (await query('select * from public.profiles where user_id=$1', [user]))[0];
  ok(blocked.no_show_count === 5 && blocked.would_block && !blocked.would_require_card, '5 misses preview a block');
  ok(profile.account_blocked && profile.blocked_at && profile.blocked_reason, 'the 5th miss blocks the account');

  // ACL: clients cannot read/write events or config or call the preview.
  await db.exec('set role authenticated');
  for (const sql of ['select * from public.booking_no_show_events',
    'update public.booking_card_rollout set collect_no_shows=true',
    `select public.preview_booking_card_requirement('${user}')`,
    `insert into public.booking_no_show_events(user_id,order_id) values ('${user}','${whole.orderId}')`]) {
    try { await db.exec(sql); assert.fail('client privilege accepted'); }
    catch (e) { ok(e.code === '42501', 'client access denied'); }
  }

  // Admin tools: list and unblock are admin only.
  await jwt({ role: 'authenticated', app_metadata: { role: 'consumer' } });
  for (const sql of ['select * from public.admin_list_no_show_customers()', `select public.admin_unblock_no_show_customer('${user}')`]) {
    try { await db.exec(sql); assert.fail('non-admin accepted'); }
    catch (e) { ok(/FORBIDDEN/.test(e.message), 'admin tools reject non-admins'); }
  }
  await jwt({ role: 'authenticated', app_metadata: { role: 'admin' } });
  const list = (await db.query('select * from public.admin_list_no_show_customers()')).rows;
  ok(list.length === 1 && list[0].user_id === user && list[0].no_show_count === 5 && list[0].account_blocked,
    'admin list shows customers with misses, blocked first');
  await db.query('select public.admin_unblock_no_show_customer($1)', [user]);
  await db.exec('reset role');
  const after = await preview(user);
  const unblocked = (await query('select * from public.profiles where user_id=$1', [user]))[0];
  ok(after.no_show_count === 0 && !after.would_block && !unblocked.account_blocked && !unblocked.blocked_reason,
    'unblock voids the misses and lifts the block');
  ok((await query('select count(*) n from public.booking_no_show_events'))[0].n == 5, 'voided events are kept for history');

  // A voided order cannot be counted again by repeating the operator action.
  await mark(fifth.items[0]);
  ok((await preview(user)).no_show_count === 0, 'voided event stays voided on retries');
  console.log(`PASS: ${checks} isolated PostgreSQL assertions. No external requests or production rows touched.`);
} finally { await db.close(); }
