
# Stripe Payment Capture Setup

## Problema Risolto

**Problema 1**: I drop completati mostrano ordini confermati, ma non ci sono entrate sulla dashboard di Stripe in sandbox.

**Problema 2**: Il tasto di logout non è visibile nella dashboard admin.

## Soluzioni Implementate

### 1. Integrazione Stripe Payment Capture

La funzione Edge `capture-drop-payments` è stata aggiornata per catturare effettivamente i pagamenti tramite l'API di Stripe invece di simulare la cattura.

#### Modifiche Apportate

**File**: `supabase/functions/capture-drop-payments/index.ts`

- ✅ Aggiunta importazione Stripe SDK
- ✅ Inizializzazione client Stripe con `STRIPE_SECRET_KEY`
- ✅ Chiamata reale all'API Stripe per catturare i pagamenti
- ✅ Gestione errori Stripe con fallback
- ✅ Logging dettagliato per debugging
- ✅ Supporto modalità simulazione se Stripe non è configurato

#### Come Funziona

1. Quando un drop viene completato, la funzione:
   - Recupera tutti i booking con `payment_status = 'authorized'`
   - Calcola il prezzo finale in base allo sconto raggiunto
   - **Chiama Stripe API** per catturare ogni payment intent
   - Aggiorna il database con lo stato `captured`

2. Per ogni booking:
   ```typescript
   const paymentIntent = await stripe.paymentIntents.capture(
     booking.payment_intent_id,
     {
       amount_to_capture: Math.round(finalPrice * 100), // Importo in centesimi
     }
   );
   ```

3. Se la cattura Stripe fallisce:
   - Il booking viene marcato come `failed`
   - L'errore viene loggato
   - Il processo continua con gli altri booking

### 2. Configurazione Stripe Secret Key

Per abilitare la cattura reale dei pagamenti, devi configurare la chiave segreta di Stripe:

#### Passo 1: Ottieni la Stripe Secret Key

