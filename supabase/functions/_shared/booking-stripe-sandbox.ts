/** Management-only Stripe API smoke test, NEVER checkout or a booking worker.
 * Uses pm_card_visa and synthetic metadata, no customers/emails/orders. Fixed
 * EUR amounts and test-only key. No client-selected price, operation or URL.
 */
import { checkStripeTestConnection } from './stripe-booking-readiness.ts';
import { discountedCents, planCapture, verifyTestAuthorization, type RetrievedPaymentIntent } from './card-booking-guards.ts';

const FLOW = 'rdn_booking_sandbox_v1';
const USER = 'sandbox-only-not-a-customer';
const AUTHORIZED = discountedCents(10000, 2000); // €100 less current 20% = €80.
const FINAL = discountedCents(10000, 4000); // Simulated closing 40% = €60.
const FIVE_DAY_DROP = 5 * 86400 + 3600; // Covers audited 5–5.04 day drops.
type Scenario = 'partial' | 'release';
type Intent = RetrievedPaymentIntent & { object: string };
export interface SandboxReport {
  ok: boolean;
  code: string;
  sandbox_only: true;
  payment_flow_verified: false;
  production_bookings_touched: false;
  intents: Record<string, string>;
  checks: Record<string, boolean | number>;
  cleanup: Record<string, string>;
  unresolved_create_keys: string[];
  stripe_error?: { http_status: number; operation: string; type: string; code: string; param: string };
}
class SafeFailure extends Error {}

