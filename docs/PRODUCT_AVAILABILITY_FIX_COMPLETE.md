
# Product Availability Real-Time Update - Complete Fix

## Data: 2025-01-XX

## Problemi Risolti

### 1. **Disponibilità Prodotto Non Aggiornata in Tempo Reale**
**Problema**: La dicitura verde "X disponibili" sulla product card non si aggiornava quando gli utenti prenotavano articoli.

**Causa**: Il componente `ProductCard` mostrava correttamente `product.stock`, ma la subscription real-time nel feed principale non aggiornava correttamente lo stock dei prodotti visibili.

**Soluzione**: 
- Migliorata la logica di real-time subscription in `app/(tabs)/(home)/index.tsx`
- Ora quando un prodotto viene aggiornato con `stock > 0`, viene mantenuto nel feed e il suo stock viene aggiornato
- Solo quando `stock <= 0` il prodotto viene rimosso dal feed

### 2. **Prodotti Spariscono dal Feed Anche con Disponibilità > 0**
**Problema**: Quando un utente prenotava un articolo ed usciva/rientrava nel feed, l'articolo spariva completamente anche se aveva altre quantità disponibili.

**Causa**: La logica di filtraggio nel feed e nella subscription real-time rimuoveva i prodotti in modo errato.

**Soluzione**:
- **Feed Loading**: Ora carica SOLO prodotti con `stock > 0`, ignorando completamente il campo `status`
- **Real-time Updates**: Aggiornata la logica per:
  - Rimuovere prodotti SOLO quando `stock <= 0`
  - Aggiornare lo stock dei prodotti quando `stock > 0`
  - Mantenere i prodotti visibili finché hanno disponibilità

## Modifiche Implementate

### 1. Home Feed (`app/(tabs)/(home)/index.tsx`)

#### Caricamento Prodotti
```typescript
// BEFORE: Filtrava per status = 'active'
.eq('status', 'active')

// AFTER: Filtra SOLO per stock > 0, ignora status
.gt('stock', 0)
```

#### Real-time Subscription
```typescript
// CRITICAL FIX: Solo rimuove se stock <= 0
if (updatedProduct.stock <= 0) {
  console.log('🗑️ Product stock is 0 or less, removing from home feed');
  // Remove from feed
} else {
  console.log('✅ Product stock updated, keeping in feed');
  // Update stock in feed
}
```

### 2. Drop Details (`app/drop-details.tsx`)

La schermata drop-details già aveva la logica corretta:
- Carica prodotti con `stock > 0`
- Real-time subscription aggiorna correttamente lo stock
- Rimuove prodotti solo quando `stock <= 0`

### 3. Database Triggers

I trigger esistenti funzionano correttamente:

#### `manage_product_stock_on_booking`
- Decrementa `stock` di 1 quando viene creata una prenotazione
- Imposta `status = 'sold_out'` quando `stock <= 0`
- Ripristina lo stock quando una prenotazione viene cancellata

#### `notify_product_stock_change`
- Invia notifiche real-time quando lo stock cambia
- Usa `pg_notify` per broadcast delle modifiche

## Flusso Completo

### Scenario: Utente Prenota un Prodotto

1. **Utente clicca "PRENOTA ARTICOLO"**
   - Frontend chiama `handleBook()` in `drop-details.tsx`
   - Crea un record in `bookings` table

2. **Database Trigger si Attiva**
   - `manage_product_stock_on_booking` decrementa `stock` di 1
   - Se `stock` diventa 0, imposta `status = 'sold_out'`
   - `notify_product_stock_change` invia notifica real-time

3. **Real-time Update Ricevuto**
   - **Nel Drop Details**: Aggiorna lo stock del prodotto o lo rimuove se `stock <= 0`
   - **Nel Home Feed**: Aggiorna lo stock del prodotto o lo rimuove se `stock <= 0`

4. **UI Aggiornata**
   - La dicitura verde "X disponibili" mostra il nuovo valore
   - Se `stock = 0`, il prodotto sparisce dal feed
   - Se `stock > 0`, il prodotto rimane visibile con il nuovo stock

### Scenario: Utente Cancella una Prenotazione

1. **Prenotazione Cancellata**
   - Status cambia da `active` a `cancelled`

2. **Database Trigger si Attiva**
   - `manage_product_stock_on_booking` ripristina `stock + 1`
   - Se `status = 'sold_out'` e `stock > 0`, ripristina `status = 'active'`

3. **Real-time Update Ricevuto**
   - Il prodotto riappare nel feed se era stato rimosso
   - Lo stock viene aggiornato

