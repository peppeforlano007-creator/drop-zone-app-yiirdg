import type { CardAttempt, RefundResult } from './booking-card-flow.ts';

export type RefundRow = { attempt_id: string; booking_id: string; amount_cents: number; state: 'requested' | 'refunded' | 'review' };
export interface RefundStore {
  request(attemptId: string, adminId: string, reason: string): Promise<RefundRow>;
  attempt(attemptId: string): Promise<CardAttempt>;
  record(attemptId: string, refundId: string, amount: number): Promise<RefundRow>;
  review(attemptId: string): Promise<void>;
}
export interface RefundGateway { refund(a: CardAttempt): Promise<RefundResult> }
export const refundCodes = new Set(['ADMIN_REQUIRED','ATTEMPT_NOT_FOUND','REFUND_NOT_AVAILABLE','REFUND_ITEM_ALREADY_COLLECTED','REFUND_REASON_INVALID']);

/** Operator-only. The database decides eligibility; money moves only after it
 * accepted the request, and is recorded only after Stripe was verified twice.
 */
export async function refundCardPayment(attemptId: string, adminId: string, reason: string, store: RefundStore, stripe: RefundGateway): Promise<RefundRow> {
  const row = await store.request(attemptId, adminId, reason);
  if (row.state === 'refunded') return row;
  try {
    const result = await stripe.refund(await store.attempt(attemptId));
    return await store.record(attemptId, result.id, result.amount);
  } catch {
    // Keep the request: a human reviews it, nothing is retried blindly.
    await store.review(attemptId).catch(() => {});
    throw new Error('REFUND_NEEDS_REVIEW');
  }
}
