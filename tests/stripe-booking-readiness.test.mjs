import { test, expect } from 'bun:test';
import { checkStripeTestConnection, createReadinessHandler } from '../supabase/functions/_shared/stripe-booking-readiness.ts';
// Synthetic strings only; no access to real credentials or Stripe in these tests.
const key = 'sk_test_syntheticFixtureOnly';
const fixture = (body, status = 200) => async () => Response.json(body, { status });
const connected = { ok: true, code: 'STRIPE_TEST_CONNECTED', payment_flow_verified: false };
const request = (body = { token: 'a'.repeat(64) }, method = 'POST', headers = {}) => new Request('https://example.invalid/check', {
  method, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}), headers,
});

test('missing key does not contact Stripe', async () => {
  const r = await checkStripeTestConnection(undefined, () => { throw Error('must not call'); });
  expect(r.code).toBe('TEST_KEY_MISSING');
});
for (const bad of ['sk_live_fixture', 'pk_test_fixture', 'rk_test_fixture', ' sk_test_fixture', 'sk_test_fixture\n']) {
  test(`reject non-test-secret format ${JSON.stringify(bad)} before network`, async () => {
    let called = false;
    const r = await checkStripeTestConnection(bad, async () => { called = true; return Response.json({}); });
    expect(r.code).toBe('TEST_KEY_REQUIRED'); expect(called).toBe(false);
  });
}
test('only a fixed read-only Stripe URL, with redirects forbidden', async () => {
  let calls = 0;
  const r = await checkStripeTestConnection(key, async (url, options) => {
    calls++;
    expect(url).toBe('https://api.stripe.com/v1/balance');
    expect(options.method).toBe('GET'); expect(options.body).toBeUndefined();
    expect(options.redirect).toBe('error'); expect(options.cache).toBe('no-store');
    expect(options.headers.Authorization).toBe(`Bearer ${key}`);
    expect(options.signal).toBeInstanceOf(AbortSignal);
    return Response.json({ object: 'balance', livemode: false, available: [{ amount: 12345 }], secret: key });
  });
  expect(calls).toBe(1); expect(r).toEqual(connected);
  expect(JSON.stringify(r)).not.toContain(key); expect(JSON.stringify(r)).not.toContain('12345');
});
for (const status of [401, 403, 429, 500]) {
  test(`sanitize Stripe HTTP ${status}`, async () => {
    const r = await checkStripeTestConnection(key, fixture({ error: { message: key } }, status));
    expect(r.ok).toBe(false); expect(JSON.stringify(r)).not.toContain(key);
    expect(r.code).toBe([401, 403].includes(status) ? 'STRIPE_AUTH_REJECTED' : 'STRIPE_READ_FAILED');
  });
}
for (const body of [{ object: 'balance', livemode: true }, { object: 'balance' }, { object: 'account', livemode: false }, null]) {
  test(`fail closed on unverifiable Stripe mode ${JSON.stringify(body)}`, async () => {
    expect((await checkStripeTestConnection(key, fixture(body))).code).toBe('STRIPE_TEST_MODE_UNVERIFIED');
  });
}
test('sanitize fetch exceptions and malformed JSON', async () => {
  const error = await checkStripeTestConnection(key, async () => { throw Error(key); });
  expect(error.code).toBe('STRIPE_READ_FAILED'); expect(JSON.stringify(error)).not.toContain(key);
  expect((await checkStripeTestConnection(key, async () => new Response('not json'))).code).toBe('STRIPE_READ_FAILED');
});
test('wrong method cannot claim or read secret', async () => {
  const handler = createReadinessHandler({ claim: () => { throw Error('not called'); }, check: () => { throw Error('not called'); } });
  expect((await handler(request({}, 'GET'))).status).toBe(405);
});
for (const body of [{}, { token: 'x' }, { token: 123 }, { token: 'a'.repeat(65) }, { token: 'A'.repeat(64) }]) {
  test('invalid capability never reaches Stripe', async () => {
    const handler = createReadinessHandler({ claim: () => { throw Error('not called'); }, check: () => { throw Error('not called'); } });
    expect((await handler(request(body))).status).toBe(403);
  });
}
test('unregistered, expired or replayed capability cannot read secret', async () => {
  let checks = 0;
  const handler = createReadinessHandler({ claim: async hash => { expect(hash).toMatch(/^[a-f0-9]{64}$/); expect(hash).not.toBe('a'.repeat(64)); return false; }, check: async () => { checks++; return connected; } });
  expect((await handler(request())).status).toBe(403); expect(checks).toBe(0);
});
test('claimed capability gets only bounded sanitized readiness, no caching/CORS', async () => {
  const handler = createReadinessHandler({ claim: async () => true, check: async () => connected });
  const res = await handler(request());
  expect(res.status).toBe(200); expect(await res.json()).toEqual(connected);
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(res.headers.has('access-control-allow-origin')).toBe(false);
});
test('Stripe diagnostic failure is not reported as success', async () => {
  const handler = createReadinessHandler({ claim: async () => true, check: async () => ({ ok: false, code: 'STRIPE_AUTH_REJECTED', payment_flow_verified: false }) });
  expect((await handler(request())).status).toBe(503);
});
test('claim failure never reaches Stripe or leaks exceptions', async () => {
  const handler = createReadinessHandler({ claim: async () => { throw Error(key); }, check: () => { throw Error('not called'); } });
  const res = await handler(request());
  expect(res.status).toBe(503); expect(await res.text()).not.toContain(key);
});
test('oversized content-length and chunked body rejected before claim', async () => {
  const handler = createReadinessHandler({ claim: () => { throw Error('not called'); }, check: () => { throw Error('not called'); } });
  expect((await handler(request({}, 'POST', { 'content-length': '999' }))).status).toBe(400);
  expect((await handler(request({ token: 'a'.repeat(64), extra: 'x'.repeat(500) }))).status).toBe(400);
});