## Vantaggi della Soluzione

### 1. **Accuratezza**
- Lo stock è sempre sincronizzato tra tutti gli utenti
- Nessun overselling possibile (gestito da trigger con `FOR UPDATE` lock)

### 2. **Performance**
- Usa real-time subscriptions invece di polling
- Aggiornamenti istantanei senza refresh manuale

### 3. **User Experience**
- Gli utenti vedono sempre la disponibilità corretta
- Feedback immediato quando un prodotto viene prenotato
- Nessuna confusione su prodotti "fantasma" nel feed

### 4. **Semplicità**
- Logica centralizzata nei database triggers
- Frontend si limita a reagire agli aggiornamenti
- Facile da debuggare con logging estensivo

## Testing

### Test Case 1: Prenotazione Singola
1. Utente A vede prodotto con "5 disponibili"
2. Utente B prenota 1 unità
3. Utente A vede immediatamente "4 disponibili"

### Test Case 2: Ultimo Articolo
1. Prodotto ha "1 disponibile"
2. Utente prenota l'ultimo articolo
3. Prodotto sparisce dal feed per tutti gli utenti

### Test Case 3: Cancellazione Prenotazione
1. Prodotto ha "0 disponibili" (non visibile nel feed)
2. Utente cancella una prenotazione
3. Prodotto riappare con "1 disponibile"

### Test Case 4: Prenotazioni Simultanee
1. Due utenti tentano di prenotare l'ultimo articolo
2. Solo uno riesce (grazie al lock `FOR UPDATE`)
3. L'altro riceve errore "Prodotto esaurito"

## Logging e Debug

### Console Logs Chiave

#### Home Feed
```
📡 Product stock update received in home feed
🗑️ Product stock is 0 or less, removing from home feed
✅ Product stock updated, keeping in feed
```

#### Drop Details
```
📡 Product stock update received
🗑️ Product out of stock, removing from list
✅ Product updated in list
```

#### Database
```
Stock decremented for product X: 5 -> 4
Stock restored for product X due to booking cancellation
```

## Configurazione Real-time

### Supabase Channels
- **Home Feed**: `home_product_stock_updates`
- **Drop Details**: `product_stock_updates_{supplier_list_id}`

### Subscription Filters
```typescript
// Home Feed - ascolta tutti i prodotti
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'products',
})

// Drop Details - ascolta solo prodotti della lista
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'products',
  filter: `supplier_list_id=eq.${listId}`,
})
```

## Considerazioni Future

### Possibili Miglioramenti
1. **Ottimizzazione Performance**: Usare `broadcast` invece di `postgres_changes` per ridurre latenza
2. **Batch Updates**: Raggruppare aggiornamenti multipli per ridurre traffico
3. **Offline Support**: Gestire aggiornamenti quando l'utente è offline
4. **Conflict Resolution**: Gestire conflitti quando l'utente tenta di prenotare un prodotto appena esaurito

### Monitoraggio
- Tracciare frequenza di errori "Prodotto esaurito"
- Monitorare latenza degli aggiornamenti real-time
- Verificare che non ci siano memory leaks nelle subscriptions

## Conclusione

La soluzione implementata risolve definitivamente i problemi di:
1. ✅ Disponibilità prodotto non aggiornata in tempo reale
2. ✅ Prodotti che spariscono dal feed anche con stock > 0

Il sistema ora:
- Mostra sempre la disponibilità corretta
- Rimuove prodotti SOLO quando stock = 0
- Aggiorna in tempo reale per tutti gli utenti
- Previene overselling con database locks
- Fornisce feedback chiaro agli utenti

## File Modificati

1. `app/(tabs)/(home)/index.tsx` - Logica feed principale e real-time subscription
2. `app/drop-details.tsx` - Già corretto, verificato funzionamento
3. `components/ProductCard.tsx` - Già corretto, mostra `product.stock`
4. `components/EnhancedProductCard.tsx` - Già corretto, mostra `product.stock`

## Database Schema

### Tabella `products`
```sql
stock INTEGER NOT NULL DEFAULT 1 CHECK (stock >= 0)
status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out'))
```

### Trigger `manage_product_stock_on_booking`
- Gestisce decremento/ripristino stock
- Aggiorna status automaticamente
- Usa `FOR UPDATE` lock per prevenire race conditions

### Trigger `notify_product_stock_change`
- Invia notifiche real-time via `pg_notify`
- Include tutti i dati necessari per l'aggiornamento UI
