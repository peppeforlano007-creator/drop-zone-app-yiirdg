
# Fix: Drop Interest RLS Error (Error 42501)

## 🐛 Problema Identificato

Quando gli utenti cliccavano su "VORRÒ PARTECIPARE AL DROP" su più articoli, ricevevano un errore:

```
Errore impossibile gestire l'interesse: new row violates row-level security policy for table "drops"
Exception handling interest: code 42501
```

### Causa del Problema

1. **Trigger Automatico**: Quando un utente esprime interesse per un prodotto, viene inserita una riga nella tabella `user_interests`
2. **Creazione Automatica Drop**: Un trigger (`trigger_check_drop_creation`) esegue la funzione `check_and_create_drop()` che:
   - Calcola il valore totale degli interessi per una lista fornitore e punto di ritiro
   - Se il valore supera la soglia minima, crea automaticamente un drop
3. **Violazione RLS**: La funzione tentava di inserire nella tabella `drops`, ma le policy RLS permettevano INSERT solo agli admin
4. **Errore 42501**: PostgreSQL bloccava l'operazione con un errore di sicurezza

## ✅ Soluzione Implementata

### Modifica della Funzione

La funzione `check_and_create_drop()` è stata modificata per utilizzare `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION check_and_create_drop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Permette di bypassare le policy RLS
SET search_path = public
AS $$
-- ... codice della funzione ...
$$;
```

### Cosa Fa `SECURITY DEFINER`

- **Esecuzione con Privilegi Elevati**: La funzione viene eseguita con i privilegi del proprietario (tipicamente il superuser o admin del database)
- **Bypass RLS**: Le policy Row Level Security vengono bypassate durante l'esecuzione della funzione
- **Sicurezza Mantenuta**: I drop vengono comunque creati con stato `pending_approval`, richiedendo l'approvazione dell'admin

### Flusso Corretto

1. **Utente Esprime Interesse**
   ```
   User clicks "VORRÒ PARTECIPARE AL DROP"
   ↓
   INSERT INTO user_interests (user_id, product_id, supplier_list_id, pickup_point_id)
   ```

2. **Trigger Automatico**
   ```
   trigger_check_drop_creation fires
   ↓
   check_and_create_drop() executes with SECURITY DEFINER
   ```

3. **Verifica Soglia**
   ```
   Calculate total interest value for (supplier_list_id, pickup_point_id)
   ↓
   IF total_value >= min_reservation_value THEN create drop
   ```

4. **Creazione Drop (se soglia raggiunta)**
   ```
   INSERT INTO drops (
     status = 'pending_approval',  -- Richiede approvazione admin
     current_discount = min_discount,
     target_value = max_reservation_value,
     ...
   )
   ```

## 🔒 Sicurezza

### Perché È Sicuro Usare SECURITY DEFINER

1. **Drop in Pending**: I drop creati automaticamente hanno stato `pending_approval`
2. **Approvazione Admin**: Un admin deve approvare il drop prima che diventi attivo
3. **Logica Validata**: La funzione contiene controlli per evitare duplicati e validare i dati
4. **Audit Trail**: Tutte le operazioni sono tracciate nel database

### Policy RLS Mantenute

Le policy RLS sulla tabella `drops` rimangono invariate:

- **SELECT**: Utenti possono vedere solo drop attivi del loro punto di ritiro
- **INSERT**: Solo admin possono inserire manualmente (la funzione bypassa questa policy)
- **UPDATE/DELETE**: Solo admin possono modificare/eliminare

## 📊 Testing

### Test Manuale

1. **Login come Utente Consumer**
   ```
   Email: consumer@test.com
   Password: test123
   ```

2. **Esprimi Interesse su Più Prodotti**
   - Vai al feed principale
   - Clicca "VORRÒ PARTECIPARE AL DROP" su 2-3 prodotti della stessa lista
   - Verifica che non ci siano errori

3. **Verifica Creazione Drop**
   ```sql
   SELECT * FROM drops 
   WHERE status = 'pending_approval' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

4. **Approva Drop (come Admin)**
   - Vai a Dashboard Admin → Gestisci Drop
   - Trova il drop in "Pending Approval"
   - Clicca "Approva"

### Test Automatico

```sql
-- Simula interesse utente
INSERT INTO user_interests (user_id, product_id, supplier_list_id, pickup_point_id)
VALUES (
  'user-uuid',
  'product-uuid',
  'list-uuid',
  'pickup-point-uuid'
);

-- Verifica che non ci siano errori
-- Verifica che il drop sia stato creato se la soglia è raggiunta
SELECT * FROM drops WHERE status = 'pending_approval';
```

## 🎯 Risultato

✅ **Problema Risolto**: Gli utenti possono ora esprimere interesse su più prodotti senza errori

✅ **Sicurezza Mantenuta**: I drop richiedono ancora l'approvazione dell'admin

✅ **Funzionalità Preservata**: Il sistema di creazione automatica dei drop funziona correttamente

## 📝 Note Tecniche

### Funzioni con SECURITY DEFINER

Quando si usa `SECURITY DEFINER`, è importante:

1. **Validare Input**: La funzione deve validare tutti gli input per evitare SQL injection
2. **Limitare Operazioni**: Eseguire solo le operazioni strettamente necessarie
3. **Set search_path**: Specificare `SET search_path = public` per evitare schema hijacking
4. **Documentare**: Spiegare chiaramente perché è necessario SECURITY DEFINER

### Alternative Considerate

1. ❌ **Modificare RLS Policy**: Permettere a tutti di inserire in `drops` → Troppo permissivo
2. ❌ **Rimuovere Trigger**: Creare drop manualmente → Perde automazione
3. ✅ **SECURITY DEFINER**: Mantiene sicurezza e automazione

## 🔄 Migrazioni Applicate

- **Migration**: `fix_drop_creation_rls_error`
- **Data**: 2024
- **Tabelle Modificate**: Nessuna (solo funzione)
- **Funzioni Modificate**: `check_and_create_drop()`
- **Trigger Ricreati**: `trigger_check_drop_creation`

## 📚 Riferimenti

- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Trigger Functions](https://www.postgresql.org/docs/current/plpgsql-trigger.html)
