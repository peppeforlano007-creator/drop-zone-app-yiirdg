
# Drop Zone - Guida Completa al Deployment

## 📋 Indice

1. [Pre-requisiti](#pre-requisiti)
2. [Checklist Pre-Deployment](#checklist-pre-deployment)
3. [Configurazione App](#configurazione-app)
4. [Build e Test](#build-e-test)
5. [Submission Apple App Store](#submission-apple-app-store)
6. [Submission Google Play Store](#submission-google-play-store)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Pre-requisiti

### Account Necessari

- ✅ **Apple Developer Account** ($99/anno)
  - Registrati su: https://developer.apple.com
  - Tempo di approvazione: 24-48 ore

- ✅ **Google Play Console Account** ($25 una tantum)
  - Registrati su: https://play.google.com/console
  - Tempo di attivazione: immediato

- ✅ **Expo Account** (gratuito)
  - Registrati su: https://expo.dev
  - Necessario per EAS Build

### Software Richiesto

```bash
# Node.js (v18 o superiore)
node --version

# Expo CLI
npm install -g expo-cli

# EAS CLI
npm install -g eas-cli

# Git
git --version
```

---

## ✅ Checklist Pre-Deployment

### 1. Testing Completo

Esegui tutti i test dalla dashboard admin:

```
App → Admin → Testing & Deployment → Esegui Test Completi
```

**Tutti i test devono passare (100% successo)**

Test inclusi:
- ✅ Performance Database
- ✅ Navigazione Prodotti
- ✅ Funzionalità Drop
- ✅ Sicurezza RLS
- ✅ Aggiornamenti Real-time
- ✅ Caricamento Immagini
- ✅ Validazione Liste Fornitori
- ✅ Parsing Excel
- ✅ Transizioni Stato Drop
- ✅ Validazione Metodi Pagamento
- ✅ Sicurezza Pagamenti

### 2. Sicurezza Database

Verifica che tutti i warning di sicurezza siano risolti:

```sql
-- Controlla le politiche RLS
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Verifica che tutte le tabelle abbiano RLS abilitato
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 3. Configurazione Ambiente

Verifica le variabili d'ambiente in Supabase:

- `STRIPE_SECRET_KEY` - Chiave segreta Stripe
- `STRIPE_PUBLISHABLE_KEY` - Chiave pubblica Stripe
- `SUPABASE_URL` - URL del progetto Supabase
- `SUPABASE_ANON_KEY` - Chiave anonima Supabase

### 4. Contenuti App Store

Prepara i seguenti materiali:

#### Screenshot (richiesti per entrambi gli store)

**iOS:**
- iPhone 6.7" (1290 x 2796 px) - 3-10 screenshot
- iPhone 6.5" (1242 x 2688 px) - 3-10 screenshot
- iPad Pro 12.9" (2048 x 2732 px) - 3-10 screenshot

**Android:**
- Phone (1080 x 1920 px) - 2-8 screenshot
- 7" Tablet (1200 x 1920 px) - opzionale
- 10" Tablet (1920 x 1200 px) - opzionale

#### Icone

- **iOS:** 1024 x 1024 px (PNG, senza trasparenza)
- **Android:** 512 x 512 px (PNG, con trasparenza)

#### Video Promozionale (opzionale ma consigliato)

- Durata: 15-30 secondi
- Formato: MP4 o MOV
- Risoluzione: 1080p minimo

#### Testi

**Nome App:**
```
Drop Zone
```

**Sottotitolo (iOS, max 30 caratteri):**
```
Sconti progressivi collettivi
```

**Descrizione Breve (Android, max 80 caratteri):**
```
Social e-commerce con sconti che crescono con le prenotazioni
```

**Descrizione Completa:**
```
Drop Zone è la rivoluzionaria piattaforma di social e-commerce che trasforma 
lo shopping in un'esperienza collettiva e conveniente.

🎯 COME FUNZIONA

1. SCOPRI - Scorri il feed di prodotti esclusivi dai nostri fornitori
2. PRENOTA - Esprimi interesse per i prodotti che ti piacciono
3. ATTIVA IL DROP - Quando abbastanza persone prenotano, il drop si attiva
4. CONDIVIDI - Più persone partecipano, più lo sconto cresce
5. ACQUISTA - Paga solo quando il drop si chiude, al miglior sconto raggiunto

💰 SCONTI PROGRESSIVI

Gli sconti partono dal 30% e possono arrivare fino all'80% in base al numero 
di partecipanti. Più persone coinvolgi, più risparmi!

🚀 CARATTERISTICHE PRINCIPALI

- Feed prodotti stile TikTok per un'esperienza coinvolgente
- Drop temporizzati di 5 giorni per creare urgenza
- Pagamento sicuro con autorizzazione preventiva
- Ritiro comodo presso i nostri punti partner
- Notifiche real-time sull'andamento degli sconti
- Condivisione facile per coinvolgere amici e famiglia

🛡️ SICUREZZA E GARANZIE

- Pagamenti gestiti da Stripe (certificato PCI DSS)
- Autorizzazione preventiva senza addebito immediato
- Addebito finale solo al prezzo scontato raggiunto
- Rimborso automatico se il drop non si completa

📍 PUNTI DI RITIRO

Ritira i tuoi acquisti presso i nostri punti partner nelle principali città 
italiane. Comodo, veloce e senza costi di spedizione!

Unisciti alla community di Drop Zone e inizia a risparmiare insieme!
```

**Parole Chiave (iOS, max 100 caratteri):**
```
shopping,sconti,offerte,e-commerce,social,gruppo,collettivo,risparmio
```

**Categoria:**
- Primaria: Shopping
- Secondaria: Social Networking

---

## 🔧 Configurazione App

### 1. Aggiorna app.json

```json
{
  "expo": {
    "name": "Drop Zone",
    "slug": "drop-zone",
    "version": "1.0.0",
    "owner": "your-expo-username",
    "ios": {
      "bundleIdentifier": "com.dropzone.app",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.dropzone.app",
      "versionCode": 1
    },
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

### 2. Configura EAS

```bash
# Login a Expo
eas login

# Configura il progetto
eas build:configure

# Verifica la configurazione
cat eas.json
```

### 3. Genera Credenziali

```bash
# iOS
eas credentials

# Android
eas credentials -p android
```

---

## 🏗️ Build e Test

### 1. Build di Sviluppo (Test Locale)

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### 2. Build di Preview (Test Interni)

```bash
# iOS (TestFlight)
eas build --profile preview --platform ios

# Android (Internal Testing)
eas build --profile preview --platform android
```

### 3. Build di Produzione

```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android

# Entrambe le piattaforme
eas build --profile production --platform all
```

### 4. Test Pre-Submission

**iOS (TestFlight):**
```bash
# Submit a TestFlight
eas submit --platform ios --latest

# Invita tester interni
# Vai su App Store Connect → TestFlight → Internal Testing
```

**Android (Internal Testing):**
```bash
# Submit a Internal Testing
eas submit --platform android --latest

# Invita tester
# Vai su Play Console → Testing → Internal testing
```

**Checklist Test:**
- ✅ Registrazione nuovo utente
- ✅ Login esistente
- ✅ Navigazione prodotti
- ✅ Espressione interesse
- ✅ Creazione drop
- ✅ Prenotazione con carta
- ✅ Condivisione drop
- ✅ Notifiche push
- ✅ Ritiro ordine

---

## 🍎 Submission Apple App Store

### 1. Prepara App Store Connect

1. Vai su https://appstoreconnect.apple.com
2. Clicca su "My Apps" → "+" → "New App"
3. Compila i campi:
   - **Platform:** iOS
   - **Name:** Drop Zone
   - **Primary Language:** Italian
   - **Bundle ID:** com.dropzone.app
   - **SKU:** DROP-ZONE-001

### 2. Carica Build

```bash
# Build e submit automatico
eas build --profile production --platform ios --auto-submit

# Oppure submit manuale
eas submit --platform ios --latest
```

### 3. Compila Informazioni App

**App Information:**
- Nome: Drop Zone
- Sottotitolo: Sconti progressivi collettivi
- Categoria: Shopping
- Categoria secondaria: Social Networking

**Pricing and Availability:**
- Prezzo: Gratuita
- Disponibilità: Italia (espandibile)

**App Privacy:**
- Raccogli dati utente? Sì
  - Nome e cognome
  - Email
  - Numero di telefono
  - Dati di pagamento (tramite Stripe)
  - Posizione (città per punto ritiro)

**Age Rating:**
- 4+ (nessun contenuto sensibile)

**Version Information:**
- Screenshot (carica tutti i formati richiesti)
- Descrizione
- Parole chiave
- URL supporto: https://dropzone.app/support
- URL marketing: https://dropzone.app
- Note di revisione: "Prima versione pubblica di Drop Zone"

### 4. Submit per Revisione

1. Clicca su "Submit for Review"
2. Rispondi alle domande:
   - Usa crittografia? No (ITSAppUsesNonExemptEncryption: false)
   - Contiene pubblicità? No
   - Usa IDFA? No

**Tempo di revisione:** 24-48 ore

---

## 🤖 Submission Google Play Store

### 1. Prepara Play Console

1. Vai su https://play.google.com/console
2. Clicca su "Create app"
3. Compila i campi:
   - **App name:** Drop Zone
   - **Default language:** Italian
   - **App or game:** App
   - **Free or paid:** Free

### 2. Carica Build

```bash
# Build e submit automatico
eas build --profile production --platform android --auto-submit

# Oppure submit manuale
eas submit --platform android --latest
```

### 3. Compila Store Listing

**Main store listing:**
- App name: Drop Zone
- Short description: Social e-commerce con sconti che crescono
- Full description: (usa la descrizione completa preparata)
- App icon: 512x512 px
- Feature graphic: 1024x500 px
- Screenshots: Phone (minimo 2)

**Categorization:**
- App category: Shopping
- Tags: shopping, sconti, offerte, social

**Contact details:**
- Email: support@dropzone.app
- Phone: +39 XXX XXX XXXX
- Website: https://dropzone.app

**Privacy Policy:**
- URL: https://dropzone.app/privacy

### 4. Content Rating

Completa il questionario:
- Violenza: No
- Contenuti sessuali: No
- Linguaggio offensivo: No
- Droghe: No
- Gioco d'azzardo: No
- Acquisti in-app: Sì (prodotti fisici)

**Rating risultante:** PEGI 3 / Everyone

### 5. App Content

**Privacy Policy:**
- URL: https://dropzone.app/privacy

**Ads:**
- Contiene pubblicità? No

**Target audience:**
- Età target: 18+

**Data safety:**
- Raccogli dati? Sì
  - Informazioni personali (nome, email, telefono)
  - Informazioni finanziarie (tramite Stripe)
  - Posizione (città)
- Condividi dati? No
- Dati crittografati in transito? Sì
- Utenti possono richiedere eliminazione? Sì

### 6. Release

**Production release:**
1. Vai su "Production" → "Create new release"
2. Carica l'AAB file
3. Release name: "1.0.0"
4. Release notes:
```
Prima versione di Drop Zone!

Funzionalità:
- Feed prodotti interattivo
- Sistema di drop con sconti progressivi
- Pagamenti sicuri con Stripe
- Punti di ritiro in tutta Italia
- Notifiche real-time
- Condivisione social

Inizia a risparmiare con Drop Zone!
```
5. Clicca su "Review release"
6. Clicca su "Start rollout to Production"

**Tempo di revisione:** 1-7 giorni

---

## 📱 Post-Deployment

### 1. Monitoring

**Crash Reporting:**
```bash
# Installa Sentry (opzionale)
npm install @sentry/react-native

# Configura in app/_layout.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: 'production',
});
```

**Analytics:**
```bash
# Installa Firebase Analytics (opzionale)
expo install @react-native-firebase/app @react-native-firebase/analytics
```

### 2. Aggiornamenti

**Over-The-Air (OTA) Updates:**
```bash
# Pubblica aggiornamento OTA
eas update --branch production --message "Bug fixes"

# Verifica aggiornamenti
eas update:list --branch production
```

**Note:** Gli aggiornamenti OTA funzionano solo per JavaScript/React Native.
Per modifiche native, serve una nuova build.

### 3. Gestione Versioni

**Incrementa versione:**
```json
// app.json
{
  "expo": {
    "version": "1.0.1",  // Incrementa
    "ios": {
      "buildNumber": "2"  // Incrementa
    },
    "android": {
      "versionCode": 2  // Incrementa
    }
  }
}
```

**Semantic Versioning:**
- **Major (1.0.0 → 2.0.0):** Breaking changes
- **Minor (1.0.0 → 1.1.0):** Nuove funzionalità
- **Patch (1.0.0 → 1.0.1):** Bug fixes

### 4. Supporto Utenti

**Canali di supporto:**
- Email: support@dropzone.app
- FAQ: https://dropzone.app/faq
- Chat in-app (opzionale)

**Gestione recensioni:**
- Rispondi a tutte le recensioni entro 24-48 ore
- Ringrazia per feedback positivi
- Risolvi problemi segnalati nelle recensioni negative

---

## 🔧 Troubleshooting

### Problemi Comuni iOS

**1. Build fallisce con errore di provisioning:**
```bash
# Rigenera credenziali
eas credentials --platform ios

# Seleziona "Set up a new iOS Distribution Certificate"
```

**2. App rifiutata per mancanza di privacy policy:**
- Aggiungi URL privacy policy in app.json
- Assicurati che la pagina sia accessibile

**3. Crash all'avvio:**
- Verifica che tutte le dipendenze native siano configurate
- Controlla i log in Xcode

### Problemi Comuni Android

**1. Build fallisce con errore Gradle:**
```bash
# Pulisci cache
cd android && ./gradlew clean

# Rebuild
eas build --profile production --platform android --clear-cache
```

**2. App rifiutata per permessi non dichiarati:**
- Verifica tutti i permessi in app.json
- Rimuovi permessi non utilizzati

**3. Crash su dispositivi specifici:**
- Testa su emulatori con diverse versioni Android
- Controlla compatibilità librerie native

### Problemi Database

**1. RLS policies bloccano operazioni:**
```sql
-- Verifica policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Testa policy
SET ROLE authenticated;
SELECT * FROM your_table;
```

**2. Performance lente:**
```sql
-- Aggiungi indici
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_drop_id ON bookings(drop_id);
CREATE INDEX idx_products_supplier_list_id ON products(supplier_list_id);
```

### Problemi Pagamenti

**1. Stripe webhook non funziona:**
- Verifica URL webhook in Stripe Dashboard
- Controlla che l'endpoint sia accessibile pubblicamente
- Verifica il webhook secret

**2. Autorizzazioni falliscono:**
- Verifica che la carta sia valida
- Controlla limiti di spesa Stripe
- Verifica che l'importo sia corretto

---

## 📊 Metriche di Successo

Monitora queste metriche post-lancio:

**Acquisizione:**
- Download giornalieri
- Costo per acquisizione (se usi ads)
- Sorgenti di traffico

**Engagement:**
- Utenti attivi giornalieri (DAU)
- Utenti attivi mensili (MAU)
- Tempo medio in app
- Prodotti visualizzati per sessione

**Conversione:**
- Tasso di registrazione
- Tasso di aggiunta metodo pagamento
- Tasso di partecipazione drop
- Tasso di conversione prenotazione → acquisto

**Retention:**
- Retention Day 1, 7, 30
- Churn rate
- Frequenza di utilizzo

**Revenue:**
- GMV (Gross Merchandise Value)
- Valore medio ordine
- Revenue per utente
- Commissioni guadagnate

---

## 🎉 Congratulazioni!

La tua app è ora pronta per il deployment! 

**Prossimi passi:**
1. ✅ Esegui tutti i test
2. ✅ Prepara materiali store
3. ✅ Build production
4. ✅ Submit agli store
5. ✅ Monitora metriche
6. ✅ Raccogli feedback
7. ✅ Itera e migliora

**Risorse utili:**
- [Expo Documentation](https://docs.expo.dev)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)
- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

Buona fortuna con il lancio di Drop Zone! 🚀
