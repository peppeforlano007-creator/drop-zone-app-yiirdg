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
export async function startCardBooking(args: { attemptId: string; productId: string; dropId: string; variantId?: string | null; saveCard?: boolean }) {
  const data = await request({ action: 'start', attempt_id: args.attemptId, product_id: args.productId, drop_id: args.dropId, variant_id: args.variantId ?? null,
    // Sent only after the customer explicitly accepted the saved-card text.
    ...(args.saveCard === true ? { save_card: true } : {}) });
  return {
    clientSecret: data.client_secret as string, authorizedCents: data.authorized_cents as number, state: data.state as string,
    customerId: typeof data.customer_id === 'string' ? data.customer_id : undefined,
    customerSessionClientSecret: typeof data.customer_session_client_secret === 'string' ? data.customer_session_client_secret : undefined,
  };
}
export type SavedCard = { brand: string; last4: string } | null;
/** Null when nothing is saved or the feature is not available to this user. Never throws. */
export async function fetchSavedCard(): Promise<SavedCard> {
  try {
    const data = await request({ action: 'saved_card' });
    return data.has_card ? { brand: String(data.brand ?? 'carta'), last4: String(data.last4 ?? '') } : null;
  } catch { return null; }
}
export async function removeSavedCard(): Promise<void> {
  await request({ action: 'remove_saved_card' });
}
export async function confirmCardBooking(attemptId: string): Promise<CardBookingState> {
  return request({ action: 'confirm', attempt_id: attemptId });
}
export async function abandonCardAttempt(attemptId: string): Promise<void> {
  try { await request({ action: 'cancel', attempt_id: attemptId }); } catch { /* The server releases unconfirmed attempts by itself. */ }
}

export type AdminCardRefundRow = {
  attempt_id: string; booking_id: string; product_name: string; customer_name: string; amount_cents: number;
  captured_at: string | null; item_collected: boolean; item_returned: boolean; refund_state: 'none' | 'requested' | 'refunded' | 'review';
};
/** Admin only: the database refuses everyone else. */
export async function listAdminCardRefunds(): Promise<AdminCardRefundRow[]> {
  const { data, error } = await supabase.rpc('admin_list_card_refunds' as never);
  if (error) throw new CardBookingError('ADMIN_REQUIRED');
  return (data ?? []) as AdminCardRefundRow[];
}
export async function refundCardPaymentAsAdmin(attemptId: string, reason: 'RETURNED' | 'OPERATOR_REQUEST'): Promise<void> {
  const { data, error } = await supabase.functions.invoke('refund-booking-card-test', { body: { attempt_id: attemptId, reason } });
  if (error) {
    let code = 'REFUND_NOT_COMPLETED';
    try { const r = await error.context?.json(); if (typeof r?.code === 'string' && /^[A-Z_]{1,80}$/.test(r.code)) code = r.code; } catch { /* keep generic */ }
    throw new CardBookingError(code);
  }
  if (!data?.ok) throw new CardBookingError(typeof data?.code === 'string' ? data.code : 'REFUND_NOT_COMPLETED');
}
