
# Guida Test: Disponibilità Prodotti e Aggiornamenti in Tempo Reale

## Prerequisiti

Prima di iniziare i test, assicurati di avere:
- ✅ Almeno 2 dispositivi o browser diversi (per testare gli aggiornamenti in tempo reale)
- ✅ Un drop attivo con prodotti disponibili
- ✅ Account utente registrato e loggato
- ✅ Connessione internet stabile

## Test 1: Verifica Filtro Prodotti con Stock 0

### Obiettivo
Verificare che i prodotti con stock = 0 non vengano mai mostrati nel feed.

### Passi
1. Apri la schermata "Drop Attivi"
2. Seleziona un drop attivo
3. Scorri il feed dei prodotti
4. **Verifica**: Tutti i prodotti mostrati devono avere stock > 0

### Risultato Atteso
- ✅ Nessun prodotto con stock = 0 è visibile
- ✅ Tutti i prodotti mostrano "X disponibili" con X > 0
- ✅ Nessun overlay "ESAURITO" è visibile

### Come Verificare lo Stock
Guarda la sezione sotto il nome del prodotto:
- 🟢 "5 disponibili" = OK
- 🟢 "1 disponibile" = OK
- 🔴 "Esaurito" = NON DOVREBBE APPARIRE

---

## Test 2: Prenotazione Ultimo Articolo (Singolo Utente)

### Obiettivo
Verificare che quando prenoti l'ultimo articolo disponibile, questo sparisca immediatamente dal feed.

### Preparazione
1. Trova un prodotto con stock = 1 (mostra "1 disponibile")
2. Se non ce ne sono, puoi crearne uno come admin

### Passi
1. Apri il drop con il prodotto
2. Trova il prodotto con "1 disponibile"
3. Clicca "PRENOTA ARTICOLO"
4. Leggi il dialog di conferma
5. Clicca "Prenota Articolo" per confermare
6. **Osserva**: Il prodotto dovrebbe sparire IMMEDIATAMENTE

### Risultato Atteso
- ✅ Il prodotto sparisce dal feed entro 1 secondo
- ✅ Lo sconto del drop si aggiorna
- ✅ Il valore ordinato del drop aumenta
- ✅ Ricevi conferma della prenotazione

### Cosa Osservare
- Tempo di rimozione: < 1 secondo
- Animazione: Il prodotto scorre via
- Indicatore "Live": Deve essere verde
- Nessun errore nella console

---

## Test 3: Prenotazione Simultanea (Due Utenti)

### Obiettivo
Verificare che quando due utenti provano a prenotare lo stesso ultimo articolo, solo uno ci riesce e l'altro riceve un errore chiaro.

### Preparazione
1. Trova un prodotto con stock = 1
2. Apri il drop su due dispositivi/browser diversi
3. Entrambi gli utenti devono essere loggati
4. Entrambi devono vedere lo stesso prodotto

### Passi
1. **Utente A**: Clicca "PRENOTA ARTICOLO"
2. **Utente B**: Clicca "PRENOTA ARTICOLO" (quasi contemporaneamente)
3. **Utente A**: Conferma la prenotazione
4. **Utente B**: Conferma la prenotazione
5. **Osserva**: Cosa succede su entrambi i dispositivi

### Risultato Atteso

**Utente A (primo a confermare)**:
- ✅ Prenotazione creata con successo
- ✅ Prodotto sparisce dal feed
- ✅ Riceve conferma

**Utente B (secondo a confermare)**:
- ✅ Riceve errore: "Prodotto esaurito"
- ✅ Messaggio: "Questo prodotto non è più disponibile. Qualcun altro lo ha appena prenotato."
- ✅ Prodotto sparisce dal feed
- ✅ Può cliccare OK e continuare

### Cosa NON Dovrebbe Succedere
- ❌ Entrambi riescono a prenotare
- ❌ Errore generico "impossibile creare la prenotazione"
- ❌ Errore con codice P0001 senza spiegazione
- ❌ Il prodotto rimane visibile dopo l'errore

---

## Test 4: Aggiornamento in Tempo Reale

### Obiettivo
Verificare che quando un utente prenota un prodotto, tutti gli altri utenti vedano l'aggiornamento in tempo reale.

### Preparazione
1. Apri lo stesso drop su 3 dispositivi/browser diversi
2. Tutti devono vedere lo stesso prodotto con stock > 1

### Passi
1. **Dispositivo 1**: Prenota il prodotto
2. **Dispositivo 2 e 3**: Osserva cosa succede
3. **Verifica**: Lo stock si aggiorna su tutti i dispositivi

