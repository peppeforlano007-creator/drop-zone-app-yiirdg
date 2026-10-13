
# Drop Zone - Requisiti Specifici Store

## 🍎 Apple App Store - Requisiti Dettagliati

### Linee Guida da Rispettare

#### 1. Design e Funzionalità

**1.1 Completezza**
- ✅ App completamente funzionale
- ✅ Nessun contenuto placeholder
- ✅ Nessun crash o bug evidenti
- ✅ Tutte le funzionalità descritte funzionanti

**1.2 Performance**
- ✅ Avvio rapido (< 3 secondi)
- ✅ Risposta immediata ai touch
- ✅ Animazioni fluide (60 FPS)
- ✅ Uso efficiente della batteria

**1.3 Business**
- ✅ Modello di business chiaro
- ✅ Prezzi trasparenti
- ✅ Nessun contenuto ingannevole
- ✅ Commissioni chiaramente indicate

#### 2. Privacy

**2.1 Raccolta Dati**
- ✅ Privacy policy accessibile
- ✅ Consenso esplicito per dati sensibili
- ✅ Spiegazione uso dati
- ✅ Opzione opt-out dove applicabile

**2.2 Dati Raccolti**
```
- Nome e cognome
- Email
- Numero di telefono
- Città (per punto ritiro)
- Dati pagamento (tramite Stripe, non memorizzati)
- Cronologia acquisti
- Preferenze prodotti
```

**2.3 Uso Dati**
```
- Gestione account utente
- Processamento ordini
- Comunicazioni transazionali
- Miglioramento servizio
- Supporto clienti
```

#### 3. Pagamenti

**3.1 In-App Purchase**
- ❌ NON richiesto (vendiamo prodotti fisici)
- ✅ Pagamenti esterni permessi per beni fisici
- ✅ Stripe come payment processor

**3.2 Trasparenza**
- ✅ Prezzi chiari prima del pagamento
- ✅ Sconti applicati visibili
- ✅ Commissioni indicate
- ✅ Conferma prima del pagamento

#### 4. Contenuti

**4.1 Contenuti Generati da Utenti**
- ✅ Sistema di moderazione (se implementato)
- ✅ Segnalazione contenuti inappropriati
- ✅ Termini d'uso chiari

**4.2 Contenuti Commerciali**
- ✅ Prodotti reali e disponibili
- ✅ Immagini accurate
- ✅ Descrizioni veritiere
- ✅ Nessun contenuto vietato

### Screenshot Requirements

#### iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max)
- **Dimensioni:** 1290 x 2796 px
- **Formato:** PNG o JPEG
- **Numero:** 3-10 screenshot
- **Contenuto suggerito:**
  1. Home feed con prodotti
  2. Dettaglio prodotto con sconti
  3. Drop attivo con timer
  4. Schermata prenotazione
  5. Profilo utente con ordini

#### iPhone 6.5" (iPhone 11 Pro Max, XS Max)
- **Dimensioni:** 1242 x 2688 px
- **Formato:** PNG o JPEG
- **Numero:** 3-10 screenshot

#### iPad Pro 12.9" (3rd gen)
- **Dimensioni:** 2048 x 2732 px
- **Formato:** PNG o JPEG
- **Numero:** 3-10 screenshot

### App Preview Video (Opzionale)

- **Durata:** 15-30 secondi
- **Formato:** M4V, MP4, o MOV
- **Codec:** H.264 o HEVC
- **Risoluzione:** Stessa degli screenshot
- **Orientamento:** Portrait
- **Audio:** Opzionale ma consigliato

### Metadata

**App Name:**
- Max 30 caratteri
- Deve essere unico
- Suggerito: "Drop Zone"

**Subtitle:**
- Max 30 caratteri
- Suggerito: "Sconti progressivi collettivi"

**Keywords:**
- Max 100 caratteri totali
- Separati da virgola
- Suggeriti: "shopping,sconti,offerte,e-commerce,social,gruppo,risparmio,deals"

**Promotional Text:**
- Max 170 caratteri
- Aggiornabile senza nuova review
- Suggerito: "Unisciti a migliaia di utenti che risparmiano fino all'80% con Drop Zone! Più persone partecipano, più lo sconto cresce. Inizia ora!"

---

## 🤖 Google Play Store - Requisiti Dettagliati

### Linee Guida da Rispettare

#### 1. Contenuti e Comportamento

**1.1 Contenuti Vietati**
- ❌ Contenuti illegali
- ❌ Violenza grafica
- ❌ Contenuti per adulti
- ❌ Incitamento all'odio
- ❌ Attività pericolose

**1.2 Funzionalità**
- ✅ App stabile e funzionante
- ✅ Descrizione accurata
- ✅ Nessuna funzionalità nascosta
- ✅ Rispetto delle API Android

#### 2. Privacy e Sicurezza

**2.1 Data Safety Form**

**Dati Raccolti:**
```
Location:
- ✅ Approximate location (città)
- ❌ Precise location

Personal info:
- ✅ Name
- ✅ Email address
- ✅ Phone number

Financial info:
- ✅ Payment info (via Stripe)
- ❌ Credit card number (non memorizzato)

App activity:
- ✅ App interactions
- ✅ Purchase history

App info and performance:
- ✅ Crash logs
- ✅ Diagnostics
```

**Uso Dati:**
```
- App functionality
- Account management
- Fraud prevention
- Personalization
- Analytics
```

**Condivisione Dati:**
```
- ✅ Dati condivisi con Stripe (payment processing)
- ✅ Dati condivisi con Supabase (backend)
- ❌ Nessuna vendita a terze parti
```

