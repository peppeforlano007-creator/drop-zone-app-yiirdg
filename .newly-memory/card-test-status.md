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
