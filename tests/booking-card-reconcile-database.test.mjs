// Disposable PostgreSQL only; the scheduler/network schemas are inert stubs.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite }=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db=new PGlite();let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create table public.booking_card_attempts(state text);
    create schema cron;create table cron.recorded(name text,schedule text,command text);
    create function cron.schedule(text,text,text) returns bigint language plpgsql as $$ begin insert into cron.recorded values($1,$2,$3); return 1;end $$;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261026110000_test_card_reconciliation_jobs.sql',import.meta.url),'utf8'));
  await db.exec('select public.enqueue_booking_card_reconcile()');
  ok((await db.query('select count(*) n from booking_card_reconcile_jobs')).rows[0].n===0,'empty queue makes no network call or capability');
  const cron=(await db.query('select * from cron.recorded')).rows[0];
  ok(cron.schedule==='* * * * *' && cron.command==='SELECT public.enqueue_booking_card_reconcile()','independent recovery scheduled each minute');
  await db.query('insert into booking_card_reconcile_jobs(token_hash) values($1)',['a'.repeat(64)]);
  await db.exec('set role service_role');
  ok((await db.query('select claim_booking_card_reconcile($1) ok',['a'.repeat(64)])).rows[0].ok,'valid capability claimed');
  ok(!(await db.query('select claim_booking_card_reconcile($1) ok',['a'.repeat(64)])).rows[0].ok,'claim replay rejected');
  ok(!(await db.query('select claim_booking_card_reconcile($1) ok',['b'.repeat(64)])).rows[0].ok,'unknown capability rejected');
  await db.exec('reset role');
  await db.query("insert into booking_card_reconcile_jobs(token_hash,created_at,expires_at) values($1,now()-interval '10 minutes',now()-interval '9 minutes')",['c'.repeat(64)]);
  await db.exec('set role service_role');
  ok(!(await db.query('select claim_booking_card_reconcile($1) ok',['c'.repeat(64)])).rows[0].ok,'expired capability rejected');
  await db.exec('reset role');
  for(const role of ['anon','authenticated','service_role']) {
    await db.exec(`set role ${role}`);
    for(const query of ["insert into booking_card_reconcile_jobs(token_hash) values(repeat('d',64))",'select * from booking_card_reconcile_jobs',
      'update booking_card_reconcile_jobs set claimed_at=null','select enqueue_booking_card_reconcile()']) {
      await assert.rejects(()=>db.exec(query),/permission denied/);checks++;
    }
    if(role!=='service_role'){await assert.rejects(()=>db.query('select claim_booking_card_reconcile($1)',['a'.repeat(64)]),/permission denied/);checks++;}
    await db.exec('reset role');
  }
  await assert.rejects(()=>db.exec("insert into booking_card_reconcile_jobs(token_hash,expires_at) values(repeat('e',64),now()+interval '1 day')"),/check constraint/);checks++;
  console.log(`PASS: ${checks} isolated reconciliation capability assertions. No production connection.`);
}finally{await db.close();}
