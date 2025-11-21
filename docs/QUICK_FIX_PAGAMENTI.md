
# 🚀 Guida Rapida: Risoluzione Errore Pagamenti

## ⚠️ Problema
Errore quando aggiungi una carta: "Could not find the card_brand column"

## ✅ Soluzione in 3 Passi

### Passo 1: Apri Supabase Dashboard
1. Vai su https://supabase.com/dashboard
2. Seleziona il progetto
3. Clicca su **SQL Editor**

### Passo 2: Esegui Questa Query
Copia e incolla questo codice nell'editor SQL e clicca **Run**:

```sql
-- Aggiungi tutte le colonne necessarie
DO $$ 
BEGIN
  -- card_brand
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'card_brand') THEN
    ALTER TABLE payment_methods ADD COLUMN card_brand TEXT;
  END IF;
  
  -- card_last4
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'card_last4') THEN
    ALTER TABLE payment_methods ADD COLUMN card_last4 TEXT;
  END IF;
  
  -- card_exp_month
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'card_exp_month') THEN
    ALTER TABLE payment_methods ADD COLUMN card_exp_month INTEGER;
  END IF;
  
  -- card_exp_year
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'card_exp_year') THEN
    ALTER TABLE payment_methods ADD COLUMN card_exp_year INTEGER;
  END IF;
  
  -- stripe_payment_method_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'stripe_payment_method_id') THEN
    ALTER TABLE payment_methods ADD COLUMN stripe_payment_method_id TEXT;
  END IF;
  
  -- is_default
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'is_default') THEN
    ALTER TABLE payment_methods ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;
  
  -- status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'status') THEN
    ALTER TABLE payment_methods ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
  
  -- user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'user_id') THEN
    ALTER TABLE payment_methods ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Abilita RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy RLS
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can update their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON payment_methods;

CREATE POLICY "Users can view their own payment methods" ON payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own payment methods" ON payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own payment methods" ON payment_methods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own payment methods" ON payment_methods FOR DELETE USING (auth.uid() = user_id);
```

### Passo 3: Riavvia il Progetto
1. Vai su **Settings** → **General**
2. Scorri fino a "Restart project"
3. Clicca **Restart project**
4. Aspetta 2-3 minuti

## 🧪 Testa l'App

1. Chiudi e riapri l'app
2. Vai su "Metodi di Pagamento"
3. Clicca "Aggiungi Metodo di Pagamento"
4. Inserisci:
   - **Numero**: 4242 4242 4242 4242
   - **Nome**: Mario Rossi
   - **Scadenza**: 12/25
   - **CVC**: 123
5. Clicca "Aggiungi Carta"

## ✅ Dovrebbe Funzionare!

Se vedi la carta nella lista, il problema è risolto! 🎉

## ❌ Ancora Problemi?

1. Controlla la console del browser (F12)
2. Cerca errori che iniziano con "==="
3. Leggi la guida completa: `RISOLUZIONE_PROBLEMI_PAGAMENTI_COMPLETA.md`

## 📝 Cosa È Stato Fatto

### Codice Migliorato
- ✅ Logging dettagliato per debugging
- ✅ Gestione errori migliorata
- ✅ Validazione completa dei dati
- ✅ Messaggi di errore chiari

### Database Aggiornato
- ✅ Tutte le colonne necessarie aggiunte
- ✅ Policy RLS configurate
- ✅ Indici per performance
- ✅ Vincoli per prevenire duplicati

### Documentazione
- ✅ Guida rapida (questo file)
- ✅ Guida completa in italiano
- ✅ Documentazione tecnica in inglese

## 🎯 Checklist Finale

- [ ] Query SQL eseguita senza errori
- [ ] Progetto Supabase riavviato
- [ ] App chiusa e riaperta
- [ ] Carta di test aggiunta con successo
- [ ] Carta visibile nella lista
- [ ] Nessun errore nella console

Se tutti i punti sono verificati, sei a posto! 🚀
