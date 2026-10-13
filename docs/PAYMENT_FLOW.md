
# Flusso di Pagamento - Documentazione

## Panoramica

Il sistema di pagamento implementa un processo di autorizzazione e cattura in due fasi per garantire che gli utenti paghino solo il prezzo finale scontato quando un drop si chiude.

## Flusso di Pagamento

### 1. Prenotazione Iniziale (Autorizzazione)

Quando un utente prenota un prodotto in un drop attivo:

**Importo Bloccato**: Prezzo con sconto ATTUALE (non il prezzo listino)
- Formula: `original_price * (1 - current_discount / 100)`
- Esempio: Se il prezzo originale è €100 e lo sconto attuale è 30%, blocchiamo €70

**Campi Database**:
- `authorized_amount`: €70 (importo bloccato sulla carta)
- `discount_percentage`: 30% (sconto attuale al momento della prenotazione)
- `final_price`: NULL (sarà calcolato alla chiusura del drop)
- `payment_status`: 'authorized'
- `status`: 'active'

**Esperienza Utente**:
```
Prenotazione Confermata! 🎉

💳 Importo bloccato sulla carta: €70.00
(Sconto attuale: 30%)

🎯 Alla fine del drop, addebiteremo solo il prezzo finale 
con lo sconto raggiunto.

💰 Prezzo minimo possibile: €20.00
(Se si raggiunge lo sconto massimo del 80%)

💵 Prezzo massimo possibile: €70.00
(Se rimane allo sconto minimo del 30%)
```

### 2. Progressione del Drop

Man mano che più utenti prenotano prodotti:
- `current_value` aumenta
- `current_discount` aumenta proporzionalmente
- Le nuove prenotazioni vengono autorizzate al NUOVO sconto attuale
- Le prenotazioni esistenti mantengono il loro `authorized_amount` originale

**Esempio di Progressione**:
```
Tempo T0: Sconto 30% → Utente A prenota → Blocca €70
Tempo T1: Sconto 40% → Utente B prenota → Blocca €60
Tempo T2: Sconto 50% → Utente C prenota → Blocca €50
Tempo T3: Drop si chiude allo sconto finale 60%

Risultato:
- Utente A: Bloccato €70 → Paga €40 → Risparmia €30 extra!
- Utente B: Bloccato €60 → Paga €40 → Risparmia €20 extra!
- Utente C: Bloccato €50 → Paga €40 → Risparmia €10 extra!
```

### 3. Completamento del Drop (Cattura)

