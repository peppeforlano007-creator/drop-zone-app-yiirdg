// Offline PostgreSQL only. No production network, customers or orders.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
try {
  // Supabase's server service_role bypasses RLS; match that actual role here.
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(await readFile(new URL('../supabase/migrations/20261024130000_booking_card_sandbox_jobs.sql', import.meta.url), 'utf8'));
  const hash = 'a'.repeat(64);
  const id = (await db.query('insert into public.booking_card_sandbox_jobs(token_hash) values($1) returning id', [hash])).rows[0].id;
  await db.exec('set role service_role');
  ok((await db.query('select public.claim_booking_card_sandbox($1) id', [hash])).rows[0].id === id, 'claim returns immutable run id');
  ok((await db.query('select public.claim_booking_card_sandbox($1) id', [hash])).rows[0].id === null, 'replay rejected');
  await db.query("update public.booking_card_sandbox_jobs set status='succeeded',finished_at=now(),result=$1 where id=$2", [JSON.stringify({ sandbox_only: true }), id]);
  ok((await db.query('select status from public.booking_card_sandbox_jobs where id=$1', [id])).rows[0].status === 'succeeded', 'service can record result');
  for (const sql of ["insert into public.booking_card_sandbox_jobs(token_hash) values(repeat('b',64))", "update public.booking_card_sandbox_jobs set claimed_at=null", "update public.booking_card_sandbox_jobs set token_hash=repeat('b',64)"]) {
    let rejected = false; try { await db.exec(sql); } catch (e) { rejected = /permission denied/.test(e.message); }
    ok(rejected, 'service cannot issue/rearm/retarget capability');
  }
  await db.exec('reset role');
  await db.query("insert into public.booking_card_sandbox_jobs(token_hash,created_at,expires_at) values($1,now()-interval '20 minutes',now()-interval '10 minutes')", ['c'.repeat(64)]);
  await db.exec('set role service_role');
  ok((await db.query('select public.claim_booking_card_sandbox($1) id', ['c'.repeat(64)])).rows[0].id === null, 'expired job rejected');
  await db.exec('reset role');
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    for (const sql of ["select * from public.booking_card_sandbox_jobs", "insert into public.booking_card_sandbox_jobs(token_hash) values(repeat('d',64))", "update public.booking_card_sandbox_jobs set status='pending'", "select public.claim_booking_card_sandbox(repeat('a',64))"]) {
      let rejected = false; try { await db.exec(sql); } catch (e) { rejected = /permission denied/.test(e.message); }
      ok(rejected, `${role} cannot access or run sandbox tests`);
    }
    await db.exec('reset role');
  }
  console.log(`PASS: ${checks} isolated sandbox-job assertions.`);
} finally { await db.close(); }
