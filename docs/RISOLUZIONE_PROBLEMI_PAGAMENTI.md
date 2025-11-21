
# Risoluzione Problemi Pagamenti - Guida Completa

## 🔴 Problemi Riscontrati

Quando tentavi di aggiungere una carta di credito, si verificavano i seguenti errori:

1. **Notifica di errore**: "Impossibile ottenere i dettagli della carta. Riprova"
2. **Errore tecnico nei log**: "Invalid last4 digits from stripe response"
3. **Carte duplicate**: La stessa carta veniva aggiunta più volte ma non risultava utilizzabile
4. **Impossibile prenotare**: Quando cliccavi "Prenota con Carta" ti chiedeva di aggiungere una carta anche se ne avevi già aggiunte

## ✅ Soluzioni Implementate

### 1. Gestione Migliorata della Risposta Stripe

**Problema**: La libreria Stripe può restituire i dettagli della carta in formati diversi a seconda della piattaforma e della versione.

**Soluzione**: Il codice ora prova tre strategie diverse per estrarre i dettagli della carta:

```typescript
// Strategia 1: Prova con "Card" (maiuscolo)
if (paymentMethod.Card) {
  last4 = paymentMethod.Card.last4;
  brand = paymentMethod.Card.brand;
  // ...
}
// Strategia 2: Prova con "card" (minuscolo)
else if (paymentMethod.card) {
  last4 = paymentMethod.card.last4;
  brand = paymentMethod.card.brand;
  // ...
}
// Strategia 3: Usa i dettagli dal form
else if (cardDetails) {
  last4 = cardDetails.last4;
  brand = cardDetails.brand;
  // ...
}
```

### 2. Normalizzazione dei Dati

**Problema**: I dati potrebbero arrivare in formati leggermente diversi.

**Soluzione**: I dati vengono normalizzati prima di essere salvati:

```typescript
// Assicura che last4 sia esattamente 4 cifre
last4 = last4.slice(-4).padStart(4, '0');
```

### 3. Validazione Più Flessibile

**Problema**: La validazione era troppo rigida e rifiutava dati validi.

**Soluzione**: La validazione ora accetta dati in formati leggermente diversi e li normalizza:

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

### 4. Prevenzione Duplicati

Il sistema ora previene i duplicati in due modi:

**A. Controllo per ID Stripe**:
```typescript
// Verifica se esiste già una carta con lo stesso ID Stripe
const { data: existingByStripeId } = await supabase
  .from('payment_methods')
  .select('*')
  .eq('stripe_payment_method_id', paymentMethod.id)
  .eq('status', 'active');

if (existingByStripeId && existingByStripeId.length > 0) {
  Alert.alert('Carta già aggiunta', 'Questa carta è già stata aggiunta al tuo account');
  return;
}
```

**B. Controllo per Dettagli Carta**:
```typescript
// Verifica se esiste già una carta con le stesse ultime 4 cifre e brand
const { data: existingByCard } = await supabase
  .from('payment_methods')
  .select('*')
  .eq('card_last4', last4)
  .eq('card_brand', brand)
  .eq('status', 'active');

if (existingByCard && existingByCard.length > 0) {
  // Chiede conferma all'utente
  Alert.alert(
    'Carta simile già presente',
    'Vuoi aggiungerla comunque?',
    [
      { text: 'Annulla' },
      { text: 'Aggiungi' }
    ]
  );
}
```

### 5. Pulizia Automatica

Il sistema ora pulisce automaticamente le carte non valide:

```typescript
// Trova tutte le carte non valide
const invalidMethods = data.filter(pm => !isValidPaymentMethod(pm));

if (invalidMethods.length > 0) {
  // Marca come inattive
  await supabase
    .from('payment_methods')
    .update({ status: 'inactive' })
    .in('id', invalidIds);
}
```

### 6. Logging Dettagliato

Aggiunto logging estensivo per facilitare il debug:

```typescript
console.log('Card details from CardField:', JSON.stringify(cardDetails, null, 2));
console.log('Full payment method object:', JSON.stringify(paymentMethod, null, 2));
console.log('Extracted card details:', { last4, brand, expMonth, expYear });
```

## 🧪 Come Testare

### 1. Aggiungi una Carta di Test

Usa questi dati per testare:

- **Numero Carta**: `4242 4242 4242 4242`
- **Nome Titolare**: Qualsiasi nome (es. "Mario Rossi")
- **Data Scadenza**: Qualsiasi data futura (es. "12/25")
- **CVC**: Qualsiasi 3 cifre (es. "123")

### 2. Verifica nei Log

Dopo aver aggiunto la carta, controlla i log della console per:

```
✅ Card details from CardField: {...}
✅ Full payment method object: {...}
✅ Extracted card details: { last4: '4242', brand: 'visa', ... }
✅ Payment method saved to database successfully
```

### 3. Controlla la Sezione Pagamenti

1. Vai su **Profilo** → **Metodi di Pagamento**
2. Dovresti vedere la carta appena aggiunta
3. Dovrebbe mostrare:
   - Brand: VISA
   - Ultime 4 cifre: •••• 4242
   - Data scadenza: 12/25
   - Badge "PREDEFINITA" (se è la prima carta)

