import React, { useMemo } from 'react';
import { Redirect } from 'expo-router';
import MyBookingsScreen, { type BookingCardPreview, type Booking } from './my-bookings';
import type { CardBookingState } from '@/utils/bookingCardPayment';

// Development-only visual fixture. No authentication, Stripe call, database
// mutation, checkout, captured-payment refund, or simulated bank success.
function PreviewContent() {
  const preview = useMemo<BookingCardPreview>(() => {
    const end = new Date(Date.now() + 86400000).toISOString();
    const base: Booking = {
      id: 'preview-authorized', product_id: 'preview-product', drop_id: 'preview-open-drop', pickup_point_id: 'preview-pickup',
      original_price: 100, authorized_amount: 80, discount_percentage: 20, final_price: 80, loyalty_discount: 0,
      payment_method: 'card', payment_status: 'authorized', status: 'active', created_at: new Date().toISOString(),
      products: { name: 'Felpa · anteprima carta', image_url: '' },
      drops: { name: 'Drop aperto · anteprima', current_discount: 20, current_value: 80, end_time: end, status: 'active',
        supplier_lists: { name: 'Anteprima', max_discount: 40, min_discount: 20, min_reservation_value: 0, max_reservation_value: 1000 } },
      pickup_points: { name: 'Punto di ritiro · anteprima', address: 'Dati sintetici', city: 'Nessun ordine reale' }, order_items: [],
    };
    const state: CardBookingState = {
      ok: true, test_mode: true, attempt_id: 'preview-attempt', booking_id: base.id, state: 'booked', authorized_cents: 8000,
      final_cents: null, paid: false, release_pending: false, customer_cancelled: false, can_cancel: true,
    };
    const paid: Booking = {
      ...base, id: 'preview-paid', drop_id: 'preview-closed-drop', payment_status: 'captured', status: 'confirmed',
      final_price: 60, discount_percentage: 40, products: { name: 'Sneakers · anteprima già pagato', image_url: '' },
      drops: { ...base.drops!, name: 'Drop chiuso · anteprima', status: 'completed', current_discount: 40, final_discount_percentage: 40 },
    };
    const cod: Booking = { ...base, id: 'preview-cod', payment_method: 'cod', payment_status: 'pending', original_price: 24.375,
      final_price: 19.5, authorized_amount: 19.5, products: { name: 'T-shirt · anteprima pagamento al ritiro', image_url: '' } };
    return { bookings: [base, cod, paid], states: {
      [base.id]: state,
      [paid.id]: { ...state, booking_id: paid.id, attempt_id: 'preview-paid-attempt', state: 'captured', paid: true, final_cents: 6000, can_cancel: false },
    } };
  }, []);
  return <MyBookingsScreen preview={preview} />;
}
export default function BookingCardPreviewScreen() {
  if (!__DEV__) return <Redirect href="/login" />;
  return <PreviewContent />;
}
