
# 🚀 Guida Completa al Deployment di Drop Zone

Questa guida ti accompagnerà passo dopo passo nel processo di pubblicazione della tua app Drop Zone su Apple App Store e Google Play Store.

---

## 📋 PREREQUISITI

### Account Necessari

1. **Account Expo** (gratuito)
   - Registrati su: https://expo.dev/signup
   - Crea un'organizzazione o usa il tuo account personale

2. **Apple Developer Program** (€99/anno)
   - Registrati su: https://developer.apple.com/programs/
   - Necessario per pubblicare su App Store

3. **Google Play Console** ($25 una tantum)
   - Registrati su: https://play.google.com/console/signup
   - Necessario per pubblicare su Play Store

### Software Necessario

- Node.js (versione 18 o superiore)
- npm o yarn
- EAS CLI: `npm install -g eas-cli`
- Expo CLI: già installato nel progetto

---

## 🔧 FASE 1: CONFIGURAZIONE INIZIALE

### 1.1 Installare EAS CLI

```bash
npm install -g eas-cli
```

### 1.2 Login a Expo

```bash
eas login
```

Inserisci le tue credenziali Expo.

### 1.3 Configurare il Progetto EAS

```bash
eas build:configure
```

Questo comando:
- Crea/aggiorna il file `eas.json`
- Collega il progetto al tuo account Expo
- Genera un Project ID

### 1.4 Aggiornare app.json

Dopo aver eseguito `eas build:configure`, copia il `projectId` generato e aggiornalo in `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "IL_TUO_PROJECT_ID_QUI"
  }
}
```

---

## 🍎 FASE 2: BUILD E SUBMISSION iOS

### 2.1 Preparare le Risorse iOS

**Icona App (obbligatoria)**
- Dimensione: 1024x1024 px
- Formato: PNG senza trasparenza
- Posizione: `./assets/images/icon.png`

**Screenshot richiesti per App Store:**
- iPhone 6.7" (1290 x 2796 px) - almeno 3 screenshot
- iPhone 6.5" (1242 x 2688 px) - almeno 3 screenshot
- iPad Pro 12.9" (2048 x 2732 px) - se supporti iPad

### 2.2 Creare il Build iOS

```bash
eas build --platform ios --profile production
```

Durante il processo ti verrà chiesto:

1. **Generare credenziali automaticamente?** → Sì (consigliato)
   - EAS gestirà certificati e provisioning profiles

2. **Aspetta il completamento** (15-30 minuti)
   - Puoi monitorare su: https://expo.dev/accounts/[username]/projects/drop-zone/builds

### 2.3 Configurare App Store Connect

1. **Vai su App Store Connect**
   - https://appstoreconnect.apple.com/

2. **Crea una Nuova App**
   - Clicca "My Apps" → "+" → "New App"
   - Piattaforma: iOS
   - Nome: Drop Zone
   - Lingua principale: Italiano
   - Bundle ID: `com.dropzone.app` (deve corrispondere a app.json)
   - SKU: `drop-zone-001` (identificativo univoco)

