
# Fix per Errore Prenotazione (P0001) e Campo Stock Obbligatorio

## Problemi Risolti

### 1. Errore P0001 durante la Prenotazione

**Problema:**
Quando un utente cliccava su "PRENOTA ARTICOLO" nel feed del drop, riceveva un errore:
- Notifica: "Impossibile creare la prenotazione"
- Errore in console: "error creating booking: code: P0001"

**Causa:**
Il trigger `manage_product_stock_on_booking()` sollevava un'eccezione con codice P0001 quando:
- Il prodotto non esisteva nel database
- Il prodotto era esaurito (stock = 0)

Il messaggio di errore originale era tecnico e non user-friendly:
```sql
RAISE EXCEPTION 'Product not found: %', NEW.product_id;
RAISE EXCEPTION 'Product out of stock. Current stock: %', v_current_stock;
```

**Soluzione:**
Ho migliorato il trigger per fornire messaggi di errore più chiari e user-friendly:

```sql
-- Se il prodotto non esiste
RAISE EXCEPTION 'Prodotto non trovato. Impossibile completare la prenotazione.'
  USING ERRCODE = 'P0001',
        HINT = 'Il prodotto potrebbe essere stato rimosso o non esiste più.';

-- Se il prodotto è esaurito
RAISE EXCEPTION 'Prodotto "%" esaurito. Qualcun altro lo ha appena prenotato.', v_product_name
  USING ERRCODE = 'P0001',
        HINT = 'Prova a prenotare un altro prodotto disponibile.';
```

Ora l'utente riceve messaggi chiari che spiegano cosa è successo e cosa può fare.

### 2. Campo Stock Non Obbligatorio nell'Import Excel

**Problema:**
Durante l'import di una lista fornitore tramite file Excel, il campo `stock` era opzionale (con default a 1), mentre il campo `prezzo` era obbligatorio. Questo causava:
- Prodotti importati senza stock specificato
- Possibili problemi di gestione inventario
- Inconsistenze nei dati

**Soluzione:**
Ho reso il campo `stock` obbligatorio come il campo `prezzo`:

#### Modifiche al Database:
```sql
-- Imposta valore di default
ALTER TABLE products 
ALTER COLUMN stock SET DEFAULT 1;

-- Aggiorna valori NULL esistenti
UPDATE products 
SET stock = 1 
WHERE stock IS NULL;

-- Aggiungi constraint NOT NULL
ALTER TABLE products 
ALTER COLUMN stock SET NOT NULL;

-- Aggiungi check constraint
ALTER TABLE products 
ADD CONSTRAINT products_stock_check CHECK (stock >= 0);
```

#### Modifiche alla Validazione Excel:
```typescript
// Prima (opzionale):
const stock = parseInt(row.stock || '1');

// Dopo (obbligatorio):
if (!row.nome || !row.immagine_url || !row.prezzo || !row.stock) {
  const missingFields = [];
  if (!row.nome) missingFields.push('nome');
  if (!row.immagine_url) missingFields.push('immagine_url');
  if (!row.prezzo) missingFields.push('prezzo');
  if (!row.stock) missingFields.push('stock');
  errors.push(`Riga ${rowNum}: Campi obbligatori mancanti (${missingFields.join(', ')})`);
  return;
}

const stock = parseInt(row.stock);
if (isNaN(stock) || stock < 1) {
  errors.push(`Riga ${rowNum}: Stock non valido (deve essere almeno 1)`);
  return;
}
```

#### Aggiornamento Documentazione:
- **ExcelFormatGuide.tsx**: Il campo `stock` è ora evidenziato come obbligatorio con un badge arancione
- **create-list.tsx**: Il messaggio di aiuto ora mostra `stock` tra i campi obbligatori

## File Modificati

### 1. Migration Database
- **File**: `app/integrations/supabase/migrations/fix_booking_errors_and_stock_validation.sql`
- **Modifiche**:
  - Migliorati i messaggi di errore nel trigger `manage_product_stock_on_booking()`
  - Aggiunto constraint NOT NULL al campo `stock`
  - Aggiunto check constraint per garantire stock >= 0
  - Creati indici per migliorare le performance

### 2. Componente Guida Excel
- **File**: `components/ExcelFormatGuide.tsx`
- **Modifiche**:
  - Campo `stock` spostato nella sezione "Colonne Obbligatorie"
  - Aggiunto badge arancione per evidenziare l'obbligatorietà
  - Aggiornati gli esempi per mostrare il campo stock
  - Aggiunto suggerimento nei tips

### 3. Schermata Creazione Lista
- **File**: `app/admin/create-list.tsx`
- **Modifiche**:
  - Validazione Excel aggiornata per richiedere il campo `stock`
  - Messaggio di errore più dettagliato che elenca i campi mancanti
  - Validazione che stock sia almeno 1
  - Aggiornato il testo di aiuto

## Comportamento Atteso

### Prenotazione Prodotto
1. **Prodotto Disponibile**: La prenotazione viene creata con successo e lo stock viene decrementato
2. **Prodotto Esaurito**: L'utente riceve il messaggio "Prodotto esaurito. Qualcun altro lo ha appena prenotato."
3. **Prodotto Non Trovato**: L'utente riceve il messaggio "Prodotto non trovato. Impossibile completare la prenotazione."

### Import Excel
1. **File Valido**: Tutti i prodotti con i campi obbligatori (nome, immagine_url, prezzo, stock) vengono importati
2. **Campo Stock Mancante**: L'import fallisce con errore specifico che indica la riga e il campo mancante
3. **Stock Invalido**: L'import fallisce se stock < 1

## Test Consigliati

### Test Prenotazione
1. Prova a prenotare un prodotto con stock > 0 → Dovrebbe funzionare
2. Prova a prenotare un prodotto con stock = 0 → Dovrebbe mostrare "Prodotto esaurito"
3. Prova a prenotare un prodotto che non esiste → Dovrebbe mostrare "Prodotto non trovato"

### Test Import Excel
1. Importa un file con tutti i campi obbligatori → Dovrebbe funzionare
2. Importa un file senza il campo stock → Dovrebbe fallire con errore chiaro
3. Importa un file con stock = 0 → Dovrebbe fallire con errore "Stock non valido (deve essere almeno 1)"
4. Importa un file con stock negativo → Dovrebbe fallire con errore "Stock non valido (deve essere almeno 1)"

## Note Tecniche

### Gestione Stock
- Lo stock viene decrementato automaticamente quando viene creata una prenotazione (trigger BEFORE INSERT)
- Lo stock viene ripristinato quando una prenotazione viene cancellata (trigger BEFORE UPDATE/DELETE)
- Il trigger usa `FOR UPDATE` per bloccare la riga del prodotto e prevenire race conditions
- Gli aggiornamenti dello stock vengono propagati in tempo reale tramite Supabase Realtime

### Performance
- Creati indici per migliorare le query:
  - `idx_products_stock`: Per trovare prodotti con stock basso
  - `idx_products_supplier_list_stock`: Per query combinate su lista fornitore e stock

### Sicurezza
- Il constraint `products_stock_check` garantisce che lo stock non possa mai essere negativo
- Il constraint NOT NULL garantisce che lo stock sia sempre definito
- I messaggi di errore non espongono informazioni sensibili del database

## Migrazione Dati Esistenti

La migrazione ha automaticamente:
1. Impostato stock = 1 per tutti i prodotti con stock NULL
2. Aggiunto il constraint NOT NULL
3. Aggiunto il check constraint per stock >= 0

Non sono richieste azioni manuali per i dati esistenti.
