
# Istruzioni per il Deployment

## 🚀 Deploy della Nuova Edge Function

La edge function `capture-drop-payments` è stata aggiornata per gestire il sistema COD. Segui questi passaggi per deployarla:

### 1. Verifica Supabase CLI

Assicurati di avere Supabase CLI installato:

```bash
npm install -g supabase
```

### 2. Login a Supabase

```bash
supabase login
```

### 3. Link al Progetto

```bash
supabase link --project-ref sippdylyuzejudmzbwdn
```

### 4. Deploy della Edge Function

```bash
supabase functions deploy capture-drop-payments
```

### 5. Verifica il Deploy

Controlla che la function sia stata deployata correttamente:

```bash
supabase functions list
```

Dovresti vedere `capture-drop-payments` nella lista.

## 🔧 Configurazione Database

Le migrazioni del database sono già state applicate automaticamente. Verifica che siano state eseguite correttamente:

### Controlla le Tabelle

Verifica che le seguenti tabelle siano state eliminate:
- `payment_methods`
- `subscriptions`
- `subscription_plans`

### Controlla i Trigger

Verifica che i seguenti trigger esistano:
- `trigger_update_drop_on_booking_insert`
- `trigger_update_drop_on_booking_update`
- `trigger_update_drop_on_booking_delete`

Puoi verificare con questa query SQL:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_update_drop%';
```

### Controlla la Funzione

Verifica che la funzione `update_drop_on_booking()` esista:

```sql
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_drop_on_booking';
```

## 📱 Test dell'App

### 1. Test Prenotazione

1. Apri l'app
2. Vai su un drop attivo
3. Prenota un articolo
4. Verifica che:
   - La prenotazione venga creata
   - I valori del drop si aggiornino (current_value, current_discount)
   - Lo stock del prodotto diminuisca
   - Gli aggiornamenti siano visibili in tempo reale

### 2. Test Completamento Drop

1. Vai su Admin → Manage Drops
2. Seleziona un drop attivo con prenotazioni
3. Clicca su "Completa Drop"
4. Verifica che:
   - Le prenotazioni vengano confermate
   - Gli utenti ricevano notifiche
   - Gli ordini vengano creati
   - Il drop venga marcato come completato

### 3. Test Notifiche

1. Completa un drop con prenotazioni
2. Vai su Notifiche come utente
3. Verifica che la notifica contenga:
   - Nome del drop
   - Sconto finale raggiunto
   - Nome del prodotto
   - Prezzo originale e finale
   - Risparmio totale
   - Promemoria pagamento alla consegna

### 4. Test Real-time

1. Apri l'app su due dispositivi diversi
2. Su un dispositivo, prenota un articolo
3. Sull'altro dispositivo, verifica che:
   - I valori del drop si aggiornino automaticamente
   - Lo stock del prodotto si aggiorni
   - L'indicatore "Live" sia visibile

## 🐛 Troubleshooting

### Edge Function non si deploya

Se ricevi errori durante il deploy:

1. Verifica di essere loggato:
   ```bash
   supabase status
   ```

2. Verifica il link al progetto:
   ```bash
   supabase projects list
   ```

3. Prova a fare re-deploy:
   ```bash
   supabase functions deploy capture-drop-payments --no-verify-jwt
   ```

### Trigger non funzionano

Se i valori del drop non si aggiornano:

1. Verifica che i trigger esistano (query sopra)
2. Controlla i log del database:
   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

3. Testa manualmente la funzione:
   ```sql
   -- Crea una prenotazione di test
   INSERT INTO bookings (
     user_id, 
     product_id, 
     drop_id, 
     pickup_point_id,
     original_price,
     discount_percentage,
     final_price,
     payment_method,
     status
   ) VALUES (
     'user-id-here',
     'product-id-here',
     'drop-id-here',
     'pickup-point-id-here',
     100,
     30,
     70,
     'cod',
     'active'
   );
   
   -- Verifica che il drop sia stato aggiornato
   SELECT current_value, current_discount, updated_at 
   FROM drops 
   WHERE id = 'drop-id-here';
   ```

### Real-time non funziona

Se gli aggiornamenti non sono in tempo reale:

1. Verifica che Supabase Realtime sia abilitato per la tabella `drops`:
   - Vai su Supabase Dashboard
   - Database → Replication
   - Verifica che `drops` sia nella lista

2. Controlla la console del browser per errori WebSocket

3. Verifica che l'app sia connessa:
   - Cerca l'indicatore "Live" nella schermata drop-details
   - Se non è visibile, c'è un problema di connessione

### Notifiche non arrivano

Se gli utenti non ricevono notifiche:

1. Verifica che la edge function sia stata deployata correttamente
2. Controlla i log della edge function:
   ```bash
   supabase functions logs capture-drop-payments
   ```

3. Verifica che la tabella `notifications` abbia i permessi RLS corretti:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'notifications';
   ```

## ✅ Checklist Finale

Prima di considerare il deployment completo, verifica:

- [ ] Edge function deployata e funzionante
- [ ] Migrazioni database applicate
- [ ] Trigger database funzionanti
- [ ] Test prenotazione superato
- [ ] Test completamento drop superato
- [ ] Test notifiche superato
- [ ] Test real-time superato
- [ ] Nessun errore nei log
- [ ] App funziona correttamente su iOS
- [ ] App funziona correttamente su Android
- [ ] Documentazione aggiornata

## 📞 Supporto

Se incontri problemi durante il deployment:

1. Controlla i log:
   ```bash
   supabase functions logs capture-drop-payments --tail
   ```

2. Verifica lo stato del progetto:
   ```bash
   supabase status
   ```

3. Consulta la documentazione Supabase:
   - https://supabase.com/docs/guides/functions
   - https://supabase.com/docs/guides/database/triggers

## 🎉 Deployment Completato!

Una volta completati tutti i passaggi e superati tutti i test, il deployment è completo. L'app è ora pronta per l'uso con il nuovo sistema COD!