3. **Compila le Informazioni dell'App**

   **Informazioni Generali:**
   - Nome: Drop Zone
   - Sottotitolo: Social e-commerce con sconti progressivi
   - Categoria primaria: Shopping
   - Categoria secondaria: Social Networking

   **Descrizione:**
   ```
   Drop Zone è la rivoluzionaria piattaforma di social e-commerce che ti permette di ottenere sconti incredibili attraverso prenotazioni collettive.

   🎯 COME FUNZIONA:
   - Scopri prodotti esclusivi nel feed in stile TikTok
   - Prenota i prodotti che ti interessano
   - Quando abbastanza persone prenotano, si attiva un "Drop"
   - Più persone partecipano, maggiore è lo sconto (fino all'80%!)
   - Ritira i tuoi acquisti presso i nostri punti di ritiro

   ✨ CARATTERISTICHE:
   - Feed infinito di prodotti esclusivi
   - Sconti progressivi fino all'80%
   - Sistema di prenotazione semplice e sicuro
   - Punti di ritiro convenienti
   - Condividi con amici per aumentare gli sconti
   - Notifiche in tempo reale sui Drop attivi

   💳 PAGAMENTI SICURI:
   - Pagamento solo quando il Drop si attiva
   - Addebito al prezzo finale scontato
   - Nessun costo nascosto

   📍 RITIRO FACILE:
   - Scegli il punto di ritiro più vicino
   - Ricevi notifica quando l'ordine è pronto
   - Ritira quando vuoi

   Unisciti alla community di Drop Zone e inizia a risparmiare oggi!
   ```

   **Parole Chiave (max 100 caratteri):**
   ```
   shopping,sconti,offerte,e-commerce,social,drop,prenotazioni,risparmio
   ```

   **URL Supporto:** https://dropzone.app/support
   **URL Marketing:** https://dropzone.app
   **URL Privacy Policy:** https://dropzone.app/privacy

4. **Carica Screenshot**
   - Trascina i tuoi screenshot nelle sezioni appropriate
   - Aggiungi didascalie descrittive

5. **Informazioni sulla Privacy**
   - Compila il questionario sulla privacy
   - Indica quali dati raccogli e come li usi

### 2.4 Scaricare e Caricare il Build

1. **Scarica il file .ipa**
   - Vai su https://expo.dev/accounts/[username]/projects/drop-zone/builds
   - Clicca sul build completato
   - Scarica il file .ipa

2. **Carica su App Store Connect**

   **Opzione A: Usando Transporter (consigliato)**
   - Scarica Transporter dal Mac App Store
   - Apri Transporter
   - Trascina il file .ipa
   - Clicca "Deliver"

   **Opzione B: Usando EAS Submit**
   ```bash
   eas submit --platform ios --profile production
   ```

3. **Aspetta l'elaborazione** (10-30 minuti)
   - Riceverai un'email quando il build è pronto

### 2.5 Preparare per la Revisione

1. **Torna su App Store Connect**
2. **Seleziona il build caricato**
   - Vai su "App Store" → "iOS App" → versione
   - Clicca su "Build" → seleziona il build caricato

3. **Informazioni per la Revisione**
   - **Note per la revisione:**
     ```
     Ciao team di revisione,

     Drop Zone è un'app di social e-commerce innovativa.

     CREDENZIALI DI TEST:
     Email: test@dropzone.app
     Password: TestDrop2024!

     COME TESTARE:
     1. Registrati o usa le credenziali sopra
     2. Scorri il feed per vedere i prodotti
     3. Clicca "Vorrò partecipare al drop" su un prodotto
     4. Vai alla sezione "Drops" per vedere i drop attivi
     5. Quando un drop è attivo, puoi prenotare con carta

     L'app richiede una connessione internet per funzionare.

     Grazie!
     ```

   - **Contatto:** Il tuo numero di telefono e email

4. **Classificazione per Età**
   - Compila il questionario
   - Probabilmente: 4+ o 9+

5. **Informazioni sul Copyright**
   - Anno: 2024
   - Nome: Il tuo nome o nome azienda

### 2.6 Inviare per la Revisione

1. Clicca "Add for Review"
2. Seleziona "Manually release this version"
3. Clicca "Submit for Review"

**Tempi di Revisione:** 24-48 ore (in media)

---

## 🤖 FASE 3: BUILD E SUBMISSION ANDROID

### 3.1 Preparare le Risorse Android

**Icona App (obbligatoria)**
- Dimensione: 512x512 px
- Formato: PNG con trasparenza
- Posizione: `./assets/images/icon.png`

**Screenshot richiesti per Play Store:**
- Telefono: almeno 2 screenshot (minimo 320px, massimo 3840px)
- Tablet 7": almeno 2 screenshot (opzionale)
- Tablet 10": almeno 2 screenshot (opzionale)

