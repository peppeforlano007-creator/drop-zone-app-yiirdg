---
name: card-test-status
description: Stato test carta sandbox e build TestFlight corrente
metadata:
  type: project
---

Sandbox carta ricreata 30/10 (prodotto test stock 2, drop/pickup test ...0001-0004). Versione corrente 2.8.7 (build 57, Android 35), TestFlight da autorizzare dal pannello.
Regola quantità (decisa dal titolare 30/10): ogni prenotazione scala 1 pezzo; qualsiasi utente può prenotare più pezzi dello stesso articolo fino a esaurimento scorte. Migrazione DB 20261030170000 già applicata in produzione (indice unico e guard BOOKING_DUPLICATE rimossi).
**Why:** il titolare non conosceva il vincolo "un pezzo a testa" preesistente.
**How to apply:** non reintrodurre limiti per utente. Cleanup a fine test: ripristino punto ritiro account test (Andria 0ed22a26-...), rollout disabled, elimina dati test, drop tabella card_diag_events e relativo insert in booking-card-test.

2026-10-30 sera: drop di prova chiuso (end_time anticipato su drop+attempts). 2 carte catturate a 48,15 EUR (100 -46,5% -10% fedeltà), differenza rilasciata. Restano: carta rifiutata, 3DS, mancati ritiri, poi pulizia. App 2.8.9 (59/37) caricata su TestFlight.
