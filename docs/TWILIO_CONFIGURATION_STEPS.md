
# Configurazione Twilio - Guida Visuale Passo-Passo

## 🎯 Obiettivo
Configurare Twilio nel Dashboard Supabase per abilitare l'invio di SMS per la verifica del numero di telefono.

## 📋 Prerequisiti
- Accesso al Dashboard Supabase
- Credenziali Twilio (già fornite)

## 🔧 Configurazione

### PASSO 1: Accedi a Supabase

1. Apri il browser
2. Vai su: **https://supabase.com/dashboard**
3. Effettua il login con le tue credenziali
4. Seleziona il progetto: **sippdylyuzejudmzbwdn**

---

### PASSO 2: Naviga alle Impostazioni di Autenticazione

1. Nel menu laterale sinistro, clicca su **"Authentication"** (icona con lucchetto)
2. Nel sottomenu, clicca su **"Providers"**
3. Scorri la pagina verso il basso fino a trovare la sezione **"Phone"**

---

### PASSO 3: Abilita Phone Authentication

1. Clicca sulla sezione **"Phone"** per espanderla
2. Attiva l'interruttore **"Enable Phone Sign-Up"** (deve diventare verde/blu)

---

### PASSO 4: Seleziona Twilio come Provider

1. Nel campo **"SMS Provider"**, seleziona **"Twilio"** dal menu a tendina
2. Appariranno nuovi campi per le credenziali Twilio

---

### PASSO 5: Inserisci le Credenziali Twilio

Copia e incolla esattamente questi valori:

#### Campo: **Twilio Account SID**
```
AC48f6a2a83987ccca8984d2e9e42604b0
```

#### Campo: **Twilio Auth Token**
```
359587445d47d55a7689058e2234a416
```

#### Campo: **Twilio Phone Number**
```
+16362183294
```

⚠️ **IMPORTANTE**: 
- Copia i valori esattamente come sono scritti
- Non aggiungere spazi prima o dopo
- Il numero di telefono deve iniziare con il "+"

---

### PASSO 6: Configura il Template SMS (Opzionale)

Il template predefinito va bene, ma puoi personalizzarlo:

**Template predefinito**:
```
Il tuo codice di verifica è: {{ .Token }}
```

**Template personalizzato** (esempio):
```
DropZone - Il tuo codice di verifica è: {{ .Token }}
Valido per 60 secondi.
```

⚠️ **IMPORTANTE**: Il template DEVE contenere `{{ .Token }}` per includere il codice OTP.

---

### PASSO 7: Configura Rate Limiting

Per prevenire abusi e controllare i costi, configura questi limiti:

1. Cerca la sezione **"Rate Limits"** o **"Security"**
2. Imposta:
   - **Max OTP requests per hour**: `10`
   - **Max OTP requests per day**: `50`

Questi limiti impediscono a un singolo numero di richiedere troppi codici.

---

### PASSO 8: Salva la Configurazione

1. Scorri fino in fondo alla pagina
2. Clicca sul pulsante **"Save"** (di solito in basso a destra)
3. Attendi la conferma "Settings saved successfully" o simile

✅ **Configurazione completata!**

---

## 🧪 Test della Configurazione

### Test 1: Registrazione Nuovo Utente

1. **Apri l'app** sul tuo dispositivo o emulatore
2. **Vai alla schermata di registrazione**
3. **Compila i campi**:
   - Nome: `Mario Rossi`
   - Numero: `+39 123 456 7890` (usa il TUO numero reale per il test)
   - Password: `Test1234`
   - Conferma Password: `Test1234`
   - Punto di Ritiro: Seleziona uno dalla lista
   - ✅ Accetta Termini e Condizioni
   - ✅ Accetta Privacy Policy
4. **Clicca "Invia Codice di Verifica"**
5. **Controlla il tuo cellulare** - dovresti ricevere un SMS entro 10-30 secondi
6. **Inserisci il codice** ricevuto via SMS (6 cifre)
7. **Clicca "Completa Registrazione"**

