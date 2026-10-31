import { bookingAdmin, SupabaseCardStore, smallJson, cardJson } from '../_shared/booking-card-store.ts';
import { StripeTestCardGateway, reconcileCardAttempt, verifyCardIdentity, type CardAttempt } from '../_shared/booking-card-flow.ts';
import { StripeTestCustomerGateway, SAVED_CARD_CONSENT_VERSION } from '../_shared/booking-saved-card.ts';
import { stripeKeysFor } from '../_shared/booking-stripe-keys.ts';
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
    const keys = await stripeKeysFor(db);
    const testKey = keys.secret;
    // Stored per attempt BEFORE Stripe is called, so every retry builds the same PaymentIntent.
    const savedOptions = async (attemptId: string) => {
      const { data } = await db.from('booking_card_save_requests').select('save_card,customer_id').eq('attempt_id', attemptId).maybeSingle();
      return data?.customer_id ? { customer: data.customer_id as string, save: data.save_card === true } : {};
    };
    if ((body.action === 'saved_card' || body.action === 'remove_saved_card') && keys.live) {
      // Saved cards are test-only for now: live customers pay each time.
      return cardJson({ ok: true, has_card: false });
    }
    if (body.action === 'saved_card' || body.action === 'remove_saved_card') {
      // Only the private test cohort (test mode + an active test scope) can use saved cards.
      const { data: scopes } = await db.from('booking_card_test_scopes').select('drop_id')
        .eq('user_id', auth.user.id).gt('expires_at', new Date().toISOString()).limit(1);
      const liveOpen = keys.live && (await db.from('booking_card_rollout').select('live_open').eq('singleton', true).single()).data?.live_open === true;
      if (!(keys.mode === 'test' && scopes?.length) && !(keys.live && (liveOpen || scopes?.length))) return cardJson({ ok: false, code: 'CARD_TEST_DISABLED' }, 403);
      const { data: row } = await db.from('booking_saved_cards').select('stripe_customer_id,removed_at').eq('user_id', auth.user.id).maybeSingle();
      const customers = new StripeTestCustomerGateway(testKey);
      if (!row || row.removed_at) return cardJson({ ok: true, has_card: false });
      if (body.action === 'saved_card') {
        const cards = await customers.cards(row.stripe_customer_id);
        return cardJson(cards.length ? { ok: true, has_card: true, brand: cards[0].brand, last4: cards[0].last4 } : { ok: true, has_card: false });
      }
      // Never detach a card that backs a booking not yet settled.
      const { data: open, error: openError } = await db.from('booking_card_attempts').select('id').eq('user_id', auth.user.id)
        .in('state', ['creating', 'awaiting_authorization', 'booked', 'capture_pending', 'release_pending', 'review']).limit(1);
      if (openError) throw new Error('CARD_DATABASE_RETRY_REQUIRED');
      if (open?.length) return cardJson({ ok: false, code: 'CARD_IN_USE' }, 409);
      await customers.detachAll(row.stripe_customer_id);
      const { error: removeError } = await db.from('booking_saved_cards').update({ removed_at: new Date().toISOString() }).eq('user_id', auth.user.id);
      if (removeError) throw new Error('CARD_DATABASE_RETRY_REQUIRED');
      return cardJson({ ok: true, has_card: false, removed: true });
    }
    let a: CardAttempt;
    let savedOpts: { customer?: string; save?: boolean } = {};
    if (body.action === 'eligible' || body.action === 'start') {
      const { data: allowed, error: allowedError } = await db.rpc('card_user_allowed', { p_user: auth.user.id, p_drop: body.drop_id });
      const enrolled = !allowedError && allowed === true;
      if (body.action === 'eligible') {
        // Read-only. A publishable key is public by design, but only enrolled users get it.
        const key = keys.publishable;
        const ok = enrolled && key !== '' && !!keys.secret;
        return cardJson(ok ? { ok: true, eligible: true, publishable_key: key, can_save_card: !keys.live } : { ok: true, eligible: false });
      }
      if (!enrolled) return cardJson({ ok: false, code: 'CARD_TEST_DISABLED' }, 403);
      a = await store.call('begin_test_card_booking', { p_id: body.attempt_id, p_user_id: auth.user.id,
        p_product_id: body.product_id, p_drop_id: body.drop_id, p_variant_id: body.variant_id ?? null });
      savedOpts = await savedOptions(a.id);
      if (!savedOpts.customer && a.state === 'creating') {
        // First decision for this attempt. The tick is the only way a card is saved.
        const { data: row } = await db.from('booking_saved_cards').select('stripe_customer_id,removed_at').eq('user_id', auth.user.id).maybeSingle();
        const wantsSave = body.save_card === true && !keys.live;
        let customer: string | null = null;
        if (wantsSave) {
          customer = row?.stripe_customer_id ?? await new StripeTestCustomerGateway(testKey).createCustomer(auth.user.id);
          const { error: consentError } = await db.from('booking_saved_cards').upsert({ user_id: auth.user.id,
            stripe_customer_id: customer, consent_text_version: SAVED_CARD_CONSENT_VERSION,
            consented_at: new Date().toISOString(), removed_at: null }, { onConflict: 'user_id' });
          if (consentError) throw new Error('CARD_DATABASE_RETRY_REQUIRED');
        } else if (row && !row.removed_at && !keys.live) customer = row.stripe_customer_id;
        const { error: saveError } = await db.from('booking_card_save_requests').upsert(
          { attempt_id: a.id, user_id: auth.user.id, save_card: wantsSave, customer_id: customer },
          { onConflict: 'attempt_id', ignoreDuplicates: true });
        if (saveError) throw new Error('CARD_DATABASE_RETRY_REQUIRED');
        savedOpts = await savedOptions(a.id);
      }
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
        a = await reconcileCardAttempt(a.id, store, new StripeTestCardGateway(testKey, fetch, await savedOptions(a.id)));
      } catch {
        // The request is already durably accepted. Never pretend it failed or
        // that funds were released just because the Stripe/DB response was lost.
        a = await store.get(a.id);
        return cardJson({ ...await view(a), retry_required: true });
      }
      return cardJson(await view(a));
    }
    if (!savedOpts.customer) savedOpts = await savedOptions(a.id);
    const stripe = new StripeTestCardGateway(testKey, fetch, savedOpts);
    a = await reconcileCardAttempt(a.id, store, stripe);
    if (body.action === 'start' && a.state === 'awaiting_authorization') {
      const pi = await stripe.retrieve(a.intent_id!); verifyCardIdentity(pi, a);
      if (!pi.client_secret || !pi.client_secret.startsWith(`${pi.id}_secret_`)) throw new Error('CLIENT_SECRET_UNAVAILABLE');
      // Only the owner receives this test secret for Stripe's native UI.
      const session = savedOpts.customer ? await new StripeTestCustomerGateway(testKey).customerSession(savedOpts.customer) : null;
      return cardJson({ ...await view(a), client_secret: pi.client_secret, currency: 'eur',
        ...(session ? { customer_id: savedOpts.customer, customer_session_client_secret: session } : {}),
        notice: (keys.live ? '' : 'TEST: ') + 'autorizzazione temporanea; prenotazione solo dopo conferma bancaria. Incasso alla chiusura del drop, non superiore a questo importo.' });
    }
    return cardJson(await view(a));
  } catch (error) {
    const code = error instanceof Error && ['ATTEMPT_NOT_FOUND','BODY_TOO_LARGE','BODY_INVALID','REQUEST_INVALID','CARD_IN_USE'].includes(error.message) ? error.message : 'CARD_STEP_NOT_COMPLETED';
    return cardJson({ ok: false, code }, code === 'ATTEMPT_NOT_FOUND' ? 404 : code === 'REQUEST_INVALID' ? 400 : 409);
  }
});
