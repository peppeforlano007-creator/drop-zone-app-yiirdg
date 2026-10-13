
# Flusso Completamento Drop e Creazione Ordini

## Panoramica

Questo documento spiega cosa succede quando completi un drop e come vengono creati gli ordini per i punti di ritiro.

## Flusso Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN: Completa Drop                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         Chiama Edge Function: capture-drop-payments             │
│                  (supabase/functions/)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Recupera Drop e Prenotazioni Autorizzate                    │
│     - Drop ID, nome, sconto finale                              │
│     - Tutte le prenotazioni con payment_status='authorized'     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Per Ogni Prenotazione:                                      │
│     ┌─────────────────────────────────────────────────┐        │
│     │ a) Calcola prezzo finale con sconto raggiunto   │        │
│     │    finalPrice = originalPrice × (1 - discount%) │        │
│     └─────────────────────────────────────────────────┘        │
│                              │                                   │
│     ┌─────────────────────────────────────────────────┐        │
│     │ b) Cattura pagamento su Stripe                  │        │
│     │    stripe.paymentIntents.capture()              │        │
│     │    - Se STRIPE_SECRET_KEY configurata: ✅ Reale │        │
│     │    - Se non configurata: ⚠️ Simulazione         │        │
│     └─────────────────────────────────────────────────┘        │
│                              │                                   │
│     ┌─────────────────────────────────────────────────┐        │
│     │ c) Aggiorna booking nel database                │        │
│     │    - payment_status: 'captured'                 │        │
│     │    - status: 'confirmed'                        │        │
│     │    - final_price: prezzo calcolato              │        │
│     └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Raggruppa Prenotazioni per Fornitore e Punto di Ritiro      │
│     ┌─────────────────────────────────────────────────┐        │
│     │ Fornitore A + Punto Ritiro Roma                 │        │
│     │   - Prenotazione 1: Nike Air Max                │        │
│     │   - Prenotazione 2: Adidas Superstar            │        │
│     │   Totale: €225.00                               │        │
│     └─────────────────────────────────────────────────┘        │
│     ┌─────────────────────────────────────────────────┐        │
│     │ Fornitore A + Punto Ritiro Milano               │        │
│     │   - Prenotazione 3: Puma RS-X                   │        │
│     │   Totale: €89.00                                │        │
│     └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Per Ogni Gruppo (Fornitore + Punto Ritiro):                │
│     ┌─────────────────────────────────────────────────┐        │
│     │ a) Crea Ordine (orders table)                   │        │
│     │    - order_number: ORD-timestamp-random         │        │
│     │    - supplier_id: ID fornitore                  │        │
│     │    - pickup_point_id: ID punto ritiro           │        │
│     │    - total_value: somma prezzi finali           │        │
│     │    - commission_amount: 5% del totale           │        │
│     │    - status: 'confirmed'                        │        │
│     └─────────────────────────────────────────────────┘        │
│                              │                                   │
│     ┌─────────────────────────────────────────────────┐        │
│     │ b) Crea Order Items (order_items table)         │        │
│     │    Per ogni prenotazione nel gruppo:            │        │
│     │    - order_id: ID ordine creato                 │        │
│     │    - booking_id: ID prenotazione                │        │
│     │    - product_id, product_name                   │        │
│     │    - user_id: ID utente che ha prenotato        │        │
│     │    - final_price: prezzo con sconto             │        │
│     │    - selected_size, selected_color              │        │
│     │    - pickup_status: 'pending'                   │        │
│     └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Aggiorna Drop                                               │
│     - status: 'completed'                                       │
│     - completed_at: timestamp corrente                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Ritorna Riepilogo                                           │
│     - Prenotazioni catturate                                    │
│     - Pagamenti Stripe effettuati                               │
│     - Totale addebitato                                         │
│     - Risparmio totale                                          │
│     - Ordini creati                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         PUNTO DI RITIRO: Visualizza Ordini                      │
│                                                                  │
│  Query: orders + order_items + profiles                         │
│  ┌────────────────────────────────────────────────┐            │
│  │ Ordine: ORD-1234567890-ABC123                  │            │
│  │ Cliente: Mario Rossi (da profiles via user_id) │            │
│  │ Telefono: +39 123 456 7890                     │            │
│  │ Prodotti:                                       │            │
│  │   • Nike Air Max - Taglia: 42 - €120.00       │            │
│  │   • Adidas Superstar - Taglia: 41 - €105.00   │            │
│  │ Valore Ordine: €225.00                         │            │
│  │ Commissione: €11.25 (5%)                       │            │
│  │ Status: Confermato                             │            │
│  └────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Struttura Database

### Tabelle Coinvolte

#### 1. `bookings`
```sql
- id (uuid)
- user_id (uuid) → utente che ha prenotato
- product_id (uuid) → prodotto prenotato
- drop_id (uuid) → drop di riferimento
- pickup_point_id (uuid) → punto di ritiro scelto
- original_price (numeric) → prezzo originale
- authorized_amount (numeric) → importo autorizzato (prezzo minimo)
- final_price (numeric) → prezzo finale pagato
- discount_percentage (numeric) → sconto finale applicato
- payment_status (text) → 'authorized' → 'captured'
- payment_intent_id (text) → ID Stripe PaymentIntent
- status (text) → 'active' → 'confirmed'
- selected_size, selected_color
```

