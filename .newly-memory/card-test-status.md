---
name: card-test-status
description: Stato dei test pagamento con carta (sandbox Stripe test), versione TestFlight e pulizia da fare
metadata:
  type: project
---

Sandbox ricreata 2026-10-30 (punto 7e570000-...01, drop ...04, scope fino a 2026-11-01 08:40 UTC) per account test +393208911937. Punto e drop nascosti agli altri utenti con policy restrittive (hide_card_test_pickup_point, hide_card_test_drop).
TestFlight 2.8.2 (51) mostrava ancora l'alert COD: causa non confermata; in 2.8.3 (53) aggiunti log e un secondo tentativo del controllo idoneità. Da inviare con publish_app.
**Cleanup a fine test:** punto test account -> 0ed22a26-bdb3-493c-9c88-8f437c3c6827; modalità disabled, collect_no_shows false; elimina scope e dati 7e570000-0000-4000-8000-00000000000{1..4} + chat group; rimuovi le due policy; stub funzione card-diag-tmp; altro utente a2e8844d-... ha ancora il punto test (da ripristinare).
Chiavi live solo con OK scritto dell'utente. Attivazione pubblica vietata.
