---
name: card-test-status
description: Stato test carta/mancati ritiri e pulizia (31/10)
metadata:
  type: project
---

31/10: test carta (autorizzazione, cattura, rilascio) e mancati ritiri (simulato in transazione annullata: resi/punto sbagliato/utente non contano; carta dal 2°, blocco al 5°) completati. Pulizia fatta (migrazione 20261031130000): dati test eliminati, account test su Andria, rollout disabled/false/false, card_diag_events rimossa. Resta la funzione stub card-diag-tmp (inutile, da ignorare).
Regola quantità: ogni prenotazione scala 1 pezzo, nessun limite per utente (titolare, 30/10).
Versione 2.8.11 (iOS build 61, Android 39) pronta, da pubblicare con publish_app. Live Stripe: vedi live-card-rollout-plan; serve OK scritto del titolare.
