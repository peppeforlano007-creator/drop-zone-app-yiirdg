// Stripe's native module exists only in builds made after it was added. Older
// store versions must keep working: load it defensively and treat absence as
// "card payments unavailable here", never as an error.
type StripeModule = typeof import('@stripe/stripe-react-native');
let loaded: StripeModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loaded = require('@stripe/stripe-react-native') as StripeModule;
} catch {
  loaded = null;
}
export const stripeNative: StripeModule | null = loaded;
