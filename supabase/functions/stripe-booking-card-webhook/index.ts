import { verifyStripeSignature } from '../_shared/stripe-webhook-signature.ts';

// OBSERVE ONLY. Accepts Stripe TEST events whose signature is valid and records
// nothing but the event type. It changes no booking, order, stock or refund.
const WATCHED = new Set(['payment_intent.amount_capturable_updated', 'payment_intent.canceled', 'payment_intent.payment_failed',
  'payment_intent.succeeded', 'charge.refunded', 'charge.captured']);
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return reply(405, { ok: false });
  const secret = Deno.env.get('STRIPE_BOOKING_TEST_WEBHOOK_SECRET') ?? '';
  if (!secret) return reply(503, { ok: false, code: 'WEBHOOK_NOT_CONFIGURED' });
  const raw = await req.text();
  if (raw.length > 200_000) return reply(413, { ok: false });
  if (!(await verifyStripeSignature(raw, req.headers.get('stripe-signature'), secret, Math.floor(Date.now() / 1000)))) {
    return reply(400, { ok: false, code: 'SIGNATURE_INVALID' });
  }
  let event: { id?: unknown; type?: unknown; livemode?: unknown };
  try { event = JSON.parse(raw); } catch { return reply(400, { ok: false }); }
  const type = typeof event.type === 'string' ? event.type.slice(0, 80) : 'unknown';
  if (event.livemode !== false) return reply(200, { ok: true, ignored: 'not_test_mode' });
  console.log(JSON.stringify({ webhook: 'observed', type, watched: WATCHED.has(type) }));
  return reply(200, { ok: true, observed: WATCHED.has(type) });
});
