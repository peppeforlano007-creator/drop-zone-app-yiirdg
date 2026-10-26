import { bookingAdmin, SupabaseCardStore, smallJson, cardJson } from '../_shared/booking-card-store.ts';
import { StripeTestCardGateway, reconcileCardAttempt, verifyCardIdentity, type CardAttempt } from '../_shared/booking-card-flow.ts';
import { parseCardRequest, requireCardOwner, cardAttemptView, customerCancelCodes, readCardAttemptResult } from '../_shared/booking-card-response.ts';

// Private test-cohort API. Supabase Auth verifies the JWT; no client prices.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return cardJson({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  const db = bookingAdmin();
  const bearer = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!bearer || bearer.length > 8192) return cardJson({ ok: false, code: 'SIGN_IN_REQUIRED' }, 401);
  const { data: auth, error } = await db.auth.getUser(bearer);
  if (error || !auth.user) return cardJson({ ok: false, code: 'SIGN_IN_REQUIRED' }, 401);
  try {
    const body = parseCardRequest(await smallJson(req, 2048));
    const store = new SupabaseCardStore(db);
    if (body.action === 'statuses') {
      // No client SELECT grant on attempts. Ownership is filtered server-side;
      // foreign/unknown booking IDs yield no data, never payment identifiers.
      const { data, error } = await db.from('booking_card_attempts')
        .select('*,drops!booking_card_attempts_drop_id_fkey(status,end_time)')
        .eq('user_id', auth.user.id).in('booking_id', body.booking_ids as string[]);
      if (error) throw new Error('CARD_DATABASE_RETRY_REQUIRED');
      return cardJson({ ok: true, statuses: (data ?? []).map(a => cardAttemptView(a, a.drops)) });
    }
    let a: CardAttempt;
    if (body.action === 'eligible' || body.action === 'start') {
      const { data: mode, error: modeError } = await db.from('booking_card_rollout').select('mode').eq('singleton', true).single();
      const { data: scope, error: scopeError } = await db.from('booking_card_test_scopes').select('expires_at')
        .eq('user_id', auth.user.id).eq('drop_id', body.drop_id).gt('expires_at', new Date().toISOString()).maybeSingle();
      const enrolled = !modeError && !scopeError && mode?.mode === 'test' && !!scope;
      if (body.action === 'eligible') {
        // Read-only. A publishable key is public by design, but only enrolled users get it.
        const key = Deno.env.get('STRIPE_BOOKING_TEST_PUBLISHABLE_KEY') ?? '';
        const ok = enrolled && /^pk_test_[A-Za-z0-9]{10,200}$/.test(key);
        return cardJson(ok ? { ok: true, eligible: true, publishable_key: key } : { ok: true, eligible: false });
      }
      if (!enrolled) return cardJson({ ok: false, code: 'CARD_TEST_DISABLED' }, 403);
      a = await store.call('begin_test_card_booking', { p_id: body.attempt_id, p_user_id: auth.user.id,
        p_product_id: body.product_id, p_drop_id: body.drop_id, p_variant_id: body.variant_id ?? null });
    } else if (body.booking_id) {
      const { data, error } = await db.from('booking_card_attempts').select('*')
        .eq('booking_id', body.booking_id).eq('user_id', auth.user.id).maybeSingle();
      if (error) throw new Error('CARD_DATABASE_RETRY_REQUIRED');
      if (!data) throw new Error('ATTEMPT_NOT_FOUND');
      a = data as CardAttempt;
    } else a = await store.get(body.attempt_id as string);
    requireCardOwner(a, auth.user.id);
    const view = async (attempt: CardAttempt) => {
      const { data: drop } = await db.from('drops').select('status,end_time').eq('id', attempt.drop_id).maybeSingle();
      return cardAttemptView(attempt, drop);
    };
    if (body.action === 'status') return cardJson(await view(a));
    if (body.action === 'cancel') {
      // Recheck ownership and deadline atomically with closing's lock order.
      // Expose ONLY bounded known codes, never a raw database message.
      const { data, error } = await db.rpc('request_test_card_customer_cancellation', {
        p_attempt_id: a.id, p_user_id: auth.user.id,
      });
      if (error) {
        const code = customerCancelCodes.has(error.message) ? error.message : 'CARD_STEP_NOT_COMPLETED';
        return cardJson({ ok: false, code }, code === 'ATTEMPT_NOT_FOUND' ? 404 : 409);
      }
      a = readCardAttemptResult(data);
      try {
        a = await reconcileCardAttempt(a.id, store, new StripeTestCardGateway(Deno.env.get('STRIPE_BOOKING_TEST_SECRET_KEY')));
      } catch {
        // The request is already durably accepted. Never pretend it failed or
        // that funds were released just because the Stripe/DB response was lost.
        a = await store.get(a.id);
        return cardJson({ ...await view(a), retry_required: true });
      }
      return cardJson(await view(a));
    }
    const stripe = new StripeTestCardGateway(Deno.env.get('STRIPE_BOOKING_TEST_SECRET_KEY'));
    a = await reconcileCardAttempt(a.id, store, stripe);
    if (body.action === 'start' && a.state === 'awaiting_authorization') {
      const pi = await stripe.retrieve(a.intent_id!); verifyCardIdentity(pi, a);
      if (!pi.client_secret || !pi.client_secret.startsWith(`${pi.id}_secret_`)) throw new Error('CLIENT_SECRET_UNAVAILABLE');
      // Only the owner receives this test secret for Stripe's native UI.
      return cardJson({ ...await view(a), client_secret: pi.client_secret, currency: 'eur',
        notice: 'TEST: autorizzazione temporanea; prenotazione solo dopo conferma bancaria. Incasso alla chiusura del drop, non superiore a questo importo.' });
    }
    return cardJson(await view(a));
  } catch (error) {
    const code = error instanceof Error && ['ATTEMPT_NOT_FOUND','BODY_TOO_LARGE','BODY_INVALID','REQUEST_INVALID'].includes(error.message) ? error.message : 'CARD_STEP_NOT_COMPLETED';
    return cardJson({ ok: false, code }, code === 'ATTEMPT_NOT_FOUND' ? 404 : code === 'REQUEST_INVALID' ? 400 : 409);
  }
});
