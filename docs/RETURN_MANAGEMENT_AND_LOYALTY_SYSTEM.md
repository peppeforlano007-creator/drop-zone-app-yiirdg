
# Sistema di Gestione Resi e Programma Fedeltà

## Panoramica

Questo documento descrive l'implementazione completa del sistema di gestione resi per i punti di ritiro e del sistema di gestione del programma fedeltà per gli amministratori.

## 1. Gestione Resi al Punto di Ritiro

### Funzionalità Implementate

#### 1.1 Schermata Gestione Resi (`app/pickup-point/returns.tsx`)

**Caratteristiche:**
- Ricerca ordini per numero ordine
- Visualizzazione articoli dell'ordine con dettagli cliente
- Registrazione resi singoli articoli
- Aggiornamento automatico rating utente
- Blocco automatico account dopo 100 articoli restituiti

**Flusso Operativo:**
1. L'operatore inserisce il numero ordine
2. Il sistema mostra tutti gli articoli dell'ordine
3. Per ogni articolo, l'operatore può:
   - Vedere lo stato (ritirato, reso, in attesa)
   - Registrare un reso se non ancora gestito
4. Alla registrazione del reso:
   - Il rating dell'utente viene abbassato
   - Il contatore `items_returned` viene incrementato
   - Se raggiunge 100 articoli, l'account viene bloccato
   - L'utente riceve una notifica

#### 1.2 Database Changes

**Nuova Colonna in `profiles`:**
```sql
items_returned integer DEFAULT 0 CHECK (items_returned >= 0)
```

**Nuova Funzione `handle_item_return`:**
- Incrementa il contatore `items_returned`
- Calcola il nuovo rating (diminuisce di 1 stella ogni 10 resi)
- Blocca l'account se raggiunge 100 articoli restituiti
- Marca l'articolo come reso nel database
- Restituisce un messaggio informativo

**Logica Rating:**
- Ogni 10 articoli restituiti = -1 stella
- Rating minimo: 1 stella
- Dopo 100 articoli: account bloccato con motivo "100 articoli restituiti"

### 1.3 Integrazione Dashboard Punto di Ritiro

Il dashboard del punto di ritiro (`app/pickup-point/dashboard.tsx`) ora include:
- Link alla nuova sezione "Gestione Resi"
- Icona distintiva per identificare rapidamente la funzione

## 2. Gestione Programma Fedeltà (Admin)

### Funzionalità Implementate

#### 2.1 Schermata Gestione Programma Fedeltà (`app/admin/loyalty-program.tsx`)

**Due Sezioni Principali:**

##### A. Gestione Utenti Bloccati
- Visualizzazione di tutti gli utenti bloccati
- Informazioni dettagliate:
  - Nome, email, telefono
  - Rating attuale
  - Numero ordini rispediti al fornitore
  - Numero articoli restituiti
  - Motivo e data del blocco
- Funzione "Sblocca Utente" per riattivare account bloccati
- Logging automatico delle azioni di sblocco

##### B. Gestione Coupon
- Visualizzazione di tutti i coupon disponibili
- Modifica in tempo reale di:
  - Percentuale di sconto
  - Punti richiesti per il riscatto
- Validazione input (sconto 1-100%, punti > 0)
- Aggiornamento immediato nell'app utente

#### 2.2 Funzione Admin `admin_unblock_user`

**Caratteristiche:**
- Verifica che il chiamante sia admin
- Sblocca l'utente rimuovendo:
  - Flag `account_blocked`
  - Data `blocked_at`
  - Motivo `blocked_reason`
- Registra l'azione nel log attività
- Restituisce conferma dell'operazione

### 2.3 Aggiornamenti Dinamici UI Utente

#### Schermata Programma Fedeltà (`app/loyalty-program.tsx`)
- Carica dinamicamente i coupon dal database
- Mostra percentuali e punti aggiornati in tempo reale
- Colori distintivi per ogni tier di coupon

#### Schermata I Miei Coupon (`app/my-coupons.tsx`)
- Già implementata con caricamento dinamico
- Riflette automaticamente le modifiche admin

## 3. Aggiornamenti Testo Pagamenti

### Schermata Metodi di Pagamento (`app/(tabs)/payment-methods.tsx`)

**Testo Aggiornato:**
```
IMPORTANTE
Assicurati di ritirare i tuoi ordini entro i tempi stabiliti. 
Dopo 5 ordini non ritirati e rispediti al fornitore, l'account verrà bloccato definitivamente.

Al punto di ritiro sarà possibile effettuare resi dei singoli articoli, 
ma dopo 100 articoli restituiti il profilo sarà bloccato momentaneamente.
```

## 4. Integrazione Dashboard Admin

### Dashboard Admin (`app/admin/dashboard.tsx`)

**Nuova Azione Rapida:**
- Titolo: "Programma Fedeltà"
- Descrizione: "Gestisci utenti bloccati e coupon"
- Icona: Stella dorata
- Route: `/admin/loyalty-program`

## 5. Struttura Database

### Tabella `profiles`

**Campi Rilevanti:**
```sql
rating_stars integer DEFAULT 5 CHECK (rating_stars >= 1 AND rating_stars <= 5)
loyalty_points integer DEFAULT 0 CHECK (loyalty_points >= 0)
orders_picked_up integer DEFAULT 0 CHECK (orders_picked_up >= 0)
orders_returned integer DEFAULT 0 CHECK (orders_returned >= 0)
items_returned integer DEFAULT 0 CHECK (items_returned >= 0)  -- NUOVO
account_blocked boolean DEFAULT false
blocked_at timestamptz
blocked_reason text
```

