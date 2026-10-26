import { test, expect } from 'bun:test';
import { refundCardPayment } from '../supabase/functions/_shared/booking-card-refund.ts';
import { StripeTestCardGateway, verifyRefund } from '../supabase/functions/_shared/booking-card-flow.ts';

const a = { id: '11111111-1111-4111-8111-111111111111', intent_id: 'pi_abc', state: 'captured', final_cents: 6000, authorized_cents: 8000 };
const mk = (state = 'requested') => {
  const log = [];
  return { log, store: {
    request: async () => ({ attempt_id: a.id, booking_id: 'b', amount_cents: 6000, state }),
    attempt: async () => a,
    record: async (i, r, n) => { log.push(['record', r, n]); return { attempt_id: i, booking_id: 'b', amount_cents: n, state: 'refunded' }; },
    review: async () => { log.push(['review']); },
  } };
};
test('refund records only after the gateway verified it', async () => {
  const { store, log } = mk();
  const row = await refundCardPayment(a.id, 'admin', 'RETURNED', store, { refund: async () => ({ id: 're_1', amount: 6000 }) });
  expect(row.state).toBe('refunded'); expect(log).toEqual([['record', 're_1', 6000]]);
});
test('already refunded request never touches Stripe', async () => {
  const { store } = mk('refunded');
  const row = await refundCardPayment(a.id, 'admin', 'RETURNED', store, { refund: async () => { throw new Error('no'); } });
  expect(row.state).toBe('refunded');
});
test('gateway failure marks review and records nothing', async () => {
  const { store, log } = mk();
  await expect(refundCardPayment(a.id, 'admin', 'RETURNED', store, { refund: async () => { throw new Error('x'); } })).rejects.toThrow('REFUND_NEEDS_REVIEW');
  expect(log).toEqual([['review']]);
});
test('verifyRefund rejects wrong amount, status, intent', () => {
  const ok = { id: 're_1', object: 'refund', status: 'succeeded', amount: 6000, currency: 'eur', payment_intent: 'pi_abc' };
  expect(() => verifyRefund(ok, a)).not.toThrow();
  for (const bad of [{ amount: 8000 }, { status: 'pending' }, { payment_intent: 'pi_x' }, { currency: 'usd' }, { id: 'x' }])
    expect(() => verifyRefund({ ...ok, ...bad }, a)).toThrow('REFUND_NOT_VERIFIED');
});
test('gateway sends exact amount with idempotency and checks the whole charge is returned', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init.method, init.headers['Idempotency-Key'], init.body]);
    if (String(url).endsWith('/refunds')) return Response.json({ id: 're_1', object: 'refund', status: 'succeeded', amount: 6000, currency: 'eur', payment_intent: 'pi_abc' });
    return Response.json({ id: 'pi_abc', livemode: false, latest_charge: { amount_refunded: 8000 } });
  };
  const g = new StripeTestCardGateway('sk_test_abc', fetcher);
  expect(await g.refund(a)).toEqual({ id: 're_1', amount: 6000 });
  expect(calls[0][3]).toContain('amount=6000'); expect(calls[0][2]).toContain(':refund');
  const short = new StripeTestCardGateway('sk_test_abc', async (u) => String(u).endsWith('/refunds')
    ? Response.json({ id: 're_1', object: 'refund', status: 'succeeded', amount: 6000, currency: 'eur', payment_intent: 'pi_abc' })
    : Response.json({ id: 'pi_abc', livemode: false, latest_charge: { amount_refunded: 2000 } }));
  await expect(short.refund(a)).rejects.toThrow('REFUND_NOT_VERIFIED');
  await expect(g.refund({ ...a, state: 'booked' })).rejects.toThrow('REFUND_PLAN_INVALID');
});

import { parseCardRequest } from '../supabase/functions/_shared/booking-card-response.ts';
test('eligible request takes only a drop id', () => {
  const d = '22222222-2222-4222-8222-222222222222';
  expect(parseCardRequest({ action: 'eligible', drop_id: d }).action).toBe('eligible');
  for (const bad of [{}, { drop_id: 'x' }, { drop_id: d, product_id: d }, { drop_id: d, booking_id: d }])
    expect(() => parseCardRequest({ action: 'eligible', ...bad })).toThrow('REQUEST_INVALID');
});
