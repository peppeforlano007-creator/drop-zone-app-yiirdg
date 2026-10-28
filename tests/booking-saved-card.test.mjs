import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StripeTestCustomerGateway } from '../supabase/functions/_shared/booking-saved-card.ts';
import { StripeTestCardGateway } from '../supabase/functions/_shared/booking-card-flow.ts';
import { parseCardRequest } from '../supabase/functions/_shared/booking-card-response.ts';

const id = '00000000-0000-4000-8000-000000000001';
const key = 'sk_test_abc123';
const record = () => { const calls = []; return { calls, fetcher: async (url, init) => { calls.push({ url, init }); return Response.json(calls.fetchBody ?? {}); } }; };

test('live keys are refused', () => {
  assert.throws(() => new StripeTestCustomerGateway('sk_live_abc'), /TEST_KEY_REQUIRED/);
  assert.throws(() => new StripeTestCardGateway('sk_live_abc'), /TEST_KEY_REQUIRED/);
});
test('customer must be a test-mode customer owned by the user', async () => {
  const bad = new StripeTestCustomerGateway(key, async () => Response.json({ object: 'customer', id: 'cus_1', livemode: true, metadata: { user_id: id } }));
  await assert.rejects(bad.createCustomer(id), /STRIPE_IDENTITY_MISMATCH/);
  const ok = new StripeTestCustomerGateway(key, async () => Response.json({ object: 'customer', id: 'cus_1', livemode: false, metadata: { user_id: id } }));
  assert.equal(await ok.createCustomer(id), 'cus_1');
});
test('customer creation is idempotent per user', async () => {
  const r = record(); r.fetcher2 = r.fetcher;
  const g = new StripeTestCustomerGateway(key, async (u, i) => { r.calls.push({ u, i }); return Response.json({ object: 'customer', id: 'cus_1', livemode: false, metadata: { user_id: id } }); });
  await g.createCustomer(id);
  assert.equal(r.calls[0].i.headers['Idempotency-Key'], `rdn_saved_card_customer_v1:${id}`);
});
test('detachAll removes every listed test card and nothing else', async () => {
  const urls = [];
  const g = new StripeTestCustomerGateway(key, async (u, i) => {
    urls.push(`${i.method} ${u.replace('https://api.stripe.com/v1/', '')}`);
    return Response.json(i.method === 'GET'
      ? { data: [{ id: 'pm_1', livemode: false, card: { brand: 'visa', last4: '4242' } }, { id: 'pm_live', livemode: true, card: {} }] } : {});
  });
  await g.detachAll('cus_1');
  assert.deepEqual(urls.filter(u => u.startsWith('POST')), ['POST payment_methods/pm_1/detach']);
});
test('customer session never exposes save/remove and falls back on failure', async () => {
  let body = '';
  const g = new StripeTestCustomerGateway(key, async (u, i) => { body = i.body; return Response.json({ client_secret: 'cuss_secret_x', livemode: false }); });
  assert.equal(await g.customerSession('cus_1'), 'cuss_secret_x');
  assert.match(decodeURIComponent(body), /payment_method_save\]=disabled/);
  assert.match(decodeURIComponent(body), /payment_method_remove\]=disabled/);
  const failing = new StripeTestCustomerGateway(key, async () => new Response('{}', { status: 500 }));
  assert.equal(await failing.customerSession('cus_1'), null);
});
test('request parser accepts only a boolean tick and body-less saved card actions', () => {
  const start = { action: 'start', attempt_id: id, product_id: id, drop_id: id };
  assert.doesNotThrow(() => parseCardRequest({ ...start, save_card: true }));
  assert.throws(() => parseCardRequest({ ...start, save_card: 'yes' }), /REQUEST_INVALID/);
  assert.doesNotThrow(() => parseCardRequest({ action: 'saved_card' }));
  assert.doesNotThrow(() => parseCardRequest({ action: 'remove_saved_card' }));
  assert.throws(() => parseCardRequest({ action: 'remove_saved_card', customer_id: 'cus_1' }), /REQUEST_INVALID/);
});
test('PaymentIntent gets a customer and future-use only when consent was stored', async () => {
  const attempt = { id, user_id: id, product_id: id, drop_id: id, variant_id: null, authorized_cents: 8000, original_cents: 10000, group_bps: 2000 };
  const bodies = [];
  const make = opts => new StripeTestCardGateway(key, async (u, i) => { bodies.push(new URLSearchParams(i.body)); return Response.json({}); }, opts);
  for (const opts of [{}, { customer: 'cus_1' }, { customer: 'cus_1', save: true }]) {
    await make(opts).create(attempt).catch(() => {});
  }
  assert.equal(bodies[0].get('customer'), null);
  assert.equal(bodies[1].get('customer'), 'cus_1'); assert.equal(bodies[1].get('setup_future_usage'), null);
  assert.equal(bodies[2].get('setup_future_usage'), 'off_session');
  assert.throws(() => new StripeTestCardGateway(key, fetch, { customer: 'bad' }), /CUSTOMER_INVALID/);
});
