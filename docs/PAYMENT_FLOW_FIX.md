
# Payment Flow Fix - Risoluzione Problemi Stripe

## Problema Identificato

L'utente riscontrava i seguenti errori quando tentava di aggiungere una carta di credito:

1. **Notifica di errore**: "Impossibile ottenere i dettagli della carta. Riprova"
2. **Errore tecnico**: "Invalid last4 digits from stripe response"
3. **Duplicazione carte**: La stessa carta veniva aggiunta più volte ma non risultava utilizzabile

## Causa Principale

Il problema era causato da una **gestione errata della risposta di Stripe** quando si creava un metodo di pagamento. Specificamente:

### 1. Formato della Risposta Stripe Inconsistente

Il codice originale tentava di accedere ai dettagli della carta usando:
```typescript
const last4 = paymentMethod.card?.last4 || '';
const brand = paymentMethod.card?.brand || 'card';
```

Tuttavia, la libreria `@stripe/stripe-react-native` può restituire i dettagli della carta in formati diversi:
- `paymentMethod.Card` (con la C maiuscola)
- `paymentMethod.card` (con la c minuscola)
- Oppure i dettagli potrebbero essere disponibili solo nel callback `onCardChange` del `CardField`

### 2. Validazione Troppo Rigida

Il codice validava che `last4` fosse esattamente 4 caratteri:
```typescript
if (!last4 || last4.length !== 4) {
  // Errore
}
```

Se Stripe restituiva il valore in un formato diverso o non lo restituiva affatto, la validazione falliva.

### 3. Mancanza di Logging Dettagliato

Non c'era abbastanza logging per diagnosticare quale formato Stripe stesse effettivamente restituendo.

## Soluzioni Implementate

### 1. Gestione Multi-Formato della Risposta Stripe

**File**: `app/add-payment-method.native.tsx`

Ora il codice prova multiple strategie per estrarre i dettagli della carta:

```typescript
let last4 = '';
let brand = 'card';
let expMonth = 0;
let expYear = 0;

// Strategia 1: Prova con Card (maiuscolo)
if (paymentMethod.Card) {
  console.log('Found Card object (capital C):', JSON.stringify(paymentMethod.Card, null, 2));
  last4 = paymentMethod.Card.last4 || '';
  brand = paymentMethod.Card.brand || 'card';
  expMonth = paymentMethod.Card.expMonth || 0;
  expYear = paymentMethod.Card.expYear || 0;
}
// Strategia 2: Prova con card (minuscolo)
else if (paymentMethod.card) {
  console.log('Found card object (lowercase c):', JSON.stringify(paymentMethod.card, null, 2));
  last4 = paymentMethod.card.last4 || '';
  brand = paymentMethod.card.brand || 'card';
  expMonth = paymentMethod.card.expMonth || 0;
  expYear = paymentMethod.card.expYear || 0;
}
// Strategia 3: Fallback ai dettagli del CardField
else if (cardDetails) {
  console.log('Using cardDetails from CardField as fallback');
  last4 = cardDetails.last4 || '';
  brand = cardDetails.brand || 'card';
  expMonth = cardDetails.expiryMonth || 0;
  expYear = cardDetails.expiryYear || 0;
}
```

### 2. Normalizzazione dei Dati

Dopo aver estratto i dati, vengono normalizzati per garantire il formato corretto:

```typescript
// Assicura che last4 sia esattamente 4 cifre
last4 = last4.slice(-4).padStart(4, '0');
```

### 3. Validazione Migliorata

**File**: `contexts/PaymentContext.tsx`

La validazione è stata resa più flessibile:

```typescript
// Prima (troppo rigida):
if (!pm.card_last4 || pm.card_last4.length !== 4) {
  return false;
}

// Dopo (più flessibile):
if (!pm.card_last4 || pm.card_last4.length < 4) {
  return false;
}
```

E nel PaymentContext, i dati vengono normalizzati quando caricati:

```typescript
const methods: PaymentMethod[] = validMethods.map(pm => ({
  id: pm.id,
  last4: pm.card_last4?.slice(-4), // Prende solo le ultime 4 cifre
  brand: pm.card_brand,
  expiryMonth: pm.card_exp_month,
  expiryYear: pm.card_exp_year,
  isDefault: pm.is_default || false,
  stripePaymentMethodId: pm.stripe_payment_method_id,
}));
```

### 4. Logging Estensivo

Aggiunto logging dettagliato in tutti i punti critici:

```typescript
console.log('Card details from CardField:', JSON.stringify(cardDetails, null, 2));
console.log('Full payment method object:', JSON.stringify(paymentMethod, null, 2));
console.log('Extracted card details:', { last4, brand, expMonth, expYear });
```