#### 2. `orders`
```sql
- id (uuid)
- order_number (text) → ORD-timestamp-random
- drop_id (uuid) → drop completato
- supplier_id (uuid) → fornitore
- pickup_point_id (uuid) → punto di ritiro
- total_value (numeric) → somma prezzi finali
- commission_amount (numeric) → 5% del totale
- status (text) → 'confirmed', 'in_transit', 'arrived', etc.
- created_at, shipped_at, arrived_at, completed_at
```

#### 3. `order_items`
```sql
- id (uuid)
- order_id (uuid) → ordine di appartenenza
- booking_id (uuid) → prenotazione originale
- product_id (uuid) → prodotto
- product_name (text) → nome prodotto (denormalizzato)
- user_id (uuid) → utente che ha prenotato
- original_price (numeric)
- final_price (numeric)
- discount_percentage (numeric)
- selected_size, selected_color
- pickup_status (text) → 'pending', 'ready', 'picked_up'
- picked_up_at (timestamp)
```

#### 4. `profiles`
```sql
- id (uuid)
- user_id (uuid) → riferimento a auth.users
- full_name (text) → nome completo
- phone (text) → telefono
- email (text)
- pickup_point_id (uuid) → punto di ritiro associato
- role (text) → 'consumer', 'pickup_point', 'admin'
```

## Esempio Pratico

### Scenario
- **Drop**: "Nike & Adidas - Roma"
- **Sconto iniziale**: 30%
- **Sconto finale raggiunto**: 60%
- **Prenotazioni**: 5 utenti, 7 prodotti totali
- **Fornitori**: 2 (Nike e Adidas)
- **Punto di ritiro**: Roma Centro

### Prenotazioni

| User | Prodotto | Fornitore | Prezzo Orig. | Autorizzato (30%) | Finale (60%) |
|------|----------|-----------|--------------|-------------------|--------------|
| Mario | Nike Air Max | Nike | €150 | €105 | €60 |
| Luigi | Nike Blazer | Nike | €120 | €84 | €48 |
| Anna | Adidas Superstar | Adidas | €100 | €70 | €40 |
| Sara | Adidas Ultraboost | Adidas | €180 | €126 | €72 |
| Paolo | Nike Cortez | Nike | €90 | €63 | €36 |

### Ordini Creati

#### Ordine 1: Nike → Roma Centro
```
Order Number: ORD-1234567890-ABC123
Supplier: Nike
Pickup Point: Roma Centro
Items:
  - Mario: Nike Air Max - €60
  - Luigi: Nike Blazer - €48
  - Paolo: Nike Cortez - €36
Total: €144.00
Commission: €7.20 (5%)
```

#### Ordine 2: Adidas → Roma Centro
```
Order Number: ORD-1234567891-DEF456
Supplier: Adidas
Pickup Point: Roma Centro
Items:
  - Anna: Adidas Superstar - €40
  - Sara: Adidas Ultraboost - €72
Total: €112.00
Commission: €5.60 (5%)
```

### Riepilogo Finale
```
✅ Prenotazioni catturate: 5/5
💳 Pagamenti Stripe: 5
💰 Totale autorizzato: €448.00
💳 Totale addebitato: €256.00
🎉 Risparmio totale: €192.00 (42.9%)
📦 Ordini creati: 2
```

## Configurazione Necessaria

### STRIPE_SECRET_KEY

**Senza configurazione:**
```
⚠️ Modalità simulazione
- Pagamenti NON catturati su Stripe
- Ordini creati ma senza addebito reale
- Dashboard Stripe: nessuna entrata
```

**Con configurazione:**
```
✅ Pagamenti reali
- Pagamenti catturati su Stripe
- Ordini creati con addebito reale
- Dashboard Stripe: entrate visibili
- Punti di ritiro: dati completi
```

### Come Configurare

```bash
# 1. Ottieni chiave da dashboard.stripe.com
# 2. Configura in Supabase
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key

# 3. Rideploy funzione
supabase functions deploy capture-drop-payments
```

## Verifica Funzionamento

### Checklist Post-Completamento Drop

- [ ] Admin vede messaggio di successo con riepilogo
- [ ] Stripe dashboard mostra pagamenti catturati
- [ ] Punto di ritiro vede ordini con:
  - [ ] Nome cliente corretto
  - [ ] Telefono cliente
  - [ ] Lista prodotti completa
  - [ ] Valore ordine corretto
  - [ ] Commissione calcolata
- [ ] Admin può esportare ordini per fornitori
- [ ] Utenti ricevono notifica di conferma

## Troubleshooting

### Ordini con dati vuoti (N/A)

**Causa**: STRIPE_SECRET_KEY non configurata prima del completamento

**Soluzione**: 
1. Configura STRIPE_SECRET_KEY
2. Crea nuovo drop
3. Completa nuovo drop

### Pagamenti non su Stripe

**Causa**: Chiave Stripe errata o funzione non deployata

**Soluzione**:
```bash
supabase secrets list  # Verifica chiave
supabase functions deploy capture-drop-payments
```

### Ordini non creati

**Causa**: Errore nella funzione Edge

**Soluzione**:
```bash
supabase functions logs capture-drop-payments
# Controlla errori nei logs
```

## Riferimenti

- **Guida completa**: `docs/STRIPE_CONFIGURATION_GUIDE.md`
- **Fix rapido**: `docs/QUICK_FIX_ORDINI_VUOTI.md`
- **Codice funzione**: `supabase/functions/capture-drop-payments/index.ts`
- **Schermata admin**: `app/admin/complete-drop.tsx`
- **Schermata punto ritiro**: `app/pickup-point/orders.tsx`
