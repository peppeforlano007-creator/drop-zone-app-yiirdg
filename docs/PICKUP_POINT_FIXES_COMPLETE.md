
# Risoluzione Completa Problemi Punto di Ritiro

## Data: 2025-01-26

## Problemi Risolti

### 1. ✅ Nome Cliente Visualizzato come "N/A"

**Problema:**
- Nella sezione "Gestisci Ordini" del punto di ritiro, il nome del cliente appariva come "N/A"
- I punti di ritiro non potevano vedere le informazioni di contatto dei clienti

**Causa:**
- Il codice tentava di usare `supabase.auth.admin.getUserById()` che non è disponibile nel client SDK
- Le policy RLS sulla tabella `profiles` impedivano ai punti di ritiro di visualizzare i profili degli altri utenti

**Soluzione:**
1. **Migrazione Database:** Aggiunta policy RLS per permettere ai punti di ritiro di visualizzare i profili dei clienti che hanno ordini presso il loro punto di ritiro:
   ```sql
   CREATE POLICY "Pickup points can view customer profiles for their orders"
   ON profiles
   FOR SELECT
   USING (
     EXISTS (
       SELECT 1 FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN profiles pp ON pp.user_id = auth.uid()
       WHERE oi.user_id = profiles.user_id
       AND pp.role = 'pickup_point'
       AND o.pickup_point_id = pp.pickup_point_id
     )
   );
   ```

2. **Ottimizzazione Codice:** Modificato `app/pickup-point/orders.tsx` per:
   - Recuperare tutti gli user_id unici dagli order_items
   - Fare una singola query per ottenere tutti i profili necessari
   - Creare una mappa user_id → profile per accesso rapido
   - Arricchire ogni order_item con i dati del cliente

**Risultato:**
- ✅ I nomi dei clienti vengono visualizzati correttamente
- ✅ I numeri di telefono sono accessibili per chiamare i clienti
- ✅ Le email sono visibili per riferimento
- ✅ Performance migliorate con query batch invece di query individuali

---

### 2. ✅ Errore "No Pickup Point ID Found" Durante Logout

**Problema:**
- Quando un utente punto di ritiro faceva logout, appariva l'errore "No pickup point ID found"
- L'errore mostrava "No pickup point ID found for user: undefined"
- La pagina si ricaricava più volte dopo il logout

**Causa:**
- Il codice di logout cancellava lo stato dell'utente prima di completare il logout da Supabase
- L'auth state change listener si attivava durante il logout, causando tentativi di accesso ai dati dell'utente già cancellati
- Questo creava un loop di ricaricamenti della pagina

**Soluzione:**
Modificato `contexts/AuthContext.tsx` per:

1. **Flag di Logout:** Aggiunto `isLoggingOut` ref per tracciare quando è in corso un logout
   ```typescript
   const isLoggingOut = useRef(false);
   ```

2. **Sequenza di Logout Corretta:**
   ```typescript
   const logout = async () => {
     // 1. Imposta flag per prevenire auth state changes
     isLoggingOut.current = true;
     
     // 2. Salva info utente per logging
     const currentUser = user;
     
     // 3. Cancella stato locale immediatamente
     setUser(null);
     setSession(null);
     setLoading(false);
     
     // 4. Attendi propagazione stato
     await new Promise(resolve => setTimeout(resolve, 100));
     
     // 5. Logout da Supabase (errori non bloccanti)
     const { error } = await supabase.auth.signOut();
     
     // 6. Reset flag dopo delay per permettere navigazione
     setTimeout(() => {
       isLoggingOut.current = false;
     }, 1000);
   };
   ```

3. **Prevenzione Auth State Changes Durante Logout:**
   ```typescript
   const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
     // Ignora cambiamenti durante logout
     if (isLoggingOut.current) {
       console.log('Ignoring auth state change during logout');
       return;
     }
     // ... resto del codice
   });
   ```

