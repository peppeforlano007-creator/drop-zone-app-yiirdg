
# Guida Configurazione Supabase per Email e WhatsApp

## ⚠️ IMPORTANTE: Configurazione Richiesta

Per far funzionare correttamente il reset password e la conferma email, devi configurare i seguenti parametri nel tuo progetto Supabase.

## 📧 Configurazione URL

### Passo 1: Vai su Supabase Dashboard

1. Apri il tuo progetto Supabase: https://supabase.com/dashboard/project/sippdylyuzejudmzbwdn
2. Vai su **Authentication** (nel menu laterale)
3. Clicca su **URL Configuration**

### Passo 2: Configura Site URL

Nel campo **Site URL**, inserisci:
```
https://sippdylyuzejudmzbwdn.supabase.co
```

### Passo 3: Configura Redirect URLs

Nel campo **Redirect URLs** (Additional Redirect URLs), aggiungi questi tre URL (uno per riga):

```
dropzone://email-confirmed
dropzone://update-password
dropzone://**
```

**Nota**: Il terzo URL con `**` è un wildcard che permette qualsiasi path sotto lo schema `dropzone://`.

### Passo 4: Salva le Modifiche

Clicca sul pulsante **Save** in fondo alla pagina.

## 📝 Configurazione Email Templates

### Template Reset Password

1. Nel tuo progetto Supabase, vai su **Authentication** > **Email Templates**
2. Seleziona il template **Reset Password**
3. Sostituisci il contenuto con questo:

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

4. Clicca **Save**

### Template Confirm Signup

1. Seleziona il template **Confirm Signup**
2. Sostituisci il contenuto con questo:

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

3. Clicca **Save**

## 📱 Configurazione Numero WhatsApp

Il numero WhatsApp è già configurato nel database: **+39 320 891 1937**

Se vuoi cambiarlo:

1. Apri l'app come Admin
2. Vai su **Impostazioni**
3. Nella sezione "Supporto Clienti WhatsApp", inserisci il nuovo numero
4. Il formato deve essere: codice paese + numero senza spazi o simboli
   - Esempio: `393208911937` per +39 320 891 1937
5. Clicca **Salva Impostazioni**

## ✅ Verifica Configurazione

### Test Reset Password

1. Apri l'app
2. Clicca "Hai dimenticato la password?"
3. Inserisci la tua email
4. Controlla la tua casella email
5. Clicca sul link nell'email
6. L'app dovrebbe aprirsi automaticamente sulla schermata di reset password

### Test WhatsApp Support

1. Apri l'app
2. Nella schermata di login, clicca "Hai bisogno di aiuto?"
3. WhatsApp dovrebbe aprirsi con un messaggio pre-compilato

## 🔧 Troubleshooting

### Safari dice "indirizzo non valido"

Questo è normale! Il link deve essere aperto dall'app email del dispositivo, non dal browser. Quando clicchi sul link nell'email:

1. iOS/Android riconoscerà lo schema `dropzone://`
2. Il sistema operativo aprirà automaticamente l'app Drop Zone
3. L'app gestirà il link e ti porterà alla schermata corretta

### WhatsApp non si apre

Verifica che:
1. WhatsApp sia installato sul dispositivo
2. Il numero sia configurato correttamente in Admin > Impostazioni
3. Il numero sia nel formato corretto (solo cifre, senza + o spazi)

### Link scaduto

I link di reset password scadono dopo 1 ora per motivi di sicurezza. Se il link è scaduto, richiedi un nuovo link.

## 📚 Documentazione Completa

Per maggiori dettagli, consulta:
- `docs/SUPABASE_EMAIL_DEEP_LINKING_SETUP.md` - Guida tecnica completa
- `docs/WHATSAPP_PASSWORD_RESET_FIX.md` - Dettagli sui fix implementati

## 🆘 Supporto

Se hai problemi con la configurazione:
1. Controlla i log dell'app per messaggi di errore
2. Verifica che tutti i passaggi siano stati completati
3. Assicurati che l'app sia installata sul dispositivo (non nel browser)
4. Riavvia l'app dopo aver modificato le configurazioni in Supabase
