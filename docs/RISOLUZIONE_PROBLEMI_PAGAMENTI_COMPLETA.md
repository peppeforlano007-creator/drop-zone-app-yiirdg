
# Risoluzione Completa dei Problemi di Pagamento

## Problema Riscontrato
Errore: "Could not find the card_brand column of payment_methods in the schema cache" e "Database error: code: PGRST204"

## Causa
Il database Supabase non ha tutte le colonne necessarie nella tabella `payment_methods`, oppure la cache dello schema non è aggiornata.

## Soluzione Passo-Passo

### Passo 1: Accedi al Dashboard Supabase
1. Vai su https://supabase.com/dashboard
2. Seleziona il progetto `sippdylyuzejudmzbwdn`
3. Clicca su "SQL Editor" nel menu laterale

### Passo 2: Verifica lo Schema Attuale
Esegui questa query per vedere le colonne attuali:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'payment_methods'
ORDER BY ordinal_position;
```

### Passo 3: Applica la Migrazione del Database
Copia e incolla questo SQL completo nell'editor SQL e clicca "Run":

```sql
-- ============================================
-- MIGRAZIONE COMPLETA PAYMENT_METHODS
-- ============================================

-- Aggiungi card_brand se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_brand'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_brand TEXT;
    RAISE NOTICE '✅ Aggiunta colonna card_brand';
  ELSE
    RAISE NOTICE '⏭️  card_brand già esiste';
  END IF;
END $$;

-- Aggiungi card_last4 se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_last4'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_last4 TEXT;
    RAISE NOTICE '✅ Aggiunta colonna card_last4';
  ELSE
    RAISE NOTICE '⏭️  card_last4 già esiste';
  END IF;
END $$;

-- Aggiungi card_exp_month se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_exp_month'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_exp_month INTEGER;
    RAISE NOTICE '✅ Aggiunta colonna card_exp_month';
  ELSE
    RAISE NOTICE '⏭️  card_exp_month già esiste';
  END IF;
END $$;

-- Aggiungi card_exp_year se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_exp_year'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_exp_year INTEGER;
    RAISE NOTICE '✅ Aggiunta colonna card_exp_year';
  ELSE
    RAISE NOTICE '⏭️  card_exp_year già esiste';
  END IF;
END $$;

-- Aggiungi stripe_payment_method_id se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'stripe_payment_method_id'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN stripe_payment_method_id TEXT;
    RAISE NOTICE '✅ Aggiunta colonna stripe_payment_method_id';
  ELSE
    RAISE NOTICE '⏭️  stripe_payment_method_id già esiste';
  END IF;
END $$;

-- Aggiungi is_default se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN is_default BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Aggiunta colonna is_default';
  ELSE
    RAISE NOTICE '⏭️  is_default già esiste';
  END IF;
END $$;

-- Aggiungi status se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'status'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN status TEXT DEFAULT 'active';
    RAISE NOTICE '✅ Aggiunta colonna status';
  ELSE
    RAISE NOTICE '⏭️  status già esiste';
  END IF;
END $$;

-- Aggiungi user_id se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Aggiunta colonna user_id';
  ELSE
    RAISE NOTICE '⏭️  user_id già esiste';
  END IF;
END $$;

-- Aggiungi created_at se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE '✅ Aggiunta colonna created_at';
  ELSE
    RAISE NOTICE '⏭️  created_at già esiste';
  END IF;
END $$;

-- Aggiungi updated_at se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE '✅ Aggiunta colonna updated_at';
  ELSE
    RAISE NOTICE '⏭️  updated_at già esiste';
  END IF;
END $$;

-- Crea vincolo unico se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_stripe_payment_method'
  ) THEN
    ALTER TABLE payment_methods 
    ADD CONSTRAINT unique_user_stripe_payment_method 
    UNIQUE (user_id, stripe_payment_method_id);
    RAISE NOTICE '✅ Aggiunto vincolo unico';
  ELSE
    RAISE NOTICE '⏭️  Vincolo unico già esiste';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '⚠️  Impossibile aggiungere vincolo unico (potrebbe già esistere)';
END $$;

-- Crea indice su user_id se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_payment_methods_user_id'
  ) THEN
    CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
    RAISE NOTICE '✅ Aggiunto indice user_id';
  ELSE
    RAISE NOTICE '⏭️  Indice user_id già esiste';
  END IF;
END $$;

-- Crea indice su status se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_payment_methods_status'
  ) THEN
    CREATE INDEX idx_payment_methods_status ON payment_methods(status);
    RAISE NOTICE '✅ Aggiunto indice status';
  ELSE
    RAISE NOTICE '⏭️  Indice status già esiste';
  END IF;
END $$;

-- Abilita RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Rimuovi policy esistenti
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can update their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON payment_methods;

-- Crea policy RLS
CREATE POLICY "Users can view their own payment methods" 
ON payment_methods FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" 
ON payment_methods FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" 
ON payment_methods FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" 
ON payment_methods FOR DELETE 
USING (auth.uid() = user_id);

-- Messaggio finale
DO $$ 
BEGIN
  RAISE NOTICE '✅ MIGRAZIONE COMPLETATA CON SUCCESSO!';