1. Vai su [Stripe Dashboard](https://dashboard.stripe.com/)
2. Assicurati di essere in **modalità Test** (toggle in alto a destra)
3. Vai su **Developers** → **API keys**
4. Copia la **Secret key** (inizia con `sk_test_...`)

#### Passo 2: Configura la Secret Key in Supabase

```bash
# Usando Supabase CLI
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Oppure tramite Dashboard Supabase
# 1. Vai su Project Settings → Edge Functions
# 2. Aggiungi un nuovo secret:
#    Name: STRIPE_SECRET_KEY
#    Value: sk_test_your_secret_key_here
```

#### Passo 3: Rideploy la Edge Function

```bash
supabase functions deploy capture-drop-payments
```

### 3. Verifica Configurazione

La funzione ora logga se Stripe è configurato correttamente:

```
✅ Stripe initialized successfully
```

Oppure:

```
⚠️ STRIPE_SECRET_KEY not found - running in simulation mode
```

### 4. Tasto Logout Admin

**File**: `app/admin/dashboard.tsx`

Aggiunti due pulsanti di logout:

1. **Header Button** (in alto a destra):
   - Icona logout rossa
   - Sempre visibile
   - Conferma prima di uscire

2. **Bottom Button** (in fondo alla lista):
   - Pulsante completo con testo "Esci"
   - Più visibile per gli utenti
   - Stesso comportamento di conferma

#### Codice Aggiunto

```typescript
// Header button
headerRight: () => (
  <Pressable onPress={handleLogout}>
    <IconSymbol
      ios_icon_name="rectangle.portrait.and.arrow.right"
      android_material_icon_name="logout"
      size={24}
      color={colors.error}
    />
  </Pressable>
)

// Bottom button
<Pressable onPress={handleLogout}>
  <IconSymbol
    ios_icon_name="rectangle.portrait.and.arrow.right"
    android_material_icon_name="logout"
    size={20}
    color={colors.error}
  />
  <Text>Esci</Text>
</Pressable>
```

## Testing

### Test Payment Capture

1. Crea un drop di test
2. Fai alcune prenotazioni con carte di test Stripe
3. Completa il drop
4. Verifica su Stripe Dashboard:
   - Vai su **Payments** → **All payments**
   - Dovresti vedere i payment intents catturati
   - Importo catturato = prezzo finale con sconto

### Test Logout Admin

1. Accedi come admin
2. Vai su Admin Dashboard
3. Verifica che il pulsante logout sia visibile:
   - In alto a destra nell'header
   - In fondo alla lista dei menu
4. Clicca sul logout
5. Conferma l'azione
6. Verifica di essere reindirizzato alla schermata di login

## Modalità Simulazione

Se `STRIPE_SECRET_KEY` non è configurato, la funzione continua a funzionare in modalità simulazione:

- ✅ I booking vengono aggiornati nel database
- ✅ Lo stato diventa `captured`
- ⚠️ Nessuna chiamata reale a Stripe
- ⚠️ Nessuna entrata sulla dashboard Stripe

Questo è utile per:
- Testing locale
- Sviluppo senza accesso a Stripe
- Demo senza processare pagamenti reali

## Logging e Debugging

La funzione logga informazioni dettagliate:

```
🎯 Starting payment capture for drop: [dropId]
📊 Drop "[name]" - Final discount: [X]%
📦 Found [N] bookings to capture
💳 Booking [id]: {...}
🔄 Capturing Stripe payment intent: [payment_intent_id]
✅ Stripe payment captured successfully: {...}
📊 CAPTURE SUMMARY:
   ✅ Succeeded: [N]
   💳 Stripe Captured: [N]
   ❌ Failed: [N]
   💰 Total Authorized: €[X]
   💳 Total Charged: €[X]
   🎉 Total Savings: €[X]
```

Per vedere i log:

```bash
# Supabase CLI
supabase functions logs capture-drop-payments

# Oppure tramite Dashboard Supabase
# Project → Edge Functions → capture-drop-payments → Logs
```

## Troubleshooting

### Problema: Nessuna entrata su Stripe

**Causa**: `STRIPE_SECRET_KEY` non configurato

**Soluzione**: Segui i passi in "Configurazione Stripe Secret Key"

### Problema: Errore "Invalid API Key"

**Causa**: Chiave Stripe non valida o scaduta

**Soluzione**:
1. Verifica di usare la chiave corretta (test vs live)
2. Rigenera la chiave su Stripe Dashboard
3. Aggiorna il secret in Supabase

### Problema: Payment Intent non trovato

**Causa**: `payment_intent_id` mancante nel booking

**Soluzione**:
1. Verifica che il flusso di prenotazione salvi il `payment_intent_id`
2. Controlla il file `app/(tabs)/(home)/index.tsx` nella funzione di prenotazione
3. Assicurati che Stripe sia inizializzato correttamente nell'app

### Problema: Logout non funziona

**Causa**: Errore nel AuthContext

**Soluzione**:
1. Controlla i log della console
2. Verifica che `useAuth()` sia disponibile
3. Controlla che il router funzioni correttamente

## Prossimi Passi

1. ✅ Configurare `STRIPE_SECRET_KEY` in Supabase
2. ✅ Testare la cattura dei pagamenti
3. ✅ Verificare le entrate su Stripe Dashboard
4. ✅ Testare il logout admin
5. 📝 Implementare webhook Stripe per notifiche automatiche
6. 📝 Aggiungere gestione rimborsi
7. 📝 Implementare report dettagliati dei pagamenti

## Note Importanti

- ⚠️ **Mai** committare la `STRIPE_SECRET_KEY` nel codice
- ⚠️ Usa sempre chiavi di test (`sk_test_...`) in sviluppo
- ⚠️ Passa a chiavi live (`sk_live_...`) solo in produzione
- ✅ La funzione gestisce automaticamente la conversione euro → centesimi
- ✅ Gli errori Stripe non bloccano l'intero processo
- ✅ Ogni booking viene processato indipendentemente

## Riferimenti

- [Stripe API - Capture Payment Intent](https://stripe.com/docs/api/payment_intents/capture)
- [Supabase Edge Functions - Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
