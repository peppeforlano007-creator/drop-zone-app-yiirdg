import { validId, type CardAttempt } from './booking-card-flow.ts';

export const customerCancelCodes = new Set([
  'ATTEMPT_NOT_FOUND', 'SETTLEMENT_ALREADY_STARTED', 'CANCELLATION_UNAVAILABLE', 'CANCELLATION_DEADLINE_PASSED',
]);
export type CardRequest = Record<string, unknown> & { action: 'start' | 'confirm' | 'status' | 'cancel' | 'statuses' | 'eligible' };
export function parseCardRequest(body: Record<string, unknown>): CardRequest {
  if (!['start','confirm','status','cancel','statuses','eligible'].includes(String(body.action))) throw new Error('REQUEST_INVALID');
  if (body.action === 'statuses') {
    if (!Array.isArray(body.booking_ids) || body.booking_ids.length < 1 || body.booking_ids.length > 50 ||
      !body.booking_ids.every(validId) || body.attempt_id !== undefined || body.booking_id !== undefined) throw new Error('REQUEST_INVALID');
  } else if (body.action === 'eligible') {
    if (!validId(body.drop_id) || body.attempt_id !== undefined || body.booking_id !== undefined || body.product_id !== undefined) throw new Error('REQUEST_INVALID');
  } else if (body.action === 'start') {
    if (!validId(body.attempt_id) || !validId(body.product_id) || !validId(body.drop_id) || body.booking_id !== undefined ||
      (body.variant_id !== null && body.variant_id !== undefined && !validId(body.variant_id))) throw new Error('REQUEST_INVALID');
  } else {
    const byAttempt = validId(body.attempt_id) && body.booking_id === undefined;
    const byBooking = validId(body.booking_id) && body.attempt_id === undefined;
    if (!byAttempt && !byBooking) throw new Error('REQUEST_INVALID');
  }
  return body as CardRequest;
}
// PostgREST may encode a PostgreSQL composite as an object or a one-row
// array. Refuse empty/multiple rows rather than silently losing an accepted
// cancellation or passing an undefined attempt ID to reconciliation.
export function readCardAttemptResult(value: unknown): CardAttempt {
  const row = Array.isArray(value) && value.length === 1 ? value[0] : value;
  if (!row || Array.isArray(row) || typeof row !== 'object' || !validId((row as Record<string, unknown>).id)) {
    throw new Error('CARD_DATABASE_RETRY_REQUIRED');
  }
  return row as CardAttempt;
}
export function requireCardOwner(a: CardAttempt, userId: string): void {
  if (a.user_id !== userId) throw new Error('ATTEMPT_NOT_FOUND');
}
export function cardAttemptView(a: CardAttempt, drop?: { status: string; end_time: string } | null, now = Date.now()) {
  return {
    ok: true, test_mode: true, attempt_id: a.id, state: a.state, booking_id: a.booking_id,
    authorized_cents: a.authorized_cents, final_cents: a.final_cents,
    paid: a.state === 'captured' || (a.state === 'released' && a.final_cents === 0 && !!a.frozen_at),
    release_pending: a.state === 'release_pending',
    customer_cancelled: a.release_reason === 'CUSTOMER_CANCELLED',
    // Presentation hint only. SQL checks the deadline again AFTER taking locks.
    can_cancel: ['creating','awaiting_authorization','booked'].includes(a.state) && !a.frozen_at &&
      drop?.status === 'active' && drop.end_time === a.drop_end && new Date(drop.end_time).getTime() > now,
  };
}