END $$;
```

### Passo 4: Pulisci i Dati Invalidi
Dopo aver applicato la migrazione, esegui questa query per pulire eventuali dati invalidi:

```sql
-- Marca come inattivi i metodi di pagamento con dati mancanti
UPDATE payment_methods
SET status = 'inactive'
WHERE 
  stripe_payment_method_id IS NULL 
  OR stripe_payment_method_id = ''
  OR card_last4 IS NULL 
  OR card_last4 = ''
  OR LENGTH(card_last4) < 4
  OR card_brand IS NULL 
  OR card_brand = ''
  OR card_exp_month IS NULL 
  OR card_exp_month < 1 
  OR card_exp_month > 12
  OR card_exp_year IS NULL;

-- Mostra quanti record sono stati aggiornati
SELECT COUNT(*) as metodi_invalidi_disattivati
FROM payment_methods
WHERE status = 'inactive';
```

### Passo 5: Riavvia il Progetto Supabase
1. Vai su Settings → General nel dashboard Supabase
2. Scorri fino a "Restart project"
3. Clicca su "Restart project" e conferma
4. Aspetta 2-3 minuti che il progetto si riavvii

### Passo 6: Testa l'App
1. Chiudi completamente l'app
2. Riapri l'app
3. Vai su "Metodi di Pagamento"
4. Clicca su "Aggiungi Metodo di Pagamento"
5. Inserisci i dati della carta di test:
   - **Numero Carta**: 4242 4242 4242 4242
   - **Nome**: Mario Rossi (o qualsiasi nome)
   - **Scadenza**: 12/25 (o qualsiasi data futura)
   - **CVC**: 123 (o qualsiasi 3 cifre)
6. Clicca su "Aggiungi Carta"

### Passo 7: Verifica i Log
Se l'errore persiste:
1. Apri la console del browser/app (F12 su browser)
2. Guarda i log dettagliati che iniziano con "==="
3. Cerca messaggi di errore specifici
4. Condividi i log con il supporto

## Struttura Finale della Tabella
Dopo la migrazione, la tabella `payment_methods` dovrebbe avere queste colonne:

- ✅ `id` (uuid, primary key)
- ✅ `user_id` (uuid, foreign key → auth.users)
- ✅ `stripe_payment_method_id` (text)
- ✅ `card_last4` (text)
- ✅ `card_brand` (text)
- ✅ `card_exp_month` (integer)
- ✅ `card_exp_year` (integer)
- ✅ `is_default` (boolean)
- ✅ `status` (text)
- ✅ `created_at` (timestamptz)
- ✅ `updated_at` (timestamptz)

## Miglioramenti al Codice

### 1. Logging Dettagliato
Il codice ora include log dettagliati in ogni fase:
- Creazione del metodo di pagamento con Stripe
- Estrazione dei dettagli della carta
- Validazione dei dati
- Inserimento nel database
- Gestione degli errori

### 2. Gestione Errori Migliorata
- Messaggi di errore chiari in italiano
- Dettagli tecnici per il debugging
- Validazione completa dei dati prima dell'inserimento

### 3. Estrazione Dati Robusta
- Supporto per diversi formati di risposta da Stripe
- Fallback multipli per estrarre i dettagli della carta
- Normalizzazione dei dati (last4, date di scadenza)

## Problemi Comuni e Soluzioni

### Errore: "column does not exist"
**Soluzione**: Esegui nuovamente la migrazione SQL dal Passo 3

### Errore: "PGRST204"
**Soluzione**: 
1. Riavvia il progetto Supabase (Passo 5)
2. Aspetta 2-3 minuti
3. Riprova

### La carta non viene salvata
**Soluzione**:
1. Controlla i log della console
2. Verifica che l'utente sia autenticato
3. Assicurati che le policy RLS siano attive
4. Verifica che Stripe stia restituendo i dettagli della carta

### Carte duplicate
**Soluzione**: Il sistema ora previene automaticamente i duplicati tramite:
- Controllo del `stripe_payment_method_id`
- Controllo di `card_last4` + `card_brand`
- Vincolo unico nel database

### Carte invalide visualizzate
**Soluzione**: Esegui la query di pulizia dal Passo 4

## Supporto
Se dopo aver seguito tutti questi passaggi il problema persiste:

1. Raccogli i log dalla console (cerca "===")
2. Fai uno screenshot dell'errore
3. Esegui questa query e condividi il risultato:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'payment_methods';
   ```
4. Contatta il supporto con tutte queste informazioni

## Checklist Finale
Prima di considerare il problema risolto, verifica:

- [ ] La migrazione SQL è stata eseguita senza errori
- [ ] Il progetto Supabase è stato riavviato
- [ ] Puoi aggiungere una carta di test (4242 4242 4242 4242)
- [ ] La carta appare nella lista dei metodi di pagamento
- [ ] Puoi impostare una carta come predefinita
- [ ] Puoi rimuovere una carta
- [ ] Non ci sono errori nella console

Se tutti questi punti sono verificati, il sistema di pagamento funziona correttamente! 🎉
