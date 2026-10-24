import { test, expect } from 'bun:test';
import { runBookingSandbox } from '../supabase/functions/_shared/booking-stripe-sandbox.ts';
const RUN = '11111111-2222-4333-8444-555555555555';
const KEY = 'sk_test_syntheticOnly';
const NOW = 1792830000;
function stripe(options = {}) {
  const intents = new Map(), cached = new Map(), calls = [];
  let captureTimeout = false, createTimeout = false;
  const json = (v, status = 200) => Response.json(v, { status });
  const clone = v => JSON.parse(JSON.stringify(v));
  const fetcher = async (url, req) => {
    expect(url.startsWith('https://api.stripe.com/v1/')).toBe(true);
    expect(req.redirect).toBe('error'); expect(req.headers.Authorization).toBe(`Bearer ${KEY}`);
    const path = new URL(url).pathname, method = req.method;
    const body = new URLSearchParams(req.body), idkey = req.headers['Idempotency-Key'];
    calls.push({ path, method, body: req.body, idkey });
    if (path === '/v1/balance') return json({ object: 'balance', livemode: options.liveBalance ?? false });
    if (method === 'POST' && cached.has(idkey)) {
      const entry = cached.get(idkey);
      expect(entry.body).toBe(req.body); expect(entry.path).toBe(path);
      return json(entry.result);
    }
    if (path === '/v1/payment_intents' && method === 'POST') {
      expect(body.get('payment_method')).toBe('pm_card_visa');
      expect(body.get('payment_method_types[]')).toBe('card');
      expect(body.get('capture_method')).toBe('manual');
      expect(body.get('amount')).toBe('8000'); expect(body.get('currency')).toBe('eur');
      expect(body.has('customer')).toBe(false); expect(body.has('receipt_email')).toBe(false);
      const id = `pi_fixture${intents.size + 1}`, metadata = {};
      for (const [key, value] of body) if (key.startsWith('metadata[')) metadata[key.slice(9, -1)] = value;
      const pi = { id, object: 'payment_intent', livemode: false, metadata,
        amount: 8000, amount_capturable: 8000, amount_received: 0, currency: 'eur', capture_method: 'manual', status: 'requires_capture',
        client_secret: 'must_never_appear_in_report',
        latest_charge: { captured: false, refunded: false, amount_refunded: 0, amount_captured: 0,
          payment_method_details: { type: 'card', card: { capture_before: NOW + (options.shortWindow ? 4 : 7) * 86400 } } } };
      intents.set(id, pi);
      const result = clone(pi);
      if (options.liveIntent) result.livemode = true;
      cached.set(idkey, { body: req.body, path, result });
      if (options.createTimeout && !createTimeout) { createTimeout = true; throw Error(KEY); }
      return json(result);
    }
    const match = path.match(/^\/v1\/payment_intents\/(pi_fixture\d+)(?:\/(capture|cancel))?$/);
    if (!match) throw Error('unexpected API path');
    const pi = intents.get(match[1]);
    if (method === 'GET') {
      const result = clone(pi);
      if (options.badMetadata) result.metadata.user_id = 'some-other-user';
      return json(result);
    }
    const operation = match[2];
    if (operation === 'capture') {
      if (options.rejectCapture) return json({ error: { message: KEY } }, 400);
      expect(body.get('amount_to_capture')).toBe('6000');
      // Ordinary final capture defaults to releasing the rest. The explicit
      // multicapture parameter was rejected by the actual Stripe sandbox.
      expect(body.has('final_capture')).toBe(false);
      pi.status = 'succeeded'; pi.amount_capturable = 0; pi.amount_received = 6000;
      pi.latest_charge.captured = true; pi.latest_charge.amount_captured = options.badCapture ? 5000 : 6000;
      // Match the actual pinned Stripe API response: unused authorization is
      // included in amount_refunded. An additional actual refund must fail.
      pi.latest_charge.amount_refunded = options.extraRefund ? 3000 : 2000;
    } else if (operation === 'cancel') {
      if (options.rejectCancel) return json({ error: { message: KEY } }, 500);
      expect(body.get('cancellation_reason')).toBe('abandoned');
      pi.status = 'canceled'; pi.amount_capturable = 0;
    } else throw Error('unexpected operation');
    const result = clone(pi);
    cached.set(idkey, { body: req.body, path, result });
    if (operation === 'capture' && options.captureTimeout && !captureTimeout) { captureTimeout = true; throw Error(KEY); }
    return json(result);
  };
  return { fetcher, intents, calls };
}
const run = async options => { const s = stripe(options); return { s, r: await runBookingSandbox(KEY, RUN, s.fetcher, NOW) }; };

