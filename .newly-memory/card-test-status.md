---
name: card-test-status
description: Stato dei test carta (sandbox rimossa, app 2.8.0 build 49 pronta per TestFlight)
metadata:
  type: project
---

Sandbox "TEST – non usare" (punto ritiro TestCity, listino, articolo, drop) creata e poi RIMOSSA il 2026-10-28. Rollout resta `disabled`, nessuno scope, account di prova sul suo punto di ritiro originale.
Simulatore: il flusso carta non parte (probabile modulo Stripe assente), serve build TestFlight.
**Why:** utente ferma e riprende domani.
**How to apply:** per riprendere, ricreare drop/punto di test isolati (id 7e570000-...), scope solo per l'account di prova, test con carte Stripe test, poi ripulire. Versione app portata a 2.8.0 (build 49, versionCode 27), TestFlight non ancora inviato.
