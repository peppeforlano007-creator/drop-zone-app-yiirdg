export function canBookAtPickup(profilePickup: string | null | undefined, dropPickup: string | null | undefined) {
  return Boolean(profilePickup && dropPickup && profilePickup === dropPickup);
}

export function pickupExportStatus(bookingPickup: string | null | undefined, dropPickup: string | null | undefined) {
  if (!bookingPickup) return 'DA VERIFICARE: punto prenotazione mancante';
  if (!dropPickup) return 'DA VERIFICARE: punto drop mancante';
  return bookingPickup === dropPickup ? 'OK' : 'DA VERIFICARE: punto prenotazione diverso dal drop';
}
