
# Guida Test Autenticazione

## Prerequisiti

Prima di iniziare i test, assicurati di aver configurato correttamente Supabase seguendo la guida in `SUPABASE_AUTH_CONFIGURATION_GUIDE.md`.

## Test 1: Registrazione Nuovo Utente

### Passi:
1. Apri l'app e vai alla schermata di login
2. Clicca su "Registrati come Utente"
3. Compila tutti i campi:
   - Nome Completo: "Mario Rossi"
   - Email: usa una tua email reale
   - Telefono: "+39 123 456 7890"
   - Password: "Test1234" (deve rispettare i requisiti)
   - Conferma Password: "Test1234"
   - Punto di Ritiro: seleziona un punto dalla lista

4. Clicca "Registrati"

### Risultato Atteso:
- ✅ Messaggio di successo: "Registrazione Completata! 🎉"
- ✅ Istruzioni per controllare l'email
- ✅ Reindirizzamento alla schermata di login
- ✅ Email ricevuta con oggetto "Conferma la tua registrazione"

### Possibili Errori:
- ❌ "Email già registrata" - L'email è già in uso
- ❌ "Password non valida" - La password non rispetta i requisiti
- ❌ "Seleziona un punto di ritiro" - Nessun punto di ritiro selezionato

## Test 2: Conferma Email

### Passi:
1. Controlla la tua casella email (anche spam)
2. Apri l'email "Conferma la tua registrazione"
3. Clicca sul link "Conferma la tua email"

### Risultato Atteso:
- ✅ L'app si apre automaticamente
- ✅ Messaggio: "Email Confermata!"
- ✅ Reindirizzamento alla schermata di login
- ✅ Ora puoi accedere con le tue credenziali

### Possibili Errori:
- ❌ "Token has expired" - Il link è scaduto (24 ore), richiedi una nuova email
- ❌ "Pagina non trovata" - Problema di configurazione deep linking
- ❌ L'app non si apre - Verifica la configurazione in `app.json`

## Test 3: Login

### Passi:
1. Dalla schermata di login, inserisci:
   - Email: l'email che hai registrato
   - Password: la password che hai scelto
2. Clicca "Accedi"

### Risultato Atteso:
- ✅ Login riuscito
- ✅ Reindirizzamento alla home dell'app
- ✅ Puoi vedere il feed dei prodotti

### Possibili Errori:
- ❌ "Email non confermata" - Devi confermare l'email prima
- ❌ "Email o password non corretti" - Credenziali errate
- ❌ "Account non trovato" - L'email non è registrata

## Test 4: Reset Password

### Passi:
1. Dalla schermata di login, clicca "Hai dimenticato la password?"
2. Inserisci la tua email
3. Clicca "Invia Link di Recupero"
4. Controlla la tua email
5. Clicca sul link "Reimposta la password"
6. Inserisci la nuova password (deve rispettare i requisiti)
7. Conferma la nuova password
8. Clicca "Aggiorna Password"

### Risultato Atteso:
- ✅ Email ricevuta con oggetto "Recupera la tua password"
- ✅ L'app si apre automaticamente quando clicchi il link
- ✅ Puoi inserire la nuova password
- ✅ Messaggio: "Password Aggiornata!"
- ✅ Reindirizzamento alla schermata di login
- ✅ Puoi accedere con la nuova password

### Possibili Errori:
- ❌ "Sessione scaduta" - Il link è scaduto, richiedi un nuovo link
- ❌ "Password non valida" - La nuova password non rispetta i requisiti
- ❌ "Le password non corrispondono" - Password e conferma diverse

## Test 5: Supporto WhatsApp

### Passi:
1. Dalla schermata di login, clicca "Hai bisogno di aiuto?"

### Risultato Atteso:
- ✅ WhatsApp si apre automaticamente
- ✅ Numero destinatario: +393208911937
- ✅ Messaggio pre-compilato: "Ciao, ho bisogno di supporto."

### Possibili Errori:
- ❌ "Supporto non disponibile" - Il numero non è configurato nel database
- ❌ "Impossibile aprire WhatsApp" - WhatsApp non è installato
- ❌ Numero errato - Verifica la configurazione in `app_settings`

## Test 6: Reinvio Email di Conferma

### Passi:
1. Prova ad accedere con un account non confermato
2. Vedrai il messaggio "Email Non Confermata"
3. Clicca "Invia Nuovamente"

### Risultato Atteso:
- ✅ Messaggio: "Email Inviata!"
- ✅ Nuova email ricevuta
- ✅ Puoi cliccare sul nuovo link per confermare

## Verifica Configurazione Database

### Query SQL per verificare:

```sql
-- Verifica numero WhatsApp
SELECT * FROM app_settings WHERE setting_key = 'whatsapp_support_number';

-- Verifica punti di ritiro attivi
SELECT id, name, city, status FROM pickup_points WHERE status = 'active';

-- Verifica profili utente
SELECT user_id, email, full_name, role, pickup_point_id 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- Verifica utenti auth
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;
```

## Checklist Finale

Prima di considerare l'autenticazione funzionante, verifica:

- [ ] Registrazione nuovo utente funziona
- [ ] Email di conferma arriva e il link funziona
- [ ] Login con credenziali corrette funziona
- [ ] Login con email non confermata mostra errore appropriato
- [ ] Reset password funziona end-to-end
- [ ] Supporto WhatsApp si apre correttamente
- [ ] Reinvio email di conferma funziona
- [ ] Logout funziona correttamente
- [ ] Deep linking funziona su iOS e Android

## Troubleshooting

### Email non arrivano
1. Controlla la cartella spam
2. Verifica la configurazione SMTP in Supabase
3. Controlla i log in Supabase Dashboard > Logs > Auth

### Deep linking non funziona
1. Verifica `app.json` - schema deve essere "dropzone"
2. Reinstalla l'app dopo modifiche a `app.json`
3. Su iOS, potrebbe essere necessario riavviare il dispositivo

### Errori di sessione
1. Cancella i dati dell'app
2. Fai logout e login di nuovo
3. Verifica che l'orologio del dispositivo sia sincronizzato

## Log Utili

Per debug, controlla questi log:

```javascript
// Nel codice
console.log('Auth state:', user, session);
console.log('Deep link received:', url);
console.log('Registration result:', data, error);
```

## Supporto

Se i problemi persistono:
1. Controlla i log in Supabase Dashboard
2. Verifica la configurazione seguendo `SUPABASE_AUTH_CONFIGURATION_GUIDE.md`
3. Controlla che tutte le dipendenze siano installate
4. Prova a riavviare il server di sviluppo

## Note Importanti

- I link nelle email scadono dopo 24 ore
- Il numero WhatsApp deve essere in formato internazionale senza spazi
- La password deve rispettare tutti i requisiti di sicurezza
- L'email deve essere confermata prima di poter accedere
- Il deep linking richiede che l'app sia installata sul dispositivo
