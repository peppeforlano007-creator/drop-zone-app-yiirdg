
# Guida Configurazione Autenticazione Supabase

## Problema Risolto
L'autenticazione email e il reset password non funzionavano correttamente perché i link nelle email puntavano direttamente a Supabase invece che all'app.

## Configurazione Supabase Dashboard

### 1. URL Configuration (Authentication > URL Configuration)

Vai su: https://supabase.com/dashboard/project/sippdylyuzejudmzbwdn/auth/url-configuration

**Site URL:**
```
dropzone://
```

**Redirect URLs (aggiungi tutte queste):**
```
dropzone://email-confirmed
dropzone://update-password
dropzone://**
```

### 2. Email Templates (Authentication > Email Templates)

#### Template "Confirm signup"

**Subject:**
```
Conferma la tua registrazione
```

**Body (HTML):**
```html
<h2>Benvenuto su DROPMARKET!</h2>

<p>Grazie per esserti registrato. Per completare la registrazione, clicca sul link qui sotto:</p>

<p><a href="{{ .SiteURL }}email-confirmed?token_hash={{ .TokenHash }}&type=email">Conferma la tua email</a></p>

<p>Oppure copia e incolla questo link nel tuo browser:</p>
<p>{{ .SiteURL }}email-confirmed?token_hash={{ .TokenHash }}&type=email</p>

<p>Questo link scadrà tra 24 ore.</p>

<p>Se non hai richiesto questa registrazione, ignora questa email.</p>

<p>Cordiali saluti,<br>
Il team DROPMARKET</p>
```

#### Template "Reset Password"

**Subject:**
```
Recupera la tua password
```

**Body (HTML):**
```html
<h2>Recupero Password</h2>

<p>Hai richiesto di reimpostare la tua password. Clicca sul link qui sotto per procedere:</p>

<p><a href="{{ .SiteURL }}update-password?token_hash={{ .TokenHash }}&type=recovery">Reimposta la password</a></p>

<p>Oppure copia e incolla questo link nel tuo browser:</p>
<p>{{ .SiteURL }}update-password?token_hash={{ .TokenHash }}&type=recovery</p>

<p>Questo link scadrà tra 24 ore.</p>

<p>Se non hai richiesto il recupero della password, ignora questa email.</p>

<p>Cordiali saluti,<br>
Il team DROPMARKET</p>
```

#### Template "Magic Link"

**Subject:**
```
Il tuo link di accesso
```

**Body (HTML):**
```html
<h2>Accesso Rapido</h2>

<p>Clicca sul link qui sotto per accedere al tuo account:</p>

<p><a href="{{ .SiteURL }}email-confirmed?token_hash={{ .TokenHash }}&type=magiclink">Accedi ora</a></p>

<p>Oppure copia e incolla questo link nel tuo browser:</p>
<p>{{ .SiteURL }}email-confirmed?token_hash={{ .TokenHash }}&type=magiclink</p>

<p>Questo link scadrà tra 24 ore.</p>

<p>Se non hai richiesto questo link, ignora questa email.</p>

<p>Cordiali saluti,<br>
Il team DROPMARKET</p>
```

### 3. Auth Providers (Authentication > Providers)

**Email:**
- ✅ Enable Email provider
- ✅ Confirm email (abilitato)
- ✅ Secure email change (abilitato)

### 4. Rate Limits (Authentication > Rate Limits)

Configurazione consigliata:
- Email OTP: 60 secondi tra le richieste
- SMS OTP: 60 secondi tra le richieste
- Email per ora: 30 (con SMTP personalizzato puoi aumentare)

## Come Testare

### Test Email Confirmation:
1. Registra un nuovo utente dall'app
2. Controlla la tua email
3. Clicca sul link "Conferma la tua email"
4. L'app dovrebbe aprirsi automaticamente e mostrare un messaggio di conferma
5. Dovresti essere reindirizzato alla schermata di login

### Test Password Reset:
1. Dalla schermata di login, clicca "Hai dimenticato la password?"
2. Inserisci la tua email
3. Controlla la tua email
4. Clicca sul link "Reimposta la password"
5. L'app dovrebbe aprirsi automaticamente
6. Inserisci la nuova password
7. Dovresti essere reindirizzato alla schermata di login

### Test WhatsApp Support:
1. Dalla schermata di login, clicca "Hai bisogno di aiuto?"
2. WhatsApp dovrebbe aprirsi con un messaggio pre-compilato
3. Il numero dovrebbe essere: +393208911937

## Risoluzione Problemi

### Il link email non apre l'app
- Verifica che il deep linking sia configurato correttamente in `app.json`
- Assicurati che lo schema `dropzone://` sia registrato
- Su iOS, potrebbe essere necessario reinstallare l'app

### "Token has expired or is invalid"
- Il link è valido solo per 24 ore
- Richiedi un nuovo link
- Verifica che l'orologio del dispositivo sia sincronizzato

### WhatsApp non si apre
- Verifica che WhatsApp sia installato sul dispositivo
- Controlla che il numero sia configurato correttamente nel database
- Il numero deve essere in formato internazionale senza spazi: 393208911937

## Note Importanti

1. **Deep Linking**: L'app usa lo schema `dropzone://` per i deep link
2. **Token Hash**: I link usano `token_hash` invece di `token` per maggiore sicurezza
3. **Scadenza**: Tutti i link scadono dopo 24 ore
4. **SMTP**: Per produzione, configura un server SMTP personalizzato per evitare limiti di rate

## Configurazione SMTP Personalizzato (Opzionale)

Per produzione, è consigliato configurare un server SMTP personalizzato:

1. Vai su: Authentication > Email Templates > SMTP Settings
2. Configura il tuo provider SMTP (SendGrid, AWS SES, Mailgun, etc.)
3. Questo ti permetterà di:
   - Inviare più email per ora
   - Personalizzare il mittente
   - Avere statistiche di consegna
   - Migliorare la deliverability

## Supporto

Per problemi o domande:
- Controlla i log in Supabase Dashboard > Logs
- Verifica la configurazione in questo documento
- Contatta il supporto Supabase se necessario
