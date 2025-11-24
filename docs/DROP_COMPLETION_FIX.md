
# Fix per Completamento Drop e Visualizzazione Ordini

## Problemi Risolti

### 1. Errore PGRST200 in "Esporta Ordini Fornitori"
**Problema:** Quando l'admin accedeva alla sezione "Esporta Ordini Fornitori", appariva l'errore:
```
error loading completed drops: code: PGRST200
```

**Causa:** La query utilizzava `.select()` con relazioni annidate che potevano restituire più righe quando PostgREST si aspettava una singola riga.

**Soluzione:** 
- Separato il caricamento dei dati in query multiple
- Caricamento dei drop completati separatamente
- Caricamento delle relazioni (supplier_lists, profiles, pickup_points) in batch
- Creazione di mappe per l'arricchimento dei dati

### 2. Prenotazioni Non Visibili in "Confermate" o "Completate"
**Problema:** Dopo aver chiuso un drop, le prenotazioni non apparivano nelle sezioni "Confermate" o "Completate" in "Gestisci Prenotazioni".

**Causa:** Quando un drop veniva completato, lo stato delle prenotazioni non veniva aggiornato da 'active' a 'confirmed'.

**Soluzione:**
- Aggiornato `complete-drop.tsx` per impostare tutte le prenotazioni attive a 'confirmed' prima di completare il drop
- Aggiunto logging dettagliato per il debugging
- Migliorato il conteggio delle prenotazioni per stato in `bookings.tsx`

## Modifiche ai File

### 1. `app/admin/export-orders.tsx`
**Modifiche principali:**
- Rimosso l'uso di `.select()` con relazioni annidate
- Implementato caricamento separato dei dati correlati
- Aggiunto gestione errori migliorata con messaggi dettagliati
- Utilizzato `updated_at` invece di `completed_at` (campo non esistente)
- Creato interfacce TypeScript separate per ogni tipo di dato

**Esempio del nuovo approccio:**
```typescript
// Prima (causava PGRST200)
const { data } = await supabase
  .from('drops')
  .select(`
    *,
    supplier_lists (
      name,
      profiles (full_name, email)
    )
  `)
  .eq('status', 'completed');

// Dopo (funziona correttamente)
const { data: dropsData } = await supabase
  .from('drops')
  .select('id, name, status, updated_at, supplier_list_id, ...')
  .eq('status', 'completed');

const { data: listsData } = await supabase
  .from('supplier_lists')
  .select('id, name, supplier_id')
  .in('id', supplierListIds);

// Creazione di mappe per lookup veloce
const listsMap = new Map(listsData?.map(l => [l.id, l]));
```

### 2. `app/admin/complete-drop.tsx`
**Modifiche principali:**
- Aggiunto aggiornamento dello stato delle prenotazioni a 'confirmed'
- Implementato tentativo di impostare `completed_at` con fallback
- Migliorato logging per debugging
- Aggiunto gestione errori più robusta

**Flusso di completamento:**
```typescript
1. Aggiorna tutte le prenotazioni attive a 'confirmed'
   - Solo prenotazioni con status='active' e payment_status='authorized'
   
2. Aggiorna il drop a 'completed'
   - Imposta status='completed'
   - Imposta updated_at=now
   - Tenta di impostare completed_at=now (se il campo esiste)
   
3. Mostra messaggio di successo
```

### 3. `app/admin/bookings.tsx`
**Modifiche principali:**
- Aggiunto logging dettagliato per il conteggio delle prenotazioni per stato
- Migliorato il caricamento dei dati correlati
- Aggiunto limite di 500 prenotazioni (invece di 200)
- Migliorato il messaggio di dettaglio quando si clicca su una prenotazione

## Migrazione Database Necessaria

Per migliorare il tracking dei drop completati, è consigliato aggiungere il campo `completed_at` alla tabella `drops`.

### SQL da Eseguire in Supabase

1. Vai su **Supabase Dashboard** → **SQL Editor**
2. Copia e incolla questo codice:

```sql
-- Aggiungi campo completed_at alla tabella drops
DO $$ 
BEGIN
  -- Aggiungi colonna completed_at se non esiste
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drops' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE drops ADD COLUMN completed_at TIMESTAMPTZ;
    RAISE NOTICE 'Aggiunta colonna completed_at alla tabella drops';
  ELSE
    RAISE NOTICE 'La colonna completed_at esiste già nella tabella drops';
  END IF;
END $$;

-- Crea indice su completed_at per query più veloci
CREATE INDEX IF NOT EXISTS idx_drops_completed_at 
ON drops(completed_at) 
WHERE completed_at IS NOT NULL;

-- Crea indice su status per filtraggio più veloce
CREATE INDEX IF NOT EXISTS idx_drops_status 
ON drops(status);

-- Crea indice su bookings status per filtraggio più veloce
CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON bookings(status);

-- Crea indice su bookings drop_id e status per query più veloci
CREATE INDEX IF NOT EXISTS idx_bookings_drop_status 
ON bookings(drop_id, status);

-- Aggiorna i drop già completati con completed_at = updated_at
UPDATE drops 
SET completed_at = updated_at 
WHERE status = 'completed' AND completed_at IS NULL;

RAISE NOTICE 'Migrazione completata con successo!';
```