### Risultato Atteso
- ✅ Dispositivo 1: Prenotazione confermata
- ✅ Dispositivo 2: Stock aggiornato (es. da "5 disponibili" a "4 disponibili")
- ✅ Dispositivo 3: Stock aggiornato (es. da "5 disponibili" a "4 disponibili")
- ✅ Aggiornamento avviene entro 1-2 secondi
- ✅ Indicatore "Live" è verde su tutti i dispositivi

### Tempo di Aggiornamento
- Ottimo: < 1 secondo
- Buono: 1-2 secondi
- Accettabile: 2-3 secondi
- Problema: > 3 secondi

---

## Test 5: Annullamento Prenotazione

### Obiettivo
Verificare che quando annulli una prenotazione, il prodotto riappare nel feed con lo stock ripristinato.

### Passi
1. Prenota un prodotto (stock diventa 0 se era 1)
2. Vai su "Le Mie Prenotazioni"
3. Trova la prenotazione appena creata
4. Annulla la prenotazione
5. Torna al drop
6. **Verifica**: Il prodotto è riapparso nel feed

### Risultato Atteso
- ✅ Prenotazione annullata con successo
- ✅ Prodotto riappare nel feed
- ✅ Stock ripristinato (es. da 0 a 1)
- ✅ Stato prodotto torna a "active"
- ✅ Altri utenti vedono il prodotto riapparire

### Nota
Questo test verifica che il sistema gestisca correttamente anche i casi di ripristino stock.

---

## Test 6: Ultimo Prodotto del Drop

### Obiettivo
Verificare che quando prenoti l'ultimo prodotto disponibile in un drop, ricevi un alert appropriato.

### Preparazione
1. Trova un drop con pochi prodotti (o crea un drop di test con 2-3 prodotti)
2. Prenota tutti i prodotti tranne uno

### Passi
1. Prenota l'ultimo prodotto disponibile
2. **Osserva**: Cosa succede dopo la conferma

### Risultato Atteso
- ✅ Prodotto prenotato con successo
- ✅ Prodotto sparisce dal feed
- ✅ Appare alert: "Tutti i prodotti esauriti"
- ✅ Messaggio: "Tutti gli articoli di questo drop sono stati prenotati."
- ✅ Pulsante "OK" per tornare indietro
- ✅ Cliccando OK, torni alla lista dei drop

---

## Test 7: Messaggi di Errore

### Obiettivo
Verificare che i messaggi di errore siano chiari e in italiano.

### Scenario A: Prodotto Esaurito
1. Prova a prenotare un prodotto che è appena stato prenotato da qualcun altro
2. **Verifica**: Messaggio di errore chiaro

**Messaggio Atteso**:
```
Titolo: Prodotto esaurito
Messaggio: Questo prodotto non è più disponibile. 
          Qualcun altro lo ha appena prenotato.
```

### Scenario B: Prodotto Non Trovato
1. Prova a prenotare un prodotto che è stato rimosso
2. **Verifica**: Messaggio di errore appropriato

**Messaggio Atteso**:
```
Titolo: Prodotto non trovato
Messaggio: Il prodotto potrebbe essere stato rimosso 
          o non esiste più.
```

### Cosa NON Dovrebbe Apparire
- ❌ "impossibile creare la prenotazione" (generico)
- ❌ "Error: P0001" (codice tecnico)
- ❌ Messaggi in inglese
- ❌ Stack trace o errori tecnici

---

## Test 8: Indicatore Real-time

### Obiettivo
Verificare che l'indicatore "Live" funzioni correttamente.

### Passi
1. Apri un drop
2. Cerca l'indicatore "Live" in alto a destra
3. **Verifica**: È verde e lampeggiante

### Risultato Atteso
- ✅ Indicatore "Live" visibile
- ✅ Colore verde
- ✅ Punto verde lampeggiante
- ✅ Testo "Live" bianco

### Se l'Indicatore Non Appare
1. Controlla la connessione internet
2. Ricarica il drop (pull-to-refresh)
3. Chiudi e riapri l'app
4. Verifica nei log del browser (F12 > Console)

---

## Test 9: Prestazioni

### Obiettivo
Verificare che il sistema sia veloce anche con molti prodotti.

### Passi
1. Apri un drop con molti prodotti (> 100)
2. Scorri il feed velocemente
3. Prenota alcuni prodotti
4. **Osserva**: Tempi di risposta

### Risultato Atteso
- ✅ Caricamento iniziale: < 2 secondi
- ✅ Scroll fluido: 60 FPS
- ✅ Prenotazione: < 1 secondo
- ✅ Aggiornamento real-time: < 2 secondi
- ✅ Nessun lag o freeze

### Metriche di Performance
- Ottimo: Tutto istantaneo
- Buono: Piccoli ritardi (< 1s)
- Accettabile: Ritardi occasionali (1-2s)
- Problema: Lag frequenti (> 2s)

---

## Test 10: Overlay "ESAURITO"

