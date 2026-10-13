
# Guida al Testing dei Pagamenti

Questa guida fornisce istruzioni complete per testare l'intero flusso di ordini (cliente, fornitore, punto di ritiro) utilizzando carte di credito virtuali di test.

## Indice

- [Configurazione Ambiente di Test](#configurazione-ambiente-di-test)
- [Carte di Credito Virtuali Test](#carte-di-credito-virtuali-test)
- [Flusso Completo di Test](#flusso-completo-di-test)
- [Scenari di Test](#scenari-di-test)
- [Risoluzione Problemi](#risoluzione-problemi)

---

## Configurazione Ambiente di Test

### 1. Modalità Test Stripe

L'app è configurata per utilizzare le chiavi di test Stripe. Verifica che nel tuo progetto Supabase siano configurate le seguenti variabili d'ambiente:

```
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### 2. Accesso Admin

Per testare l'intero flusso, avrai bisogno di accedere con diversi ruoli:

- **Admin**: Per approvare drop e gestire ordini
- **Consumer**: Per prenotare prodotti
- **Supplier**: Per visualizzare ordini ricevuti
- **Pickup Point**: Per gestire ritiri

### 3. Dati di Test

Usa la funzione "Crea Dati Test" nella sezione Testing & Diagnostica per generare:
- Un fornitore di test
- 5 prodotti di esempio
- Una lista fornitore configurata

---

## Carte di Credito Virtuali Test

Stripe fornisce carte di test che simulano diversi scenari di pagamento. **IMPORTANTE**: Queste carte funzionano SOLO in modalità test e non addebitano mai denaro reale.

### Carte di Successo

#### Visa - Pagamento Riuscito
```
Numero: 4242 4242 4242 4242
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
```

#### Visa (debit) - Pagamento Riuscito
```
Numero: 4000 0566 5566 5556
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
```

#### Mastercard - Pagamento Riuscito
```
Numero: 5555 5555 5555 4444
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
```

#### Mastercard (2-series) - Pagamento Riuscito
```
Numero: 2223 0031 2200 3222
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
```

#### Mastercard (debit) - Pagamento Riuscito
```
Numero: 5200 8282 8282 8210
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
```

#### American Express - Pagamento Riuscito
```
Numero: 3782 822463 10005
CVC: Qualsiasi 4 cifre
Data: Qualsiasi data futura
```

### Carte per Testare Errori

#### Carta Declinata - Fondi Insufficienti
```
Numero: 4000 0000 0000 9995
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
Risultato: Pagamento declinato (insufficient_funds)
```

#### Carta Declinata - Generica
```
Numero: 4000 0000 0000 0002
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
Risultato: Pagamento declinato (generic_decline)
```

#### Carta Declinata - Carta Rubata
```
Numero: 4000 0000 0000 9979
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
Risultato: Pagamento declinato (stolen_card)
```

#### Carta Declinata - Carta Smarrita
```
Numero: 4000 0000 0000 9987
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
Risultato: Pagamento declinato (lost_card)
```

#### Carta Scaduta
```
Numero: 4000 0000 0000 0069
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
Risultato: Carta scaduta (expired_card)
```

#### CVC Errato
```
Numero: 4000 0000 0000 0127
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
Risultato: CVC non valido (incorrect_cvc)
```

#### Errore di Elaborazione
```
Numero: 4000 0000 0000 0119
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
Risultato: Errore di elaborazione (processing_error)
```

### Carte per Testare 3D Secure

#### 3D Secure - Autenticazione Richiesta
```
Numero: 4000 0027 6000 3184
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
Risultato: Richiede autenticazione 3D Secure
```

#### 3D Secure - Autenticazione Opzionale
```
Numero: 4000 0025 0000 3155
CVC: Qualsiasi 3 cifre
Data: Qualsiasi data futura
Risultato: Autenticazione 3D Secure opzionale
```

---

## Flusso Completo di Test

### Fase 1: Preparazione (Admin)

1. **Accedi come Admin**
   ```
   Email: admin@test.com
   Password: [la tua password admin]
   ```

2. **Crea Dati di Test**
   - Vai su "Testing & Diagnostica"
   - Clicca "Crea Dati Test"
   - Verifica che vengano creati:
     - 1 fornitore
     - 1 lista fornitore
     - 5 prodotti

3. **Verifica Configurazione Lista**
   - Vai su "Fornitori" → Seleziona il fornitore test
   - Verifica i parametri della lista:
     - Sconto minimo: 30%
     - Sconto massimo: 80%
     - Valore minimo: €5.000
     - Valore massimo: €30.000

### Fase 2: Registrazione Interesse (Consumer)

1. **Crea Account Consumer**
   - Registrati come nuovo consumer
   - Seleziona un punto di ritiro (es. Roma)
   - Verifica email e accedi

2. **Aggiungi Metodo di Pagamento**
   - Vai su "Profilo" → "Metodi di Pagamento"
   - Clicca "Aggiungi Carta"
   - Usa una carta di test Visa:
     ```
     Numero: 4242 4242 4242 4242
     CVC: 123
     Scadenza: 12/25
     ```
   - Salva la carta

3. **Esprimi Interesse sui Prodotti**
   - Naviga nel feed principale
   - Scorri i prodotti della lista test
   - Clicca "Vorrò Partecipare al Drop" su almeno 3 prodotti
   - Verifica che il pulsante cambi in "Interessato"

4. **Ripeti con Altri Utenti**
   - Crea 2-3 account consumer aggiuntivi
   - Aggiungi carte di pagamento
   - Esprimi interesse sugli stessi prodotti
   - Obiettivo: Raggiungere €5.000 di valore totale

### Fase 3: Attivazione Drop (Automatica/Admin)

1. **Verifica Creazione Drop**
   - Il drop dovrebbe crearsi automaticamente quando si raggiunge €5.000
   - Vai su "Drops" per vedere il nuovo drop
   - Stato iniziale: "Pending Approval"

2. **Approva Drop (Admin)**
   - Accedi come admin
   - Vai su "Gestione Drop"
   - Trova il drop in "Pending Approval"
   - Clicca "Approva"
   - Verifica che lo stato cambi in "Approved"

3. **Attiva Drop (Admin)**
   - Clicca "Attiva" sul drop approvato
   - Verifica che:
     - Stato cambi in "Active"
     - Timer di 5 giorni inizi
     - Sconto iniziale sia al 30%

### Fase 4: Prenotazione con Carta (Consumer)

1. **Accedi come Consumer**
   - Vai alla tab "Drops"
   - Seleziona il drop attivo

2. **Prenota Prodotto**
   - Scorri i prodotti nel drop
   - Seleziona un prodotto
   - Clicca "Prenota con Carta"
   - Verifica il riepilogo:
     - Prezzo originale
     - Sconto attuale (30%)
     - Importo da bloccare
   - Conferma la prenotazione

3. **Verifica Autorizzazione**
   - Vai su "Le Mie Prenotazioni"
   - Verifica che la prenotazione appaia con:
     - Stato: "Attiva"
     - Pagamento: "Autorizzato"
     - Importo bloccato visibile

4. **Ripeti con Altri Consumer**
   - Accedi con gli altri account consumer
   - Prenota prodotti nel drop
   - Obiettivo: Aumentare il valore totale per far crescere lo sconto

5. **Monitora Crescita Sconto**
   - Osserva lo sconto aumentare in tempo reale
   - Condividi il drop su WhatsApp (opzionale)
   - Verifica che lo sconto cresca verso l'80%

### Fase 5: Chiusura Drop (Admin)

1. **Completa Drop Manualmente**
   - Accedi come admin
   - Vai su "Gestione Drop"
   - Seleziona il drop attivo
   - Clicca "Completa Drop"
   - Conferma l'azione

2. **Verifica Calcolo Finale**
   - Controlla che lo sconto finale sia calcolato
   - Verifica che tutte le prenotazioni siano aggiornate
   - Controlla che l'ordine sia creato per il fornitore

### Fase 6: Cattura Pagamenti (Automatica)

1. **Verifica Cattura Automatica**
   - Dopo la chiusura del drop, i pagamenti vengono catturati automaticamente
   - Vai su "Le Mie Prenotazioni" (consumer)
   - Verifica che:
     - Stato pagamento: "Addebitato"
     - Importo finale sia calcolato con lo sconto finale
     - Risparmio sia mostrato

2. **Controlla Ordine Fornitore**
   - Accedi come fornitore (o admin)
   - Vai su "Ordini"
   - Verifica che l'ordine contenga:
     - Tutti i prodotti prenotati
     - Importi finali corretti
     - Stato: "Pending"

### Fase 7: Gestione Ordine (Supplier)

1. **Accedi come Fornitore**
   - Visualizza l'ordine ricevuto
   - Controlla i dettagli:
     - Prodotti ordinati
     - Quantità
     - Importi
     - Punto di ritiro destinazione

2. **Prepara Ordine**
   - Segna l'ordine come "Confermato"
   - Prepara i prodotti
   - Segna come "In Transito"
   - Inserisci tracking (opzionale)

3. **Spedisci al Punto di Ritiro**
   - Segna come "Spedito"
   - Inserisci data di spedizione prevista

### Fase 8: Gestione Ritiro (Pickup Point)

1. **Accedi come Punto di Ritiro**
   - Vai su "Ordini"
   - Visualizza ordini in arrivo

2. **Ricevi Ordine**
   - Quando l'ordine arriva fisicamente
   - Clicca "Segna come Arrivato"
   - Verifica che i clienti ricevano notifica

3. **Gestisci Ritiri**
   - Visualizza lista clienti da servire
   - Quando un cliente ritira:
     - Verifica identità
     - Consegna prodotto
     - Segna come "Ritirato"
   - Verifica calcolo commissione

### Fase 9: Completamento (Consumer)

1. **Ricevi Notifica**
   - Il consumer riceve notifica che l'ordine è pronto
   - Vai su "Le Mie Prenotazioni"
   - Visualizza dettagli ritiro

2. **Ritira Prodotto**
   - Vai al punto di ritiro
   - Mostra conferma ordine
   - Ritira il prodotto

3. **Verifica Finale**
   - Controlla che lo stato sia "Completato"
   - Verifica l'importo finale addebitato
   - Controlla il risparmio ottenuto

---

## Scenari di Test

### Scenario 1: Pagamento Riuscito (Happy Path)

**Obiettivo**: Testare il flusso completo senza errori

**Carta da usare**: 4242 4242 4242 4242 (Visa)

**Passi**:
1. Registra consumer
2. Aggiungi carta Visa test
3. Esprimi interesse su prodotti
4. Attendi/forza creazione drop
5. Prenota prodotto
6. Verifica autorizzazione riuscita
7. Completa drop
8. Verifica cattura pagamento
9. Completa ritiro

**Risultato Atteso**: Tutto funziona senza errori

### Scenario 2: Carta Declinata - Fondi Insufficienti

**Obiettivo**: Testare gestione errore fondi insufficienti

**Carta da usare**: 4000 0000 0000 9995

**Passi**:
1. Aggiungi questa carta come metodo di pagamento
2. Prova a prenotare un prodotto
3. Verifica messaggio di errore appropriato
4. Verifica che la prenotazione NON sia creata
5. Verifica che il drop NON sia aggiornato

**Risultato Atteso**: Errore chiaro, nessuna prenotazione creata

### Scenario 3: Carta Scaduta

**Obiettivo**: Testare validazione carta scaduta

**Carta da usare**: 4000 0000 0000 0069

**Passi**:
1. Prova ad aggiungere questa carta
2. Verifica che venga rifiutata
3. Verifica messaggio di errore

**Risultato Atteso**: Carta non aggiunta, errore chiaro

### Scenario 4: Drop Sotto-Finanziato

**Obiettivo**: Testare comportamento quando il drop non raggiunge il minimo

**Passi**:
1. Crea drop con poche prenotazioni (< €5.000 valore minimo)
2. Lascia scadere il timer (o forza scadenza)
3. Verifica che:
   - Drop vada in stato "Underfunded"
   - Autorizzazioni vengano cancellate
   - Fondi vengano rilasciati
   - Utenti ricevano notifica

**Risultato Atteso**: Fondi rilasciati, utenti notificati

### Scenario 5: Cancellazione Prenotazione

**Obiettivo**: Testare cancellazione prenotazione da parte dell'utente

**Passi**:
1. Crea prenotazione con carta valida
2. Vai su "Le Mie Prenotazioni"
3. Clicca "Annulla Prenotazione"
4. Conferma cancellazione
5. Verifica che:
   - Autorizzazione venga cancellata
   - Fondi vengano rilasciati
   - Stato cambi in "Cancelled"
   - Valore drop venga decrementato

**Risultato Atteso**: Prenotazione cancellata, fondi rilasciati

### Scenario 6: Rimborso Post-Cattura

**Obiettivo**: Testare rimborso dopo che il pagamento è stato catturato

**Passi**:
1. Completa un ordine fino alla cattura
2. Come admin, vai su "Prenotazioni"
3. Seleziona una prenotazione catturata
4. Clicca "Rimborsa"
5. Conferma rimborso
6. Verifica che:
   - Stato pagamento diventi "Refunded"
   - Utente riceva notifica
   - Importo venga rimborsato

**Risultato Atteso**: Rimborso elaborato correttamente

### Scenario 7: Test con Più Carte

**Obiettivo**: Testare gestione di più metodi di pagamento

**Passi**:
1. Aggiungi 3 carte diverse:
   - Visa: 4242 4242 4242 4242
   - Mastercard: 5555 5555 5555 4444
   - Amex: 3782 822463 10005
2. Imposta Mastercard come predefinita
3. Prenota prodotto (dovrebbe usare Mastercard)
4. Cambia predefinita a Visa
5. Prenota altro prodotto (dovrebbe usare Visa)
6. Rimuovi Amex
7. Verifica che le altre carte rimangano

**Risultato Atteso**: Gestione corretta di più carte

### Scenario 8: Test 3D Secure

**Obiettivo**: Testare autenticazione 3D Secure

**Carta da usare**: 4000 0027 6000 3184

**Passi**:
1. Aggiungi questa carta
2. Prova a prenotare un prodotto
3. Verifica che appaia la schermata 3D Secure
4. Completa l'autenticazione
5. Verifica che la prenotazione sia creata

**Risultato Atteso**: Autenticazione 3D Secure funzionante

---

## Risoluzione Problemi

### Problema: Carta Non Accettata

**Sintomi**: La carta di test viene rifiutata

**Soluzioni**:
1. Verifica di essere in modalità test Stripe
2. Controlla che il numero carta sia corretto
3. Usa una data di scadenza futura
4. Verifica che il CVC sia di 3 cifre (4 per Amex)
5. Controlla i log Stripe nel dashboard

### Problema: Autorizzazione Non Creata

**Sintomi**: La prenotazione non viene creata

**Soluzioni**:
1. Verifica che l'utente abbia un metodo di pagamento
2. Controlla che il drop sia in stato "Active"
3. Verifica che il prodotto sia disponibile
4. Controlla i log dell'app
5. Verifica le policy RLS su Supabase

### Problema: Pagamento Non Catturato

**Sintomi**: Dopo la chiusura del drop, i pagamenti rimangono "Authorized"

**Soluzioni**:
1. Verifica che l'Edge Function `capture-drop-payments` sia deployata
2. Controlla i log dell'Edge Function
3. Verifica che il drop sia in stato "Completed"
4. Controlla le chiavi Stripe nel progetto Supabase
5. Esegui manualmente la cattura da admin

### Problema: Drop Non Si Crea Automaticamente

**Sintomi**: Anche raggiungendo il valore minimo, il drop non si attiva

**Soluzioni**:
1. Verifica che il trigger database sia attivo
2. Controlla che gli interessi siano dello stesso punto di ritiro
3. Verifica che la lista fornitore sia "Active"
4. Controlla i log del database
5. Crea manualmente il drop da admin

### Problema: Notifiche Non Ricevute

**Sintomi**: Gli utenti non ricevono notifiche

**Soluzioni**:
1. Verifica che le notifiche siano abilitate nell'app
2. Controlla che i record siano creati nella tabella `notifications`
3. Verifica le policy RLS sulla tabella notifications
4. Controlla che l'utente abbia l'email verificata
5. Testa con notifiche push (se implementate)

---

## Checklist Testing Completo

### Pre-Test
- [ ] Ambiente di test configurato
- [ ] Chiavi Stripe test configurate
- [ ] Dati di test creati
- [ ] Account di test per tutti i ruoli

### Test Carte di Pagamento
- [ ] Carta Visa successo
- [ ] Carta Mastercard successo
- [ ] Carta Amex successo
- [ ] Carta declinata - fondi insufficienti
- [ ] Carta declinata - generica
- [ ] Carta scaduta
- [ ] CVC errato
- [ ] 3D Secure

### Test Flusso Ordine
- [ ] Registrazione consumer
- [ ] Aggiunta metodo di pagamento
- [ ] Espressione interesse
- [ ] Creazione drop automatica
- [ ] Approvazione drop (admin)
- [ ] Attivazione drop (admin)
- [ ] Prenotazione con carta
- [ ] Autorizzazione pagamento
- [ ] Crescita sconto
- [ ] Chiusura drop
- [ ] Cattura pagamento
- [ ] Creazione ordine fornitore
- [ ] Gestione ordine fornitore
- [ ] Spedizione al punto di ritiro
- [ ] Ricezione al punto di ritiro
- [ ] Notifica cliente
- [ ] Ritiro prodotto
- [ ] Completamento ordine

### Test Scenari Errore
- [ ] Drop sotto-finanziato
- [ ] Cancellazione prenotazione
- [ ] Rimborso
- [ ] Carta declinata durante prenotazione
- [ ] Timeout pagamento
- [ ] Errore di rete

### Test Gestione Carte
- [ ] Aggiunta carta
- [ ] Rimozione carta
- [ ] Cambio carta predefinita
- [ ] Gestione più carte
- [ ] Validazione carta

### Test Notifiche
- [ ] Notifica drop attivato
- [ ] Notifica drop in scadenza
- [ ] Notifica ordine pronto
- [ ] Notifica pagamento catturato
- [ ] Notifica drop sotto-finanziato

### Test Admin
- [ ] Visualizzazione drop
- [ ] Approvazione drop
- [ ] Attivazione drop
- [ ] Completamento drop
- [ ] Visualizzazione ordini
- [ ] Gestione prenotazioni
- [ ] Rimborsi
- [ ] Analytics

### Test Performance
- [ ] Caricamento veloce
- [ ] Scroll fluido
- [ ] Aggiornamenti real-time
- [ ] Gestione errori di rete
- [ ] Caching immagini

---

## Risorse Aggiuntive

### Documentazione Stripe Test Cards
https://stripe.com/docs/testing

### Dashboard Stripe Test
https://dashboard.stripe.com/test/payments

### Supabase Dashboard
https://supabase.com/dashboard/project/sippdylyuzejudmzbwdn

### Log Edge Functions
```bash
supabase functions logs capture-drop-payments --project-ref sippdylyuzejudmzbwdn
```

---

## Note Importanti

1. **Mai usare carte reali in test**: Le carte di test funzionano SOLO in modalità test
2. **Dati di test isolati**: I dati di test non influenzano la produzione
3. **Pulizia regolare**: Elimina periodicamente i dati di test per mantenere il database pulito
4. **Documentazione aggiornamenti**: Documenta eventuali problemi trovati durante i test
5. **Test su dispositivi reali**: Testa sempre su dispositivi fisici, non solo emulatori

---

## Contatti

Per problemi o domande sul testing:
- Controlla i log dell'app
- Verifica la documentazione Stripe
- Consulta la documentazione Supabase
- Usa la sezione "Testing & Diagnostica" nell'app