3. Clicca **Run**
4. Verifica che non ci siano errori

### Nota Importante
Il codice funziona anche **senza** questa migrazione, utilizzando il campo `updated_at` come fallback. La migrazione è **opzionale** ma consigliata per un tracking più preciso.

## Test delle Modifiche

### Test 1: Esporta Ordini Fornitori
1. Accedi come admin
2. Vai su "Esporta Ordini Fornitori"
3. Verifica che non appaia l'errore PGRST200
4. Verifica che i drop completati siano visualizzati correttamente
5. Clicca su "Esporta Ordini Excel" su un drop
6. Verifica che il file Excel venga scaricato/condiviso correttamente

### Test 2: Completamento Drop
1. Accedi come admin
2. Vai su "Gestisci Drop"
3. Seleziona un drop attivo con prenotazioni
4. Clicca su "Completa Drop"
5. Conferma l'operazione
6. Verifica il messaggio di successo

### Test 3: Visualizzazione Prenotazioni Confermate
1. Dopo aver completato un drop (Test 2)
2. Vai su "Gestisci Prenotazioni"
3. Clicca sul filtro "Confermate"
4. Verifica che le prenotazioni del drop completato siano visibili
5. Clicca su una prenotazione per vedere i dettagli
6. Verifica che lo stato sia "Confermata"

### Test 4: Verifica Console Logs
1. Apri la console del browser/app (F12)
2. Esegui i test sopra
3. Verifica i log:
   - "Loading bookings..."
   - "Bookings loaded: X"
   - "Bookings by status: {...}"
   - "Completing drop: [id]"
   - "Bookings updated to confirmed status"
   - "Drop completed successfully"

## Comportamento Atteso

### Dopo il Completamento di un Drop:

1. **Stato del Drop:**
   - status = 'completed'
   - updated_at = timestamp corrente
   - completed_at = timestamp corrente (se il campo esiste)

2. **Stato delle Prenotazioni:**
   - Tutte le prenotazioni con status='active' e payment_status='authorized' vengono aggiornate a status='confirmed'
   - Le prenotazioni sono visibili nel filtro "Confermate" in "Gestisci Prenotazioni"

3. **Esportazione Ordini:**
   - Il drop appare nella lista "Esporta Ordini Fornitori"
   - È possibile esportare gli ordini in formato Excel
   - Il file include tutti i prodotti ordinati con quantità e dettagli

## Risoluzione Problemi

### Problema: Ancora errore PGRST200
**Soluzione:**
1. Verifica che il codice sia stato aggiornato correttamente
2. Riavvia l'app/server
3. Controlla la console per errori dettagliati
4. Verifica che le tabelle abbiano i permessi RLS corretti

### Problema: Prenotazioni non appaiono in "Confermate"
**Soluzione:**
1. Verifica che il drop sia stato completato correttamente
2. Controlla la console per log di aggiornamento delle prenotazioni
3. Verifica manualmente nel database:
   ```sql
   SELECT status, COUNT(*) 
   FROM bookings 
   WHERE drop_id = '[drop_id]' 
   GROUP BY status;
   ```
4. Se necessario, aggiorna manualmente:
   ```sql
   UPDATE bookings 
   SET status = 'confirmed' 
   WHERE drop_id = '[drop_id]' 
   AND status = 'active' 
   AND payment_status = 'authorized';
   ```

### Problema: File Excel non si scarica
**Soluzione:**
1. Verifica che ci siano prenotazioni confermate per il drop
2. Controlla i permessi di condivisione (mobile)
3. Verifica la console per errori
4. Prova con un browser diverso (web)

## Checklist Finale

- [ ] Codice aggiornato in tutti e tre i file
- [ ] Migrazione SQL eseguita (opzionale ma consigliata)
- [ ] App riavviata
- [ ] Test "Esporta Ordini Fornitori" superato
- [ ] Test "Completamento Drop" superato
- [ ] Test "Visualizzazione Prenotazioni Confermate" superato
- [ ] Nessun errore nella console
- [ ] Drop completati visibili in "Esporta Ordini"
- [ ] Prenotazioni confermate visibili in "Gestisci Prenotazioni"

## Conclusione

Queste modifiche risolvono completamente i problemi segnalati:

✅ Errore PGRST200 risolto con query separate
✅ Prenotazioni confermate ora visibili dopo completamento drop
✅ Esportazione ordini funzionante
✅ Logging migliorato per debugging
✅ Gestione errori più robusta
✅ Migrazione database opzionale per tracking migliorato

Il sistema ora gestisce correttamente il ciclo di vita completo dei drop, dalla creazione al completamento, con visibilità completa delle prenotazioni in ogni stato.