### Obiettivo
Verificare che l'overlay "ESAURITO" appaia correttamente se un prodotto ha stock = 0 (non dovrebbe mai succedere nel feed, ma è una protezione).

### Come Testare
Questo è difficile da testare in produzione perché i prodotti con stock = 0 non dovrebbero apparire. Ma puoi verificare:

1. Se vedi un prodotto con overlay "ESAURITO":
   - ✅ Overlay scuro copre l'immagine
   - ✅ Icona X grande e bianca
   - ✅ Testo "ESAURITO" in grande
   - ✅ Pulsante "PRENOTA ARTICOLO" disabilitato
   - ✅ Testo pulsante: "ARTICOLO ESAURITO - Non più disponibile"

2. Se clicchi sul pulsante:
   - ✅ Niente succede (è disabilitato)
   - ✅ Nessun errore nella console

---

## Checklist Completa

Usa questa checklist per verificare che tutto funzioni:

### Filtro Prodotti
- [ ] Nessun prodotto con stock = 0 nel feed
- [ ] Tutti i prodotti mostrano stock > 0
- [ ] Query del database filtra correttamente

### Prenotazione
- [ ] Prenotazione ultimo articolo funziona
- [ ] Prodotto sparisce immediatamente
- [ ] Sconto e valore drop si aggiornano
- [ ] Conferma prenotazione ricevuta

### Race Condition
- [ ] Solo un utente riesce a prenotare l'ultimo articolo
- [ ] Secondo utente riceve errore chiaro
- [ ] Prodotto sparisce per entrambi

### Real-time
- [ ] Indicatore "Live" è verde
- [ ] Aggiornamenti arrivano entro 2 secondi
- [ ] Tutti i client si aggiornano
- [ ] Nessun ritardo o lag

### Errori
- [ ] Messaggi in italiano
- [ ] Messaggi chiari e descrittivi
- [ ] Nessun codice tecnico visibile
- [ ] Suggerimenti su cosa fare

### Annullamento
- [ ] Annullamento prenotazione funziona
- [ ] Stock ripristinato correttamente
- [ ] Prodotto riappare nel feed
- [ ] Altri utenti vedono il prodotto

### Prestazioni
- [ ] Caricamento veloce (< 2s)
- [ ] Scroll fluido
- [ ] Nessun freeze o crash
- [ ] Memoria stabile

---

## Risoluzione Problemi

### Problema: Prodotti con stock = 0 nel feed
**Soluzione**:
1. Chiudi e riapri l'app
2. Ricarica il drop (pull-to-refresh)
3. Verifica la migrazione del database
4. Controlla i log: `SELECT * FROM products WHERE stock = 0 AND status = 'active'`

### Problema: Aggiornamenti non in tempo reale
**Soluzione**:
1. Verifica indicatore "Live" (deve essere verde)
2. Controlla connessione internet
3. Ricarica il drop
4. Verifica nei log del browser: "Product stock subscription status: SUBSCRIBED"

### Problema: Errori generici
**Soluzione**:
1. Apri console del browser (F12)
2. Cerca errori in rosso
3. Verifica che la migrazione sia applicata
4. Controlla i trigger del database

### Problema: Prestazioni lente
**Soluzione**:
1. Verifica che gli indici siano creati
2. Controlla il numero di prodotti nel drop
3. Riduci il numero di prodotti per test
4. Verifica la connessione internet

---

## Log e Debug

### Console del Browser
Apri la console (F12) e cerca questi messaggi:

**Messaggi Positivi** (✅):
```
Products loaded: 1617 (with stock > 0)
Available products after filter: 1617
Product stock subscription status: SUBSCRIBED
Real-time drop update received
Stock decremented for product
```

**Messaggi di Errore** (❌):
```
Error loading products
Error creating booking
Product stock is 0, removing from list
```

### Database Logs
Controlla i log del database per:
```sql
-- Verifica trigger eseguiti
SELECT * FROM pg_stat_user_functions 
WHERE funcname LIKE '%stock%';

-- Verifica prodotti con stock = 0
SELECT COUNT(*) FROM products 
WHERE stock = 0 AND status = 'active';

-- Verifica prenotazioni recenti
SELECT * FROM bookings 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Conclusione

Se tutti i test passano:
- ✅ Il sistema funziona correttamente
- ✅ I prodotti con stock = 0 non appaiono mai
- ✅ Gli aggiornamenti sono in tempo reale
- ✅ I messaggi di errore sono chiari
- ✅ Le prestazioni sono buone

Se alcuni test falliscono:
- 📝 Annota quali test falliscono
- 📸 Fai screenshot degli errori
- 📋 Copia i log della console
- 📧 Contatta il supporto tecnico

---

**Buon Testing! 🚀**
