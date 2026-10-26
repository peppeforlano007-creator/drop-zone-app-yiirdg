/** Display only: financial authority stays in the authenticated server API. */
export type CardBookingState = {
  ok: true;
  test_mode: true;
  attempt_id: string;
  booking_id: string | null;
  state: 'creating' | 'awaiting_authorization' | 'booked' | 'release_pending' | 'capture_pending' | 'captured' | 'released' | 'review';
  authorized_cents: number;
  final_cents: number | null;
  paid: boolean;
  release_pending: boolean;
  customer_cancelled: boolean;
  can_cancel: boolean;
  retry_required?: boolean;
};
export type BookingPayment = { payment_method?: string | null; payment_status?: string | null; final_price?: number | string | null };
export function isCardPayment(payment: BookingPayment): boolean { return payment.payment_method === 'card'; }
export function dueAtPickup(payment: BookingPayment): number {
  // Card holds are not cash due either. They need settlement verification, not
  // another collection at pickup. COD behavior remains the existing price.
  if (isCardPayment(payment)) return 0;
  const price = Number(payment.final_price ?? 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}
export function cardPaymentPresentation(payment: BookingPayment, state?: CardBookingState) {
  if (payment.payment_status === 'refunded') return {
    title: 'Rimborsato sulla carta', detail: 'Nessun importo da pagare al ritiro.', tone: 'neutral' as const,
  };
  if (state?.state === 'review') return {
    title: 'Pagamento da verificare', detail: 'Non effettuare un secondo pagamento. Contatta l’assistenza.', tone: 'warning' as const,
  };
  if (state?.release_pending) return {
    title: 'Rilascio in corso',
    detail: state.customer_cancelled
      ? 'Annullamento richiesto. Attendiamo la conferma di Stripe prima di considerare sbloccato l’importo. Non devi ripetere la richiesta.'
      : 'È in corso lo sblocco dell’importo autorizzato. Non è ancora confermato.',
    tone: 'warning' as const,
  };
  if (state?.state === 'released' && !state.paid) return {
    title: 'Sblocco confermato', detail: 'Nessun addebito. La disponibilità effettiva dipende dai tempi della banca.', tone: 'success' as const,
  };
  if (payment.payment_status === 'captured' || state?.paid) return {
    title: 'Già pagato con carta', detail: 'Nulla da pagare al ritiro. Non pagare una seconda volta.', tone: 'success' as const,
  };
  if (state?.state === 'capture_pending') return {
    title: 'Addebito in verifica', detail: 'Il pagamento è in corso di verifica. Non pagare in contanti.', tone: 'warning' as const,
  };
  if (payment.payment_status === 'authorized' || state?.state === 'booked') return {
    title: 'Importo autorizzato, non addebitato',
    detail: 'L’importo è temporaneamente bloccato. L’addebito avverrà alla chiusura del drop, al prezzo finale e mai oltre l’importo autorizzato.',
    tone: 'neutral' as const,
  };
  return { title: 'Stato carta da verificare', detail: 'Aggiorna la schermata prima di effettuare altri pagamenti.', tone: 'warning' as const };
}
export function cardCancellationError(code?: string): string {
  switch (code) {
    case 'CANCELLATION_DEADLINE_PASSED': return 'Il drop è terminato o è già stato chiuso. Non è più possibile annullare da questa schermata.';
    case 'SETTLEMENT_ALREADY_STARTED': return 'L’incasso è già iniziato. Non è possibile usare l’annullamento per sbloccare un pagamento già avviato. Contatta l’assistenza.';
    case 'CANCELLATION_UNAVAILABLE': return 'Il pagamento richiede una verifica. Non ripetere il pagamento e contatta l’assistenza.';
    case 'ATTEMPT_NOT_FOUND': return 'Non è stato possibile verificare il pagamento di questa prenotazione. Aggiorna la schermata o contatta l’assistenza.';
    case 'SIGN_IN_REQUIRED': return 'Accedi di nuovo per gestire la prenotazione.';
    default: return 'Non è stato possibile verificare l’esito della richiesta. Aggiorna le prenotazioni: potrebbe essere già stata ricevuta. Non effettuare un altro pagamento.';
  }
}
