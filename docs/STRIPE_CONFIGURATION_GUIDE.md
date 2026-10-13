
# Guida Configurazione Stripe per Pagamenti Reali

## Problema Attuale

Quando completi un drop, gli ordini vengono visualizzati nei punti di ritiro ma:
- I dati del cliente mostrano "N/A"
- I prodotti mostrano "nessun prodotto"
- Il valore ordine mostra "€0.00"
- Non vedi entrate sulla dashboard di Stripe

Questo accade perché:
1. La chiave segreta di Stripe (`STRIPE_SECRET_KEY`) non è configurata in Supabase
2. I pagamenti vengono solo simulati, non catturati realmente
3. Gli ordini non vengono creati correttamente

## Soluzione: Configurazione Passo-Passo

### Passo 1: Ottieni la Chiave Segreta di Stripe

1. **Accedi alla Dashboard di Stripe**
   - Vai su https://dashboard.stripe.com
   - Accedi con il tuo account Stripe

2. **Ottieni la Chiave di Test**
   - Nel menu laterale, clicca su **Developers** (Sviluppatori)
   - Clicca su **API keys** (Chiavi API)
   - Assicurati di essere in **Test mode** (modalità test) - c'è un toggle in alto a destra
   - Copia la **Secret key** (Chiave segreta) - inizia con `sk_test_...`
   
   ⚠️ **IMPORTANTE**: Non condividere mai questa chiave pubblicamente!

3. **Per Produzione (quando sei pronto)**
   - Passa a **Live mode** (modalità live)
   - Copia la **Secret key** di produzione - inizia con `sk_live_...`

### Passo 2: Installa Supabase CLI

Se non hai già installato Supabase CLI:

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (con Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Oppure con npm
npm install -g supabase
```

### Passo 3: Login a Supabase

```bash
supabase login
```

Questo aprirà il browser per autenticarti.

### Passo 4: Link al Progetto

```bash
supabase link --project-ref sippdylyuzejudmzbwdn
```

### Passo 5: Configura la Chiave Stripe

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_actual_key_here
```

Sostituisci `sk_test_your_actual_key_here` con la tua chiave segreta di Stripe copiata al Passo 1.

**Esempio:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_51Abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### Passo 6: Rideploy la Funzione Edge

```bash
supabase functions deploy capture-drop-payments
```

Questo comando:
- Carica la funzione aggiornata su Supabase
- Applica la nuova configurazione con la chiave Stripe
- Rende la funzione pronta per catturare pagamenti reali

### Passo 7: Verifica la Configurazione

1. **Controlla i Secrets**
   ```bash
   supabase secrets list
   ```
   
   Dovresti vedere `STRIPE_SECRET_KEY` nella lista.

2. **Controlla i Logs della Funzione**
   ```bash
   supabase functions logs capture-drop-payments
   ```

### Passo 8: Testa il Flusso Completo

1. **Crea un Drop di Test**
   - Accedi come admin
   - Crea un nuovo drop con prodotti

2. **Fai una Prenotazione**
   - Accedi come utente normale
   - Prenota un prodotto con carta di test Stripe:
     - Numero: `4242 4242 4242 4242`
     - Data: qualsiasi data futura
     - CVC: qualsiasi 3 cifre
     - CAP: qualsiasi 5 cifre

3. **Completa il Drop**
   - Torna come admin
   - Vai in "Gestisci Drop"
   - Completa il drop
   - Dovresti vedere un messaggio di successo con:
     - ✅ Pagamenti Stripe catturati
     - 📦 Ordini creati
     - 💰 Totale addebitato

4. **Verifica su Stripe**
   - Vai su https://dashboard.stripe.com/test/payments
   - Dovresti vedere i pagamenti catturati

5. **Verifica nel Punto di Ritiro**
   - Accedi come punto di ritiro
   - Vai in "Gestisci Ordini"
   - Dovresti vedere gli ordini con:
     - ✅ Nome cliente
     - ✅ Prodotti
     - ✅ Valore ordine corretto

## Risoluzione Problemi

### Errore: "STRIPE_SECRET_KEY not found"

**Causa**: La chiave non è stata configurata o non è stata applicata alla funzione.

**Soluzione**:
```bash
# Verifica che la chiave sia impostata
supabase secrets list

# Se non c'è, impostala
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key

# Rideploy la funzione
supabase functions deploy capture-drop-payments
```

### Errore: "Invalid API Key"

**Causa**: La chiave Stripe è errata o scaduta.

**Soluzione**:
1. Vai su https://dashboard.stripe.com/test/apikeys
2. Copia una nuova chiave
3. Aggiorna il secret:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_new_key
   supabase functions deploy capture-drop-payments
   ```

### Gli ordini mostrano ancora dati vuoti

**Causa**: Gli ordini sono stati creati prima della configurazione di Stripe.

**Soluzione**:
1. Elimina i drop di test vecchi
2. Crea un nuovo drop dopo aver configurato Stripe
3. Completa il nuovo drop

### I pagamenti non vengono catturati

**Causa**: La funzione Edge non è stata deployata correttamente.

**Soluzione**:
```bash
# Controlla i logs per errori
supabase functions logs capture-drop-payments

# Rideploy la funzione
supabase functions deploy capture-drop-payments

# Testa di nuovo
```

## Passaggio a Produzione

Quando sei pronto per andare in produzione:

1. **Ottieni la Chiave Live di Stripe**
   - Vai su https://dashboard.stripe.com
   - Passa a **Live mode**
   - Copia la **Secret key** (inizia con `sk_live_...`)

2. **Aggiorna il Secret in Produzione**
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_your_production_key
   ```

3. **Rideploy**
   ```bash
   supabase functions deploy capture-drop-payments
   ```

4. **Verifica**
   - Fai un test con una carta reale (o una carta di test in live mode)
   - Controlla che i pagamenti appaiano in https://dashboard.stripe.com/payments

## Comandi Utili

```bash
# Visualizza tutti i secrets
supabase secrets list

# Rimuovi un secret (se necessario)
supabase secrets unset STRIPE_SECRET_KEY

# Visualizza i logs in tempo reale
supabase functions logs capture-drop-payments --follow

# Testa la funzione localmente (opzionale)
supabase functions serve capture-drop-payments
```

## Sicurezza

⚠️ **IMPORTANTE**:
- Non committare mai le chiavi Stripe nel codice
- Non condividere le chiavi in chat o email
- Usa sempre `sk_test_` per test e `sk_live_` per produzione
- Ruota le chiavi regolarmente dalla dashboard di Stripe
- Monitora i logs per attività sospette

## Supporto

Se hai ancora problemi:
1. Controlla i logs: `supabase functions logs capture-drop-payments`
2. Verifica che la chiave sia corretta su Stripe
3. Assicurati che il progetto Supabase sia linkato correttamente
4. Controlla che la funzione sia deployata: `supabase functions list`

## Checklist Finale

- [ ] Chiave Stripe ottenuta da dashboard.stripe.com
- [ ] Supabase CLI installato
- [ ] Login a Supabase effettuato
- [ ] Progetto linkato
- [ ] Secret STRIPE_SECRET_KEY configurato
- [ ] Funzione capture-drop-payments deployata
- [ ] Test completato con successo
- [ ] Ordini visibili nei punti di ritiro con dati corretti
- [ ] Pagamenti visibili su Stripe dashboard

Una volta completata questa checklist, il sistema sarà completamente funzionante! 🎉
