import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.0';
import { checkStripeTestConnection, createReadinessHandler } from '../_shared/stripe-booking-readiness.ts';

// A random, expiring, one-use management capability replaces user JWT auth here.
// Only SQL management can enqueue it; no customer/admin UI can run this check.
// No request can choose a Stripe URL, amount, operation or payment method.
Deno.serve(createReadinessHandler({
  claim: async hash => {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc('claim_booking_stripe_readiness', { p_token_hash: hash });
    return !error && data === true;
  },
  check: () => checkStripeTestConnection(Deno.env.get('STRIPE_BOOKING_TEST_SECRET_KEY')),
}));
