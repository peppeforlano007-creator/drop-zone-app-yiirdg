import { test, expect } from 'bun:test';
import { createHmac } from 'node:crypto';
import { verifyStripeSignature } from '../supabase/functions/_shared/stripe-webhook-signature.ts';
const secret = 'whsec_' + 'a'.repeat(32), body = '{"id":"evt_1","type":"charge.refunded","livemode":false}', now = 1800000000;
const sig = (t, b = body, s = secret) => `t=${t},v1=${createHmac('sha256', s).update(`${t}.${b}`).digest('hex')}`;
test('webhook signature', async () => {
  expect(await verifyStripeSignature(body, sig(now), secret, now)).toBe(true);
  expect(await verifyStripeSignature(body + ' ', sig(now), secret, now)).toBe(false);
  expect(await verifyStripeSignature(body, sig(now, body, 'whsec_' + 'b'.repeat(32)), secret, now)).toBe(false);
  expect(await verifyStripeSignature(body, sig(now - 400), secret, now)).toBe(false);
  expect(await verifyStripeSignature(body, null, secret, now)).toBe(false);
  expect(await verifyStripeSignature(body, sig(now), 'bad', now)).toBe(false);
});