✅ Se tutto funziona, vedrai il messaggio "Registrazione Completata! 🎉"

### Test 2: Login con Password

1. **Vai alla schermata di login**
2. **Inserisci**:
   - Numero: `+39 123 456 7890` (il numero usato per la registrazione)
   - Password: `Test1234`
3. **Clicca "Accedi"**

✅ Dovresti accedere SENZA ricevere SMS (risparmio!)

### Test 3: Reset Password

1. **Dalla schermata di login, clicca "Password dimenticata?"**
2. **Inserisci il numero**: `+39 123 456 7890`
3. **Clicca "Invia Codice"**
4. **Controlla il tuo cellulare** - dovresti ricevere un nuovo SMS
5. **Inserisci il codice** e una nuova password
6. **Clicca "Reimposta Password"**

✅ Se tutto funziona, vedrai "Password Reimpostata! ✅"

---

## 📊 Verifica nei Dashboard

### Dashboard Twilio

1. Vai su: **https://console.twilio.com/**
2. Login con le tue credenziali Twilio
3. Clicca su **"Monitor"** nel menu laterale
4. Clicca su **"Logs"** → **"Messaging"**
5. Dovresti vedere gli SMS inviati con:
   - **To**: Il tuo numero di telefono
   - **From**: +16362183294
   - **Status**: "delivered" (se tutto ok)
   - **Body**: Il messaggio con il codice OTP

### Dashboard Supabase

1. Vai su: **https://supabase.com/dashboard**
2. Seleziona il progetto: **sippdylyuzejudmzbwdn**
3. Clicca su **"Authentication"** → **"Users"**
4. Dovresti vedere il nuovo utente con:
   - **Phone**: +39 123 456 7890
   - **Email**: (generato automaticamente)
   - **Created**: Data e ora di registrazione

---

## ❌ Risoluzione Problemi

### Problema: "SMS non ricevuto"

**Possibili cause**:
1. ❌ Numero non in formato internazionale
   - ✅ Soluzione: Usa `+39` per Italia, `+1` per USA, ecc.

2. ❌ Credenziali Twilio errate
   - ✅ Soluzione: Verifica di aver copiato correttamente Account SID, Auth Token e Phone Number

3. ❌ Credito Twilio insufficiente
   - ✅ Soluzione: Controlla il saldo nel Dashboard Twilio

4. ❌ Numero in blacklist
   - ✅ Soluzione: Verifica nel Dashboard Twilio se il numero è bloccato

