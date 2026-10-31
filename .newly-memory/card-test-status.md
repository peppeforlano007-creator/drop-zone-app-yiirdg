---
name: card-test-status
description: Stato test carta/mancati ritiri e pulizia (31/10)
metadata:
  type: project
---

31/10: test carta (autorizzazione, cattura, rilascio) e mancati ritiri (simulato in transazione annullata: resi/punto sbagliato/utente non contano; carta dal 2°, blocco al 5°) completati. Pulizia fatta (migrazione 20261031130000): dati test eliminati, account test su Andria, rollout disabled/false/false, card_diag_events rimossa. Resta la funzione stub card-diag-tmp (inutile, da ignorare).
Regola quantità: ogni prenotazione scala 1 pezzo, nessun limite per utente (titolare, 30/10).
Versione 2.8.11 (iOS build 61, Android 39) pronta, da pubblicare con publish_app. Live Stripe: vedi live-card-rollout-plan; serve OK scritto del titolare.

**31/10 live test finding:** il primo tentativo live è fallito (LIVE_PAYMENTS_DISABLED): controlli `livemode !== false` rimasti nel codice condiviso. Corretto (expectLive dalla chiave), 3 funzioni ridistribuite, tentativi 'review' ripuliti. In attesa del nuovo test da 1,10 € sul drop nascosto; poi pulizia test (vedi live-card-rollout-plan).

**31/10 pomeriggio:** pagamento live OK (booking 900d2dab…, attempt e5a49f08-6a73-4e84-b04c-73af5a06cef1, intent pi_3UWbRN44A7XLMImJ1JgxHy52, utente test 68353694-fb8a-45ec-90db-e0d07658070a = tel 393208911937). Drop test chiuso, incasso live riuscito: 0,99 € catturati (final_cents 99, sconto fedeltà). Da fare: rimborso 0,99 € (io non posso: serve JWT admin → utente da Stripe o pannello admin), poi pulizia test (migrazione sul modello 20261031130000, id 7e570000-0000-4000-8000-00000000000{1..6}, pickup utente → Andria 0ed22a26-bdb3-493c-9c88-8f437c3c6827), poi rollout: l'utente ha chiesto OK a mancati ritiri per tutti (collect_no_shows+enforce), live_open resta false.

**31/10 sera:** utente chiede salvataggio carta + 'rimuovi carta' in Le mie prenotazioni anche in live (oggi disattivati in live: booking-saved-card.ts livemode===false, drop-details salta prompt con pk_live). Rimborso 0,99€ da fare dall'utente poi pulizia+rollout mancati ritiri (vedi sopra).

**31/10 sera FINALE:** rimborso fatto dall'utente, test eliminati (migrazione 20261031150000). Rollout attivo: mode live, live_open false, collect_no_shows true (da 31/10 13:01 UTC), enforce_no_show_card true. Pagamento carta in live solo per chi ha ≥2 mancati ritiri. Salvataggio/rimuovi carta attivati in live (serve nuova versione app: pubblicare 2.8.11 con publish_app). Non attivare live_open senza OK scritto.
