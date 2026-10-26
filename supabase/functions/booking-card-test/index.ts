import { bookingAdmin, SupabaseCardStore, smallJson, cardJson } from '../_shared/booking-card-store.ts';
import { StripeTestCardGateway, reconcileCardAttempt, verifyCardIdentity, validId, type CardAttempt } from '../_shared/booking-card-flow.ts';

// Private test-cohort API. Supabase Auth verifies the JWT; no client prices.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return cardJson({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  const db = bookingAdmin();
  const bearer = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!bearer || bearer.length > 8192) return cardJson({ ok: false, code: 'SIGN_IN_REQUIRED' }, 401);
  const { data: auth, error } = await db.auth.getUser(bearer);
  if (error || !auth.user) return cardJson({ ok: false, code: 'SIGN_IN_REQUIRED' }, 401);
  try {
    const body = await smallJson(req, 2048);
    if (!validId(body.attempt_id) || !['start','confirm','status','cancel'].includes(String(body.action))) return cardJson({ ok: false, code: 'REQUEST_INVALID' }, 400);
    const store = new SupabaseCardStore(db);
    let a: CardAttempt;
    if (body.action === 'start') {
      if (!validId(body.product_id) || !validId(body.drop_id) || (body.variant_id !== null && body.variant_id !== undefined && !validId(body.variant_id))) return cardJson({ ok: false, code: 'REQUEST_INVALID' }, 400);
      const { data: mode, error: modeError } = await db.from('booking_card_rollout').select('mode').eq('singleton', true).single();
      const { data: scope, error: scopeError } = await db.from('booking_card_test_scopes').select('expires_at')
        .eq('user_id', auth.user.id).eq('drop_id', body.drop_id).gt('expires_at', new Date().toISOString()).maybeSingle();
      if (modeError || scopeError || mode?.mode !== 'test' || !scope) return cardJson({ ok: false, code: 'CARD_TEST_DISABLED' }, 403);
      a = await store.call('begin_test_card_booking', { p_id: body.attempt_id, p_user_id: auth.user.id,
        p_product_id: body.product_id, p_drop_id: body.drop_id, p_variant_id: body.variant_id ?? null });
    } else a = await store.get(body.attempt_id);
    if (a.user_id !== auth.user.id) return cardJson({ ok: false, code: 'ATTEMPT_NOT_FOUND' }, 404);
    if (body.action === 'status') return cardJson(view(a));
    if (body.action === 'cancel') {
      if (a.state === 'captured' || a.state === 'capture_pending') return cardJson({ ok: false, code: 'SETTLEMENT_ALREADY_STARTED' }, 409);
      a = await store.release(a.id, 'CUSTOMER_CANCELLED');
    }
    const stripe = new StripeTestCardGateway(Deno.env.get('STRIPE_BOOKING_TEST_SECRET_KEY'));
    a = await reconcileCardAttempt(a.id, store, stripe);
    if (body.action === 'start' && a.state === 'awaiting_authorization') {
      const pi = await stripe.retrieve(a.intent_id!); verifyCardIdentity(pi, a);
      if (!pi.client_secret || !pi.client_secret.startsWith(`${pi.id}_secret_`)) throw new Error('CLIENT_SECRET_UNAVAILABLE');
      // Only the owner receives this test secret for Stripe's native UI.
      return cardJson({ ...view(a), client_secret: pi.client_secret, currency: 'eur',
        notice: 'TEST: autorizzazione temporanea; prenotazione solo dopo conferma bancaria. Incasso alla chiusura del drop, non superiore a questo importo.' });
    }
    return cardJson(view(a));
  } catch (error) {
    const code = error instanceof Error && ['ATTEMPT_NOT_FOUND','BODY_TOO_LARGE','BODY_INVALID'].includes(error.message) ? error.message : 'CARD_STEP_NOT_COMPLETED';
    return cardJson({ ok: false, code }, code === 'ATTEMPT_NOT_FOUND' ? 404 : 409);
  }
});
function view(a: CardAttempt) {
  return { ok: true, test_mode: true, attempt_id: a.id, state: a.state, booking_id: a.booking_id,
    authorized_cents: a.authorized_cents, final_cents: a.final_cents,
    paid: a.state === 'captured' || (a.state === 'released' && a.final_cents === 0 && !!a.frozen_at),
    release_pending: a.state === 'release_pending' };
}