**Come verificare**:
- Vai nel Dashboard Twilio → Monitor → Logs → Messaging
- Cerca l'SMS inviato al tuo numero
- Controlla lo "Status":
  - ✅ "delivered" = SMS consegnato
  - ❌ "failed" = Problema di consegna (leggi l'errore)
  - ⏳ "queued" o "sent" = In attesa di consegna

---

### Problema: "Rate limit exceeded"

**Causa**: Hai richiesto troppi codici OTP in poco tempo

**Soluzione**:
- Attendi 1 ora prima di richiedere un nuovo codice
- Questo è normale e previene abusi
- Se sei in fase di test, puoi temporaneamente aumentare i limiti nel Dashboard Supabase

---

### Problema: "Invalid credentials" o "Authentication failed"

**Causa**: Credenziali Twilio errate nel Dashboard Supabase

**Soluzione**:
1. Torna al Dashboard Supabase
2. Vai su Authentication → Providers → Phone
3. Verifica che i valori siano esattamente:
   - Account SID: `AC48f6a2a83987ccca8984d2e9e42604b0`
   - Auth Token: `359587445d47d55a7689058e2234a416`
   - Phone Number: `+16362183294`
4. Salva di nuovo

---

### Problema: "Codice OTP non valido" o "Codice scaduto"

**Causa**: Il codice OTP ha una validità di 60 secondi

**Soluzione**:
- Richiedi un nuovo codice cliccando "Invia nuovamente"
- Inserisci il codice più velocemente
- Verifica di non aver fatto errori di digitazione

---

## 💰 Monitoraggio Costi

### Dashboard Twilio - Costi

1. Vai su: **https://console.twilio.com/**
2. Clicca su **"Usage"** nel menu
3. Seleziona **"Messaging"**
4. Vedrai:
   - Numero di SMS inviati
   - Costo per SMS
   - Costo totale

### Costi Stimati

- **SMS Italia**: ~€0.08 per messaggio
- **SMS USA**: ~€0.01 per messaggio
- **SMS altri paesi**: varia (controlla Twilio Pricing)

**Esempio mensile**:
- 100 nuove registrazioni: ~€8
- 10 reset password: ~€0.80
- Login: €0 (usa password)
- **Totale**: ~€8.80/mese

### Impostare Alert Costi

1. Nel Dashboard Twilio, vai su **"Settings"** → **"Notifications"**
2. Imposta un alert quando la spesa supera una soglia (es. €50/mese)
3. Riceverai un'email se i costi superano il limite

---

## 🔒 Sicurezza

### Configurazioni di Sicurezza Implementate

✅ **Rate Limiting**: Max 10 OTP/ora per numero
✅ **OTP Expiry**: Codice valido solo 60 secondi
✅ **Password Forte**: Minimo 8 caratteri, maiuscole, minuscole, numeri
✅ **Session Management**: Token JWT con refresh automatico
✅ **Credenziali Sicure**: Auth Token Twilio salvato nel backend Supabase

### Raccomandazioni Aggiuntive

1. **Monitora i log** regolarmente per attività sospette
2. **Imposta alert** per spese anomale
3. **Considera CAPTCHA** per prevenire bot (se necessario)
4. **Blocco account** dopo troppi tentativi falliti (già implementato da Supabase)

---

## 📚 Risorse Utili

### Documentazione
- **Twilio SMS**: https://www.twilio.com/docs/sms
- **Supabase Phone Auth**: https://supabase.com/docs/guides/auth/phone-login
- **Twilio Pricing**: https://www.twilio.com/sms/pricing

### Supporto
- **Twilio Support**: https://support.twilio.com
- **Supabase Support**: https://supabase.com/support
- **Twilio Console**: https://console.twilio.com
- **Supabase Dashboard**: https://supabase.com/dashboard

---

## ✅ Checklist Finale

Prima di considerare la configurazione completa, verifica:

- [ ] Accesso al Dashboard Supabase effettuato
- [ ] Navigato su Authentication → Providers → Phone
- [ ] "Enable Phone Sign-Up" attivato
- [ ] "Twilio" selezionato come provider
- [ ] Account SID inserito correttamente
- [ ] Auth Token inserito correttamente
- [ ] Phone Number inserito correttamente (con +)
- [ ] Rate Limiting configurato (10/ora, 50/giorno)
- [ ] Configurazione salvata
- [ ] Test registrazione completato con successo
- [ ] SMS ricevuto sul cellulare
- [ ] Test login con password completato
- [ ] Test reset password completato
- [ ] Verificato SMS nel Dashboard Twilio
- [ ] Verificato utente nel Dashboard Supabase
- [ ] Alert costi configurato nel Dashboard Twilio

---

## 🎉 Congratulazioni!

Se hai completato tutti i passaggi e i test sono andati a buon fine, 
la tua app è ora completamente configurata con l'autenticazione via SMS Twilio!

Gli utenti possono:
- ✅ Registrarsi con verifica SMS
- ✅ Accedere con password (senza SMS)
- ✅ Reimpostare la password con verifica SMS

**Prossimi passi**:
1. Testa con più utenti
2. Monitora i costi nel Dashboard Twilio
3. Raccogli feedback dagli utenti
4. Ottimizza il template SMS se necessario

---

**Tempo totale stimato**: 10-15 minuti ⏱️

**Difficoltà**: Facile 🟢

**Supporto**: Se hai problemi, consulta la sezione "Risoluzione Problemi" o contatta il supporto Twilio/Supabase.
