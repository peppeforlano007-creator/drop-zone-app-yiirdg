
# Fix: Notifiche Mancanti per Ordini Pronti al Ritiro

## Problema
Quando un punto di ritiro segnava un ordine come "consegnato" o "ricevuto in store", l'utente non riceveva la notifica che l'ordine era pronto per il ritiro.

## Causa Principale
Il problema era causato da una **policy RLS (Row Level Security) mancante** sulla tabella `notifications`. 

La tabella aveva policies per:
- ✅ SELECT (lettura) - utenti possono leggere le proprie notifiche
- ✅ UPDATE (aggiornamento) - utenti possono aggiornare le proprie notifiche
- ❌ **INSERT (inserimento) - MANCANTE!**

Quando il punto di ritiro tentava di inserire una notifica per un utente, l'operazione falliva silenziosamente a causa della mancanza di permessi RLS.

## Soluzione Implementata

### 1. Aggiunta Policy RLS per INSERT
È stata creata una nuova policy che permette a:
- **Admin** - di inserire notifiche per qualsiasi utente
- **Pickup Points** - di inserire notifiche per qualsiasi utente
- **Suppliers** - di inserire notifiche per qualsiasi utente

```sql
CREATE POLICY "notifications_insert_by_admin_or_pickup_point"
ON notifications
FOR INSERT
TO public
WITH CHECK (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'pickup_point', false)
  OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'supplier', false)
);
```

### 2. Miglioramento del Sistema di Notifiche
Il codice in `app/pickup-point/orders.tsx` è stato migliorato per:

#### a) Funzione Centralizzata per Invio Notifiche
```typescript
const sendNotificationToUser = async (userId: string, title: string, message: string, orderId: string) => {
  try {
    console.log(`Sending notification to user ${userId}: ${title}`);
    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: title,
        message: message,
        type: 'order_ready',
        related_id: orderId,
        related_type: 'order',
        read: false,
      })
      .select();

    if (error) {
      console.error('Error inserting notification:', error);
      throw error;
    }

    console.log('Notification sent successfully:', data);
    return true;
  } catch (error: any) {
    console.error('Failed to send notification:', error);
    return false;
  }
};
```

#### b) Tracking delle Notifiche Inviate
Ogni azione ora traccia quante notifiche sono state inviate con successo e quante hanno fallito:

```typescript
let notificationsSent = 0;
let notificationsFailed = 0;

for (const userId of uniqueUserIds) {
  const success = await sendNotificationToUser(...);
  if (success) {
    notificationsSent++;
  } else {
    notificationsFailed++;
  }
}
```

#### c) Feedback Migliorato all'Utente
Gli alert ora mostrano informazioni dettagliate:
- Numero di notifiche inviate con successo
- Numero di notifiche fallite (se presenti)
- Messaggi più chiari e informativi

#### d) Notifiche con Emoji per Maggiore Visibilità
Le notifiche ora includono emoji per renderle più visibili:
- 🎉 "Ordine Pronto per il Ritiro!"
- ✅ "Ordine Consegnato con Successo"
- ⚠️ "Ordine Rispedito al Fornitore"
- 🔔 "Promemoria Ritiro Ordine"

### 3. Tre Scenari di Notifica

#### Scenario 1: Ordine Ricevuto in Store
Quando il punto di ritiro segna un ordine come "Ricevuto in Store":
```
Titolo: 🎉 Ordine Pronto per il Ritiro!
Messaggio: Il tuo ordine [numero] è arrivato ed è pronto per il ritiro presso il punto di ritiro. 
           Ricorda di portare un documento d'identità valido.
```

#### Scenario 2: Ordine Consegnato
Quando il punto di ritiro consegna l'ordine al cliente:
```
Titolo: ✅ Ordine Consegnato con Successo
Messaggio: L'ordine [numero] è stato consegnato con successo presso il punto di ritiro. 
           Grazie per aver utilizzato il nostro servizio! Hai guadagnato 10 punti fedeltà.
```

#### Scenario 3: Ordine Rispedito
Quando l'ordine non viene ritirato e deve essere rispedito:
```
Titolo: ⚠️ Ordine Rispedito al Fornitore
Messaggio: L'ordine [numero] non è stato ritirato entro i termini e verrà rispedito al fornitore. 
           Il tuo rating è stato aggiornato. Dopo 5 ordini non ritirati, l'account verrà bloccato.
```

## Test della Soluzione

### Test Manuale
1. Accedi come punto di ritiro
2. Vai su "Gestione Ordini"
3. Seleziona un ordine in stato "In Arrivo"
4. Clicca "Segna come Ricevuto in Store"
5. Conferma l'azione
6. Verifica che appaia il messaggio "X clienti sono stati notificati"
7. Accedi come utente consumer
8. Vai su "Notifiche"
9. Verifica che la notifica sia presente con il titolo "🎉 Ordine Pronto per il Ritiro!"

### Test Database
```sql
-- Verifica che le notifiche siano state create
SELECT 
  n.id,
  n.user_id,
  n.title,
  n.message,
  n.type,
  n.read,
  n.created_at,
  p.full_name as user_name
FROM notifications n
JOIN profiles p ON p.user_id = n.user_id
WHERE n.type = 'order_ready'
ORDER BY n.created_at DESC
LIMIT 10;
```

## Logging e Debug

Il codice ora include logging dettagliato per facilitare il debug:

```typescript
console.log(`Sending notification to user ${userId}: ${title}`);
console.log('Notification sent successfully:', data);
console.log(`Notifications sent: ${notificationsSent}, failed: ${notificationsFailed}`);
```

Questi log possono essere visualizzati:
- Nella console del browser (per web)
- In Expo Dev Tools (per mobile)
- Nei log di Supabase (per verificare le query)

## Benefici della Soluzione

1. **Notifiche Garantite**: Con la policy RLS corretta, le notifiche vengono sempre inserite
2. **Error Handling Robusto**: Ogni errore viene catturato e loggato
3. **Feedback Chiaro**: L'operatore del punto di ritiro sa esattamente quante notifiche sono state inviate
4. **Tracciabilità**: Tutti i log permettono di tracciare eventuali problemi
5. **User Experience Migliorata**: Le notifiche con emoji sono più visibili e chiare

## Prossimi Passi (Opzionali)

### Push Notifications
Per implementare notifiche push native (iOS/Android):
1. Configurare Expo Notifications
2. Richiedere permessi push all'utente
3. Salvare i push tokens nel database
4. Creare un Edge Function per inviare push notifications
5. Chiamare l'Edge Function quando si crea una notifica

### Email Notifications
Per inviare anche email:
1. Configurare un servizio email (es. Resend, SendGrid)
2. Creare template email per ogni tipo di notifica
3. Inviare email in parallelo alle notifiche in-app

### SMS Notifications
Per casi urgenti:
1. Configurare un servizio SMS (es. Twilio)
2. Inviare SMS per ordini pronti da più di 3 giorni
3. Inviare SMS prima della scadenza del ritiro

## File Modificati

- `app/pickup-point/orders.tsx` - Migliorato sistema di notifiche
- Migration: `add_notifications_insert_policy` - Aggiunta policy RLS

## Conclusione

Il problema è stato risolto completamente. Ora quando un punto di ritiro segna un ordine come "ricevuto in store" o "consegnato", l'utente riceve immediatamente una notifica chiara e visibile nell'app.
