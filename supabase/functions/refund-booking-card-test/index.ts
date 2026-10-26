import { bookingAdmin, smallJson, cardJson, SupabaseCardStore } from '../_shared/booking-card-store.ts';
import { StripeTestCardGateway, validId } from '../_shared/booking-card-flow.ts';
import { refundCardPayment, refundCodes, type RefundRow, type RefundStore } from '../_shared/booking-card-refund.ts';

// Operator-only refund of an already captured TEST card payment. Auth.getUser
// verifies the caller; the database re-checks the admin role. No Stripe ids leave.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return cardJson({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  const db = bookingAdmin();
  const bearer = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!bearer || bearer.length > 8192) return cardJson({ ok: false, code: 'SIGN_IN_REQUIRED' }, 401);
  const { data: auth, error } = await db.auth.getUser(bearer);
  if (error || !auth.user) return cardJson({ ok: false, code: 'SIGN_IN_REQUIRED' }, 401);
  try {
    const body = await smallJson(req, 1024);
    if (!validId(body.attempt_id) || typeof body.reason !== 'string' || !/^[A-Z_]{1,40}$/.test(body.reason)) throw new Error('REQUEST_INVALID');
    const cards = new SupabaseCardStore(db);
    const rpc = async (name: string, args: Record<string, unknown>): Promise<RefundRow> => {
      const { data, error } = await db.rpc(name, args);
      if (error) throw new Error(refundCodes.has(error.message) ? error.message : 'CARD_DATABASE_RETRY_REQUIRED');
      return data as RefundRow;
    };
    const store: RefundStore = {
      request: (id, admin, reason) => rpc('request_test_card_refund', { p_attempt_id: id, p_admin_id: admin, p_reason: reason }),
      attempt: (id) => cards.get(id),
      record: (id, refundId, amount) => rpc('record_test_card_refund', { p_attempt_id: id, p_refund_id: refundId, p_amount: amount }),
      review: async (id) => { await db.rpc('note_test_card_refund_review', { p_attempt_id: id }); },
    };
    const row = await refundCardPayment(body.attempt_id as string, auth.user.id, body.reason as string, store,
      new StripeTestCardGateway(Deno.env.get('STRIPE_BOOKING_TEST_SECRET_KEY')));
    return cardJson({ ok: true, state: row.state, amount_cents: row.amount_cents });
  } catch (e) {
    const code = e instanceof Error && (refundCodes.has(e.message) || ['REFUND_NEEDS_REVIEW','REQUEST_INVALID','BODY_TOO_LARGE','BODY_INVALID'].includes(e.message)) ? e.message : 'REFUND_NOT_COMPLETED';
    return cardJson({ ok: false, code }, code === 'ADMIN_REQUIRED' ? 403 : code === 'REQUEST_INVALID' ? 400 : 409);
  }
});
