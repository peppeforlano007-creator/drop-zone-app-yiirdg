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