test('sandbox partial capture, full cancellation, and exact idempotent retries', async () => {
  const { s, r } = await run();
  expect(r.ok).toBe(true); expect(r.code).toBe('STRIPE_SANDBOX_LIFECYCLE_VERIFIED');
  expect(r.payment_flow_verified).toBe(false); expect(r.production_bookings_touched).toBe(false);
  expect(r.checks.authorized_cents).toBe(8000); expect(r.checks.captured_cents).toBe(6000);
  expect(r.checks.unused_authorization_cents).toBe(2000); expect(r.checks.full_release_cents).toBe(8000);
  expect(s.intents.size).toBe(2); expect([...s.intents.values()].map(pi => pi.status)).toEqual(['succeeded', 'canceled']);
  expect([...s.intents.values()].reduce((sum, pi) => sum + pi.amount_received, 0)).toBe(6000);
  expect(s.calls.filter(c => c.path.endsWith('/capture')).length).toBe(2);
  expect(s.calls.filter(c => c.path.endsWith('/cancel')).length).toBe(2);
  expect(JSON.stringify(r)).not.toContain(KEY); expect(JSON.stringify(r)).not.toContain('must_never_appear');
});
test('replaying same run reuses both intents and does not charge again', async () => {
  const s = stripe();
  expect((await runBookingSandbox(KEY, RUN, s.fetcher, NOW)).ok).toBe(true);
  expect((await runBookingSandbox(KEY, RUN, s.fetcher, NOW)).ok).toBe(true);
  expect(s.intents.size).toBe(2); expect([...s.intents.values()].reduce((n, pi) => n + pi.amount_received, 0)).toBe(6000);
});
for (const options of [{ createTimeout: true }, { captureTimeout: true }]) {
  test(`ambiguous timeout retries with same idempotency key ${JSON.stringify(options)}`, async () => {
    const { s, r } = await run(options);
    expect(r.ok).toBe(true); expect(s.intents.size).toBe(2); expect(r.unresolved_create_keys).toEqual([]);
    expect([...s.intents.values()].reduce((n, pi) => n + pi.amount_received, 0)).toBe(6000);
  });
}
test('short authorization window fails and cancels only its sandbox hold', async () => {
  const { s, r } = await run({ shortWindow: true });
  expect(r.ok).toBe(false); expect(r.code).toBe('AUTHORIZATION_WINDOW_TOO_SHORT');
  expect(r.cleanup.partial).toBe('hold_canceled'); expect([...s.intents.values()][0].status).toBe('canceled');
  expect(s.calls.some(c => c.path.endsWith('/capture'))).toBe(false);
});
test('capture failure cancels hold and never claims payment verified', async () => {
  const { s, r } = await run({ rejectCapture: true });
  expect(r.ok).toBe(false); expect(r.cleanup.partial).toBe('hold_canceled');
  expect([...s.intents.values()][0].amount_received).toBe(0); expect(JSON.stringify(r)).not.toContain(KEY);
});
test('failed cleanup is surfaced, not silently treated as released', async () => {
  const { r } = await run({ rejectCapture: true, rejectCancel: true });
  expect(r.ok).toBe(false); expect(r.cleanup.partial).toBe('review_required');
});
test('incorrect capture result cannot pass and is never automatically refunded', async () => {
  const { s, r } = await run({ badCapture: true });
  expect(r.code).toBe('PARTIAL_CAPTURE_NOT_VERIFIED'); expect(r.ok).toBe(false);
  expect(s.calls.some(c => c.path.includes('refund'))).toBe(false);
});
test('an additional refund is not mistaken for the released authorization', async () => {
  const { r } = await run({ extraRefund: true });
  expect(r.ok).toBe(false); expect(r.code).toBe('PARTIAL_CAPTURE_NOT_VERIFIED');
});
test('test key alone is insufficient if Stripe does not attest test mode', async () => {
  const { s, r } = await run({ liveBalance: true });
  expect(r.ok).toBe(false); expect(s.calls.length).toBe(1); expect(s.intents.size).toBe(0);
});
test('live intent response rejected; never capture or cancel an unverified identity', async () => {
  const { s, r } = await run({ liveIntent: true });
  expect(r.code).toBe('SANDBOX_INTENT_IDENTITY_REJECTED'); expect(r.unresolved_create_keys.length).toBe(1);
  expect(s.calls.some(c => c.path.endsWith('/capture') || c.path.endsWith('/cancel'))).toBe(false);
});
test('wrong metadata rejected even when status and amount match', async () => {
  const { s, r } = await run({ badMetadata: true });
  expect(r.ok).toBe(false); expect(r.cleanup.partial).toBe('review_required');
  expect(s.calls.some(c => c.path.endsWith('/capture') || c.path.endsWith('/cancel'))).toBe(false);
});
for (const key of ['sk_live_fake', 'pk_test_fake', undefined]) {
  test('refuse non-test/private keys before any network', async () => {
    let calls = 0;
    const r = await runBookingSandbox(key, RUN, async () => { calls++; throw Error('no network'); }, NOW);
    expect(r.ok).toBe(false); expect(calls).toBe(0);
  });
}
test('invalid management run cannot contact Stripe', async () => {
  let calls = 0;
  const r = await runBookingSandbox(KEY, '../arbitrary', async () => { calls++; }, NOW);
  expect(r.code).toBe('INVALID_MANAGEMENT_RUN'); expect(calls).toBe(0);
});
test('unrecoverable create timeout preserves idempotency key for reconciliation', async () => {
  let calls = 0;
  const r = await runBookingSandbox(KEY, RUN, async url => {
    calls++;
    if (url.endsWith('/balance')) return Response.json({ object: 'balance', livemode: false });
    throw Error(KEY);
  }, NOW);
  expect(calls).toBe(3); expect(r.ok).toBe(false); expect(r.code).toBe('STRIPE_REQUEST_UNCERTAIN');
  expect(r.unresolved_create_keys.length).toBe(1); expect(JSON.stringify(r)).not.toContain(KEY);
});
