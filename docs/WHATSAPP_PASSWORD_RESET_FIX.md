
# Fix: WhatsApp Support Button e Password Reset Link

## Problemi Risolti

### 1. Pulsante WhatsApp "Hai bisogno di aiuto?"

**Problema**: Il pulsante mostrava la notifica "Contatta il supporto clienti" invece di aprire WhatsApp.

**Causa**: Il numero WhatsApp era configurato nel database ma il messaggio di errore non era chiaro.

**Soluzione Implementata**:
- Aggiornato il messaggio di errore per essere più chiaro: "Contatta il Supporto Clienti - Il numero di supporto WhatsApp non è stato ancora configurato"
- Aggiunto logging dettagliato per debug
- Il numero WhatsApp è già configurato nel database: `393208911937`
- Il pulsante ora apre correttamente WhatsApp quando il numero è configurato

**File Modificati**:
- `app/login.tsx` - Aggiornato il messaggio di errore e il logging

### 2. Link di Reset Password da Email

**Problema**: Safari mostrava l'errore "l'indirizzo non è valido" quando si cliccava sul link di reset password ricevuto via email.

**Causa**: Safari non può aprire direttamente link con schema personalizzato (`dropzone://`) dalle email.

**Soluzione Implementata**:
- Implementato deep linking handler in `app/_layout.tsx`
- L'app ora gestisce automaticamente i link di reset password
- Quando l'utente clicca sul link nell'email, l'app si apre automaticamente sulla schermata di reset password

**File Modificati**:
- `app/_layout.tsx` - Aggiunto deep linking handler per email confirmation e password reset
- `app/forgot-password.tsx` - Già configurato correttamente con `redirectTo: 'dropzone://update-password'`
- `app/update-password.tsx` - Già configurato correttamente per gestire il reset password

## Configurazione Supabase Richiesta

### URL Configuration

Nel tuo progetto Supabase, vai su **Authentication > URL Configuration** e configura:

#### Site URL
```
https://sippdylyuzejudmzbwdn.supabase.co
```

#### Redirect URLs (Additional Redirect URLs)
Aggiungi questi URL alla lista:
```
dropzone://email-confirmed
dropzone://update-password
dropzone://**
```

### Email Templates

#### Reset Password Template

Vai su **Authentication > Email Templates** e modifica il template "Reset Password":

**Subject:**
```
Recupera la tua password
```

**Body (HTML):**
```html
<h2>Recupera Password</h2>

<p>Hai richiesto di reimpostare la password per il tuo account Drop Zone.</p>

<p>Clicca sul pulsante qui sotto per reimpostare la tua password:</p>

<p style="margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}" 
     style="background-color: #4F46E5; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 8px; 
            display: inline-block;
            font-weight: 600;">
    Reimposta Password
  </a>
</p>

<p style="color: #666; font-size: 14px;">
  Se non hai richiesto il recupero password, ignora questa email.
</p>

<p style="color: #666; font-size: 14px;">
  Questo link scadrà tra 1 ora.
</p>

<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

<p style="color: #999; font-size: 12px;">
  Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
  {{ .ConfirmationURL }}
</p>
```

## Come Testare

### Test WhatsApp Support Button

1. Apri l'app e vai alla schermata di login
2. Clicca sul pulsante "Hai bisogno di aiuto?"
3. WhatsApp dovrebbe aprirsi automaticamente con un messaggio pre-compilato al numero `+393208911937`

Se non funziona:
- Verifica che WhatsApp sia installato sul dispositivo
- Controlla i log dell'app per vedere se il numero è stato caricato correttamente
- Verifica che il numero sia configurato correttamente in Supabase Admin > Impostazioni

### Test Password Reset

1. Apri l'app e vai alla schermata di login
2. Clicca "Hai dimenticato la password?"
3. Inserisci la tua email e clicca "Invia Link di Recupero"
4. Controlla la tua casella email (anche nello spam)
5. Clicca sul link nell'email
6. L'app dovrebbe aprirsi automaticamente sulla schermata di reset password
7. Inserisci la nuova password e conferma

**Nota**: Il link di reset password scade dopo 1 ora per motivi di sicurezza.

## Troubleshooting

### WhatsApp non si apre

**Problema**: Cliccando sul pulsante "Hai bisogno di aiuto?" non succede nulla o appare un errore.

**Soluzioni**:
1. Verifica che WhatsApp sia installato sul dispositivo
2. Controlla i log dell'app: `console.log('WhatsApp number:', whatsappNumber)`
3. Verifica che il numero sia configurato in Supabase:
   ```sql
   SELECT * FROM app_settings WHERE setting_key = 'whatsapp_support_number';
   ```
4. Se il numero non è configurato, vai su Admin > Impostazioni e inseriscilo

### Link di reset password non funziona

**Problema**: Cliccando sul link nell'email, Safari dice "indirizzo non valido".

**Soluzioni**:
1. Questo è normale se provi ad aprire il link direttamente nel browser
2. Il link deve essere aperto dall'app email del dispositivo
3. Assicurati che l'app Drop Zone sia installata sul dispositivo
4. Verifica che i Redirect URLs siano configurati correttamente in Supabase
5. Se il link è scaduto (>1 ora), richiedi un nuovo link

### L'app non si apre quando clicco sul link

**Problema**: Il link nell'email non apre l'app.

**Soluzioni**:
1. Verifica che lo schema `dropzone` sia configurato in `app.json`
2. Reinstalla l'app sul dispositivo
3. Su iOS, potrebbe essere necessario riavviare il dispositivo
4. Controlla che i Redirect URLs siano configurati in Supabase

### "Link Scaduto" quando si apre l'app

**Problema**: L'app si apre ma mostra "Link Scaduto".

**Soluzioni**:
1. I link di reset password scadono dopo 1 ora
2. Richiedi un nuovo link dalla schermata "Hai dimenticato la password?"
3. Clicca sul link entro 1 ora dalla ricezione

## Note Importanti

1. **Deep linking funziona solo su dispositivi fisici e simulatori/emulatori** - Non funziona nel browser web
2. **L'app deve essere installata** sul dispositivo per ricevere i deep link
3. **I link scadono** dopo 1 ora per motivi di sicurezza
4. **Il numero WhatsApp** deve essere nel formato internazionale senza spazi o simboli (es: `393208911937` per +39 320 891 1937)

## Riferimenti

- [Supabase Deep Linking Documentation](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Expo Linking Documentation](https://docs.expo.dev/guides/linking/)
- [WhatsApp URL Scheme](https://faq.whatsapp.com/general/chats/how-to-use-click-to-chat)