**Grafica Promozionale (obbligatoria)**
- Dimensione: 1024 x 500 px
- Formato: PNG o JPG

**Icona dell'App (obbligatoria)**
- Dimensione: 512 x 512 px
- Formato: PNG con trasparenza

### 3.2 Creare il Build Android

```bash
eas build --platform android --profile production
```

Durante il processo:

1. **Generare un nuovo keystore?** → Sì (prima volta)
   - EAS gestirà il keystore automaticamente
   - **IMPORTANTE:** Scarica e conserva il keystore in un posto sicuro!

2. **Aspetta il completamento** (10-20 minuti)

### 3.3 Configurare Google Play Console

1. **Vai su Google Play Console**
   - https://play.google.com/console/

2. **Crea una Nuova App**
   - Clicca "Crea app"
   - Nome app: Drop Zone
   - Lingua predefinita: Italiano
   - Tipo di app: App
   - Gratuita o a pagamento: Gratuita
   - Accetta le dichiarazioni

3. **Configura la Scheda dello Store**

   **Dettagli App:**
   - Nome breve: Drop Zone
   - Nome completo: Drop Zone - Social Shopping
   
   **Descrizione breve (max 80 caratteri):**
   ```
   Sconti fino all'80% con prenotazioni collettive. Shopping sociale!
   ```

   **Descrizione completa (max 4000 caratteri):**
   ```
   🎯 Drop Zone - Il Futuro dello Shopping Online

   Drop Zone rivoluziona l'e-commerce combinando social media e shopping collettivo per offrirti sconti incredibili fino all'80%!

   ✨ COME FUNZIONA

   1. SCOPRI
   Scorri il feed in stile TikTok e scopri prodotti esclusivi da fornitori selezionati.

   2. PRENOTA
   Vedi un prodotto che ti piace? Clicca "Vorrò partecipare al drop" per prenotarlo.

   3. ATTIVA IL DROP
   Quando abbastanza persone del tuo punto di ritiro prenotano prodotti dello stesso fornitore, si attiva un Drop con timer di 5 giorni.

   4. AUMENTA LO SCONTO
   Condividi il Drop con amici e parenti. Più persone prenotano con carta, maggiore è lo sconto per tutti!

   5. RITIRA
   Quando il Drop si chiude, paghi il prezzo finale scontato e ritiri presso il tuo punto di ritiro.

   🎁 CARATTERISTICHE PRINCIPALI

   • Feed Infinito: Scorri all'infinito tra prodotti esclusivi
   • Sconti Progressivi: Da 30% fino all'80% di sconto
   • Shopping Sociale: Condividi e risparmia insieme
   • Punti di Ritiro: Ritira comodamente vicino a te
   • Notifiche Real-Time: Resta aggiornato sui Drop attivi
   • Pagamento Sicuro: Paga solo quando il Drop si attiva
   • Prezzo Finale: Paghi il prezzo con lo sconto finale raggiunto

   💳 PAGAMENTI SICURI

   • Nessun pagamento anticipato
   • Addebito solo al completamento del Drop
   • Prezzo finale garantito con lo sconto raggiunto
   • Pagamenti sicuri con carta di credito/debito
   • Nessun costo nascosto

   📍 SISTEMA DI RITIRO

   • Scegli il punto di ritiro più vicino
   • Notifica quando l'ordine è pronto
   • Ritiro flessibile negli orari di apertura
   • Nessun costo di spedizione

   🔔 NOTIFICHE INTELLIGENTI

   • Drop attivati nel tuo punto di ritiro
   • Sconti che aumentano
   • Ordini pronti per il ritiro
   • Nuovi prodotti disponibili

   🌟 PERCHÉ SCEGLIERE DROP ZONE

   • Risparmio Reale: Sconti fino all'80%
   • Prodotti Esclusivi: Articoli selezionati da fornitori di qualità
   • Community: Risparmia insieme ad altri
   • Trasparenza: Vedi sempre il prezzo finale
   • Convenienza: Ritiro vicino a te
   • Sicurezza: Pagamenti protetti

   📱 FACILE DA USARE

   Drop Zone è progettato per essere semplice e intuitivo:
   • Interfaccia moderna e pulita
   • Navigazione fluida
   • Feed coinvolgente
   • Processo di acquisto semplificato

   🎯 PERFETTO PER

   • Chi ama fare shopping online
   • Chi cerca sconti veri
   • Chi vuole scoprire prodotti nuovi
   • Chi preferisce ritirare di persona
   • Chi ama condividere con amici

   💡 COME INIZIARE

   1. Scarica l'app
   2. Registrati gratuitamente
   3. Scegli il tuo punto di ritiro
   4. Inizia a scoprire prodotti
   5. Prenota e risparmia!

   🔒 PRIVACY E SICUREZZA

   La tua privacy è importante per noi:
   • Dati crittografati
   • Pagamenti sicuri
   • Nessuna vendita di dati personali
   • Conformità GDPR

   📞 SUPPORTO

   Il nostro team è sempre pronto ad aiutarti:
   • Email: support@dropzone.app
   • FAQ nell'app
   • Risposta entro 24 ore

   🚀 UNISCITI ALLA RIVOLUZIONE DELLO SHOPPING

   Scarica Drop Zone oggi e inizia a risparmiare con la community!

   ---

   Drop Zone - Dove lo shopping diventa sociale e conveniente! 🎉
   ```

