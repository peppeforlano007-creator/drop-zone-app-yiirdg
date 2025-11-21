
# Configurazione Servizio Email per Esportazione Dati

## Problema Attuale

L'Edge Function `export-user-data` è stata implementata e funziona correttamente, ma **non può inviare email automaticamente** perché Supabase non include un servizio email integrato per email personalizzate.

Supabase può inviare solo email di autenticazione (conferma email, reset password, ecc.) ma non email personalizzate con contenuti arbitrari.

## Soluzione Attuale

Attualmente, quando un utente richiede l'esportazione dei dati:

1. ✅ L'Edge Function raccoglie tutti i dati dell'utente dal database
2. ✅ Crea un record nella tabella `data_requests` per tracciare la richiesta
3. ✅ Restituisce i dati in formato JSON all'app
4. ✅ L'app permette all'utente di scaricare/condividere il file JSON

**L'utente riceve i suoi dati immediatamente, ma tramite download invece che via email.**

## Come Abilitare l'Invio Email Automatico

Per abilitare l'invio automatico via email, devi integrare un servizio email. Ecco le opzioni consigliate:

### Opzione 1: Resend (Consigliato) ⭐

**Vantaggi:**
- Facile da configurare
- Piano gratuito generoso (100 email/giorno)
- API moderna e semplice
- Ottima deliverability

**Setup:**

1. **Crea un account su [Resend](https://resend.com)**

2. **Ottieni la tua API Key**
   - Dashboard → API Keys → Create API Key

3. **Aggiungi la chiave come secret in Supabase**
   ```bash
   # Dalla CLI di Supabase
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
   
   # Oppure dal Dashboard Supabase
   # Project Settings → Edge Functions → Secrets
   ```

4. **Verifica il tuo dominio (opzionale ma consigliato)**
   - Aggiungi i record DNS forniti da Resend
   - Questo migliora la deliverability e permette di usare il tuo dominio

5. **Aggiorna l'Edge Function**
   
   Decommentare e modificare questa sezione in `supabase/functions/export-user-data/index.ts`:

   ```typescript
   // Dopo aver raccolto i dati dell'utente (userData)
   
   const resendApiKey = Deno.env.get('RESEND_API_KEY');
   
   if (resendApiKey) {
     try {
       const emailResponse = await fetch('https://api.resend.com/emails', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${resendApiKey}`,
         },
         body: JSON.stringify({
           from: 'noreply@tuodominio.com', // Usa il tuo dominio verificato
           to: user.email,
           subject: 'I Tuoi Dati Personali - Esportazione GDPR',
           html: `
             <h2>Esportazione Dati Completata</h2>
             <p>Ciao,</p>
             <p>Come richiesto, ecco i tuoi dati personali in formato JSON:</p>
             <p>Puoi scaricare il file allegato o copiare i dati qui sotto:</p>
             <details>
               <summary>Visualizza Dati</summary>
               <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
                 ${JSON.stringify(userData, null, 2)}
               </pre>
             </details>
             <p>Questi dati sono stati esportati in conformità con il GDPR.</p>
             <p>Se non hai richiesto questa esportazione, contattaci immediatamente.</p>
           `,
           attachments: [
             {
               filename: `dati_personali_${new Date().toISOString().split('T')[0]}.json`,
               content: Buffer.from(JSON.stringify(userData, null, 2)).toString('base64'),
             },
           ],
         }),
       });

       if (!emailResponse.ok) {
         const error = await emailResponse.text();
         console.error('❌ Errore invio email:', error);
       } else {
         console.log('✅ Email inviata con successo');
       }
     } catch (emailError) {
       console.error('❌ Eccezione invio email:', emailError);
     }
   }
   ```

6. **Rideploy dell'Edge Function**
   ```bash
   supabase functions deploy export-user-data
   ```

### Opzione 2: SendGrid

**Vantaggi:**
- Piano gratuito (100 email/giorno)
- Molto affidabile
- Ottima documentazione

**Setup:**

1. Crea account su [SendGrid](https://sendgrid.com)
2. Ottieni API Key
3. Aggiungi come secret: `SENDGRID_API_KEY`
4. Usa l'API di SendGrid nell'Edge Function

**Esempio codice:**
```typescript
const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');

const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sendgridApiKey}`,
  },
  body: JSON.stringify({
    personalizations: [{
      to: [{ email: user.email }],
    }],
    from: { email: 'noreply@tuodominio.com' },
    subject: 'I Tuoi Dati Personali - Esportazione GDPR',
    content: [{
      type: 'text/html',
      value: `<p>I tuoi dati...</p>`,
    }],
  }),
});
```

### Opzione 3: AWS SES

**Vantaggi:**
- Molto economico (€0.10 per 1000 email)
- Altamente scalabile
- Integrato con AWS

**Svantaggi:**
- Setup più complesso
- Richiede verifica dominio

## Test

Dopo aver configurato il servizio email:

1. Accedi all'app come utente
2. Vai su "Profilo" → "I Miei Dati"
3. Clicca su "Esporta i Tuoi Dati"
4. Controlla la tua email (e la cartella spam)

## Monitoraggio

Puoi monitorare l'invio delle email:

1. **Logs dell'Edge Function:**
   ```bash
   supabase functions logs export-user-data
   ```

2. **Dashboard del servizio email:**
   - Resend: Dashboard → Logs
   - SendGrid: Activity → Email Activity
   - AWS SES: CloudWatch Logs

## Note Importanti

- ⚠️ **Privacy:** Le email contengono dati personali sensibili. Assicurati che:
  - Il servizio email sia GDPR compliant
  - Le email siano inviate tramite connessione sicura (TLS)
  - I dati siano crittografati in transito

- 📧 **Deliverability:** Per evitare che le email finiscano nello spam:
  - Verifica il tuo dominio
  - Configura SPF, DKIM e DMARC
  - Usa un dominio professionale (non gmail.com)

- 💰 **Costi:** Tutti i servizi hanno piani gratuiti sufficienti per iniziare:
  - Resend: 100 email/giorno gratis
  - SendGrid: 100 email/giorno gratis
  - AWS SES: 62.000 email/mese gratis (primi 12 mesi)

## Supporto

Se hai bisogno di aiuto con la configurazione:
1. Consulta la documentazione del servizio email scelto
2. Controlla i logs dell'Edge Function
3. Verifica che i secrets siano configurati correttamente in Supabase
