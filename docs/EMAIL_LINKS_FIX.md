
# Fix per Email di Conferma e Reset Password

## Problema
I link nelle email di conferma e reset password non funzionano (errore "Safari non può connettersi al server").

## Soluzione

### 1. Configurazione Supabase Dashboard

Accedi al dashboard Supabase e configura i redirect URLs:

1. Vai su **Authentication** → **URL Configuration**
2. Aggiungi i seguenti **Redirect URLs**:
   - `exp://localhost:8081` (per sviluppo locale)
   - `dropmarket://` (per produzione con deep linking)
   - `https://tuodominio.com/auth/callback` (se hai un dominio web)

3. Configura **Site URL**: 
   - Sviluppo: `exp://localhost:8081`
   - Produzione: `https://tuodominio.com` o `dropmarket://`

### 2. Deep Linking Configuration

Il progetto è già configurato per gestire deep links attraverso Expo Router.

#### File app.json
Assicurati che il file `app.json` contenga:

```json
{
  "expo": {
    "scheme": "dropmarket",
    "ios": {
      "bundleIdentifier": "com.tuodominio.dropmarket",
      "associatedDomains": ["applinks:tuodominio.com"]
    },
    "android": {
      "package": "com.tuodominio.dropmarket",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "tuodominio.com",
              "pathPrefix": "/auth"
            },
            {
              "scheme": "dropmarket"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### 3. Gestione dei Link nell'App

L'app è già configurata per gestire i link di autenticazione attraverso:

- **Email Confirmation**: Reindirizza automaticamente al login dopo la conferma
- **Password Reset**: Reindirizza alla schermata di aggiornamento password

### 4. Testing

#### Sviluppo Locale
```bash
# Avvia l'app in modalità tunnel per testare su dispositivi reali
npm run dev

# Testa il deep link
npx uri-scheme open "dropmarket://auth/callback?token=test" --ios
npx uri-scheme open "dropmarket://auth/callback?token=test" --android
```

#### Produzione
1. Build dell'app con EAS:
```bash
eas build --platform ios
eas build --platform android
```

2. Configura i domini associati per iOS (Universal Links)
3. Configura gli App Links per Android

### 5. Verifica Configurazione

Dopo aver configurato i redirect URLs nel dashboard Supabase:

1. Registra un nuovo utente
2. Controlla l'email ricevuta
3. Clicca sul link di conferma
4. L'app dovrebbe aprirsi automaticamente

Se l'app non si apre:
- Verifica che il deep linking sia configurato correttamente
- Controlla i log di Expo per errori
- Assicurati che i redirect URLs nel dashboard Supabase corrispondano allo schema dell'app

### 6. Fallback per Browser

Se l'app non è installata, il link aprirà il browser. Puoi creare una pagina web di fallback che:
1. Mostra un messaggio "Apri l'app DropMarket"
2. Fornisce link per scaricare l'app dagli store
3. Tenta di aprire l'app con JavaScript: `window.location = 'dropmarket://auth/callback?token=...'`

## Note Importanti

- **Sviluppo**: Usa `exp://localhost:8081` o `exp://192.168.x.x:8081` (IP della tua macchina)
- **Produzione**: Usa uno schema personalizzato come `dropmarket://` o un dominio web con Universal Links/App Links
- **Testing**: Testa sempre su dispositivi reali, non solo su emulatori
- **Sicurezza**: Non esporre mai le chiavi API o i token in chiaro

## Risoluzione Problemi

### "Safari non può connettersi al server"
- Il redirect URL non è configurato correttamente nel dashboard Supabase
- Lo schema dell'app non corrisponde a quello configurato

### L'app non si apre dal link
- Deep linking non configurato correttamente in app.json
- L'app non è installata sul dispositivo
- Il sistema operativo non riconosce lo schema dell'app

### Il token è scaduto
- I token di conferma email scadono dopo 24 ore
- Richiedi un nuovo link di conferma

## Contatti

Per supporto tecnico, contatta l'amministratore del sistema.