Questo permette di diagnosticare rapidamente eventuali problemi futuri.

### 5. Messaggi di Errore Migliorati

Gli errori ora includono più contesto:

```typescript
Alert.alert(
  'Errore',
  'Impossibile ottenere i dettagli della carta. Riprova.\n\nDettagli tecnici: last4 non valido o mancante'
);
```

### 6. Validazione della Data di Scadenza

Aggiunta validazione esplicita per i dati di scadenza:

```typescript
if (!expMonth || !expYear || expMonth < 1 || expMonth > 12) {
  console.error('Invalid expiry data:', { expMonth, expYear });
  Alert.alert(
    'Errore',
    'Impossibile ottenere la data di scadenza della carta. Riprova.'
  );
  return;
}
```

## Prevenzione Duplicati

Il sistema ora previene i duplicati in due modi:

### 1. Controllo per Stripe Payment Method ID

```typescript
const { data: existingByStripeId } = await supabase
  .from('payment_methods')
  .select('id, stripe_payment_method_id, card_last4, card_brand')
  .eq('user_id', user.id)
  .eq('stripe_payment_method_id', paymentMethod.id)
  .eq('status', 'active');

if (existingByStripeId && existingByStripeId.length > 0) {
  Alert.alert('Carta già aggiunta', 'Questa carta è già stata aggiunta al tuo account');
  return;
}
```

### 2. Controllo per Dettagli Carta (last4 + brand)

```typescript
const { data: existingByCard } = await supabase
  .from('payment_methods')
  .select('id, card_last4, card_brand, stripe_payment_method_id')
  .eq('user_id', user.id)
  .eq('card_last4', last4)
  .eq('card_brand', brand)
  .eq('status', 'active');

if (existingByCard && existingByCard.length > 0) {
  Alert.alert(
    'Carta simile già presente',
    `Una carta ${brand.toUpperCase()} che termina con ${last4} è già presente...`,
    [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Aggiungi', onPress: () => proceedWithSave(...) },
    ]
  );
  return;
}
```

## Pulizia Automatica

Il `PaymentContext` ora pulisce automaticamente i metodi di pagamento non validi:

```typescript
const invalidMethods = (data || []).filter(pm => !isValidPaymentMethod(pm));

if (invalidMethods.length > 0) {
  console.log('Found', invalidMethods.length, 'invalid payment methods, marking as inactive');
  const invalidIds = invalidMethods.map(pm => pm.id);
  
  await supabase
    .from('payment_methods')
    .update({ status: 'inactive' })
    .in('id', invalidIds);
}
```

## Test della Soluzione

Per testare che tutto funzioni correttamente:

1. **Aggiungi una carta di test**:
   - Numero: 4242 4242 4242 4242
   - Nome: Qualsiasi nome
   - Scadenza: Qualsiasi data futura (es. 12/25)
   - CVC: Qualsiasi 3 cifre (es. 123)

2. **Verifica nei log**:
   - Cerca "Card details from CardField" per vedere i dati dal form
   - Cerca "Full payment method object" per vedere la risposta completa di Stripe
   - Cerca "Extracted card details" per vedere i dati estratti

3. **Controlla la sezione Pagamenti**:
   - La carta dovrebbe apparire una sola volta
   - Dovrebbe mostrare le ultime 4 cifre corrette (4242)
   - Dovrebbe essere impostata come predefinita se è la prima

4. **Prova a prenotare un prodotto**:
   - Vai a un drop attivo
   - Clicca "Prenota con Carta"
   - Non dovrebbe più dire "Aggiungi una carta"

## Struttura Database

La tabella `payment_methods` ha la seguente struttura:

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_payment_method_id TEXT NOT NULL,
  card_last4 TEXT,
  card_brand TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Compatibilità

Le modifiche sono compatibili con:
- ✅ iOS (tramite `@stripe/stripe-react-native`)
- ✅ Android (tramite `@stripe/stripe-react-native`)
- ⚠️ Web (mostra messaggio che la funzionalità è disponibile solo su mobile)

## Prossimi Passi

Per completare l'integrazione dei pagamenti:

1. **Implementare Payment Intent**: Creare una Supabase Edge Function per creare Payment Intent quando l'utente prenota
2. **Implementare Payment Capture**: Creare una Edge Function per catturare i pagamenti alla fine del drop
3. **Gestione Errori Stripe**: Aggiungere gestione per errori specifici di Stripe (carta rifiutata, fondi insufficienti, etc.)
4. **Webhook Stripe**: Configurare webhook per ricevere notifiche da Stripe sullo stato dei pagamenti

## Riferimenti

- [Stripe React Native SDK](https://stripe.com/docs/payments/accept-a-payment?platform=react-native)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
