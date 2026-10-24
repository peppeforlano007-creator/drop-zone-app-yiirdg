import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discountedCents, noShowDecision, verifyTestAuthorization, planCapture, CAPTURE_SAFETY_SECONDS } from '../supabase/functions/_shared/card-booking-guards.ts';

const expected = {
  intentId: 'pi_test', attemptId: 'attempt-test', userId: 'user-test', dropId: 'drop-test',
  amountCents: 8000, nowSeconds: 1800000000, dropEndSeconds: 1800000000 + 5 * 86400,
};
function authorized() {
  return {
    id: 'pi_test', livemode: false, status: 'requires_capture', capture_method: 'manual',
    currency: 'eur', amount: 8000, amount_capturable: 8000, amount_received: 0,
    metadata: { booking_attempt_id: 'attempt-test', user_id: 'user-test', drop_id: 'drop-test' },
    latest_charge: { captured: false, refunded: false, amount_refunded: 0,
      payment_method_details: { type: 'card', card: { capture_before: expected.nowSeconds + 7 * 86400 } } },
  };
}

test('only verified no-show count decides card: 0 COD, 1–4 card, 5+ blocked', () => {
  assert.equal(noShowDecision(0, false), 'cod');
  for (let n = 1; n < 5; n++) assert.equal(noShowDecision(n, false), 'card');
  for (const n of [5, 6, 20]) assert.equal(noShowDecision(n, false), 'blocked');
  assert.equal(noShowDecision(0, true), 'blocked');
  for (const n of [-1, 0.1, NaN, Infinity]) assert.throws(() => noShowDecision(n, false));
});

test('authorization at current discount; final group/loyalty discounts release the difference', () => {
  const hold = discountedCents(10000, 2000);
  const closing = discountedCents(10000, 4000, 300);
  assert.equal(hold, 8000);
  assert.equal(closing, 5820);
  assert.deepEqual(planCapture(hold, closing), { action: 'capture', amountToCapture: 5820, amountToRelease: 2180 });
});

test('prices use one half-up integer rounding, including fractional euro amounts', () => {
  assert.equal(discountedCents(1999, 3333, 600), 1253);
  assert.equal(discountedCents(1, 5000), 1);
  assert.equal(discountedCents(100, 10000), 0);
  for (const amount of [0, -1, NaN, Infinity, 1.5, 100000000]) assert.throws(() => discountedCents(amount, 0));
  for (const bps of [-1, 10001, NaN, 0.1]) assert.throws(() => discountedCents(100, bps));
});

test('zero final price releases; increased price never silently overcaptures', () => {
  assert.deepEqual(planCapture(8000, 0), { action: 'release', amountToCapture: 0, amountToRelease: 8000 });
  assert.deepEqual(planCapture(8000, 8000), { action: 'capture', amountToCapture: 8000, amountToRelease: 0 });
  assert.throws(() => planCapture(8000, 8001), /NEW_AUTHORIZATION_REQUIRED/);
  for (const value of [-1, NaN, Infinity, 1.5]) assert.throws(() => planCapture(8000, value));
});

test('verified manual test authorization covering drop close is accepted', () => {
  assert.deepEqual(verifyTestAuthorization(authorized(), expected), {
    captureBefore: expected.nowSeconds + 7 * 86400, amountCents: 8000,
  });
});

for (const [field, value, error] of [
  ['livemode', true, 'LIVE_PAYMENTS_DISABLED'],
  ['livemode', undefined, 'LIVE_PAYMENTS_DISABLED'],
  ['id', 'pi_other', 'AUTHORIZATION_IDENTITY_MISMATCH'],
  ['status', 'requires_action', 'AUTHORIZATION_NOT_READY'],
  ['status', 'processing', 'AUTHORIZATION_NOT_READY'],
  ['status', 'succeeded', 'AUTHORIZATION_NOT_READY'],
  ['status', 'canceled', 'AUTHORIZATION_NOT_READY'],
  ['capture_method', 'automatic', 'AUTHORIZATION_NOT_READY'],
  ['currency', 'usd', 'AUTHORIZATION_AMOUNT_MISMATCH'],
  ['amount', 7999, 'AUTHORIZATION_AMOUNT_MISMATCH'],
  ['amount_capturable', 4000, 'AUTHORIZATION_AMOUNT_MISMATCH'],
  ['amount_received', 8000, 'AUTHORIZATION_AMOUNT_MISMATCH'],
  ['latest_charge', 'ch_not_expanded', 'UNVERIFIED_CARD_CHARGE'],
  ['latest_charge', null, 'UNVERIFIED_CARD_CHARGE'],
]) {
  test(`fail closed for ${field}=${String(value)}`, () => {
    const pi = authorized(); pi[field] = value;
    assert.throws(() => verifyTestAuthorization(pi, expected), new RegExp(error));
  });
}

for (const key of ['booking_attempt_id', 'user_id', 'drop_id']) {
  test(`a different ${key} cannot reuse an authorization`, () => {
    const pi = authorized(); pi.metadata[key] = 'different';
    assert.throws(() => verifyTestAuthorization(pi, expected), /AUTHORIZATION_IDENTITY_MISMATCH/);
  });
}

for (const deadline of [undefined, NaN, Infinity, 1800000000,
  expected.dropEndSeconds - 1, expected.dropEndSeconds + CAPTURE_SAFETY_SECONDS]) {
  test(`short or unknown authorization deadline ${String(deadline)} is rejected`, () => {
    const pi = authorized(); pi.latest_charge.payment_method_details.card.capture_before = deadline;
    assert.throws(() => verifyTestAuthorization(pi, expected), /AUTHORIZATION_WINDOW_TOO_SHORT/);
  });
}

test('a closed or invalid drop cannot become a booking', () => {
  for (const end of [expected.nowSeconds, expected.nowSeconds - 1, NaN]) {
    assert.throws(() => verifyTestAuthorization(authorized(), { ...expected, dropEndSeconds: end }), /DROP_NOT_OPEN/);
  }
});

test('captured, refunded or non-card charges cannot become authorized bookings', () => {
  for (const patch of [{ captured: true }, { refunded: true }, { amount_refunded: 1 },
    { payment_method_details: { type: 'sepa_debit' } }]) {
    const pi = authorized(); Object.assign(pi.latest_charge, patch);
    assert.throws(() => verifyTestAuthorization(pi, expected), /UNVERIFIED_CARD_CHARGE/);
  }
});

test('discount progression never increases amount at capture across a wide price sample', () => {
  for (let original = 50; original <= 50000; original += 137) {
    for (let current = 0; current <= 9000; current += 1000) {
      const hold = discountedCents(original, current);
      for (let final = current; final <= 10000; final += 500) {
        for (const loyalty of [0, 300, 600, 1000]) {
          const due = discountedCents(original, final, loyalty);
          assert.ok(due <= hold);
          assert.equal(planCapture(hold, due).amountToCapture, due);
        }
      }
    }
  }
});