4. **Carica Risorse Grafiche**
   - Icona: 512x512 px
   - Grafica promozionale: 1024x500 px
   - Screenshot: almeno 2 per telefono

5. **Classificazione dei Contenuti**
   - Compila il questionario
   - Probabilmente: PEGI 3 o 7

6. **Informazioni di Contatto**
   - Email: la tua email
   - Telefono: il tuo numero (opzionale)
   - Sito web: https://dropzone.app

7. **Privacy Policy**
   - URL: https://dropzone.app/privacy
   - **IMPORTANTE:** Devi avere una privacy policy pubblicata online

### 3.4 Caricare il Build

1. **Scarica il file .aab**
   - Vai su https://expo.dev/accounts/[username]/projects/drop-zone/builds
   - Clicca sul build Android completato
   - Scarica il file .aab

2. **Carica su Play Console**

   **Opzione A: Manualmente**
   - Vai su "Release" → "Production"
   - Clicca "Create new release"
   - Carica il file .aab
   - Compila le note di rilascio

   **Opzione B: Usando EAS Submit**
   
   Prima, configura il service account:
   
   a. Vai su Google Cloud Console
   b. Crea un service account
   c. Scarica il JSON delle credenziali
   d. Salvalo come `google-service-account.json` nella root del progetto
   
   Poi esegui:
   ```bash
   eas submit --platform android --profile production
   ```

3. **Note di Rilascio**
   ```
   🎉 Prima versione di Drop Zone!

   ✨ Caratteristiche:
   - Feed infinito di prodotti esclusivi
   - Sistema di prenotazione con sconti progressivi
   - Drop con timer di 5 giorni
   - Sconti fino all'80%
   - Punti di ritiro convenienti
   - Notifiche in tempo reale
   - Pagamenti sicuri

   Inizia a risparmiare oggi con Drop Zone!
   ```

### 3.5 Configurare il Rilascio

1. **Scegli il tipo di rilascio**
   - Test interno (per testare)
   - Test chiuso (per beta tester)
   - Test aperto (per pubblico limitato)
   - Produzione (per tutti)

2. **Per il primo rilascio, consiglio:**
   - Inizia con "Test interno"
   - Testa accuratamente
   - Passa a "Test chiuso" con beta tester
   - Infine, vai in "Produzione"

