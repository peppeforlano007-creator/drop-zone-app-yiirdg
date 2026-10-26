import { discountedCents, verifyTestAuthorization, type RetrievedPaymentIntent } from './card-booking-guards.ts';

/** Dormant test-cohort integration. No live keys, client amounts or legacy orders.
 * All Stripe data below is fetched server-side. Never log client_secret or raw
 * Stripe responses. Amounts and stable identities come from private SQL attempts.
 */
export const BOOKING_FLOW = 'rdn_booking_test_v2';
export type CardAttempt = {
  id: string; user_id: string; product_id: string; drop_id: string; variant_id: string | null;
  pickup_point_id: string; original_cents: number; group_bps: number; authorized_cents: number;
  drop_end: string; created_at: string; expires_at: string; target_booking_id: string;
  intent_id: string | null; booking_id: string | null;
  state: 'creating' | 'awaiting_authorization' | 'booked' | 'release_pending' | 'capture_pending' | 'captured' | 'released' | 'review';
  capture_before: string | null; final_cents: number | null; final_group_bps: number | null;
  final_loyalty_bps: number | null; frozen_at: string | null; release_reason: string | null;
};
export type CardIntent = RetrievedPaymentIntent & {
  object: string; client_secret?: string; latest_charge: RetrievedPaymentIntent['latest_charge'] & (null | string | { amount_captured?: number });
};
export interface CardStore {
  get(id: string): Promise<CardAttempt>;
  attach(id: string, intent: string): Promise<CardAttempt>;
  finalize(a: CardAttempt, captureBefore: number): Promise<CardAttempt>;
  prepare(id: string): Promise<CardAttempt>;
  release(id: string, reason: string): Promise<CardAttempt>;
  record(a: CardAttempt, result: 'captured' | 'released', received: number): Promise<CardAttempt>;
  note(id: string, code: string | null, review?: boolean): Promise<void>;
}
export interface CardGateway {
  create(a: CardAttempt): Promise<CardIntent>;
  retrieve(id: string): Promise<CardIntent>;
  capture(a: CardAttempt): Promise<void>;
  cancel(a: CardAttempt): Promise<void>;
}
export type RefundResult = { id: string; amount: number };
export function verifyRefund(r: { id?: string; object?: string; status?: string; amount?: number; currency?: string; payment_intent?: string }, a: CardAttempt): void {
  if (!r || r.object !== 'refund' || typeof r.id !== 'string' || !/^re_[A-Za-z0-9]+$/.test(r.id) || r.status !== 'succeeded' ||
    r.amount !== a.final_cents || r.currency !== 'eur' || r.payment_intent !== a.intent_id) throw new Error('REFUND_NOT_VERIFIED');
}
const fail = (code: string): never => { throw new Error(code); };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function validId(value: unknown): value is string { return typeof value === 'string' && uuid.test(value); }
const intentId = /^pi_[A-Za-z0-9]+$/;
const epoch = (s: string) => Math.floor(new Date(s).getTime() / 1000);

export function verifyCardIdentity(pi: CardIntent, a: CardAttempt): void {
  if (pi.livemode !== false) fail('LIVE_PAYMENTS_DISABLED');
  if (pi.object !== 'payment_intent' || !intentId.test(pi.id) || (a.intent_id !== null && pi.id !== a.intent_id) ||
    pi.capture_method !== 'manual' || pi.currency !== 'eur' || pi.amount !== a.authorized_cents ||
    pi.metadata?.flow !== BOOKING_FLOW || pi.metadata?.booking_attempt_id !== a.id ||
    pi.metadata?.user_id !== a.user_id || pi.metadata?.drop_id !== a.drop_id ||
    pi.metadata?.product_id !== a.product_id || pi.metadata?.variant_id !== (a.variant_id ?? 'none') ||
    discountedCents(a.original_cents, a.group_bps) !== a.authorized_cents) fail('STRIPE_IDENTITY_MISMATCH');
}
export function verifyCardSettlement(pi: CardIntent, a: CardAttempt): 'captured' | 'released' {
  verifyCardIdentity(pi, a);
  if (pi.status === 'canceled' && pi.amount_received === 0 && pi.amount_capturable === 0) {
    const charge = pi.latest_charge;
    if (charge && (typeof charge === 'string' || charge.captured !== false)) fail('RELEASE_NOT_VERIFIED');
    return 'released';
  }
  const charge = pi.latest_charge;
  if (a.frozen_at === null || a.final_cents === null || a.final_group_bps === null || a.final_loyalty_bps === null ||
    discountedCents(a.original_cents, a.final_group_bps, a.final_loyalty_bps) !== a.final_cents ||
    a.final_cents < 1 || a.final_cents > a.authorized_cents || pi.status !== 'succeeded' ||
    pi.amount_received !== a.final_cents || pi.amount_capturable !== 0 || !charge || typeof charge === 'string' ||
    charge.captured !== true || charge.refunded !== false || charge.amount_captured !== a.final_cents ||
    // Verified accounting for API 2024-06-20: unused authorization is reflected
    // here. A later actual refund beyond that remainder is NOT a paid result.
    charge.amount_refunded !== a.authorized_cents - a.final_cents) fail('CAPTURE_NOT_VERIFIED');
  return 'captured';
}

