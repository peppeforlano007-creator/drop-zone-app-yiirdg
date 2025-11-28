
# Configurazione Supabase per Autenticazione Telefonica

## ⚠️ IMPORTANTE: Configurazione Richiesta

Questo documento descrive i passaggi necessari per configurare Supabase per supportare l'autenticazione tramite numero di cellulare.

## 📋 Checklist Configurazione

### 1. Abilitare Phone Authentication

**Dashboard Supabase** → **Authentication** → **Providers**

1. Clicca su **Phone**
2. Abilita il provider Phone
3. Scegli se richiedere la conferma del numero (consigliato per produzione)

### 2. Configurare Provider SMS

Devi scegliere e configurare un provider SMS. Opzioni disponibili:

#### Opzione A: Twilio (Consigliato)

1. Registrati su [Twilio](https://www.twilio.com)
2. Ottieni:
   - Account SID
   - Auth Token
   - Phone Number
3. In Supabase Dashboard → **Authentication** → **Providers** → **Phone**:
   ```
   Provider: Twilio
   Account SID: [your-account-sid]
   Auth Token: [your-auth-token]
   Phone Number: [your-twilio-number]
   ```

**Costi Twilio**:
- SMS Italia: ~€0.08 per messaggio
- Numero italiano: ~€1/mese

#### Opzione B: MessageBird

1. Registrati su [MessageBird](https://www.messagebird.com)
2. Ottieni API Key
3. In Supabase:
   ```
   Provider: MessageBird
   API Key: [your-api-key]
   Originator: [your-sender-name]
   ```

#### Opzione C: Vonage (ex Nexmo)

1. Registrati su [Vonage](https://www.vonage.com)
2. Ottieni API Key e Secret
3. In Supabase:
   ```
   Provider: Vonage
   API Key: [your-api-key]
   API Secret: [your-api-secret]
   ```

### 3. Configurare Site URL

**Dashboard Supabase** → **Authentication** → **URL Configuration**

1. **Site URL**: Imposta l'URL principale della tua app
   ```
   Produzione: https://your-domain.com
   Sviluppo: http://localhost:19006
   ```

2. **Redirect URLs**: Aggiungi questi URL (uno per riga):
   ```
   dropzone://email-confirmed
   dropzone://update-password
   https://your-domain.com/email-confirmed
   https://your-domain.com/update-password
   http://localhost:19006/email-confirmed
   http://localhost:19006/update-password
   ```

### 4. Configurare Email Templates

**Dashboard Supabase** → **Authentication** → **Email Templates**

#### Template: Confirm signup

```html
<h2>Conferma la tua registrazione</h2>

<p>Grazie per esserti registrato su DropMarket!</p>

<p>Clicca sul link qui sotto per confermare il tuo account:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/welcome" 
     style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
    Conferma Email
  </a>
</p>

<p>Oppure copia e incolla questo link nel tuo browser:</p>
<p style="word-break: break-all; color: #666;">
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/welcome
</p>

<p style="margin-top: 20px; color: #666; font-size: 14px;">
  Questo link scadrà tra 24 ore.
</p>

<p style="color: #999; font-size: 12px;">
  Se non hai richiesto questa registrazione, ignora questa email.
</p>
```

#### Template: Reset password

```html
<h2>Reset Password</h2>

<p>Hai richiesto di reimpostare la tua password su DropMarket.</p>

<p>Clicca sul link qui sotto per procedere:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password"
     style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px;">
    Reset Password
  </a>
</p>

<p>Oppure copia e incolla questo link nel tuo browser:</p>
<p style="word-break: break-all; color: #666;">
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password
</p>

<p style="margin-top: 20px; color: #666; font-size: 14px;">
  <strong>Importante:</strong> Questo link scadrà tra 1 ora.
</p>

<p style="color: #999; font-size: 12px;">
  Se non hai richiesto questo reset, ignora questa email e la tua password rimarrà invariata.
</p>
```

#### Template: Magic Link (Opzionale)

```html
<h2>Il tuo Magic Link</h2>

<p>Clicca sul link qui sotto per accedere a DropMarket:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink"
     style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;">
    Accedi
  </a>
</p>

<p>Oppure copia e incolla questo link nel tuo browser:</p>
<p style="word-break: break-all; color: #666;">
  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink
</p>

<p style="margin-top: 20px; color: #666; font-size: 14px;">
  Questo link scadrà tra 1 ora e può essere usato una sola volta.
</p>
```

### 5. Configurare SMTP Personalizzato (Produzione)

**Dashboard Supabase** → **Project Settings** → **Auth** → **SMTP Settings**

#### Opzione A: Resend (Consigliato - Gratuito fino a 3000 email/mese)

1. Registrati su [Resend](https://resend.com)
2. Verifica il tuo dominio
3. Ottieni API Key
4. In Supabase:
   ```
   Enable Custom SMTP: ON
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: [your-resend-api-key]
   Sender email: noreply@your-domain.com
   Sender name: DropMarket
   ```

#### Opzione B: SendGrid

```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [your-sendgrid-api-key]
Sender email: noreply@your-domain.com
Sender name: DropMarket
```

#### Opzione C: AWS SES

```
Host: email-smtp.eu-west-1.amazonaws.com
Port: 587
Username: [your-smtp-username]
Password: [your-smtp-password]
Sender email: noreply@your-domain.com
Sender name: DropMarket
```

### 6. Configurare Rate Limiting (Sicurezza)

**Dashboard Supabase** → **Authentication** → **Rate Limits**

Configurazioni consigliate:

```
Email OTP:
- Requests per hour: 10
- Validity period: 3600 seconds (1 ora)

SMS OTP:
- Requests per hour: 5
- Validity period: 300 seconds (5 minuti)

Password Reset:
- Requests per hour: 5
- Validity period: 3600 seconds (1 ora)
```

### 7. Configurare Email Confirmation (Opzionale)

**Dashboard Supabase** → **Authentication** → **Providers** → **Email**

- **Confirm email**: ON (consigliato per produzione)
- **Secure email change**: ON
- **Double confirm email change**: ON (massima sicurezza)

## 🧪 Testing

### Test 1: Registrazione con Phone

```bash
# Nel browser o Postman
POST https://sippdylyuzejudmzbwdn.supabase.co/auth/v1/signup
Headers:
  apikey: [your-anon-key]
  Content-Type: application/json
Body:
{
  "phone": "+39 123 456 7890",
  "password": "SecurePass123",
  "data": {
    "full_name": "Test User",
    "email": "test@example.com",
    "role": "consumer"
  }
}
```

### Test 2: Login con Phone

```bash
POST https://sippdylyuzejudmzbwdn.supabase.co/auth/v1/token?grant_type=password
Headers:
  apikey: [your-anon-key]
  Content-Type: application/json
Body:
{
  "phone": "+39 123 456 7890",
  "password": "SecurePass123"
}
```

### Test 3: Login con Email (Alternativo)

```bash
POST https://sippdylyuzejudmzbwdn.supabase.co/auth/v1/token?grant_type=password
Headers:
  apikey: [your-anon-key]
  Content-Type: application/json
Body:
{
  "email": "test@example.com",
  "password": "SecurePass123"
}
```

### Test 4: Email Verification

1. Registra un nuovo utente con email
2. Controlla la casella email
3. Clicca sul link di conferma
4. Verifica che reindirizza correttamente
5. Controlla nel Dashboard → Authentication → Users che l'utente sia confermato

## 🔍 Troubleshooting

### Problema: "Invalid login credentials"

**Possibili cause**:
1. Utente non confermato (se email confirmation è abilitata)
2. Password errata
3. Phone/email non esistente

**Soluzione**:
1. Verifica nel Dashboard → Authentication → Users
2. Controlla lo stato di conferma dell'utente
3. Prova a resettare la password

### Problema: "Email not sent"

**Possibili cause**:
1. SMTP non configurato
2. Rate limit raggiunto
3. Email template non valido

**Soluzione**:
1. Verifica configurazione SMTP
2. Controlla logs in Dashboard → Logs
3. Verifica email templates

### Problema: "SMS not received"

**Possibili cause**:
1. Provider SMS non configurato
2. Credenziali errate
3. Numero di telefono non valido
4. Credito insufficiente sul provider

**Soluzione**:
1. Verifica configurazione Twilio/MessageBird
2. Controlla credenziali API
3. Verifica formato numero (+39...)
4. Controlla saldo sul provider SMS

### Problema: "Link email non funziona"

**Possibili cause**:
1. Site URL non configurato
2. Redirect URLs mancanti
3. Deep linking non configurato

**Soluzione**:
1. Verifica Site URL in Supabase
2. Aggiungi tutti i Redirect URLs
3. Testa con URL completo nel browser

## 📊 Monitoraggio

### Logs da Controllare

**Dashboard Supabase** → **Logs**

1. **Auth Logs**: Monitora tentativi di login, registrazioni, errori
2. **API Logs**: Verifica chiamate API e errori
3. **Database Logs**: Controlla query e performance

### Metriche Importanti

1. **Tasso di conferma email**: % utenti che confermano email
2. **Tasso di successo login**: % login riusciti vs falliti
3. **Errori autenticazione**: Tipi di errori più comuni
4. **Utilizzo SMS**: Numero di SMS inviati (costi)

## 🚀 Deployment Checklist

Prima di andare in produzione:

- [ ] Provider SMS configurato e testato
- [ ] SMTP personalizzato configurato
- [ ] Site URL produzione impostato
- [ ] Redirect URLs produzione aggiunti
- [ ] Email templates aggiornati e testati
- [ ] Rate limiting configurato
- [ ] Deep linking testato su iOS
- [ ] Deep linking testato su Android
- [ ] Email verification testata
- [ ] Password reset testato
- [ ] Phone login testato
- [ ] Email login testato
- [ ] Logs monitorati
- [ ] Backup database configurato

## 📞 Supporto

Se hai problemi con la configurazione:

1. Controlla i logs in Supabase Dashboard
2. Verifica la documentazione ufficiale: https://supabase.com/docs/guides/auth
3. Contatta il supporto Supabase: https://supabase.com/support
4. Community Discord: https://discord.supabase.com

## 🔗 Link Utili

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Phone Login Guide](https://supabase.com/docs/guides/auth/phone-login)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Deep Linking Guide](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Twilio Documentation](https://www.twilio.com/docs)
- [Resend Documentation](https://resend.com/docs)
