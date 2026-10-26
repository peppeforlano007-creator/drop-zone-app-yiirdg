import { supabase } from '@/app/integrations/supabase/client';
import type { CardBookingState } from '@/utils/bookingCardPayment';

export class CardBookingError extends Error {
  constructor(public code: string) { super(code); }
}
async function request(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('booking-card-test', { body });
  if (error) {
    let code = 'CARD_STEP_NOT_COMPLETED';
    // Supabase keeps non-2xx response bodies on the error context. Read only the
    // bounded code; never log or persist payment responses/client secrets.
    try {
      const result = await error.context?.json();
      if (typeof result?.code === 'string' && /^[A-Z_]{1,80}$/.test(result.code)) code = result.code;
    } catch { /* Ambiguous response: refresh status, never claim cancellation. */ }
    throw new CardBookingError(code);
  }
  if (!data?.ok) throw new CardBookingError(typeof data?.code === 'string' ? data.code : 'CARD_STEP_NOT_COMPLETED');
  return data;
}
export async function loadCardBookingStates(bookingIds: string[]): Promise<Record<string, CardBookingState>> {
  const result: Record<string, CardBookingState> = {};
  // Private status is requested only when a real card booking is present. Public
  // COD customers make no extra request and retain their existing flow.
  for (let offset = 0; offset < bookingIds.length; offset += 50) {
    const data = await request({ action: 'statuses', booking_ids: bookingIds.slice(offset, offset + 50) });
    for (const state of data.statuses ?? []) {
      if (state.booking_id && bookingIds.includes(state.booking_id)) result[state.booking_id] = state;
    }
  }
  return result;
}
export async function cancelCardBooking(bookingId: string): Promise<CardBookingState> {
  return request({ action: 'cancel', booking_id: bookingId });
}

export async function fetchCardEligibility(dropId: string): Promise<{ eligible: boolean; publishableKey?: string }> {
  const data = await request({ action: 'eligible', drop_id: dropId });
  return data.eligible ? { eligible: true, publishableKey: data.publishable_key } : { eligible: false };
}
export async function startCardBooking(args: { attemptId: string; productId: string; dropId: string; variantId?: string | null }) {
  const data = await request({ action: 'start', attempt_id: args.attemptId, product_id: args.productId, drop_id: args.dropId, variant_id: args.variantId ?? null });
  return { clientSecret: data.client_secret as string, authorizedCents: data.authorized_cents as number, state: data.state as string };
}
export async function confirmCardBooking(attemptId: string): Promise<CardBookingState> {
  return request({ action: 'confirm', attempt_id: attemptId });
}
export async function abandonCardAttempt(attemptId: string): Promise<void> {
  try { await request({ action: 'cancel', attempt_id: attemptId }); } catch { /* The server releases unconfirmed attempts by itself. */ }
}
