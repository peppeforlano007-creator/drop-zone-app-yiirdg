/** Dormant phase-1 guards for physical-goods bookings, NOT a payment endpoint.
 * These pure functions perform no network/database writes. They cannot enable
 * live payments. Only a future server worker may pass Stripe-retrieved objects;
 * never trust PaymentIntent data or monetary amounts supplied by a mobile client.
 */
export const CAPTURE_SAFETY_SECONDS = 6 * 60 * 60;
const MAX_CENTS = 99_999_999;

function cents(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_CENTS) {
    throw new Error('INVALID_AMOUNT');
  }
}
function discount(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
    throw new Error('INVALID_DISCOUNT_BPS');
  }
}

/** Integer euro cents, percentage in basis points: 30% = 3000.
 * One half-up rounding after BOTH group and loyalty factors. Authorization uses
 * the current group discount only; settlement can add the loyalty reduction.
 */
export function discountedCents(originalCents: number, groupBps: number, loyaltyBps = 0): number {
  cents(originalCents);
  discount(groupBps);
  discount(loyaltyBps);
  const numerator = BigInt(originalCents) * BigInt(10_000 - groupBps) * BigInt(10_000 - loyaltyBps);
  return Number((numerator + 50_000_000n) / 100_000_000n);
}

export function noShowDecision(count: number, alreadyBlocked: boolean): 'cod' | 'card' | 'blocked' {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('INVALID_NO_SHOW_COUNT');
  if (alreadyBlocked || count >= 5) return 'blocked';
  return count >= 2 ? 'card' : 'cod';
}

export interface ExpectedTestAuthorization {
  intentId: string;
  attemptId: string;
  userId: string;
  dropId: string;
  amountCents: number;
  nowSeconds: number;
  dropEndSeconds: number;
}

export interface RetrievedPaymentIntent {
  id: string;
  livemode: boolean;
  status: string;
  capture_method: string;
  currency: string;
  amount: number;
  amount_capturable: number;
  amount_received: number;
  metadata: Record<string, string>;
  latest_charge: null | string | {
    captured: boolean;
    refunded: boolean;
    amount_refunded: number;
    payment_method_details?: {
      type?: string;
      card?: { capture_before?: number };
    };
  };
}

/** Fail closed. Requires an expanded latest_charge fetched from Stripe in test
 * mode. A browser success redirect, checkout opening, or a client assertion is
 * never proof of authorization. This guard alone does NOT insert a booking.
 */
export function verifyTestAuthorization(pi: RetrievedPaymentIntent, expected: ExpectedTestAuthorization): {
  captureBefore: number;
  amountCents: number;
} {
  cents(expected.amountCents);
  if (!expected.intentId || !expected.attemptId || !expected.userId || !expected.dropId) {
    throw new Error('MISSING_SERVER_IDENTITY');
  }
  if (!Number.isSafeInteger(expected.nowSeconds) || expected.nowSeconds < 0 ||
      !Number.isSafeInteger(expected.dropEndSeconds) || expected.dropEndSeconds <= expected.nowSeconds) {
    throw new Error('DROP_NOT_OPEN');
  }
  if (pi.livemode !== false) throw new Error('LIVE_PAYMENTS_DISABLED');
  if (pi.id !== expected.intentId || pi.metadata?.booking_attempt_id !== expected.attemptId ||
      pi.metadata?.user_id !== expected.userId || pi.metadata?.drop_id !== expected.dropId) {
    throw new Error('AUTHORIZATION_IDENTITY_MISMATCH');
  }
  if (pi.status !== 'requires_capture' || pi.capture_method !== 'manual') {
    throw new Error('AUTHORIZATION_NOT_READY');
  }
  if (pi.currency !== 'eur' || pi.amount !== expected.amountCents ||
      pi.amount_capturable !== expected.amountCents || pi.amount_received !== 0) {
    throw new Error('AUTHORIZATION_AMOUNT_MISMATCH');
  }
  const charge = pi.latest_charge;
  if (!charge || typeof charge === 'string' || charge.captured !== false ||
      charge.refunded !== false || charge.amount_refunded !== 0 ||
      charge.payment_method_details?.type !== 'card') {
    throw new Error('UNVERIFIED_CARD_CHARGE');
  }
  const deadline = charge.payment_method_details.card?.capture_before;
  if (!Number.isSafeInteger(deadline) ||
      (deadline as number) <= expected.dropEndSeconds + CAPTURE_SAFETY_SECONDS) {
    throw new Error('AUTHORIZATION_WINDOW_TOO_SHORT');
  }
  return { captureBefore: deadline as number, amountCents: expected.amountCents };
}

/** Prepare, but do not execute, a single final partial capture. If the closing
 * price exceeds the agreed authorization, require fresh consent, never silently
 * charge more or claim that the shortfall was paid. Zero means release, not a
 * zero-value Stripe capture. The worker must verify the actual paid result too.
 */
export function planCapture(authorizedCents: number, finalCents: number): {
  action: 'capture' | 'release';
  amountToCapture: number;
  amountToRelease: number;
} {
  cents(authorizedCents);
  if (!Number.isSafeInteger(finalCents) || finalCents < 0) throw new Error('INVALID_FINAL_AMOUNT');
  if (finalCents > authorizedCents) throw new Error('NEW_AUTHORIZATION_REQUIRED');
  return {
    action: finalCents === 0 ? 'release' : 'capture',
    amountToCapture: finalCents,
    amountToRelease: authorizedCents - finalCents,
  };
}
