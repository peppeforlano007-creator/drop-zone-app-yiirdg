
# Guida Integrazione Twilio con Supabase

## Credenziali Twilio Fornite

Hai fornito le seguenti credenziali Twilio:

- **Account SID**: `AC48f6a2a83987ccca8984d2e9e42604b0`
- **Auth Token**: `359587445d47d55a7689058e2234a416`
- **Numero Twilio**: `+16362183294`

## Configurazione Supabase Dashboard

Per integrare Twilio con Supabase e abilitare l'autenticazione via SMS, segui questi passaggi:

### 1. Accedi al Dashboard Supabase

1. Vai su [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Accedi con le tue credenziali
3. Seleziona il progetto: **sippdylyuzejudmzbwdn**

### 2. Configura il Provider SMS (Twilio)

1. Nel menu laterale, vai su **Authentication** → **Providers**
2. Scorri fino alla sezione **Phone**
3. Clicca su **Phone** per espandere le opzioni

### 3. Abilita Phone Authentication

1. Attiva l'interruttore **Enable Phone Sign-Up**
2. Seleziona **Twilio** come provider SMS

### 4. Inserisci le Credenziali Twilio

Inserisci le seguenti informazioni nei campi corrispondenti:

- **Twilio Account SID**: `AC48f6a2a83987ccca8984d2e9e42604b0`
- **Twilio Auth Token**: `359587445d47d55a7689058e2234a416`
- **Twilio Phone Number**: `+16362183294`

### 5. Configura le Impostazioni SMS

1. **SMS Template**: Puoi personalizzare il messaggio SMS. Il template predefinito è:
   ```
   Il tuo codice di verifica è: {{ .Token }}
   ```

2. **Rate Limiting**: Configura i limiti per prevenire abusi:
   - **Max OTP requests per hour**: 10 (consigliato)
   - **Max OTP requests per day**: 50 (consigliato)

### 6. Configura le Impostazioni di Conferma

1. Vai su **Authentication** → **Settings**
2. Nella sezione **User Signups**:
   - **Enable phone confirmations**: DISABILITATO (già configurato)
   - Questo permette agli utenti di registrarsi e impostare la password dopo la verifica OTP

### 7. Salva le Modifiche

Clicca su **Save** per applicare tutte le configurazioni.

## Verifica della Configurazione

### Test Manuale

1. Apri l'app e vai alla schermata di registrazione
2. Inserisci un numero di cellulare valido (con prefisso internazionale, es. +39 per l'Italia)
3. Compila tutti i campi richiesti
4. Clicca su "Invia Codice di Verifica"
5. Dovresti ricevere un SMS con un codice di 6 cifre
6. Inserisci il codice e completa la registrazione

### Test Password Reset

1. Dalla schermata di login, clicca su "Password dimenticata?"
2. Inserisci il tuo numero di cellulare
3. Clicca su "Invia Codice"
4. Dovresti ricevere un SMS con un codice di 6 cifre
5. Inserisci il codice e la nuova password

## Flusso di Autenticazione Implementato

### Registrazione (Una Tantum)
1. L'utente inserisce: nome, numero di cellulare, password, punto di ritiro
2. L'app invia un OTP via SMS tramite Twilio
3. L'utente inserisce il codice OTP ricevuto
4. L'app verifica l'OTP e crea l'account
5. L'app imposta la password scelta dall'utente

### Login (Successivi Accessi)
1. L'utente inserisce: numero di cellulare e password
2. L'app autentica l'utente senza inviare SMS
3. Nessun costo SMS per i login

### Reset Password
1. L'utente richiede il reset della password
2. L'app invia un OTP via SMS tramite Twilio
3. L'utente inserisce il codice OTP ricevuto
4. L'app verifica l'OTP e permette di impostare una nuova password

## Costi Stimati

Con Twilio, i costi SMS sono circa:
- **SMS Italia**: ~€0.08 per messaggio
- **SMS Internazionali**: varia per paese

### Esempio di Costo
- 100 nuove registrazioni al mese: ~€8
- 10 reset password al mese: ~€0.80
- **Totale mensile stimato**: ~€8.80

I login successivi NON hanno costi SMS perché usano password.

## Monitoraggio e Limiti

### Rate Limiting Configurato
- **Max 10 OTP per ora** per numero di telefono
- **Max 50 OTP al giorno** per numero di telefono
- Questo previene abusi e controlla i costi

### Monitoraggio Twilio
1. Accedi al [Dashboard Twilio](https://console.twilio.com/)
2. Vai su **Monitor** → **Logs** → **Messaging**
3. Qui puoi vedere tutti gli SMS inviati, lo stato di consegna e i costi

### Monitoraggio Supabase
1. Nel Dashboard Supabase, vai su **Authentication** → **Users**
2. Puoi vedere tutti gli utenti registrati e il loro metodo di autenticazione
3. Vai su **Logs** per vedere i tentativi di autenticazione

## Risoluzione Problemi

### SMS Non Ricevuto
1. Verifica che il numero sia in formato internazionale (es. +39 per l'Italia)
2. Controlla i log Twilio per vedere se l'SMS è stato inviato
3. Verifica che il numero non sia in blacklist
4. Controlla che il credito Twilio sia sufficiente

### Errore "Rate Limit Exceeded"
- L'utente ha richiesto troppi codici
- Deve attendere 1 ora prima di richiedere un nuovo codice
- Questo è normale e previene abusi

### Errore "Invalid Credentials"
- Verifica che le credenziali Twilio siano corrette nel Dashboard Supabase
- Controlla che l'Auth Token non sia scaduto

### Codice OTP Non Valido
- Il codice ha una validità di 60 secondi
- L'utente deve richiedere un nuovo codice se è scaduto

## Sicurezza

### Best Practices Implementate
1. ✅ OTP usato solo per verifica numero (registrazione e reset password)
2. ✅ Password richiesta per login successivi
3. ✅ Rate limiting per prevenire abusi
4. ✅ Validazione password forte (8+ caratteri, maiuscole, minuscole, numeri)
5. ✅ Session management con refresh token automatico
6. ✅ Credenziali Twilio sicure nel backend Supabase

### Raccomandazioni Aggiuntive
- Monitora regolarmente i log Twilio per attività sospette
- Imposta alert Twilio per spese anomale
- Considera l'aggiunta di CAPTCHA per prevenire bot
- Implementa blocco account dopo troppi tentativi falliti

## Supporto

Se hai problemi con la configurazione:

1. **Documentazione Twilio**: [https://www.twilio.com/docs/sms](https://www.twilio.com/docs/sms)
2. **Documentazione Supabase Phone Auth**: [https://supabase.com/docs/guides/auth/phone-login](https://supabase.com/docs/guides/auth/phone-login)
3. **Supporto Twilio**: [https://support.twilio.com](https://support.twilio.com)
4. **Supporto Supabase**: [https://supabase.com/support](https://supabase.com/support)

## Prossimi Passi

Dopo aver completato la configurazione:

1. ✅ Testa la registrazione con un numero reale
2. ✅ Testa il login con password
3. ✅ Testa il reset password
4. ✅ Monitora i primi SMS inviati nel Dashboard Twilio
5. ✅ Verifica i costi nel Dashboard Twilio
6. ✅ Configura alert per spese anomale

## Checklist Configurazione

- [ ] Accesso al Dashboard Supabase
- [ ] Navigazione su Authentication → Providers → Phone
- [ ] Abilitazione Phone Sign-Up
- [ ] Selezione Twilio come provider
- [ ] Inserimento Account SID: `AC48f6a2a83987ccca8984d2e9e42604b0`
- [ ] Inserimento Auth Token: `359587445d47d55a7689058e2234a416`
- [ ] Inserimento Phone Number: `+16362183294`
- [ ] Configurazione Rate Limiting (10/ora, 50/giorno)
- [ ] Salvataggio configurazione
- [ ] Test registrazione con numero reale
- [ ] Test login con password
- [ ] Test reset password
- [ ] Verifica SMS ricevuto
- [ ] Controllo log Twilio
- [ ] Configurazione alert costi Twilio

## Stato Attuale

✅ **Codice App**: Completamente implementato e pronto
⏳ **Configurazione Supabase**: Da completare seguendo questa guida
⏳ **Test**: Da eseguire dopo la configurazione

Una volta completata la configurazione nel Dashboard Supabase, l'app sarà completamente funzionante con l'autenticazione via SMS Twilio!
