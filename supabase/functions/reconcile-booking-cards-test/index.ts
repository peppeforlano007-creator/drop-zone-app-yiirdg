import { bookingAdmin, SupabaseCardStore } from '../_shared/booking-card-store.ts';
import { StripeTestCardGateway, reconcileCardAttempt } from '../_shared/booking-card-flow.ts';
import { stripeKeysFor } from '../_shared/booking-stripe-keys.ts';
import { createReadinessHandler } from '../_shared/stripe-booking-readiness.ts';

// Scheduler/management only. Single-use capability, never a customer JWT.
Deno.serve((req: Request) => {
  const db = bookingAdmin();
  return createReadinessHandler({
    claim: async hash => {
      const { data, error } = await db.rpc('claim_booking_card_reconcile', { p_token_hash: hash });
      return !error && data === true;
    },
    check: async () => {
      const { data, error } = await db.from('booking_card_attempts').select('id')
        .in('state', ['creating','awaiting_authorization','booked','capture_pending','release_pending'])
        .order('last_checked_at', { ascending: true, nullsFirst: true }).order('created_at').limit(10);
      if (error) return { ok: false, code: 'CARD_QUEUE_UNAVAILABLE', checked: 0, retry_or_review: 0 };
      if (!data?.length) return { ok: true, code: 'NO_CARD_WORK', checked: 0, retry_or_review: 0 };
      const store = new SupabaseCardStore(db);
      const stripe = new StripeTestCardGateway((await stripeKeysFor(db)).secret);
      let failed = 0;
      for (let i = 0; i < data.length; i += 2) {
        await Promise.all(data.slice(i, i+2).map(async row => {
          try { await reconcileCardAttempt(row.id, store, stripe); } catch { failed++; }
        }));
      }
      return { ok: failed === 0, code: failed ? 'CARD_WORK_REQUIRES_RETRY_OR_REVIEW' : 'CARD_WORK_CHECKED', checked: data.length, retry_or_review: failed };
    },
  })(req);
});