export async function runBookingSandbox(
  key: string | undefined, runId: string, fetcher: typeof fetch = fetch,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<SandboxReport> {
  const report: SandboxReport = {
    ok: false, code: 'NOT_STARTED', sandbox_only: true, payment_flow_verified: false,
    production_bookings_touched: false, intents: {}, checks: {}, cleanup: {}, unresolved_create_keys: [],
  };
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(runId)) {
    return { ...report, code: 'INVALID_MANAGEMENT_RUN' };
  }
  const ready = await checkStripeTestConnection(key, fetcher);
  if (!ready.ok) return { ...report, code: ready.code };

  // No caller outside this module supplies paths. Bound retries reuse identical
  // POST parameters and idempotency keys, including after ambiguous timeouts.
  const api = async (path: string, body?: URLSearchParams, idempotency?: string): Promise<Intent> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetcher(`https://api.stripe.com/v1/${path}`, {
          method: body ? 'POST' : 'GET', redirect: 'error', cache: 'no-store',
          headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': '2024-06-20',
            ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idempotency! } : {}) },
          ...(body ? { body: body.toString() } : {}), signal: AbortSignal.timeout(12000),
        });
      } catch {
        if (attempt === 0) continue;
        throw new SafeFailure('STRIPE_REQUEST_UNCERTAIN');
      }
      if (!response.ok) {
        if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
        // Retain only bounded Stripe machine fields, never message, body,
        // request URL, headers or embedded payment/client-secret objects.
        if (!report.stripe_error) {
          let failure: { type?: unknown; code?: unknown; param?: unknown } = {};
          try { failure = (await response.json())?.error ?? {}; } catch { /* no raw data */ }
          const field = (value: unknown) => typeof value === 'string' && /^[a-z0-9_.\[\]]{1,80}$/.test(value) ? value : 'unspecified';
          report.stripe_error = { http_status: response.status,
            operation: path.endsWith('/capture') ? 'capture' : path.endsWith('/cancel') ? 'cancel' : path === 'payment_intents' ? 'authorize' : 'retrieve',
            type: field(failure.type), code: field(failure.code), param: field(failure.param) };
        }
        throw new SafeFailure(response.status >= 500 ? 'STRIPE_REQUEST_UNCERTAIN' : 'STRIPE_TEST_REQUEST_REJECTED');
      }
      try { return await response.json(); } catch { throw new SafeFailure('STRIPE_RESPONSE_INVALID'); }
    }
    throw new SafeFailure('STRIPE_REQUEST_UNCERTAIN');
  };
  const idem = (scenario: Scenario, action: string) => `${FLOW}:${runId}:${scenario}:${action}`;
  const owned = (pi: Intent, scenario: Scenario) => {
    if (!pi || pi.object !== 'payment_intent' || !/^pi_[A-Za-z0-9]+$/.test(pi.id) || pi.livemode !== false ||
        pi.capture_method !== 'manual' || pi.currency !== 'eur' || pi.amount !== AUTHORIZED ||
        pi.metadata?.flow !== FLOW || pi.metadata?.booking_attempt_id !== `${runId}:${scenario}` ||
        pi.metadata?.user_id !== USER || pi.metadata?.drop_id !== `sandbox-drop:${runId}`) {
      throw new SafeFailure('SANDBOX_INTENT_IDENTITY_REJECTED');
    }
  };
  const get = async (id: string, scenario: Scenario) => {
    if (!/^pi_[A-Za-z0-9]+$/.test(id)) throw new SafeFailure('SANDBOX_INTENT_IDENTITY_REJECTED');
    const pi = await api(`payment_intents/${id}?expand%5B%5D=latest_charge`);
    owned(pi, scenario);
    if (pi.id !== id) throw new SafeFailure('SANDBOX_INTENT_IDENTITY_REJECTED');
    return pi;
  };
  const authorize = async (scenario: Scenario) => {
    const params = new URLSearchParams({ amount: String(AUTHORIZED), currency: 'eur',
      capture_method: 'manual', confirm: 'true', payment_method: 'pm_card_visa',
      'payment_method_types[]': 'card', description: 'RDN SANDBOX ONLY - synthetic lifecycle test - no order',
      'metadata[flow]': FLOW, 'metadata[booking_attempt_id]': `${runId}:${scenario}`,
      'metadata[user_id]': USER, 'metadata[drop_id]': `sandbox-drop:${runId}` });
    const creationKey = idem(scenario, 'create');
    report.unresolved_create_keys.push(creationKey);
    const pi = await api('payment_intents', params, creationKey);
    owned(pi, scenario);
    report.intents[scenario] = pi.id;
    report.unresolved_create_keys = report.unresolved_create_keys.filter(k => k !== creationKey);
    return get(pi.id, scenario);
  };
  const validateHold = (pi: Intent, scenario: Scenario) => {
    try {
      const verified = verifyTestAuthorization(pi, { intentId: pi.id, attemptId: `${runId}:${scenario}`,
        userId: USER, dropId: `sandbox-drop:${runId}`, amountCents: AUTHORIZED,
        nowSeconds, dropEndSeconds: nowSeconds + FIVE_DAY_DROP });
      report.checks[`${scenario}_capture_before`] = verified.captureBefore;
    } catch (error) {
      throw new SafeFailure(error instanceof Error && error.message === 'AUTHORIZATION_WINDOW_TOO_SHORT'
        ? 'AUTHORIZATION_WINDOW_TOO_SHORT' : 'AUTHORIZATION_CHECK_FAILED');
    }
  };
  const verifyCapture = (pi: Intent) => {
    const charge = pi.latest_charge;
    // Bounded, non-personal observations make schema/version mismatches diagnosable
    // without exposing Stripe responses, card details, client secrets or headers.
    report.checks.capture_status_succeeded = pi.status === 'succeeded';
    report.checks.capture_amount_received = Number.isSafeInteger(pi.amount_received) ? pi.amount_received : -1;
    report.checks.capture_amount_capturable = Number.isSafeInteger(pi.amount_capturable) ? pi.amount_capturable : -1;
    if (charge && typeof charge !== 'string') {
      const captured = (charge as typeof charge & { amount_captured?: number }).amount_captured;
      report.checks.charge_captured = charge.captured === true;
      report.checks.charge_refunded = charge.refunded === true;
      report.checks.charge_amount_refunded = Number.isSafeInteger(charge.amount_refunded) ? charge.amount_refunded : -1;
      report.checks.charge_amount_captured = Number.isSafeInteger(captured) ? captured! : -1;
    }
    if (pi.status !== 'succeeded' || pi.amount_received !== FINAL || pi.amount_capturable !== 0 ||
        !charge || typeof charge === 'string' || charge.captured !== true || charge.refunded !== false ||
        // Pinned API 2024-06-20 reports the uncaptured remainder in
      // amount_refunded (observed against this sandbox). It is NOT an extra
      // customer refund: any further refund would exceed this exact remainder.
      charge.amount_refunded !== AUTHORIZED - FINAL ||
      (charge as typeof charge & { amount_captured?: number }).amount_captured !== FINAL) {
      throw new SafeFailure('PARTIAL_CAPTURE_NOT_VERIFIED');
    }
  };
  const verifyRelease = (pi: Intent) => {
    if (pi.status !== 'canceled' || pi.amount_capturable !== 0 || pi.amount_received !== 0) {
      throw new SafeFailure('RELEASE_NOT_VERIFIED');
    }
  };
  try {
    let partial = await authorize('partial');
    if (partial.status !== 'succeeded') {
      validateHold(partial, 'partial');
      const plan = planCapture(AUTHORIZED, FINAL);
      await api(`payment_intents/${partial.id}/capture`, new URLSearchParams({
        // Standard single capture releases the remainder by default. Do not
        // send multicapture-specific parameters to this ordinary card flow.
        amount_to_capture: String(plan.amountToCapture),
      }), idem('partial', 'capture'));
      partial = await get(partial.id, 'partial');
    }
    verifyCapture(partial);
    // Retry the EXACT same capture request to verify Stripe idempotency, then
    // independently retrieve the intent. This must not charge a second time.
    await api(`payment_intents/${partial.id}/capture`, new URLSearchParams({
      amount_to_capture: String(FINAL),
    }), idem('partial', 'capture'));
    verifyCapture(await get(partial.id, 'partial'));
    report.checks.authorized_cents = AUTHORIZED;
    report.checks.captured_cents = FINAL;
    report.checks.unused_authorization_cents = AUTHORIZED - FINAL;
    report.checks.partial_capture_and_retry_verified = true;

    let release = await authorize('release');
    if (release.status !== 'canceled') {
      validateHold(release, 'release');
      await api(`payment_intents/${release.id}/cancel`, new URLSearchParams({ cancellation_reason: 'abandoned' }), idem('release', 'cancel'));
      release = await get(release.id, 'release');
    }
    verifyRelease(release);
    await api(`payment_intents/${release.id}/cancel`, new URLSearchParams({ cancellation_reason: 'abandoned' }), idem('release', 'cancel'));
    verifyRelease(await get(release.id, 'release'));
    report.checks.full_release_cents = AUTHORIZED;
    report.checks.release_and_retry_verified = true;
    report.ok = true;
    report.code = 'STRIPE_SANDBOX_LIFECYCLE_VERIFIED';
  } catch (error) {
    report.code = error instanceof SafeFailure ? error.message : 'SANDBOX_CHECK_FAILED';
    // Only cancel a retrieved, owned, test-mode hold. Never refund an already
    // captured intent, never touch unknown identities, and never hide uncertainty.
    for (const [scenario, id] of Object.entries(report.intents)) {
      try {
        let pi = await get(id, scenario as Scenario);
        if (pi.status === 'requires_capture') {
          await api(`payment_intents/${id}/cancel`, new URLSearchParams({ cancellation_reason: 'abandoned' }), idem(scenario as Scenario, 'cleanup'));
          pi = await get(id, scenario as Scenario);
          verifyRelease(pi);
          report.cleanup[scenario] = 'hold_canceled';
        } else {
          report.cleanup[scenario] = pi.status === 'canceled' || pi.status === 'succeeded' ? 'no_open_hold' : 'review_required';
        }
      } catch { report.cleanup[scenario] = 'review_required'; }
    }
  }
  return report;
}
