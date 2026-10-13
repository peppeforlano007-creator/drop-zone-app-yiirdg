
# Guida Test: Applicazione Sconto Finale Uniforme

## Scenario di Test Completo

### Prerequisiti
- Accesso come Admin
- Un fornitore con una lista prodotti configurata
- Un punto di ritiro attivo
- Almeno 3 utenti consumer

### Passo 1: Configurazione Lista Fornitore

1. Vai su **Admin → Fornitori**
2. Seleziona un fornitore
3. Crea/Modifica una lista con:
   - **Sconto minimo:** 30%
   - **Sconto massimo:** 80%
   - **Valore minimo:** €500
   - **Valore massimo:** €3.000

### Passo 2: Creazione Drop

1. Vai su **Admin → Gestisci Drop**
2. Crea un nuovo drop manualmente
3. Seleziona:
   - Lista fornitore configurata
   - Punto di ritiro
   - Durata: 5 giorni (o meno per test rapidi)

### Passo 3: Simulazione Prenotazioni

Effettua prenotazioni in momenti diversi per simulare sconti variabili:

**Prenotazione 1 (Valore basso - Sconto basso)**
- Utente: Consumer 1
- Prodotto: €100
- Valore totale drop: €100
- Sconto atteso: ~30% (vicino al minimo)

**Prenotazione 2 (Valore medio - Sconto medio)**
- Utente: Consumer 2
- Prodotto: €150
- Valore totale drop: €250
- Sconto atteso: ~35-40%

**Prenotazione 3 (Valore alto - Sconto alto)**
- Utente: Consumer 3
- Prodotto: €200
- Valore totale drop: €450
- Sconto atteso: ~45-50%

### Passo 4: Verifica Prenotazioni Prima del Completamento

1. Vai su **Admin → Gestisci Prenotazioni**
2. Verifica che le prenotazioni abbiano sconti DIVERSI:

```sql
SELECT 
  id,
  discount_percentage,
  original_price,
  final_price,
  status
FROM bookings
WHERE drop_id = 'TUO_DROP_ID'
ORDER BY created_at;
```

**Risultato atteso:**
```
Booking 1: discount_percentage = 30.00
Booking 2: discount_percentage = 37.50
Booking 3: discount_percentage = 45.00
```

### Passo 5: Completamento Drop

1. Vai su **Admin → Gestisci Drop**
2. Seleziona il drop di test
3. Clicca **"Completa Drop"**
4. Leggi attentamente il messaggio di conferma
5. Conferma il completamento

### Passo 6: Verifica Sconto Finale Applicato

Dopo il completamento, verifica che TUTTE le prenotazioni abbiano lo stesso sconto:

```sql
SELECT 
  b.id,
  b.discount_percentage as booking_discount,
  b.original_price,
  b.final_price,
  b.status,
  d.current_discount as drop_final_discount
FROM bookings b
JOIN drops d ON b.drop_id = d.id
WHERE b.drop_id = 'TUO_DROP_ID'
ORDER BY b.created_at;
```

**Risultato atteso:**
```
Booking 1: discount_percentage = 45.00 (aggiornato!)
Booking 2: discount_percentage = 45.00 (aggiornato!)
Booking 3: discount_percentage = 45.00 (uguale!)
Drop: current_discount = 45.00
```

### Passo 7: Verifica Notifiche Utenti

1. Accedi come **Consumer 1**
2. Vai su **Notifiche**
3. Verifica la notifica di completamento drop
4. Controlla che contenga:
   - ✅ Sconto finale (es. 45%)
   - ✅ Lista prodotti prenotati
   - ✅ Prezzo originale di ogni prodotto
   - ✅ Prezzo finale di ogni prodotto
   - ✅ Risparmio per ogni prodotto
   - ✅ **IMPORTO TOTALE DA PAGARE** (evidenziato)

5. Ripeti per **Consumer 2** e **Consumer 3**
6. Verifica che tutti abbiano ricevuto lo stesso sconto finale

### Passo 8: Verifica Ordini Creati

1. Vai su **Admin → Gestisci Drop**
2. Visualizza i dettagli del drop completato
3. Verifica che siano stati creati gli ordini
4. Controlla che tutti gli order_items abbiano:
   - ✅ Stesso `discount_percentage`
   - ✅ `final_price` calcolato correttamente

```sql
SELECT 
  oi.id,
  oi.product_name,
  oi.original_price,
  oi.discount_percentage,
  oi.final_price,
  oi.user_id,
  o.order_number
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.drop_id = 'TUO_DROP_ID';
```

### Passo 9: Verifica Punto di Ritiro

1. Accedi come **Pickup Point**
2. Vai su **Ordini**
3. Verifica che l'ordine sia visibile
4. Controlla che tutti gli articoli abbiano:
   - ✅ Prezzo finale corretto
   - ✅ Stesso sconto applicato

