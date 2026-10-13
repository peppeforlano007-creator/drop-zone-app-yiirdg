
# Fix Rapido: Ordini Vuoti nei Punti di Ritiro

## Problema
Quando accedi come punto di ritiro (es. Andria-street stock) e vai in "Gestisci Ordini", vedi ordini con:
- Cliente: N/A
- Prodotti: nessun prodotto
- Valore ordine: €0.00

## Causa
La chiave segreta di Stripe (`STRIPE_SECRET_KEY`) non è configurata in Supabase, quindi:
1. I pagamenti non vengono catturati realmente
2. Gli ordini non vengono creati correttamente
3. I dati non vengono popolati

## Soluzione Rapida (5 minuti)

### 1. Ottieni la Chiave Stripe
1. Vai su https://dashboard.stripe.com
2. Clicca su **Developers** → **API keys**
3. Assicurati di essere in **Test mode**
4. Copia la **Secret key** (inizia con `sk_test_...`)

### 2. Configura Supabase

Apri il terminale ed esegui questi comandi:

```bash
# 1. Login a Supabase (se non l'hai già fatto)
supabase login

# 2. Link al progetto
supabase link --project-ref sippdylyuzejudmzbwdn

# 3. Configura la chiave Stripe (sostituisci con la tua chiave)
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_actual_key_here

# 4. Rideploy la funzione
supabase functions deploy capture-drop-payments
```

### 3. Verifica

```bash
# Controlla che il secret sia stato impostato
supabase secrets list

# Dovresti vedere STRIPE_SECRET_KEY nella lista
```

### 4. Testa

1. **Crea un nuovo drop** (i vecchi drop non funzioneranno)
2. **Fai una prenotazione** con carta di test:
   - Numero: `4242 4242 4242 4242`
   - Data: qualsiasi futura
   - CVC: qualsiasi 3 cifre
3. **Completa il drop** da admin
4. **Controlla il punto di ritiro** - ora dovresti vedere:
   - ✅ Nome cliente
   - ✅ Prodotti
   - ✅ Valore ordine corretto

## Verifica su Stripe

Vai su https://dashboard.stripe.com/test/payments e dovresti vedere i pagamenti catturati.

## Se Non Funziona

### Problema: "supabase: command not found"

**Installa Supabase CLI:**

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (con Scoop)
scoop install supabase

# Oppure con npm
npm install -g supabase
```

### Problema: "Invalid API Key"

La chiave Stripe è errata. Ricontrolla su https://dashboard.stripe.com/test/apikeys

### Problema: Gli ordini vecchi sono ancora vuoti

Gli ordini creati prima della configurazione rimarranno vuoti. Devi:
1. Creare un nuovo drop
2. Completarlo dopo aver configurato Stripe

## Comandi Utili

```bash
# Visualizza i logs della funzione
supabase functions logs capture-drop-payments

# Visualizza tutti i secrets
supabase secrets list

# Rideploy la funzione (se hai fatto modifiche)
supabase functions deploy capture-drop-payments
```

## Risultato Atteso

Dopo la configurazione, quando completi un drop vedrai:

```
Drop Completato! ✅

📊 Riepilogo:
• Prenotazioni catturate: 5/5
• Pagamenti Stripe: 5
• Totale addebitato: €450.00
• Risparmio totale: €150.00 (25%)
• Ordini creati: 2

✅ Pagamenti reali su Stripe
```

E nel punto di ritiro:

```
Ordine: ORD-1234567890-ABC123
Cliente: Mario Rossi
Telefono: +39 123 456 7890
Prodotti:
• Nike Air Max - Taglia: 42 - Colore: Nero
• Adidas Superstar - Taglia: 41
Valore Ordine: €225.00
```

## Documentazione Completa

Per maggiori dettagli, consulta: `docs/STRIPE_CONFIGURATION_GUIDE.md`
