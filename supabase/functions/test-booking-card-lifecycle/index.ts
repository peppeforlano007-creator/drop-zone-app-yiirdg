import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.0';
import { createReadinessHandler } from '../_shared/stripe-booking-readiness.ts';
import { runBookingSandbox, type SandboxReport } from '../_shared/booking-stripe-sandbox.ts';

// Each request has its own claim closure. No public/user-selectable job id,
// amount, customer, card, booking or operation. Not connected to app checkout.
Deno.serve((request: Request) => {
  let runId: string | undefined;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return createReadinessHandler<SandboxReport>({
    claim: async hash => {
      const { data, error } = await admin.rpc('claim_booking_card_sandbox', { p_token_hash: hash });
      if (error || typeof data !== 'string') return false;
      runId = data;
      return true;
    },
    check: async () => {
      const result = await runBookingSandbox(Deno.env.get('STRIPE_BOOKING_TEST_SECRET_KEY'), runId!);
      const { error } = await admin.from('booking_card_sandbox_jobs').update({
        status: result.ok ? 'succeeded' : 'failed', finished_at: new Date().toISOString(), result,
      }).eq('id', runId!).eq('status', 'running').select('id').single();
      return error ? { ...result, ok: false, code: 'SANDBOX_RESULT_NOT_RECORDED' } : result;
    },
  })(request);
});
