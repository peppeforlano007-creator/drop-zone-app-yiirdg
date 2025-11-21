
# Migrazione Database per Sistema Pagamenti

## 🚨 PROBLEMA RISCONTRATO

Errori durante l'aggiunta di carte di pagamento:
- **Errore PGRST204**: "Could not find the card_brand column of payment_methods in the schema cache"
- **TypeError**: "Network request failed"

## 🔍 CAUSA

La tabella `payment_methods` nel database Supabase non ha tutte le colonne necessarie per salvare i dettagli delle carte di pagamento.

## ✅ SOLUZIONE

### PASSO 1: Accedi al Dashboard Supabase

1. Vai su https://supabase.com/dashboard
2. Seleziona il progetto: **sippdylyuzejudmzbwdn**
3. Nel menu laterale, clicca su **"SQL Editor"**

### PASSO 2: Esegui la Migrazione SQL

Copia e incolla questo SQL completo nell'editor e clicca **"Run"**:

```sql
-- ============================================
-- MIGRAZIONE COMPLETA PAYMENT_METHODS
-- Questa migrazione è idempotente e può essere eseguita più volte
-- ============================================

-- Crea la tabella se non esiste
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL,
  card_last4 TEXT,
  card_brand TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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
    ALTER TABLE payment_methods ADD COLUMN stripe_payment_method_id TEXT NOT NULL DEFAULT '';
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
    ALTER TABLE payment_methods ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
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

-- Pulisci dati invalidi
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

-- Messaggio finale
DO $$ 
BEGIN
  RAISE NOTICE '✅ MIGRAZIONE COMPLETATA CON SUCCESSO!';
  RAISE NOTICE '📊 Verifica lo schema con: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ''payment_methods'';';
END $$;
```

### PASSO 3: Verifica lo Schema

Dopo aver eseguito la migrazione, verifica che tutte le colonne siano state create correttamente:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'payment_methods'
ORDER BY ordinal_position;
```

Dovresti vedere queste colonne:

| Colonna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | - |
| stripe_payment_method_id | text | NO | '' |
| card_last4 | text | YES | - |
| card_brand | text | YES | - |
| card_exp_month | integer | YES | - |
| card_exp_year | integer | YES | - |
| is_default | boolean | YES | false |
| status | text | YES | 'active' |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### PASSO 4: Riavvia il Progetto Supabase

**IMPORTANTE**: Dopo aver applicato la migrazione, devi riavviare il progetto per aggiornare la cache dello schema.

1. Nel dashboard Supabase, vai su **Settings** → **General**
2. Scorri fino alla sezione **"Restart project"**
3. Clicca su **"Restart project"** e conferma
4. Aspetta 2-3 minuti che il progetto si riavvii completamente

### PASSO 5: Testa l'App

1. **Chiudi completamente l'app** (non solo minimizzarla)
2. **Riapri l'app**
3. Vai su **"Metodi di Pagamento"**
4. Clicca su **"Aggiungi Metodo di Pagamento"**
5. Inserisci i dati della carta di test:
   - **Numero Carta**: `4242 4242 4242 4242`
   - **Nome Titolare**: `Mario Rossi` (o qualsiasi nome)
   - **Data Scadenza**: `12/25` (o qualsiasi data futura)
   - **CVC**: `123` (o qualsiasi 3 cifre)
6. Clicca su **"Aggiungi Carta"**

Se tutto funziona correttamente, dovresti vedere:
- ✅ Un messaggio di successo
- ✅ La carta nella lista dei metodi di pagamento
- ✅ Nessun errore nella console

## 🔧 MIGLIORAMENTI AL CODICE

### 1. Controllo Connessione Migliorato

L'app ora verifica:
- ✅ Connessione internet attiva
- ✅ Connessione al server Supabase
- ✅ Schema del database corretto

### 2. Gestione Errori Avanzata

- ✅ Messaggi di errore chiari in italiano
- ✅ Dettagli tecnici per il debugging
- ✅ Suggerimenti per risolvere i problemi
- ✅ Rilevamento automatico errori PGRST204

### 3. Feedback Visivo

- ✅ Indicatore di stato della connessione
- ✅ Pulsante "Riprova" per ricontrollare la connessione
- ✅ Disabilitazione automatica dei campi se non connesso

## 🐛 RISOLUZIONE PROBLEMI

### Errore: "column does not exist"

**Causa**: La migrazione non è stata eseguita o non è andata a buon fine.

**Soluzione**:
1. Esegui nuovamente la migrazione SQL dal Passo 2
2. Verifica che non ci siano errori nell'output
3. Riavvia il progetto Supabase (Passo 4)

### Errore: "PGRST204" persiste

**Causa**: La cache dello schema di Supabase non è stata aggiornata.

**Soluzione**:
1. Riavvia il progetto Supabase (Passo 4)
2. Aspetta 3-5 minuti
3. Riprova ad aggiungere una carta

### Errore: "Network request failed"

**Causa**: Problemi di connessione internet o configurazione Supabase.

**Soluzione**:
1. Verifica la connessione internet del dispositivo
2. Controlla che l'URL Supabase sia corretto: `https://sippdylyuzejudmzbwdn.supabase.co`
3. Verifica che la chiave API sia valida
4. Prova a riavviare l'app

### La carta non viene salvata

**Causa**: Possibili problemi con RLS policies o autenticazione.

**Soluzione**:
1. Verifica che l'utente sia autenticato (controlla i log)
2. Controlla le RLS policies con:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'payment_methods';
   ```
3. Assicurati che Stripe stia restituendo i dettagli della carta

### Carte duplicate

**Causa**: Il vincolo unico non è stato creato.

**Soluzione**:
1. Esegui questa query per verificare:
   ```sql
   SELECT conname FROM pg_constraint WHERE conname = 'unique_user_stripe_payment_method';
   ```
2. Se non esiste, esegui:
   ```sql
   ALTER TABLE payment_methods 
   ADD CONSTRAINT unique_user_stripe_payment_method 
   UNIQUE (user_id, stripe_payment_method_id);
   ```

## 📊 VERIFICA FINALE

Prima di considerare il problema risolto, verifica:

- [ ] La migrazione SQL è stata eseguita senza errori
- [ ] Tutte le colonne sono presenti nella tabella
- [ ] Il progetto Supabase è stato riavviato
- [ ] L'app mostra "Connessione OK" (icona verde)
- [ ] Puoi aggiungere una carta di test (4242 4242 4242 4242)
- [ ] La carta appare nella lista dei metodi di pagamento
- [ ] Puoi impostare una carta come predefinita
- [ ] Puoi rimuovere una carta
- [ ] Non ci sono errori nella console dell'app

## 📞 SUPPORTO

Se dopo aver seguito tutti questi passaggi il problema persiste:

1. **Raccogli i log**:
   - Apri la console dell'app (F12 su browser)
   - Cerca i log che iniziano con "==="
   - Copia tutti i messaggi di errore

2. **Verifica lo schema**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'payment_methods'
   ORDER BY ordinal_position;
   ```

3. **Controlla le policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'payment_methods';
   ```

4. **Contatta il supporto** con:
   - Screenshot degli errori
   - Log della console
   - Risultati delle query sopra

## 🎉 SUCCESSO!

Se tutti i punti della checklist sono verificati, il sistema di pagamento funziona correttamente!

Ora puoi:
- ✅ Aggiungere carte di pagamento
- ✅ Gestire più carte
- ✅ Impostare una carta predefinita
- ✅ Rimuovere carte
- ✅ Effettuare prenotazioni con carta

---

**Data Creazione**: 2024
**Ultima Modifica**: 2024
**Versione**: 2.0