/** Fixed origin, pinned API, same body/key on bounded ambiguous-write retries.
 * Creation is unconfirmed: only the customer can confirm via Stripe's card UI.
 */
export class StripeTestCardGateway implements CardGateway {
  constructor(private key: string | undefined, private fetcher: typeof fetch = fetch) {
    if (!key || !/^sk_test_[A-Za-z0-9]+$/.test(key)) fail('TEST_KEY_REQUIRED');
  }
  private async request(path: string, body?: URLSearchParams, idempotency?: string): Promise<any> {
    for (let n = 0; n < 2; n++) {
      let response: Response;
      try {
        response = await this.fetcher(`https://api.stripe.com/v1/${path}`, {
          method: body ? 'POST' : 'GET', headers: {
            Authorization: `Bearer ${this.key}`, 'Stripe-Version': '2024-06-20',
            ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idempotency! } : {}),
          }, ...(body ? { body: body.toString() } : {}), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12_000),
        });
      } catch {
        if (n === 0) continue;
        return fail(body ? 'STRIPE_WRITE_UNCONFIRMED' : 'STRIPE_READ_FAILED');
      }
      if (!response.ok) {
        if (n === 0 && (response.status === 429 || response.status >= 500)) continue;
        return fail(body ? 'STRIPE_WRITE_UNCONFIRMED' : 'STRIPE_READ_FAILED');
      }
      try { return await response.json(); } catch { return fail('STRIPE_RESPONSE_UNVERIFIED'); }
    }
    return fail('STRIPE_UNAVAILABLE');
  }
  async create(a: CardAttempt): Promise<CardIntent> {
    if (!validId(a.id)) return fail('ATTEMPT_INVALID');
    const body = new URLSearchParams({
      amount: String(a.authorized_cents), currency: 'eur', capture_method: 'manual',
      'payment_method_types[]': 'card', description: 'RDN TEST ONLY - isolated booking authorization',
      'metadata[flow]': BOOKING_FLOW, 'metadata[booking_attempt_id]': a.id,
      'metadata[user_id]': a.user_id, 'metadata[drop_id]': a.drop_id,
      'metadata[product_id]': a.product_id, 'metadata[variant_id]': a.variant_id ?? 'none',
    });
    const pi = await this.request('payment_intents', body, `${BOOKING_FLOW}:${a.id}:create`);
    verifyCardIdentity(pi, a);
    return pi;
  }
  retrieve(id: string): Promise<CardIntent> {
    if (!intentId.test(id)) return Promise.reject(new Error('INTENT_INVALID'));
    return this.request(`payment_intents/${id}?expand[]=latest_charge`);
  }
  async capture(a: CardAttempt): Promise<void> {
    if (!a.intent_id || !intentId.test(a.intent_id) || !Number.isSafeInteger(a.final_cents) ||
      a.final_cents! < 1 || a.final_cents! > a.authorized_cents || !a.frozen_at) return fail('CAPTURE_PLAN_INVALID');
    await this.request(`payment_intents/${a.intent_id}/capture`, new URLSearchParams({ amount_to_capture: String(a.final_cents) }), `${BOOKING_FLOW}:${a.id}:capture`);
  }
  /** Refund of an ALREADY captured payment. Never more than the captured amount. */
  async refund(a: CardAttempt): Promise<RefundResult> {
    if (!a.intent_id || !intentId.test(a.intent_id) || a.state !== 'captured' || !Number.isSafeInteger(a.final_cents) || a.final_cents! < 1) return fail('REFUND_PLAN_INVALID');
    const r = await this.request('refunds', new URLSearchParams({ payment_intent: a.intent_id, amount: String(a.final_cents),
      'metadata[flow]': BOOKING_FLOW, 'metadata[booking_attempt_id]': a.id }), `${BOOKING_FLOW}:${a.id}:refund`);
    verifyRefund(r, a);
    // Independent read: the whole charge must now be returned, nothing more.
    const pi = await this.retrieve(a.intent_id);
    const charge = pi.latest_charge;
    if (pi.livemode !== false || !charge || typeof charge === 'string' || (charge as { amount_refunded?: number }).amount_refunded !== a.authorized_cents) return fail('REFUND_NOT_VERIFIED');
    return { id: r.id, amount: r.amount };
  }
  async cancel(a: CardAttempt): Promise<void> {
    if (!a.intent_id || !intentId.test(a.intent_id)) return fail('INTENT_INVALID');
    await this.request(`payment_intents/${a.intent_id}/cancel`, new URLSearchParams({ cancellation_reason: 'abandoned' }), `${BOOKING_FLOW}:${a.id}:cancel`);
  }
}

