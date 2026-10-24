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
const user = '00000000-0000-4000-8000-000000000001';
const secondUser = '00000000-0000-4000-8000-000000000002';
const pickup = '00000000-0000-4000-8000-000000000003';
const order = '00000000-0000-4000-8000-000000000004';
const item = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const count = async () => Number((await query('select count(*) n from public.booking_no_show_events'))[0].n);
const jwt = async claims => db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(claims)]);
const mark = async id => db.query(`update public.order_items set returned_to_sender=true, returned_at=now(),
  return_reason='Non ritirato dal cliente' where id=$1`, [id]);

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as
      $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create table auth.users(id uuid primary key);
    create table public.profiles(user_id uuid primary key references auth.users(id),account_blocked boolean default false);
    create table public.orders(id uuid primary key,pickup_point_id uuid);
    create table public.order_items(id uuid primary key,order_id uuid references public.orders(id),user_id uuid references auth.users(id),
      pickup_status text default 'pending',picked_up_at timestamptz,returned_to_sender boolean default false,
      returned_at timestamptz,return_reason text);
  `);
  const migration = await readFile(new URL('../supabase/migrations/20261024100000_disabled_booking_card_foundation.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.query('insert into auth.users values ($1),($2)', [user, secondUser]);
  await db.query('insert into public.profiles(user_id) values ($1),($2)', [user, secondUser]);
  await db.query('insert into public.orders values ($1,$2)', [order, pickup]);
  for (let n = 10; n <= 25; n++) await db.query('insert into public.order_items(id,order_id,user_id) values ($1,$2,$3)', [item(n),order,user]);
  await jwt({ role: 'authenticated', app_metadata: { role: 'pickup_point', pickup_point_id: pickup } });

  // Disabled means the existing operator action succeeds but no new event is stored.
  await mark(item(10));
  ok(await count() === 0, 'collection off by default');
  const rollout = (await query('select * from public.booking_card_rollout'))[0];
  ok(rollout.mode === 'disabled' && rollout.collect_no_shows === false, 'mode/collection defaults');
  try { await db.exec("update public.booking_card_rollout set mode='live'"); assert.fail('live mode accepted'); }
  catch (e) { ok(e.code === '23514', 'live mode is structurally forbidden'); }

  // Turn on observation only INSIDE this isolated database, never on Supabase.
  await db.exec('update public.booking_card_rollout set collect_no_shows=true');
  await mark(item(11));
  ok(await count() === 1, 'explicit authorized operator no-show is observed');
  await mark(item(11)); await mark(item(12));
  ok(await count() === 1, 'same item and second item from one customer order count once');

  // Normal returns, even with misleading reason, cannot produce strikes after pickup.
  await db.query("update public.order_items set pickup_status='picked_up',picked_up_at=now() where id=$1", [item(13)]);
  await mark(item(13));
  await db.query("update public.order_items set pickup_status='picked_up' where id=$1", [item(14)]);
  await mark(item(14));
  await db.query('update public.order_items set returned_to_sender=true,returned_at=now() where id=$1', [item(15)]);
  ok(await count() === 1, 'returns never add evidence');

  // Historical rows do not get inferred from null reason or a repeated update.
  await db.query("update public.order_items set return_reason='Non ritirato dal cliente' where id=$1", [item(15)]);
  await mark(item(10));
  ok(await count() === 1, 'no automatic historical backfill');

  await db.query('update public.order_items set user_id=$1 where id=$2', [secondUser,item(16)]);
  await mark(item(16));
  ok(await count() === 2, 'separate customer in a shared supplier order counts separately');

  // A service-side preview does not enforce anything on existing bookings/profiles.
  const preview = (await query('select public.preview_booking_card_requirement($1) p', [user]))[0].p;
  ok(preview.no_show_count === 1 && preview.would_require_card && !preview.enforcement_enabled,
    'one observed no-show only previews card requirement');
  ok(!(await query('select account_blocked from public.profiles where user_id=$1', [user]))[0].account_blocked,
    'collector never mutates profiles');

  // Different orders under an unauthorized role are ignored, not conflated.
  for (let n = 30; n < 38; n++) {
    await db.query('insert into public.orders(id,pickup_point_id) values ($1,$2)', [item(n),pickup]);
    await db.query('insert into public.order_items(id,order_id,user_id) values ($1,$2,$3)', [item(n+100),item(n),user]);
  }
  await jwt({ role: 'authenticated', app_metadata: { role: 'consumer' } });
  await mark(item(130));
  await jwt({ role: 'authenticated', app_metadata: { role: 'pickup_point', pickup_point_id: item(999) } });
  await mark(item(131));
  await jwt({ role: 'authenticated', user_metadata: { role: 'admin' } });
  await mark(item(132));
  ok(await count() === 2, 'consumer, wrong point and editable metadata cannot create strikes');

  await jwt({ role: 'authenticated', app_metadata: { role: 'pickup_point', pickup_point_id: pickup } });
  for (const n of [133,134,135,136]) await mark(item(n));
  const blocked = (await query('select public.preview_booking_card_requirement($1) p', [user]))[0].p;
  ok(blocked.no_show_count === 5 && blocked.would_block && !blocked.would_require_card && !blocked.enforcement_enabled,
    'five distinct customer orders preview a block, never a sixth card booking');

  // RLS/ACL: clients cannot write events/config or query other customers' decisions.
  await db.exec('set role authenticated');
  for (const sql of ['select * from public.booking_no_show_events',
    'update public.booking_card_rollout set collect_no_shows=true',
    `select public.preview_booking_card_requirement('${user}')`,
    `insert into public.booking_no_show_events(user_id,order_id) values ('${user}','${order}')`]) {
    try { await db.exec(sql); assert.fail('client privilege accepted'); }
    catch (e) { ok(e.code === '42501', 'client access denied'); }
  }
  await db.exec('reset role');
  await db.query('update public.profiles set account_blocked=true where user_id=$1', [secondUser]);
  const oldBlock = (await query('select public.preview_booking_card_requirement($1) p', [secondUser]))[0].p;
  ok(oldBlock.would_block && !oldBlock.would_require_card, 'existing administrative blocks preserved');

  // Voiding mistaken evidence is explicit; repeating the item action cannot undo it.
  await db.query('update public.booking_no_show_events set voided_at=now(),void_reason=$1 where user_id=$2 and order_id=$3', ['operator correction',user,order]);
  await mark(item(12));
  const corrected = (await query('select public.preview_booking_card_requirement($1) p', [user]))[0].p;
  ok(corrected.no_show_count === 4 && corrected.would_require_card, 'voided event stays voided on retries');
  console.log(`PASS: ${checks} isolated PostgreSQL assertions. No external requests or production rows touched.`);
} finally { await db.close(); }