**Sicurezza:**
```
- ✅ Data encrypted in transit
- ✅ Data encrypted at rest
- ✅ Users can request data deletion
- ✅ Committed to Google Play Families Policy (se applicabile)
```

#### 3. Monetizzazione

**3.1 Pagamenti**
- ✅ Pagamenti per beni fisici (permessi)
- ✅ Prezzi chiari
- ✅ Nessun addebito nascosto
- ✅ Rimborsi gestiti correttamente

**3.2 Pubblicità**
- ❌ Nessuna pubblicità (al momento)
- Se implementata in futuro:
  - Deve essere chiaramente identificabile
  - Non deve interferire con l'esperienza utente
  - Deve rispettare le policy Google Ads

### Screenshot Requirements

#### Phone
- **Dimensioni:** Min 320px, Max 3840px
- **Aspect Ratio:** 16:9 o 9:16
- **Formato:** PNG o JPEG (24-bit, no alpha)
- **Numero:** 2-8 screenshot
- **Suggerito:** 1080 x 1920 px

#### 7" Tablet (Opzionale)
- **Dimensioni:** Min 320px, Max 3840px
- **Suggerito:** 1200 x 1920 px

#### 10" Tablet (Opzionale)
- **Dimensioni:** Min 320px, Max 3840px
- **Suggerito:** 1920 x 1200 px

### Feature Graphic

- **Dimensioni:** 1024 x 500 px
- **Formato:** PNG o JPEG (24-bit, no alpha)
- **Obbligatorio:** Sì
- **Contenuto:** Banner promozionale dell'app

### Promo Video (Opzionale)

- **Piattaforma:** YouTube
- **Durata:** 30 secondi - 2 minuti
- **Formato:** Link YouTube
- **Contenuto:** Demo app o trailer

### Metadata

**App Name:**
- Max 50 caratteri
- Suggerito: "Drop Zone - Sconti Progressivi"

**Short Description:**
- Max 80 caratteri
- Suggerito: "Social e-commerce con sconti che crescono con le prenotazioni"

**Full Description:**
- Max 4000 caratteri
- Deve includere:
  - Cosa fa l'app
  - Caratteristiche principali
  - Come funziona
  - Benefici per l'utente
  - Call to action

---

## 📋 Checklist Pre-Submission

### Apple App Store

- [ ] Build caricata su App Store Connect
- [ ] TestFlight testing completato (minimo 5 tester)
- [ ] Tutti gli screenshot caricati (tutti i formati richiesti)
- [ ] App icon 1024x1024 caricato
- [ ] Privacy policy URL fornito e accessibile
- [ ] Support URL fornito e accessibile
- [ ] Marketing URL fornito (opzionale)
- [ ] App description compilata
- [ ] Keywords compilate
- [ ] Promotional text compilato
- [ ] Age rating completato
- [ ] Pricing and availability configurato
- [ ] Review notes compilate (credenziali test se necessario)
- [ ] Export compliance dichiarato

### Google Play Store

- [ ] Build (AAB) caricata
- [ ] Internal testing completato (minimo 20 tester per 14 giorni)
- [ ] Tutti gli screenshot caricati
- [ ] Feature graphic caricato
- [ ] App icon 512x512 caricato
- [ ] Privacy policy URL fornito e accessibile
- [ ] Store listing compilato
- [ ] Content rating completato
- [ ] Data safety form compilato
- [ ] Target audience definito
- [ ] App category selezionata
- [ ] Pricing and distribution configurato
- [ ] Countries selezionati

---

## 🚨 Motivi Comuni di Rifiuto

### Apple App Store

1. **Crash o Bug Evidenti**
   - Soluzione: Test approfonditi su dispositivi reali

2. **Funzionalità Incomplete**
   - Soluzione: Rimuovere placeholder e funzionalità non finite

3. **Privacy Policy Mancante o Inadeguata**
   - Soluzione: Privacy policy completa e accessibile

4. **Metadata Ingannevole**
   - Soluzione: Screenshot e descrizioni accurate

5. **Violazione Linee Guida Pagamenti**
   - Soluzione: Usare IAP solo per contenuti digitali

### Google Play Store

1. **Violazione Policy Contenuti**
   - Soluzione: Rimuovere contenuti vietati

2. **Data Safety Form Incompleto**
   - Soluzione: Compilare accuratamente tutte le sezioni

3. **Metadata Fuorviante**
   - Soluzione: Descrizioni e screenshot veritieri

4. **Permessi Non Giustificati**
   - Soluzione: Richiedere solo permessi necessari

5. **Testing Insufficiente**
   - Soluzione: Completare internal testing per 14 giorni

---

## 📞 Contatti Supporto Store

### Apple

- **Developer Support:** https://developer.apple.com/support/
- **App Review:** https://developer.apple.com/contact/app-store/
- **Phone:** Disponibile per membri del programma

### Google

- **Developer Support:** https://support.google.com/googleplay/android-developer/
- **Policy Support:** https://support.google.com/googleplay/android-developer/answer/9899234
- **Community:** https://www.reddit.com/r/androiddev/

---

## ✅ Final Checklist

Prima di premere "Submit for Review":

- [ ] Ho letto tutte le linee guida dello store
- [ ] Ho testato l'app su dispositivi reali
- [ ] Ho verificato che tutti i link funzionino
- [ ] Ho preparato credenziali di test (se necessario)
- [ ] Ho un piano per rispondere rapidamente a richieste di chiarimenti
- [ ] Ho notificato il team del submission
- [ ] Ho preparato comunicazioni per il lancio

**Tempo stimato di review:**
- Apple: 24-48 ore
- Google: 1-7 giorni

**Buona fortuna con il lancio! 🚀**