const reviewCodes = new Set(['STRIPE_IDENTITY_MISMATCH','LIVE_PAYMENTS_DISABLED','CAPTURE_NOT_VERIFIED',
  'RELEASE_NOT_VERIFIED','UNEXPECTED_CAPTURE','UNRESOLVED_OLD_CREATION','AUTHORIZED_AMOUNT_CHANGED']);

/** One recoverable step. No client JSON/redirect/event is ever payment proof.
 * Duplicate callbacks and scheduler passes converge through SQL row/drop locks,
 * immutable capture plans, Stripe idempotency and independent GET verification.
 */
export async function reconcileCardAttempt(id: string, store: CardStore, stripe: CardGateway, now = Math.floor(Date.now()/1000)): Promise<CardAttempt> {
  let a = await store.get(id);
  if (a.state === 'review' || a.state === 'captured' || a.state === 'released') return a;
  try {
    if (a.state === 'creating' || (a.state === 'release_pending' && a.intent_id === null)) {
      // A cancellation can win while creation is still in flight or its response
      // was lost. Recover the SAME unconfirmed intent with the original key,
      // attach it without leaving release_pending, then retrieve/cancel it.
      // Never infer 'no funds' merely from a missing local intent ID.
      // Never recreate a possibly processed operation beyond Stripe's minimum
      // idempotency lifetime. Recovery of an old ambiguous creation is manual.
      if (now - epoch(a.created_at) >= 23 * 3600) fail('UNRESOLVED_OLD_CREATION');
      const pi = await stripe.create(a);
      verifyCardIdentity(pi, a);
      a = await store.attach(a.id, pi.id);
    }
    let pi = await stripe.retrieve(a.intent_id!);
    verifyCardIdentity(pi, a);
    if (a.state === 'awaiting_authorization') {
      if (epoch(a.expires_at) <= now || epoch(a.drop_end) <= now) {
        a = await store.release(a.id, 'CHECKOUT_EXPIRED');
      } else if (pi.status === 'requires_capture') {
        let verified;
        try {
          verified = verifyTestAuthorization(pi, {
            intentId: a.intent_id!, attemptId: a.id, userId: a.user_id, dropId: a.drop_id,
            amountCents: a.authorized_cents, nowSeconds: now, dropEndSeconds: epoch(a.drop_end),
          });
        } catch (error) {
          // Identity already checked. A known own test hold can be safely
          // released if the card network's actual window is too short.
          if (error instanceof Error && error.message === 'AUTHORIZATION_WINDOW_TOO_SHORT') {
            a = await store.release(a.id, 'AUTHORIZATION_INVALID');
          } else throw error;
        }
        if (verified) a = await store.finalize(a, verified.captureBefore);
      } else if (pi.status === 'canceled') a = await store.release(a.id, 'AUTHORIZATION_INVALID');
      else if (pi.status === 'succeeded') fail('UNEXPECTED_CAPTURE');
    }
    if (a.state === 'booked') {
      a = await store.prepare(a.id);
      if (a.state === 'booked' && a.capture_before && epoch(a.capture_before) <= now + 1800) {
        // Never capture early at the wrong discount to beat authorization expiry.
        a = await store.release(a.id, 'AUTHORIZATION_EXPIRING');
      }
    }
    if (a.state === 'capture_pending') {
      pi = await stripe.retrieve(a.intent_id!);
      verifyCardIdentity(pi, a);
      if (pi.status === 'canceled') {
        verifyCardSettlement(pi, a);
        a = await store.record(a, 'released', 0);
      } else {
        if (pi.status !== 'succeeded') {
          if (pi.status !== 'requires_capture' || pi.amount_capturable !== a.authorized_cents || pi.amount_received !== 0) fail('AUTHORIZED_AMOUNT_CHANGED');
          if (!a.capture_before || epoch(a.capture_before) <= now) {
            // Leave a durable capture_pending row; a subsequent GET must confirm
            // network cancellation before inventory is released or marked paid.
            fail('AUTHORIZATION_EXPIRED');
          }
          await stripe.capture(a);
          pi = await stripe.retrieve(a.intent_id!);
        }
        if (verifyCardSettlement(pi, a) !== 'captured') fail('CAPTURE_NOT_VERIFIED');
        a = await store.record(a, 'captured', a.final_cents!);
      }
    }
    if (a.state === 'release_pending') {
      pi = await stripe.retrieve(a.intent_id!);
      verifyCardIdentity(pi, a);
      if (pi.status === 'succeeded') fail('UNEXPECTED_CAPTURE');
      if (pi.status !== 'canceled') {
        await stripe.cancel(a);
        pi = await stripe.retrieve(a.intent_id!);
      }
      if (verifyCardSettlement(pi, a) !== 'released') fail('RELEASE_NOT_VERIFIED');
      a = await store.record(a, 'released', 0);
    }
    await store.note(a.id, null);
    return a;
  } catch (error) {
    const code = error instanceof Error && /^[A-Z_]{1,80}$/.test(error.message) ? error.message : 'RECONCILIATION_RETRY_REQUIRED';
    await store.note(a.id, code, reviewCodes.has(code));
    throw new Error(code);
  }
}
