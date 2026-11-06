---
name: card-test-status
description: Test carta/mancati ritiri completati e ripuliti (05/11); rollout invariato
metadata:
  node_type: memory
  type: project
  originSessionId: ecf8f11c-2f9c-47aa-8486-887a7b85b8f5
  modified: 2026-11-05T09:29:00.483Z
---

Tutti i test carta (live 1,10 €, test finale 3h del 02/11) e mancati ritiri sono andati a buon fine. Pulizia finale fatta il 05/11 (migrazione 20261105100000): punto ritiro test, drop/lista/prodotto test (id 7e570000-…), tentativi carta di test, carta salvata dell'utente test 68353694-fb8a-45ec-90db-e0d07658070a (Forlano Giuseppe), policy hide_card_test_* rimosse. Il suo punto ritiro attuale è Matera (59e85f25-…), lasciato così.

Rollout invariato: mode live, live_open false, collect_no_shows true, enforce_no_show_card true. Non attivare live_open senza OK scritto del titolare.

Il pagamento catturato 0,99 € del test 02/11 (intent pi_3UXJ6s44A7XLMImJ0A4LI7w1) va rimborsato dal titolare su Stripe se non già fatto (nel database non c'è più traccia).

05/11: ripristinato reso sbagliato Cosori di Annalisa Senatore (80 punti restituiti, migrazione 20261104100000). Versione 2.8.13 (iOS 64, Android 42).

06/11: notifiche attivazione drop Megastore (287305cc, 95e14213) rimandate ai clienti mancanti (migrazione 20261106100000, push via pg_net). Limite 1000 righe corretto in manage-drops.tsx e drops.tsx: serve nuova versione 2.8.14 (non ancora pubblicata).