3. **Revisione e Pubblicazione**
   - Clicca "Review release"
   - Controlla tutti i dettagli
   - Clicca "Start rollout to Production"

**Tempi di Revisione:** Poche ore fino a 7 giorni

---

## 📊 FASE 4: MONITORAGGIO POST-LANCIO

### 4.1 Monitorare le Metriche

**App Store Connect:**
- Vai su "Analytics"
- Monitora: download, crash, recensioni

**Google Play Console:**
- Vai su "Dashboard"
- Monitora: installazioni, disinstallazioni, crash, ANR

### 4.2 Gestire le Recensioni

- Rispondi alle recensioni (soprattutto negative)
- Usa il feedback per migliorare l'app
- Ringrazia gli utenti per le recensioni positive

### 4.3 Aggiornamenti

Quando devi rilasciare un aggiornamento:

1. **Aggiorna la versione in app.json:**
   ```json
   "version": "1.0.1",
   "ios": {
     "buildNumber": "2"
   },
   "android": {
     "versionCode": 2
   }
   ```

2. **Crea nuovi build:**
   ```bash
   eas build --platform all --profile production
   ```

3. **Invia agli store:**
   ```bash
   eas submit --platform all --profile production
   ```

---

## 🔧 TROUBLESHOOTING

### Problemi Comuni iOS

**Build fallisce:**
- Controlla che il Bundle ID sia univoco
- Verifica che le credenziali siano corrette
- Controlla i log del build su expo.dev

**Rifiutato dalla revisione:**
- Leggi attentamente il motivo del rifiuto
- Correggi il problema
- Rispondi nel Resolution Center
- Invia nuovamente

### Problemi Comuni Android

**Build fallisce:**
- Controlla che il package name sia univoco
- Verifica il keystore
- Controlla i log del build

**Errore di firma:**
- Assicurati di usare lo stesso keystore per gli aggiornamenti
- Non perdere mai il keystore originale!

---

## 📝 CHECKLIST FINALE

### Prima di Inviare iOS:
- [ ] Icona 1024x1024 pronta
- [ ] Screenshot per tutti i dispositivi
- [ ] Privacy policy online
- [ ] URL supporto funzionante
- [ ] Descrizione completa
- [ ] Parole chiave ottimizzate
- [ ] Credenziali di test fornite
- [ ] Build testato su dispositivo reale

### Prima di Inviare Android:
- [ ] Icona 512x512 pronta
- [ ] Grafica promozionale 1024x500
- [ ] Screenshot pronti
- [ ] Privacy policy online
- [ ] Descrizione completa
- [ ] Classificazione contenuti completata
- [ ] Build testato su dispositivo reale
- [ ] Keystore salvato in modo sicuro

---

## 🎯 PROSSIMI PASSI

1. **Completa i prerequisiti** (account, pagamenti)
2. **Prepara le risorse grafiche** (icone, screenshot)
3. **Esegui i build** con EAS
4. **Configura gli store** (App Store Connect, Play Console)
5. **Carica i build**
6. **Invia per la revisione**
7. **Monitora e rispondi** alle recensioni

---

## 📞 SUPPORTO

Se hai problemi:

1. **Documentazione Expo:** https://docs.expo.dev/
2. **Forum Expo:** https://forums.expo.dev/
3. **Discord Expo:** https://chat.expo.dev/
4. **Stack Overflow:** Tag `expo` o `eas`

---

## 🎉 CONGRATULAZIONI!

Seguendo questa guida, la tua app Drop Zone sarà presto disponibile su App Store e Play Store!

Ricorda:
- La prima pubblicazione richiede tempo e pazienza
- Leggi attentamente le linee guida degli store
- Testa accuratamente prima di inviare
- Rispondi prontamente alle richieste di revisione

Buona fortuna con il lancio! 🚀