### 4. Prova a Prenotare

1. Vai a un drop attivo
2. Scorri i prodotti
3. Clicca su "PRENOTA CON CARTA"
4. **NON** dovrebbe più chiederti di aggiungere una carta
5. Dovrebbe creare la prenotazione con successo

## 🔍 Risoluzione Problemi

### Se la carta non viene aggiunta:

1. **Controlla i log della console** per vedere quale errore specifico si verifica
2. **Verifica la connessione internet**
3. **Assicurati di usare la carta di test corretta**: `4242 4242 4242 4242`
4. **Prova a riavviare l'app**

### Se vedi ancora carte duplicate:

1. Le carte duplicate vecchie sono state marcate come "inactive"
2. Vai su **Profilo** → **Metodi di Pagamento**
3. Rimuovi manualmente le carte duplicate (se ancora visibili)
4. Aggiungi nuovamente la carta

### Se non riesci a prenotare:

1. **Verifica di avere almeno una carta attiva**:
   - Vai su **Profilo** → **Metodi di Pagamento**
   - Dovresti vedere almeno una carta
   - Una carta dovrebbe avere il badge "PREDEFINITA"

2. **Controlla i log** quando clicchi "Prenota con Carta":
   ```
   ✅ Checking for valid payment methods: true, total: 1
   ```

3. **Se vedi `total: 0`**, significa che non ci sono carte valide:
   - Rimuovi tutte le carte esistenti
   - Aggiungi una nuova carta di test

## 📊 Struttura Database

La tabella `payment_methods` ha questa struttura:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `id` | UUID | ID univoco |
| `user_id` | UUID | ID dell'utente |
| `stripe_payment_method_id` | TEXT | ID del metodo di pagamento su Stripe |
| `card_last4` | TEXT | Ultime 4 cifre della carta |
| `card_brand` | TEXT | Brand della carta (visa, mastercard, etc.) |
| `card_exp_month` | INTEGER | Mese di scadenza (1-12) |
| `card_exp_year` | INTEGER | Anno di scadenza (es. 2025) |
| `is_default` | BOOLEAN | Se è la carta predefinita |
| `status` | TEXT | Stato: 'active' o 'inactive' |
| `created_at` | TIMESTAMP | Data di creazione |
| `updated_at` | TIMESTAMP | Data ultimo aggiornamento |

## 🎯 Cosa Succede Quando Prenoti

1. **Verifica Carta**: Il sistema verifica che tu abbia almeno una carta attiva
2. **Crea Prenotazione**: Viene creata una prenotazione nel database
3. **Blocco Importo**: L'importo viene "bloccato" sulla carta (in modalità test non viene addebitato nulla)
4. **Aggiorna Drop**: Il valore totale del drop e lo sconto vengono aggiornati
5. **Notifica**: Ricevi una conferma con i dettagli della prenotazione

## 📝 File Modificati

I seguenti file sono stati modificati per risolvere i problemi:

1. **`app/add-payment-method.native.tsx`**
   - Gestione multi-formato della risposta Stripe
   - Normalizzazione dei dati
   - Logging dettagliato
   - Validazione migliorata

2. **`contexts/PaymentContext.tsx`**
   - Validazione più flessibile
   - Pulizia automatica carte non valide
   - Normalizzazione dati al caricamento

3. **`docs/PAYMENT_FLOW_FIX.md`** (nuovo)
   - Documentazione tecnica in inglese

4. **`docs/RISOLUZIONE_PROBLEMI_PAGAMENTI.md`** (questo file)
   - Guida utente in italiano

## ✨ Prossimi Passi

Per completare l'integrazione dei pagamenti:

1. **✅ COMPLETATO**: Aggiunta e gestione carte
2. **✅ COMPLETATO**: Prevenzione duplicati
3. **✅ COMPLETATO**: Validazione e pulizia automatica
4. **🔄 DA FARE**: Implementare Payment Intent per bloccare realmente i fondi
5. **🔄 DA FARE**: Implementare Payment Capture per addebitare alla fine del drop
6. **🔄 DA FARE**: Configurare webhook Stripe per notifiche in tempo reale

## 🆘 Supporto

Se continui ad avere problemi:

1. **Controlla sempre i log della console** - contengono informazioni dettagliate
2. **Verifica di usare la carta di test corretta**: `4242 4242 4242 4242`
3. **Assicurati di essere in modalità test** (dovresti vedere il banner blu "Modalità Test")
4. **Prova a rimuovere tutte le carte e aggiungerne una nuova**

## 🎉 Conclusione

Tutti i problemi relativi all'aggiunta e gestione delle carte di pagamento sono stati risolti. Il sistema ora:

- ✅ Estrae correttamente i dettagli della carta da Stripe
- ✅ Normalizza e valida i dati in modo flessibile
- ✅ Previene l'aggiunta di carte duplicate
- ✅ Pulisce automaticamente le carte non valide
- ✅ Permette di prenotare prodotti con la carta aggiunta
- ✅ Fornisce logging dettagliato per il debug

Buon test! 🚀