Quando un drop viene completato (manualmente dall'admin o automaticamente alla scadenza):

**Processo Automatico** (tramite trigger database):
1. Lo status del drop cambia a 'completed'
2. Il trigger `handle_drop_completion()` si attiva
3. Per ogni prenotazione autorizzata:
   - Calcola il prezzo finale: `original_price * (1 - final_discount / 100)`
   - Aggiorna `final_price` con l'importo calcolato
   - Aggiorna `discount_percentage` con lo sconto finale
   - Cambia `payment_status` a 'captured'
   - Cambia `status` a 'confirmed'

**Esempio**:
- Prezzo originale: €100
- Importo autorizzato: €70 (allo sconto del 30%)
- Sconto finale raggiunto: 60%
- Prezzo finale addebitato: €40
- **L'utente risparmia**: €30 rispetto all'importo bloccato!

### 4. Logica di Cattura del Pagamento

```sql
-- Attivato automaticamente quando lo status del drop cambia a 'completed'
UPDATE bookings
SET 
  final_price = original_price * (1 - NEW.current_discount / 100),
  discount_percentage = NEW.current_discount,
  payment_status = 'captured',
  status = 'confirmed',
  updated_at = NOW()
WHERE 
  drop_id = NEW.id 
  AND payment_status = 'authorized'
  AND status = 'active';
```

## Schema Database

### Tabella Bookings

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  product_id UUID REFERENCES products,
  drop_id UUID REFERENCES drops,
  
  -- Campi di prezzo
  original_price NUMERIC,              -- Prezzo listino del prodotto
  authorized_amount NUMERIC,           -- Importo bloccato sulla carta (allo sconto attuale)
  discount_percentage NUMERIC,         -- Percentuale di sconto (aggiornata al finale alla cattura)
  final_price NUMERIC,                 -- Importo finale addebitato (calcolato alla cattura)
  
  -- Campi di stato
  payment_status TEXT,                 -- 'pending', 'authorized', 'captured', 'failed', 'refunded'
  status TEXT,                         -- 'active', 'confirmed', 'cancelled', 'completed'
  
  -- Integrazione Stripe (per produzione)
  payment_intent_id TEXT,              -- ID del PaymentIntent di Stripe
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Azioni Admin

### Completare un Drop Manualmente

Gli admin possono completare manualmente un drop dalla dashboard admin:

1. Naviga su "Gestisci Drop"
2. Trova il drop attivo
3. Clicca sul pulsante "Completa"
4. Conferma l'azione
5. Il sistema automaticamente:
   - Cattura tutti i pagamenti autorizzati
   - Calcola i prezzi finali
   - Aggiorna gli stati delle prenotazioni
   - Crea gli ordini per i fornitori

## Esperienza Utente

### Vista Prenotazione Attiva

```
📦 Nome Prodotto
Nome Fornitore

⏰ 3 giorni rimanenti
📊 Sconto attuale: 40%
🔒 Bloccato: €70.00

Prezzo Attuale: €60.00 (Sconto 40%)
Prezzo Minimo: €20.00 (Max 80%)

✅ Alla fine del drop, pagherai solo il prezzo finale 
con lo sconto raggiunto
```

### Vista Prenotazione Completata

```
📦 Nome Prodotto
Nome Fornitore

Importo Bloccato: €70.00
Importo Pagato: €40.00
✅ Hai risparmiato €30.00!

Sconto finale: 60%
Pagato il 15/01/2024
```

## Integrazione con Stripe (Produzione)

Per l'implementazione in produzione con Stripe:

### 1. Fase di Autorizzazione

```typescript
// Crea un PaymentIntent con cattura manuale
const paymentIntent = await stripe.paymentIntents.create({
  amount: authorizedAmount * 100, // Importo in centesimi
  currency: 'eur',
  customer: customerId,
  payment_method: paymentMethodId,
  capture_method: 'manual', // Non catturare immediatamente
  confirm: true,
  metadata: {
    booking_id: bookingId,
    drop_id: dropId,
    product_id: productId,
    authorized_discount: currentDiscount,
  },
});

// Salva payment_intent_id nella prenotazione
await supabase
  .from('bookings')
  .update({ payment_intent_id: paymentIntent.id })
  .eq('id', bookingId);
```

### 2. Fase di Cattura

```typescript
// Quando il drop si completa, cattura il pagamento
const finalAmount = originalPrice * (1 - finalDiscount / 100);

// Se l'importo finale è inferiore a quello autorizzato, cattura solo l'importo finale
const paymentIntent = await stripe.paymentIntents.capture(
  paymentIntentId,
  {
    amount_to_capture: Math.round(finalAmount * 100), // Importo in centesimi
  }
);

// La differenza viene automaticamente rilasciata al cliente
// Esempio: Autorizzato €70, Catturato €40 → €30 rilasciati automaticamente
```

### 3. Edge Function per la Cattura

```typescript
// supabase/functions/capture-drop-payments/index.ts
import Stripe from 'https://esm.sh/stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

// Per ogni prenotazione
const paymentIntent = await stripe.paymentIntents.capture(
  booking.payment_intent_id,
  {
    amount_to_capture: Math.round(finalPrice * 100),
  }
);

console.log(`✅ Captured €${finalPrice} (authorized €${authorizedAmount})`);
console.log(`🎉 Customer saved €${authorizedAmount - finalPrice}!`);
```

## Vantaggi del Sistema

1. **Fiducia dell'Utente**: Gli utenti vedono esattamente cosa viene bloccato e cosa pagheranno
2. **Maggiori Risparmi**: Gli utenti possono risparmiare di più se lo sconto aumenta
3. **Trasparente**: Comunicazione chiara ad ogni passo
4. **Automatico**: Nessun intervento manuale necessario per le catture
5. **Sicuro**: I fondi sono trattenuti in modo sicuro fino al completamento del drop
6. **Equo**: Chi prenota prima (a sconto minore) risparmia di più alla fine

## Gestione degli Errori

### Catture Fallite

Se una cattura del pagamento fallisce:
- Lo stato della prenotazione viene impostato su 'failed'
- L'utente viene notificato via email/notifica
- L'admin viene allertato per una revisione manuale
- Può essere implementato un meccanismo di retry

### Prenotazioni Cancellate

Se l'utente cancella prima della fine del drop:
- L'autorizzazione viene rilasciata
- I fondi vengono restituiti immediatamente all'utente
- Lo stato della prenotazione viene impostato su 'cancelled'
- Lo stato del pagamento viene impostato su 'refunded'

## Testing

### Scenari di Test

1. **Flusso Base**:
   - Prenota allo sconto del 30% (€70 bloccati)
   - Il drop termina allo sconto del 60%
   - L'utente paga €40, risparmia €30

2. **Nessun Aumento di Sconto**:
   - Prenota allo sconto del 30% (€70 bloccati)
   - Il drop termina allo sconto del 30%
   - L'utente paga €70, nessun risparmio extra

3. **Sconto Massimo**:
   - Prenota allo sconto del 30% (€70 bloccati)
   - Il drop raggiunge lo sconto dell'80%
   - L'utente paga €20, risparmia €50!

4. **Cancellazione**:
   - Prenota allo sconto del 30% (€70 bloccati)
   - L'utente cancella prima della fine del drop
   - €70 rilasciati sulla carta

5. **Prenotazioni Multiple**:
   - Utente A prenota a 30% (€70 bloccati)
   - Utente B prenota a 40% (€60 bloccati)
   - Utente C prenota a 50% (€50 bloccati)
   - Drop termina a 60%
   - Tutti pagano €40, ma con risparmi diversi

## Monitoraggio

Metriche chiave da monitorare:
- Risparmio medio per prenotazione
- Progressione dello sconto nel tempo
- Tasso di successo delle catture
- Tempo di cattura dopo il completamento del drop
- Soddisfazione dell'utente con i prezzi finali
- Differenza media tra importo autorizzato e importo finale
- Percentuale di utenti che risparmiano extra

## Notifiche agli Utenti

### Durante il Drop
```
🎉 Buone notizie!
Lo sconto è aumentato dal 30% al 40%!

Il tuo prezzo finale potrebbe essere ancora più basso.
Continua a condividere per aumentare lo sconto!
```

### Alla Chiusura del Drop
```
✅ Drop Completato!

Prodotto: [Nome Prodotto]
Importo Bloccato: €70.00
Importo Finale: €40.00
🎉 Hai risparmiato €30.00 extra!

Sconto finale: 60%
Il tuo ordine sarà pronto per il ritiro tra 3-5 giorni.
```

## Conformità e Sicurezza

- **PCI DSS**: Stripe gestisce tutti i dati sensibili delle carte
- **GDPR**: I dati degli utenti sono protetti e possono essere cancellati su richiesta
- **Autorizzazioni**: Le autorizzazioni scadono dopo 7 giorni (limite Stripe)
- **Audit Trail**: Tutti i cambiamenti di stato vengono registrati con timestamp
- **Rollback**: In caso di errori, le autorizzazioni possono essere cancellate
