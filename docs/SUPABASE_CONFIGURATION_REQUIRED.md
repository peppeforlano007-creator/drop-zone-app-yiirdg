
# Configurazione Supabase Richiesta

## ⚠️ IMPORTANTE: Azioni da Completare nel Dashboard Supabase

Per risolvere i problemi con il pulsante "Hai bisogno di aiuto?" e i link di recupero password, devi aggiornare la configurazione nel tuo dashboard Supabase.

## 1. Configurazione URL (CRITICO)

### Vai a: Authentication → URL Configuration

**Cambia queste impostazioni:**

#### Site URL
- **VECCHIO (NON FUNZIONANTE):** `https://natively.dev/*`
- **NUOVO (CORRETTO):** `dropzone://`

#### Redirect URLs
Aggiungi questi URL alla lista (uno per riga):
- `dropzone://email-confirmed`
- `dropzone://update-password`
- `exp://localhost:8081` (per sviluppo)

### Perché questo cambiamento?

L'app usa uno schema URL personalizzato (`dropzone://`) per i deep link. Il vecchio URL `https://natively.dev/*` causava errori 404 perché non è un dominio reale configurato per la tua app.

## 2. Verifica Numero WhatsApp

Il numero WhatsApp è già configurato nel database:
- **Numero attuale:** `393208911937`
- **Tabella:** `app_settings`
- **Chiave:** `whatsapp_support_number`

### Come modificarlo (se necessario):

1. Vai nell'app come **Admin**
2. Naviga a **Impostazioni**
3. Trova la sezione "Supporto Clienti WhatsApp"
4. Inserisci il numero in formato internazionale senza + o spazi
   - Esempio: `393123456789` per +39 312 345 6789
5. Clicca "Salva Impostazioni"

## 3. Verifica Template Email (Opzionale)

### Vai a: Authentication → Email Templates

Assicurati che i template usino la variabile corretta:

#### Confirm Signup
```
{{ .ConfirmationURL }}
```

#### Reset Password
```
{{ .ConfirmationURL }}
```

Supabase sostituirà automaticamente queste variabili con i link corretti che puntano a `dropzone://`.

## 4. Test dopo la Configurazione

### Test Pulsante Supporto:
1. Apri l'app
2. Vai alla schermata di login
3. Clicca "Hai bisogno di aiuto?"
4. Dovrebbe aprire WhatsApp con il numero configurato

### Test Recupero Password:
1. Clicca "Hai dimenticato la password?"
2. Inserisci la tua email
3. Controlla l'email ricevuta
4. Clicca sul link nell'email
5. Dovrebbe aprire l'app direttamente alla schermata di cambio password

### Test Conferma Email:
1. Registra un nuovo utente
2. Controlla l'email di conferma
3. Clicca sul link nell'email
4. Dovrebbe aprire l'app e confermare l'email automaticamente

## 5. Risoluzione Problemi

### Il link email mostra ancora 404:
- Verifica di aver salvato le modifiche nel dashboard Supabase
- Aspetta qualche minuto per la propagazione delle modifiche
- Prova a richiedere un nuovo link di reset password

### Il pulsante supporto dice "non configurato":
- Verifica che il numero sia salvato nel database
- Controlla che il numero non contenga spazi o caratteri speciali
- Riavvia l'app

### L'app non si apre dal link email:
- Assicurati che l'app sia installata sul dispositivo
- Verifica che lo schema URL `dropzone://` sia configurato correttamente
- Prova a disinstallare e reinstallare l'app

## 6. Checklist Finale

- [ ] Site URL cambiato da `https://natively.dev/*` a `dropzone://`
- [ ] Redirect URLs aggiunti (`dropzone://email-confirmed`, `dropzone://update-password`)
- [ ] Numero WhatsApp verificato in Admin → Impostazioni
- [ ] Test pulsante supporto completato
- [ ] Test recupero password completato
- [ ] Test conferma email completato

## Supporto

Se hai ancora problemi dopo aver completato questi passaggi, verifica:
1. I log di Supabase per errori di autenticazione
2. I log dell'app per errori di deep linking
3. Che l'app sia aggiornata all'ultima versione del codice

---

**Nota:** Questi cambiamenti sono stati implementati nel codice dell'app. Devi solo aggiornare la configurazione nel dashboard Supabase per farli funzionare.
