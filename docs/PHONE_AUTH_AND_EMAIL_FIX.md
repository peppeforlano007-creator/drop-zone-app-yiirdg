
# Phone Authentication & Email Verification Fix

## Sommario delle Modifiche

Questo documento descrive le modifiche implementate per supportare l'autenticazione tramite numero di cellulare e risolvere i problemi di verifica email.

## 1. Autenticazione Tramite Numero di Cellulare

### Modifiche Implementate

#### Login (`app/login.tsx`)
- **Campo di input unificato**: Ora accetta sia numero di cellulare che email
- **Rilevamento automatico**: Il sistema rileva automaticamente se l'input è un'email o un numero di cellulare
- **Supporto dual-mode**: 
  - Se l'input è un'email → usa `signInWithPassword` con email
  - Se l'input è un numero → usa `signInWithPassword` con phone
- **Messaggi di errore migliorati**: Messaggi più chiari per l'utente

#### Registrazione (`app/register/consumer.tsx`)
- **Numero di cellulare obbligatorio**: Campo phone ora è obbligatorio
- **Email opzionale**: L'email è opzionale ma consigliata per il recupero password
- **Registrazione con phone**: Usa `signUp` con phone come identificatore principale
- **Metadata utente**: Email salvata nei metadata anche se opzionale

#### Reset Password (`app/forgot-password.tsx`)
- **Supporto dual-mode**: Accetta sia numero di cellulare che email
- **Reset via email**: Funziona normalmente per utenti con email
- **Reset via phone**: Mostra messaggio per contattare il supporto (SMS OTP non configurato)

### Configurazione Richiesta in Supabase

Per abilitare completamente l'autenticazione tramite telefono, è necessario configurare Supabase:

#### 1. Abilitare Phone Authentication

Nel Dashboard di Supabase:
1. Vai su **Authentication** → **Providers**
2. Abilita **Phone**
3. Configura un provider SMS (Twilio, MessageBird, Vonage, o TextLocal)

#### 2. Configurare Provider SMS

Esempio con Twilio:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

#### 3. Configurare Phone Confirmation (Opzionale)

Se vuoi richiedere la verifica del numero di telefono:
1. Vai su **Authentication** → **Providers** → **Phone**
2. Abilita "Confirm phone"
3. Gli utenti riceveranno un OTP via SMS durante la registrazione

## 2. Problemi Email Verification e Soluzioni

### Problema Identificato

I link nelle email di verifica portano a errori "server non risponde" o "pagina non trovata" perché:

1. **Redirect URL non configurato**: Il deep link `dropzone://` non è configurato correttamente
2. **Email templates non aggiornati**: I template email usano URL non validi
3. **Site URL non configurato**: Il Site URL del progetto non è impostato correttamente

### Soluzioni da Implementare

#### Soluzione 1: Configurare Site URL e Redirect URLs

Nel Dashboard di Supabase:

1. **Vai su Authentication → URL Configuration**

2. **Imposta Site URL**:
   ```
   https://your-app-domain.com
   ```
   O per sviluppo locale:
   ```
   http://localhost:19006
   ```

3. **Aggiungi Redirect URLs**:
   ```
   dropzone://email-confirmed
   dropzone://update-password
   https://your-app-domain.com/email-confirmed
   https://your-app-domain.com/update-password
   ```

#### Soluzione 2: Aggiornare Email Templates

Nel Dashboard di Supabase:

1. **Vai su Authentication → Email Templates**

2. **Aggiorna "Confirm signup" template**:
   ```html
   <h2>Conferma la tua registrazione</h2>
   
   <p>Grazie per esserti registrato! Clicca sul link qui sotto per confermare il tuo account:</p>
   
   <p>
     <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/welcome">
       Conferma Email
     </a>
   </p>
   
   <p>Oppure copia e incolla questo link nel tuo browser:</p>
   <p>{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/welcome</p>
   
   <p>Questo link scadrà tra 24 ore.</p>
   
   <p>Se non hai richiesto questa registrazione, ignora questa email.</p>
   ```

3. **Aggiorna "Reset password" template**:
   ```html
   <h2>Reset Password</h2>
   
   <p>Hai richiesto di reimpostare la tua password. Clicca sul link qui sotto:</p>
   
   <p>
     <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password">
       Reset Password
     </a>
   </p>
   
   <p>Oppure copia e incolla questo link nel tuo browser:</p>
   <p>{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password</p>
   
   <p>Questo link scadrà tra 1 ora.</p>
   
   <p>Se non hai richiesto questo reset, ignora questa email.</p>
   ```

#### Soluzione 3: Creare Endpoint di Conferma

Se usi un dominio web, crea un endpoint `/auth/confirm` che gestisce la verifica:

```typescript
// pages/auth/confirm.tsx o app/auth/confirm/route.ts
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (!error) {
      // Redirect to app with success
      return Response.redirect(`dropzone://email-confirmed?success=true`)
    }
  }

  // Redirect to error page
  return Response.redirect(`dropzone://email-confirmed?error=true`)
}
```

#### Soluzione 4: Configurare Deep Linking (React Native)

Per far funzionare i deep link `dropzone://`:

1. **Aggiorna `app.json`**:
   ```json
   {
     "expo": {
       "scheme": "dropzone",
       "ios": {
         "bundleIdentifier": "com.yourcompany.dropzone",
         "associatedDomains": ["applinks:your-domain.com"]
       },
       "android": {
         "package": "com.yourcompany.dropzone",
         "intentFilters": [
           {
             "action": "VIEW",
             "autoVerify": true,
             "data": [
               {
                 "scheme": "https",
                 "host": "your-domain.com",
                 "pathPrefix": "/auth"
               },
               {
                 "scheme": "dropzone"
               }
             ],
             "category": ["BROWSABLE", "DEFAULT"]
           }
         ]
       }
     }
   }
   ```

