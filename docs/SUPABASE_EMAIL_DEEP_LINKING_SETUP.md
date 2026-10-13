
# Supabase Email Deep Linking Setup Guide

Questa guida spiega come configurare correttamente i link nelle email di Supabase per il recupero password e la conferma email.

## Problema

Safari e altri browser non possono aprire direttamente i link con schema personalizzato (`dropzone://`) dalle email. Questo causa l'errore "l'indirizzo non è valido" quando si clicca sul link di recupero password.

## Soluzione

La soluzione consiste nell'utilizzare un URL web che poi reindirizza all'app tramite deep linking.

## Configurazione Supabase Dashboard

### 1. URL Configuration

Vai su: **Authentication > URL Configuration** nel tuo progetto Supabase

#### Site URL
```
https://sippdylyuzejudmzbwdn.supabase.co
```

#### Redirect URLs (Additional Redirect URLs)
Aggiungi i seguenti URL alla lista:

```
dropzone://email-confirmed
dropzone://update-password
dropzone://**
```

**Nota**: Il wildcard `dropzone://**` permette qualsiasi path sotto lo schema `dropzone://`.

### 2. Email Templates

Vai su: **Authentication > Email Templates** nel tuo progetto Supabase

#### Reset Password Email Template

Modifica il template "Reset Password" per usare il seguente contenuto:

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

#### Confirm Signup Email Template

Modifica il template "Confirm Signup" per usare il seguente contenuto:

**Subject:**
```
Conferma la tua email
```

**Body (HTML):**
```html
<h2>Benvenuto su Drop Zone!</h2>

<p>Grazie per esserti registrato. Per completare la registrazione, conferma il tuo indirizzo email.</p>

<p style="margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}" 
     style="background-color: #4F46E5; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 8px; 
            display: inline-block;
            font-weight: 600;">
    Conferma Email
  </a>
</p>

<p style="color: #666; font-size: 14px;">
  Se non ti sei registrato su Drop Zone, ignora questa email.
</p>

<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

<p style="color: #999; font-size: 12px;">
  Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
  {{ .ConfirmationURL }}
</p>
```

## Come Funziona

1. **L'utente clicca "Hai dimenticato la password?"** nell'app
2. **L'app chiama** `supabase.auth.resetPasswordForEmail()` con `redirectTo: 'dropzone://update-password'`
3. **Supabase invia un'email** con un link che contiene il token di reset
4. **L'utente clicca il link** nell'email
5. **Il browser apre il link** che ha il formato: `https://sippdylyuzejudmzbwdn.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=dropzone://update-password`
6. **Supabase verifica il token** e reindirizza a `dropzone://update-password`
7. **Il sistema operativo apre l'app** Drop Zone tramite deep linking
8. **L'app gestisce il deep link** in `app/_layout.tsx` e naviga alla schermata di aggiornamento password
9. **L'utente imposta la nuova password** e viene reindirizzato al login

## Testing

### Test su iOS Simulator
```bash
xcrun simctl openurl booted "dropzone://update-password"
```

### Test su Android Emulator
```bash
adb shell am start -W -a android.intent.action.VIEW -d "dropzone://update-password"
```

### Test Manuale
1. Vai alla schermata di login
2. Clicca "Hai dimenticato la password?"
3. Inserisci la tua email
4. Controlla la tua casella email
5. Clicca sul link nell'email
6. L'app dovrebbe aprirsi automaticamente sulla schermata di reset password

## Troubleshooting

### Il link non apre l'app
- Verifica che lo schema `dropzone` sia configurato correttamente in `app.json`
- Controlla che i Redirect URLs siano configurati correttamente in Supabase
- Assicurati che l'app sia installata sul dispositivo

### "Link Scaduto" quando si apre l'app
- I link di reset password scadono dopo 1 ora
- Richiedi un nuovo link di reset password

### Safari dice "indirizzo non valido"
- Questo è normale se provi ad aprire il link direttamente nel browser
- Il link deve essere aperto dall'email per funzionare correttamente
- Il browser di sistema gestirà automaticamente il reindirizzamento all'app

## Note Importanti

1. **Deep linking funziona solo su dispositivi fisici e simulatori/emulatori** - Non funziona nel browser web
2. **L'app deve essere installata** sul dispositivo per ricevere i deep link
3. **I link scadono** dopo 1 ora per motivi di sicurezza
4. **Non condividere i link di reset password** - Sono personali e permettono l'accesso al tuo account

## Riferimenti

- [Supabase Deep Linking Documentation](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Expo Linking Documentation](https://docs.expo.dev/guides/linking/)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)
