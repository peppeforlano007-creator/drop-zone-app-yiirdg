// One place decides which Stripe keys the card flow uses. The rollout mode picks the
// pair: 'live' -> STRIPE_BOOKING_LIVE_*, anything else -> STRIPE_BOOKING_TEST_*.
// A key of the wrong kind is rejected, so test mode can never touch live money.
export type StripeKeys = { mode: string; live: boolean; secret: string | undefined; publishable: string };

export async function stripeKeysFor(db: { from: (t: string) => any }): Promise<StripeKeys> {
  const { data } = await db.from('booking_card_rollout').select('mode').eq('singleton', true).single();
  const mode: string = data?.mode ?? 'disabled';
  const live = mode === 'live';
  const secret = Deno.env.get(live ? 'STRIPE_BOOKING_LIVE_SECRET_KEY' : 'STRIPE_BOOKING_TEST_SECRET_KEY');
  const publishable = Deno.env.get(live ? 'STRIPE_BOOKING_LIVE_PUBLISHABLE_KEY' : 'STRIPE_BOOKING_TEST_PUBLISHABLE_KEY') ?? '';
  const kind = live ? 'live' : 'test';
  return {
    mode, live,
    secret: secret && new RegExp(`^sk_${kind}_[A-Za-z0-9]+$`).test(secret) ? secret : undefined,
    publishable: new RegExp(`^pk_${kind}_[A-Za-z0-9]{10,200}$`).test(publishable) ? publishable : '',
  };
}