2. **Crea handler per deep link**:
   ```typescript
   // app/email-confirmed.tsx
   import { useEffect } from 'react'
   import { useRouter, useLocalSearchParams } from 'expo-router'
   import { Alert } from 'react-native'

   export default function EmailConfirmed() {
     const router = useRouter()
     const { success, error } = useLocalSearchParams()

     useEffect(() => {
       if (success) {
         Alert.alert(
           'Email Confermata!',
           'Il tuo account è stato verificato con successo.',
           [{ text: 'OK', onPress: () => router.replace('/login') }]
         )
       } else if (error) {
         Alert.alert(
           'Errore',
           'Si è verificato un errore durante la verifica. Riprova.',
           [{ text: 'OK', onPress: () => router.replace('/login') }]
         )
       }
     }, [success, error])

     return null
   }
   ```

## 3. Configurazione SMTP (Opzionale ma Consigliata)

Per produzione, configura un server SMTP personalizzato:

### Opzione 1: Resend (Consigliato)

1. Registrati su [Resend](https://resend.com)
2. Verifica il tuo dominio
3. Nel Dashboard Supabase:
   - Vai su **Project Settings** → **Auth** → **SMTP Settings**
   - Abilita "Enable Custom SMTP"
   - Configura:
     ```
     Host: smtp.resend.com
     Port: 465
     Username: resend
     Password: [your-api-key]
     Sender email: noreply@your-domain.com
     Sender name: DropMarket
     ```

### Opzione 2: SendGrid

```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [your-sendgrid-api-key]
```

### Opzione 3: AWS SES

```
Host: email-smtp.[region].amazonaws.com
Port: 587
Username: [your-smtp-username]
Password: [your-smtp-password]
```

## 4. Testing

### Test Autenticazione Phone

1. **Registrazione**:
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     phone: '+39 123 456 7890',
     password: 'SecurePass123',
     options: {
       data: {
         full_name: 'Test User',
         email: 'test@example.com',
         role: 'consumer',
         pickup_point_id: 'uuid'
       }
     }
   })
   ```

2. **Login con Phone**:
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     phone: '+39 123 456 7890',
     password: 'SecurePass123'
   })
   ```

3. **Login con Email** (alternativo):
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'test@example.com',
     password: 'SecurePass123'
   })
   ```

### Test Email Verification

1. Registra un nuovo utente con email
2. Controlla la casella email
3. Clicca sul link di conferma
4. Verifica che l'app si apra correttamente
5. Verifica che l'utente sia confermato nel database

### Test Reset Password

1. Vai su "Hai dimenticato la password?"
2. Inserisci email o numero di telefono
3. Per email: controlla la casella e clicca sul link
4. Per phone: contatta il supporto (SMS non configurato)

## 5. Checklist Configurazione

- [ ] Abilitare Phone Authentication in Supabase
- [ ] Configurare provider SMS (Twilio/MessageBird/Vonage)
- [ ] Impostare Site URL corretto
- [ ] Aggiungere Redirect URLs
- [ ] Aggiornare Email Templates
- [ ] Configurare SMTP personalizzato (produzione)
- [ ] Testare registrazione con phone
- [ ] Testare login con phone
- [ ] Testare login con email (alternativo)
- [ ] Testare email verification
- [ ] Testare password reset
- [ ] Configurare deep linking per mobile
- [ ] Testare deep linking su iOS
- [ ] Testare deep linking su Android

## 6. Troubleshooting

### Problema: "Invalid login credentials"

**Causa**: Utente non confermato o credenziali errate

**Soluzione**:
1. Verifica che l'utente abbia confermato l'email (se richiesto)
2. Controlla che phone/email e password siano corretti
3. Verifica nel Dashboard Supabase → Authentication → Users

### Problema: "Email not confirmed"

**Causa**: Link di conferma non funzionante

**Soluzione**:
1. Verifica Site URL in Supabase
2. Controlla Redirect URLs
3. Aggiorna Email Templates
4. Testa manualmente il link di conferma

### Problema: "Server non risponde" nei link email

**Causa**: Deep link non configurato o Site URL errato

**Soluzione**:
1. Configura Site URL corretto
2. Implementa endpoint `/auth/confirm`
3. Configura deep linking in `app.json`
4. Testa deep linking su dispositivo reale

### Problema: SMS non ricevuti

**Causa**: Provider SMS non configurato

**Soluzione**:
1. Verifica configurazione Twilio/MessageBird
2. Controlla credenziali API
3. Verifica numero di telefono del provider
4. Controlla logs in Supabase Dashboard

## 7. Note Importanti

1. **Numero di Cellulare Obbligatorio**: Il numero di cellulare è ora il metodo principale di autenticazione
2. **Email Opzionale**: L'email è opzionale ma consigliata per il recupero password
3. **SMS OTP Non Configurato**: Il reset password via SMS richiede configurazione aggiuntiva
4. **Deep Linking**: Richiede configurazione sia lato Supabase che lato app
5. **SMTP Produzione**: Usa sempre SMTP personalizzato in produzione (limite 30 email/ora con SMTP default)

## 8. Prossimi Passi

1. Configurare provider SMS per OTP
2. Implementare reset password via SMS
3. Configurare dominio email personalizzato
4. Testare su dispositivi reali iOS e Android
5. Monitorare logs di autenticazione
6. Implementare rate limiting per sicurezza