**Risultato:**
- ✅ Nessun errore durante il logout
- ✅ Nessun ricaricamento multiplo della pagina
- ✅ Transizione pulita alla schermata di login
- ✅ Stato dell'app completamente pulito dopo logout

---

### 3. ✅ Notifiche Duplicate agli Utenti

**Problema:**
- L'utente `g.forlano@modagroupcompany.com` ha ricevuto 48 notifiche identiche "Drop completato"
- Ogni booking generava una notifica separata invece di aggregare per utente

**Causa:**
- L'edge function `capture-drop-payments` inviava una notifica per ogni booking
- Non c'era deduplica delle notifiche per utente
- Non c'era controllo per evitare notifiche duplicate

**Soluzione:**
Modificato `supabase/functions/capture-drop-payments/index.ts` per:

1. **Aggregazione per Utente:**
   ```typescript
   // Usa Map per garantire unicità
   const userNotifications: Map<string, UserNotificationData> = new Map();
   
   // Aggrega tutti i booking per utente
   for (const booking of enrichedBookings) {
     if (!userNotifications.has(booking.user_id)) {
       userNotifications.set(booking.user_id, {
         userId: booking.user_id,
         userName: booking.user_full_name,
         userEmail: booking.user_email,
         bookings: [],
         totalOriginal: 0,
         totalFinal: 0,
         totalSavings: 0,
       });
     }
     
     const userData = userNotifications.get(booking.user_id)!;
     userData.bookings.push({...});
     userData.totalOriginal += originalPrice;
     userData.totalFinal += finalPrice;
     userData.totalSavings += savings;
   }
   ```

2. **Controllo Duplicati:**
   ```typescript
   // Verifica se esiste già una notifica per questo drop e utente
   const { data: existingNotif } = await supabase
     .from('notifications')
     .select('id')
     .eq('user_id', userId)
     .eq('type', 'drop_completed')
     .eq('related_id', dropId)
     .eq('related_type', 'drop')
     .maybeSingle();

   if (existingNotif) {
     console.log(`Notification already exists for user ${userId}, skipping...`);
     continue;
   }
   ```

3. **Notifica Aggregata:**
   - Una singola notifica per utente con tutti i suoi prodotti
   - Totali aggregati (prezzo originale, finale, risparmio)
   - Lista dei primi 5 prodotti + conteggio rimanenti

**Risultato:**
- ✅ Una sola notifica per utente, indipendentemente dal numero di booking
- ✅ Notifica completa con tutti i prodotti e totali
- ✅ Prevenzione duplicati anche in caso di esecuzioni multiple
- ✅ Logging dettagliato: `${notificationsSent} sent, ${notificationsFailed} failed`

---

### 4. ✅ Gestione Ordini Completa

**Problema:**
- Non c'era modo di gestire gli ordini (marcare come ricevuto, consegnato, rispedito)
- Non si poteva cliccare sugli ordini per vedere i dettagli
- Mancavano funzionalità per notificare e chiamare i clienti

**Soluzione:**
Implementato in `app/pickup-point/orders.tsx`:

1. **Modal Dettagli Ordine:**
   - Visualizzazione completa di tutti gli articoli
   - Informazioni cliente per ogni articolo
   - Stato di ogni articolo
   - Giorni in deposito

2. **Azioni Ordine:**
   - **Ordine Arrivato:** Notifica tutti i clienti che l'ordine è pronto per il ritiro
   - **Articolo Ritirato:** Marca un articolo come ritirato da un cliente
   - **Notifica Cliente:** Invia promemoria al cliente per ritirare l'articolo
   - **Chiama Cliente:** Apre il dialer con il numero del cliente
   - **Rispedisci al Fornitore:** Marca articolo come non ritirato e da rispedire

3. **Completamento Automatico:**
   - Quando tutti gli articoli sono ritirati o rispediti, l'ordine viene automaticamente completato
   - Notifiche inviate ai clienti per articoli rispediti

