
# 🚀 Configurazione Resend per Invio Email Automatico

## Panoramica

L'app ora supporta l'invio automatico di email per l'esportazione dati GDPR tramite **Resend**, un servizio email moderno e affidabile.

## ✅ Cosa è Stato Implementato

- ✅ Edge Function aggiornata per inviare email automatiche
- ✅ Email HTML formattata con allegato JSON
- ✅ Gestione errori e fallback se l'email non può essere inviata
- ✅ Notifiche all'utente sullo stato dell'invio email

## 📋 Prerequisiti

1. Account Resend (gratuito per iniziare)
2. Dominio verificato (opzionale ma consigliato)
3. Accesso al pannello Supabase

## 🔧 Passaggi di Configurazione

### 1. Crea un Account Resend

1. Vai su [resend.com](https://resend.com)
2. Registrati gratuitamente
3. Verifica la tua email

### 2. Ottieni la API Key

1. Accedi al dashboard di Resend
2. Vai su **API Keys**
3. Clicca su **Create API Key**
4. Dai un nome alla chiave (es. "Dropzone Production")
5. Seleziona i permessi: **Send emails**
6. Copia la chiave API (inizia con `re_`)

### 3. Configura il Dominio (Opzionale ma Consigliato)

**Opzione A: Usa il dominio di test di Resend**
- Puoi inviare email da `onboarding@resend.dev`
- Limite: 100 email/giorno
- Solo per testing

**Opzione B: Configura il tuo dominio (Consigliato per produzione)**

1. Nel dashboard Resend, vai su **Domains**
2. Clicca su **Add Domain**
3. Inserisci il tuo dominio (es. `dropzone.app`)
4. Aggiungi i record DNS forniti da Resend:
   - Record SPF
   - Record DKIM
   - Record DMARC (opzionale)
5. Attendi la verifica (può richiedere fino a 48 ore)

### 4. Aggiungi la API Key a Supabase

1. Vai al [dashboard Supabase](https://supabase.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **Settings** → **Edge Functions**
4. Nella sezione **Secrets**, clicca su **Add new secret**
5. Aggiungi:
   - **Name**: `RESEND_API_KEY`
   - **Value**: La tua API key di Resend (es. `re_123abc...`)
6. Clicca su **Save**

### 5. Aggiorna l'Indirizzo Email Mittente

Se hai configurato un dominio personalizzato, aggiorna l'indirizzo mittente nell'Edge Function:

```typescript
// In supabase/functions/export-user-data/index.ts
from: 'Dropzone <noreply@tuodominio.com>', // Sostituisci con il tuo dominio
```

**Nota**: Se usi il dominio di test di Resend, usa:
```typescript
from: 'Dropzone <onboarding@resend.dev>',
```

## 🧪 Test della Configurazione

### Test Manuale

1. Accedi all'app come utente
2. Vai su **Profilo** → **I Miei Dati**
3. Clicca su **Esporta i Tuoi Dati**
4. Conferma l'esportazione
5. Controlla:
   - ✅ Ricevi un messaggio di successo
   - ✅ Ricevi l'email con l'allegato JSON
   - ✅ Il file viene salvato sul dispositivo

### Verifica i Log

Controlla i log dell'Edge Function per vedere se l'email è stata inviata:

```bash
# Nella console Supabase
# Vai su Edge Functions → export-user-data → Logs
```

Cerca questi messaggi:
- ✅ `📧 Sending email to: user@example.com`
- ✅ `✅ Email sent successfully`
- ❌ `❌ Error sending email:` (se c'è un errore)

## 📧 Formato Email

L'email inviata include:

- **Oggetto**: "I Tuoi Dati Personali - Esportazione GDPR"
- **Mittente**: `Dropzone <noreply@tuodominio.com>`
- **Contenuto HTML**: Email formattata con:
  - Intestazione con logo
  - Riepilogo dei dati esportati
  - Avvisi di sicurezza
  - Footer con informazioni legali
- **Allegato**: File JSON con tutti i dati dell'utente

## 🔍 Risoluzione Problemi

### L'email non viene inviata

**Problema**: L'utente non riceve l'email

**Soluzioni**:

1. **Verifica la API Key**
   ```bash
   # Controlla che RESEND_API_KEY sia configurata
   # Dashboard Supabase → Settings → Edge Functions → Secrets
   ```

2. **Controlla i log dell'Edge Function**
   - Cerca errori come "RESEND_API_KEY not configured"
   - Verifica che la chiamata a Resend sia andata a buon fine

3. **Verifica il dominio**
   - Se usi un dominio personalizzato, assicurati che sia verificato
   - Controlla i record DNS

4. **Controlla la cartella spam**
   - Le prime email potrebbero finire nello spam
   - Aggiungi il mittente ai contatti

5. **Limiti di invio**
   - Account gratuito: 100 email/giorno
   - Account a pagamento: limiti più alti

### Errore "Invalid API Key"

**Causa**: La API key non è valida o è scaduta

**Soluzione**:
1. Genera una nuova API key su Resend
2. Aggiorna il secret su Supabase
3. Riprova l'esportazione

### Errore "Domain not verified"

**Causa**: Il dominio non è stato verificato

**Soluzione**:
1. Verifica i record DNS su Resend
2. Attendi fino a 48 ore per la propagazione DNS
3. Usa temporaneamente `onboarding@resend.dev` per i test

## 💰 Prezzi Resend

### Piano Gratuito
- ✅ 100 email/giorno
- ✅ 3,000 email/mese
- ✅ Perfetto per testing e piccoli progetti

### Piano Pro ($20/mese)
- ✅ 50,000 email/mese
- ✅ Email illimitate/giorno
- ✅ Supporto prioritario
- ✅ Analytics avanzate

### Piano Enterprise
- ✅ Volume personalizzato
- ✅ SLA garantito
- ✅ Supporto dedicato

## 🔐 Sicurezza

- ✅ La API key è memorizzata come secret in Supabase
- ✅ Non è mai esposta al client
- ✅ Le email contengono solo dati dell'utente autenticato
- ✅ Gli allegati sono in formato JSON (non eseguibile)

## 📚 Risorse Utili

- [Documentazione Resend](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Configurazione DNS per Email](https://resend.com/docs/dashboard/domains/introduction)

## ✅ Checklist Finale

Prima di andare in produzione, verifica:

- [ ] API key Resend configurata su Supabase
- [ ] Dominio verificato (o usa dominio di test)
- [ ] Email di test inviata con successo
- [ ] Allegato JSON ricevuto correttamente
- [ ] Log dell'Edge Function senza errori
- [ ] Email non finisce nello spam
- [ ] Messaggio di successo mostrato all'utente

## 🎉 Conclusione

Ora l'app è configurata per inviare automaticamente email con i dati esportati! Gli utenti riceveranno:

1. 📧 Email con allegato JSON
2. 💾 File salvato sul dispositivo
3. ✅ Notifica di successo nell'app

Se hai domande o problemi, consulta i log dell'Edge Function o contatta il supporto Resend.