### Tabella `coupons`

**Struttura:**
```sql
id uuid PRIMARY KEY
name text
description text
discount_percentage integer CHECK (discount_percentage > 0 AND discount_percentage <= 100)
points_required integer CHECK (points_required > 0)
is_active boolean DEFAULT true
created_at timestamptz
updated_at timestamptz
```

### Tabella `order_items`

**Campi per Resi:**
```sql
returned_to_sender boolean DEFAULT false
returned_at timestamptz
return_reason text
```

## 6. Notifiche

### Notifiche Automatiche

**Reso Articolo:**
- Titolo: "Articolo Reso"
- Messaggio: Include nome articolo e stato account
- Tipo: `general`
- Inviata automaticamente all'utente

**Sblocco Account:**
- Può essere implementata come notifica futura
- Attualmente gestita tramite activity log

## 7. Sicurezza e Permessi

### RLS Policies

**Funzioni SECURITY DEFINER:**
- `handle_item_return`: Eseguibile da utenti autenticati
- `admin_unblock_user`: Verifica ruolo admin internamente

**Permessi:**
```sql
GRANT EXECUTE ON FUNCTION handle_item_return TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unblock_user TO authenticated;
```

## 8. User Experience

### Per Operatori Punto di Ritiro

**Workflow Semplificato:**
1. Accedi a "Gestione Resi" dal dashboard
2. Cerca ordine per numero
3. Visualizza articoli e clienti
4. Registra reso con un tap
5. Sistema gestisce automaticamente tutto il resto

**Feedback Visivo:**
- Stati chiari (Ritirato, Reso, In Attesa)
- Colori distintivi per ogni stato
- Conferme e avvisi appropriati

### Per Amministratori

**Gestione Centralizzata:**
1. Accedi a "Programma Fedeltà" dal dashboard
2. Tab "Utenti Bloccati": Visualizza e sblocca account
3. Tab "Gestione Coupon": Modifica percentuali e punti
4. Modifiche immediate nell'app utente

**Informazioni Complete:**
- Statistiche dettagliate per ogni utente bloccato
- Motivo e data del blocco
- Storico ordini e resi

### Per Utenti Finali

**Trasparenza:**
- Informazioni chiare sui limiti (5 ordini, 100 articoli)
- Visualizzazione dinamica coupon disponibili
- Percentuali sempre aggiornate

## 9. Testing

### Test Consigliati

**Gestione Resi:**
1. Creare ordine di test
2. Registrare resi multipli
3. Verificare aggiornamento rating
4. Testare blocco a 100 articoli

**Gestione Coupon:**
1. Modificare percentuali da admin
2. Verificare aggiornamento in app utente
3. Testare validazione input
4. Verificare riscatto coupon con nuove percentuali

**Sblocco Utenti:**
1. Bloccare utente (manualmente o via resi)
2. Sbloccare da admin
3. Verificare ripristino accesso
4. Controllare activity log

## 10. Considerazioni Future

### Possibili Miglioramenti

**Gestione Resi:**
- Motivi di reso personalizzabili
- Statistiche resi per prodotto
- Report resi per fornitore
- Foto articolo reso

**Programma Fedeltà:**
- Creazione nuovi coupon da admin
- Coupon personalizzati per utente
- Promozioni temporanee
- Bonus punti per comportamenti virtuosi

**Notifiche:**
- Notifica sblocco account
- Promemoria riscatto coupon
- Alert admin per pattern sospetti

## 11. Documentazione Tecnica

### File Modificati/Creati

**Nuovi File:**
- `app/pickup-point/returns.tsx` - Gestione resi punto di ritiro
- `app/admin/loyalty-program.tsx` - Gestione programma fedeltà admin
- `docs/RETURN_MANAGEMENT_AND_LOYALTY_SYSTEM.md` - Questa documentazione

**File Modificati:**
- `app/pickup-point/_layout.tsx` - Aggiunto route returns
- `app/pickup-point/dashboard.tsx` - Aggiunto link gestione resi
- `app/admin/_layout.tsx` - Aggiunto route loyalty-program
- `app/admin/dashboard.tsx` - Aggiunta azione rapida programma fedeltà
- `app/(tabs)/payment-methods.tsx` - Aggiornato testo informativo
- `app/loyalty-program.tsx` - Caricamento dinamico coupon
- `app/my-coupons.tsx` - Già implementato con caricamento dinamico

**Migrazioni Database:**
- `add_item_returns_tracking` - Aggiunge colonna items_returned e funzioni

### Dipendenze

**Nessuna nuova dipendenza richiesta** - Utilizza solo:
- React Native core
- Expo Router
- Supabase client
- Componenti esistenti

## 12. Conclusioni

Il sistema implementato fornisce:

✅ **Gestione Completa Resi** - Operatori possono gestire resi singoli articoli facilmente

✅ **Controllo Automatico** - Sistema blocca automaticamente account problematici

✅ **Flessibilità Admin** - Amministratori possono sbloccare utenti e modificare coupon

✅ **Trasparenza Utente** - Utenti vedono sempre informazioni aggiornate

✅ **Scalabilità** - Sistema progettato per gestire grandi volumi

✅ **Sicurezza** - RLS policies e validazioni appropriate

Il sistema è pronto per l'uso in produzione e può essere facilmente esteso con le funzionalità future suggerite.