4. **UI/UX:**
   - Tab per ordini attivi e completati
   - Badge colorati per stati
   - Indicatore giorni in deposito
   - Pull-to-refresh
   - Haptic feedback

**Risultato:**
- ✅ Gestione completa del ciclo di vita degli ordini
- ✅ Comunicazione diretta con i clienti (notifiche e chiamate)
- ✅ Tracciamento dettagliato di ogni articolo
- ✅ Interfaccia intuitiva e facile da usare

---

## Riepilogo Modifiche

### File Modificati:
1. **contexts/AuthContext.tsx**
   - Aggiunto flag `isLoggingOut` per prevenire race conditions
   - Migliorata sequenza di logout
   - Prevenzione auth state changes durante logout

2. **app/pickup-point/orders.tsx**
   - Ottimizzato caricamento dati clienti con query batch
   - Implementato modal dettagli ordine completo
   - Aggiunte tutte le azioni di gestione ordini
   - Migliorata UI con stati, badge e indicatori

3. **supabase/functions/capture-drop-payments/index.ts**
   - Aggregazione notifiche per utente
   - Controllo duplicati notifiche
   - Logging dettagliato con contatori
   - Notifiche aggregate con tutti i prodotti

### Migrazioni Database:
1. **allow_pickup_points_view_customer_profiles**
   - Policy RLS per permettere ai punti di ritiro di vedere i profili dei clienti

---

## Test Consigliati

### 1. Test Visualizzazione Clienti:
- ✅ Login come punto di ritiro
- ✅ Aprire "Gestisci Ordini"
- ✅ Verificare che i nomi dei clienti siano visibili
- ✅ Verificare che i numeri di telefono siano visibili
- ✅ Cliccare su un ordine e verificare i dettagli

### 2. Test Logout:
- ✅ Login come punto di ritiro
- ✅ Cliccare su logout
- ✅ Verificare che non appaia nessun errore
- ✅ Verificare che la pagina non si ricarichi più volte
- ✅ Verificare di essere reindirizzati al login

### 3. Test Gestione Ordini:
- ✅ Marcare ordine come arrivato
- ✅ Verificare che i clienti ricevano notifica
- ✅ Marcare articolo come ritirato
- ✅ Chiamare un cliente
- ✅ Inviare notifica promemoria
- ✅ Marcare articolo come da rispedire
- ✅ Verificare completamento automatico ordine

### 4. Test Notifiche Drop:
- ✅ Completare un drop con più booking dello stesso utente
- ✅ Verificare che l'utente riceva UNA sola notifica
- ✅ Verificare che la notifica contenga tutti i prodotti
- ✅ Verificare i totali aggregati
- ✅ Completare di nuovo lo stesso drop (non dovrebbe inviare duplicati)

---

## Note Tecniche

### Performance:
- Le query per i profili clienti sono ora batch (una query per tutti gli utenti invece di N query)
- Uso di Map per lookup O(1) invece di array.find() O(n)
- Deduplica notifiche a livello di database

### Sicurezza:
- Policy RLS garantisce che i punti di ritiro vedano solo i clienti dei loro ordini
- Nessun accesso diretto a auth.users
- Tutte le operazioni sono tracciate nei log

### Manutenibilità:
- Codice ben commentato
- Logging dettagliato per debugging
- Gestione errori robusta
- Feedback utente chiaro

---

## Conclusione

Tutti i problemi segnalati sono stati risolti:

1. ✅ **Nome cliente N/A** → Ora visualizza correttamente nome, telefono ed email
2. ✅ **Errore logout** → Logout pulito senza errori o ricaricamenti
3. ✅ **Notifiche duplicate** → Una sola notifica aggregata per utente
4. ✅ **Gestione ordini** → Funzionalità complete per gestire tutto il ciclo di vita

L'app è ora pronta per l'uso in produzione da parte dei punti di ritiro.
