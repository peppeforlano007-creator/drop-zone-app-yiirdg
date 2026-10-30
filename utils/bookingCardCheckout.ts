import { stripeNative } from '@/utils/stripeNative';
import { abandonCardAttempt, confirmCardBooking, fetchCardEligibility, startCardBooking } from '@/utils/bookingCardApi';

export type CardCheckoutOutcome =
  | { kind: 'booked'; bookingId: string | null }
  | { kind: 'pending' }      // Bank accepted but the server has not confirmed yet.
  | { kind: 'cancelled' }    // Customer closed the sheet: nothing was booked.
  | { kind: 'failed'; message: string };

let initializedKey: string | null = null;

/** Null unless this build has Stripe AND the server enrolled this user for this drop. Never throws. */
/** True when the last eligibility check failed (network/session), as opposed to "not enrolled". */
export let cardCheckFailed = false;
export async function getCardCheckoutKey(dropId: string, retries = 1): Promise<string | null> {
  cardCheckFailed = false;
  if (!stripeNative) return null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetchCardEligibility(dropId);
      return r.eligible && r.publishableKey ? r.publishableKey : null;
    } catch (e) {
      cardCheckFailed = true;
      console.warn('[cardCheckout] eligibility check failed:', String((e as Error)?.message ?? e).slice(0, 120));
      if (attempt < retries) await new Promise(r => setTimeout(r, 1500));
    }
  }
  return null;
}
function uuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
export async function payAndBookWithCard(args: { publishableKey: string; productId: string; dropId: string; variantId?: string | null; saveCard?: boolean }): Promise<CardCheckoutOutcome> {
  const stripe = stripeNative;
  if (!stripe) return { kind: 'failed', message: 'Pagamento con carta non disponibile su questa versione.' };
  const attemptId = uuidV4();
  try {
    const started = await startCardBooking({ attemptId, productId: args.productId, dropId: args.dropId, variantId: args.variantId, saveCard: args.saveCard });
    if (initializedKey !== args.publishableKey) {
      await stripe.initStripe({ publishableKey: args.publishableKey, urlScheme: 'rdnstreetstockmarket' });
      initializedKey = args.publishableKey;
    }
    const init = await stripe.initPaymentSheet({
      paymentIntentClientSecret: started.clientSecret,
      ...(started.customerId && started.customerSessionClientSecret
        ? { customerId: started.customerId, customerSessionClientSecret: started.customerSessionClientSecret } : {}),
      merchantDisplayName: 'RDN Street Stock Market',
      returnURL: 'rdnstreetstockmarket://stripe-redirect',
      allowsDelayedPaymentMethods: false,
    });
    if (init.error) { await abandonCardAttempt(attemptId); return { kind: 'failed', message: 'Non è stato possibile aprire il pagamento. Riprova.' }; }
    const paid = await stripe.presentPaymentSheet();
    if (paid.error) {
      await abandonCardAttempt(attemptId);
      return paid.error.code === stripe.PaymentSheetError.Canceled
        ? { kind: 'cancelled' }
        : { kind: 'failed', message: 'La banca non ha autorizzato il pagamento. Nessuna prenotazione creata.' };
    }
    // The booking exists only after the server independently verified the authorization.
    const state = await confirmCardBooking(attemptId);
    if (state.state === 'booked' || state.state === 'captured') return { kind: 'booked', bookingId: state.booking_id ?? null };
    return { kind: 'pending' };
  } catch (e) {
    const code = (e as { code?: string })?.code;
    return { kind: 'failed', message: code === 'CARD_TEST_DISABLED' ? 'La carta non è disponibile per questa prenotazione.' : 'Non siamo riusciti a completare la prenotazione con carta. Controlla Le mie prenotazioni prima di riprovare.' };
  }
}