## Calcolo Manuale dello Sconto Finale

Per verificare manualmente il calcolo:

```
Valore Minimo = €500 (sconto 30%)
Valore Massimo = €3.000 (sconto 80%)
Valore Raggiunto = €450

Formula:
Se Valore ≤ Minimo → Sconto Minimo (30%)
Se Valore ≥ Massimo → Sconto Massimo (80%)
Altrimenti:
  Range Valore = 3000 - 500 = 2500
  Range Sconto = 80 - 30 = 50
  Progresso = (450 - 500) / 2500 = -0.02 (negativo!)
  Sconto = 30 + (-0.02 * 50) = 30% (minimo)

In questo caso: Valore €450 < Minimo €500
Quindi: Sconto Finale = 30%
```

## Checklist Completa

### ✅ Prima del Completamento
- [ ] Drop creato con lista fornitore configurata
- [ ] Almeno 3 prenotazioni effettuate
- [ ] Prenotazioni hanno sconti DIVERSI
- [ ] Valore totale drop calcolato correttamente

### ✅ Durante il Completamento
- [ ] Messaggio di conferma mostra informazioni corrette
- [ ] Nessun errore durante il processo
- [ ] Funzione Edge eseguita con successo

### ✅ Dopo il Completamento
- [ ] Tutte le prenotazioni hanno lo STESSO sconto
- [ ] Prezzi finali ricalcolati correttamente
- [ ] Drop status = 'completed'
- [ ] Drop current_discount aggiornato
- [ ] Notifiche inviate a tutti gli utenti
- [ ] Notifiche contengono importo esatto da pagare
- [ ] Ordini creati per fornitori
- [ ] Order items hanno sconto uniforme
- [ ] Punto di ritiro vede gli ordini

## Test Edge Cases

### Caso 1: Nessuna Prenotazione
1. Crea un drop
2. NON effettuare prenotazioni
3. Completa il drop
4. **Risultato atteso:** Drop completato senza errori

### Caso 2: Una Sola Prenotazione
1. Crea un drop
2. Effettua UNA prenotazione
3. Completa il drop
4. **Risultato atteso:** Sconto finale applicato correttamente

### Caso 3: Valore Sotto il Minimo
1. Crea un drop (min €500)
2. Prenota per €100
3. Completa il drop
4. **Risultato atteso:** Sconto minimo (30%) applicato

### Caso 4: Valore Sopra il Massimo
1. Crea un drop (max €3.000)
2. Prenota per €5.000
3. Completa il drop
4. **Risultato atteso:** Sconto massimo (80%) applicato

## Query SQL Utili

### Verifica Stato Drop
```sql
SELECT 
  id,
  name,
  status,
  current_discount,
  current_value,
  completed_at
FROM drops
WHERE id = 'TUO_DROP_ID';
```

### Verifica Prenotazioni
```sql
SELECT 
  id,
  user_id,
  discount_percentage,
  original_price,
  final_price,
  status,
  payment_status
FROM bookings
WHERE drop_id = 'TUO_DROP_ID'
ORDER BY created_at;
```

### Verifica Notifiche
```sql
SELECT 
  user_id,
  title,
  message,
  type,
  created_at
FROM notifications
WHERE related_id = 'TUO_DROP_ID'
  AND type = 'drop_completed'
ORDER BY created_at;
```

### Verifica Ordini
```sql
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.total_value,
  COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.drop_id = 'TUO_DROP_ID'
GROUP BY o.id;
```

## Risoluzione Problemi

### Problema: Sconti ancora diversi dopo completamento
**Soluzione:**
1. Verifica i log della funzione Edge
2. Controlla che la funzione sia stata deployata correttamente
3. Verifica che non ci siano errori di aggiornamento database

### Problema: Notifiche non inviate
**Soluzione:**
1. Verifica la tabella `notifications`
2. Controlla i log per errori di inserimento
3. Verifica che gli user_id siano corretti

### Problema: Ordini non creati
**Soluzione:**
1. Verifica che le prenotazioni abbiano `supplier_id`
2. Controlla i log per errori di creazione ordini
3. Verifica le foreign key constraints

## Log da Monitorare

Durante il test, monitora i log della funzione Edge:

```
🎯 FINAL DISCOUNT TO APPLY: XX.XX%
📦 Found X bookings to confirm
🔄 Applying uniform final discount...
✅ Successfully confirmed booking...
📧 Notifications sent: X
📦 Orders created: X
```

Se vedi errori (❌), investiga immediatamente.

## Conclusione

Se tutti i test passano:
- ✅ Sistema funziona correttamente
- ✅ Sconto finale applicato uniformemente
- ✅ Utenti notificati con importi esatti
- ✅ Ordini creati correttamente

Il sistema è pronto per la produzione! 🎉
