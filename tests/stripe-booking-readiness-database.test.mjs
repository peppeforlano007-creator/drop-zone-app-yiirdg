// Isolated PostgreSQL test. No production connection or customer data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };
try {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(await readFile(new URL('../supabase/migrations/20261024120000_booking_stripe_readiness_jobs.sql', import.meta.url), 'utf8'));
  const hash = 'a'.repeat(64);
  await db.query('insert into public.booking_stripe_readiness_jobs(token_hash) values($1)', [hash]);
  await db.exec('set role service_role');
  ok((await db.query('select public.claim_booking_stripe_readiness($1) claimed', [hash])).rows[0].claimed, 'valid job claimed');
  ok(!(await db.query('select public.claim_booking_stripe_readiness($1) claimed', [hash])).rows[0].claimed, 'replay rejected');
  ok(!(await db.query('select public.claim_booking_stripe_readiness($1) claimed', ['b'.repeat(64)])).rows[0].claimed, 'unknown job rejected');
  await db.exec('reset role');
  await db.query("insert into public.booking_stripe_readiness_jobs(token_hash,created_at,expires_at) values($1,now()-interval '20 minutes',now()-interval '10 minutes')", ['c'.repeat(64)]);
  await db.exec('set role service_role');
  ok(!(await db.query('select public.claim_booking_stripe_readiness($1) claimed', ['c'.repeat(64)])).rows[0].claimed, 'expired job rejected');
  await db.exec('reset role');
  for (const role of ['anon', 'authenticated', 'service_role']) {
    await db.exec(`set role ${role}`);
    for (const sql of ["select * from public.booking_stripe_readiness_jobs", "insert into public.booking_stripe_readiness_jobs(token_hash) values(repeat('d',64))", "update public.booking_stripe_readiness_jobs set claimed_at=null"]) {
      let rejected = false;
      try { await db.exec(sql); } catch (e) { rejected = /permission denied/.test(e.message); }
      ok(rejected, `${role} cannot read/create/reset jobs`);
    }
    if (role !== 'service_role') {
      let rejected = false;
      try { await db.query('select public.claim_booking_stripe_readiness($1)', [hash]); } catch (e) { rejected = /permission denied/.test(e.message); }
      ok(rejected, `${role} cannot claim job RPC`);
    }
    await db.exec('reset role');
  }
  let rejected = false;
  try { await db.exec("insert into public.booking_stripe_readiness_jobs(token_hash,expires_at) values(repeat('e',64), now()+interval '1 day')"); } catch { rejected = true; }
  ok(rejected, 'capabilities cannot exceed ten minutes');
  console.log(`PASS: ${checks} isolated readiness-job assertions. No production connection.`);
} finally { await db.close(); }
