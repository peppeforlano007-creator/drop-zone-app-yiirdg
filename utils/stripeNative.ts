// Stripe's native module exists only in builds made after it was added. Older
// store versions must keep working: load it defensively and treat absence as
// "card payments unavailable here", never as an error.
type StripeModule = typeof import('@stripe/stripe-react-native');
let loaded: StripeModule | null = null;
export let stripeLoadError: string | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loaded = require('@stripe/stripe-react-native') as StripeModule;
} catch (e) {
  loaded = null;
  // Diagnostic only: the reason the card module did not load (no user data).
  stripeLoadError = String((e as Error)?.message ?? e).slice(0, 300);
  console.warn('[stripeNative] not available:', stripeLoadError);
}
export const stripeNative: StripeModule | null = loaded;
