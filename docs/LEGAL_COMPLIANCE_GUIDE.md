
# Guida alla Conformità Legale - Drop Zone

## 📋 Panoramica

Questa guida descrive l'implementazione completa della conformità legale italiana e GDPR nell'app Drop Zone.

## ✅ Requisiti Implementati

### 1. **Privacy Policy** (GDPR - Obbligatorio)
- ✅ Documento completo gestibile dall'admin
- ✅ Accessibile prima della registrazione
- ✅ Versionamento automatico
- ✅ Visualizzazione per tutti gli utenti

**Percorso:** `/legal/privacy-policy`
**Admin:** `/admin/legal-documents`

### 2. **Termini e Condizioni** (Obbligatorio per e-commerce)
- ✅ Documento completo gestibile dall'admin
- ✅ Accettazione obbligatoria durante registrazione
- ✅ Include: diritto di recesso, modalità di pagamento, garanzie
- ✅ Versionamento automatico

**Percorso:** `/legal/terms-conditions`
**Admin:** `/admin/legal-documents`

### 3. **Cookie Policy** (Obbligatorio se si usano cookie/tracking)
- ✅ Documento completo gestibile dall'admin
- ✅ Spiega l'uso di tecnologie di tracciamento nell'app
- ✅ Versionamento automatico

**Percorso:** `/legal/cookie-policy`
**Admin:** `/admin/legal-documents`

### 4. **Consensi GDPR** (Obbligatorio)
- ✅ Checkbox separati per consensi obbligatori e facoltativi
- ✅ Consenso esplicito per marketing/newsletter
- ✅ Registrazione timestamp e metadati consensi
- ✅ Possibilità di modificare consensi

**Implementato in:** `/register/consumer`

### 5. **Diritti GDPR degli Utenti** (Obbligatorio)
- ✅ Accesso ai propri dati
- ✅ Esportazione dati (portabilità)
- ✅ Cancellazione account e dati
- ✅ Modifica dati personali

**Percorso:** `/(tabs)/my-data`

---

## 🗄️ Struttura Database

### Tabelle Create

#### 1. `legal_documents`
Memorizza i documenti legali con versionamento:
```sql
- id: UUID
- document_type: 'privacy_policy' | 'terms_conditions' | 'cookie_policy'
- title: TEXT
- content: TEXT
- version: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 2. `user_consents`
Registra i consensi degli utenti:
```sql
- id: UUID
- user_id: UUID (FK auth.users)
- terms_accepted: BOOLEAN
- privacy_accepted: BOOLEAN
- marketing_accepted: BOOLEAN
- consent_date: TIMESTAMPTZ
- ip_address: TEXT (opzionale)
- user_agent: TEXT (opzionale)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 3. `data_requests`
Gestisce richieste GDPR (esportazione/cancellazione):
```sql
- id: UUID
- user_id: UUID (FK auth.users)
- request_type: 'export' | 'deletion'
- status: 'pending' | 'processing' | 'completed' | 'failed'
- requested_at: TIMESTAMPTZ
- completed_at: TIMESTAMPTZ
- notes: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 4. Modifiche a `profiles`
Aggiunti campi per gestire cancellazione account:
```sql
- deletion_requested: BOOLEAN
- deletion_requested_at: TIMESTAMPTZ
```

---

## 🔐 Row Level Security (RLS)

Tutte le tabelle hanno RLS abilitato con policy appropriate:

### `legal_documents`
- ✅ Tutti possono leggere documenti attivi
- ✅ Solo admin possono creare/modificare

### `user_consents`
- ✅ Utenti possono vedere/modificare i propri consensi
- ✅ Admin possono vedere tutti i consensi

### `data_requests`
- ✅ Utenti possono vedere/creare le proprie richieste
- ✅ Admin possono gestire tutte le richieste

---

## 📱 Schermate Implementate

### Per Utenti

#### 1. **Registrazione con Consensi** (`/register/consumer`)
- Checkbox obbligatori:
  - ✅ Accettazione Termini e Condizioni
  - ✅ Accettazione Privacy Policy
- Checkbox facoltativi:
  - ⚪ Consenso marketing/newsletter
- Link diretti ai documenti legali

#### 2. **Gestione Dati Personali** (`/(tabs)/my-data`)
- Visualizzazione diritti GDPR
- Accesso e modifica dati personali
- Esportazione dati (richiesta)
- Cancellazione account (richiesta)
- Link a tutti i documenti legali

#### 3. **Visualizzazione Documenti Legali**
- `/legal/privacy-policy` - Privacy Policy
- `/legal/terms-conditions` - Termini e Condizioni
- `/legal/cookie-policy` - Cookie Policy

### Per Admin

#### 1. **Gestione Documenti Legali** (`/admin/legal-documents`)
- Creazione nuovi documenti
- Modifica documenti esistenti
- Versionamento automatico
- Visualizzazione cronologia versioni
- Template predefiniti in italiano

#### 2. **Impostazioni** (`/admin/settings`)
- Link rapido a gestione documenti legali
- Configurazione WhatsApp supporto

---

## 🎯 Flusso Utente

### Registrazione
1. Utente compila form registrazione
2. **OBBLIGATORIO:** Accetta Termini e Condizioni
3. **OBBLIGATORIO:** Accetta Privacy Policy
4. **OPZIONALE:** Accetta marketing
5. Consensi salvati in `user_consents`
6. Email di conferma inviata

### Gestione Dati
1. Utente accede a "I Miei Dati" dal profilo
2. Può visualizzare i propri diritti GDPR
3. Può richiedere esportazione dati
4. Può richiedere cancellazione account
5. Richieste salvate in `data_requests`
6. Admin gestisce richieste entro 30 giorni

---

## ⚖️ Conformità Legale

### GDPR (Regolamento UE 2016/679)
✅ **Art. 13-14:** Informativa sul trattamento dati (Privacy Policy)
✅ **Art. 15:** Diritto di accesso
✅ **Art. 16:** Diritto di rettifica
✅ **Art. 17:** Diritto alla cancellazione
✅ **Art. 20:** Diritto alla portabilità
✅ **Art. 21:** Diritto di opposizione

### Codice del Consumo (D.Lgs. 206/2005)
✅ **Art. 52-59:** Diritto di recesso (14 giorni)
✅ **Art. 128-135:** Garanzia legale di conformità (2 anni)

### Cookie Law (D.Lgs. 196/2003 e Provvedimento Garante 2021)
✅ Informativa sull'uso di tecnologie di tracciamento
✅ Consenso esplicito per cookie non tecnici

---

## 📝 Cosa Deve Fare l'Admin

### 1. **Configurare Documenti Legali** (PRIORITÀ ALTA)
1. Accedere a `/admin/legal-documents`
2. Creare/modificare i 3 documenti:
   - Privacy Policy
   - Termini e Condizioni
   - Cookie Policy
3. **IMPORTANTE:** I template forniti sono esempi. Devono essere personalizzati da un legale esperto in diritto digitale e GDPR.

### 2. **Personalizzare i Documenti**
Ogni documento deve includere:
- Nome azienda completo
- Indirizzo sede legale
- Partita IVA / Codice Fiscale
- Email contatto
- Telefono
- PEC (se applicabile)
- Dati del DPO (Data Protection Officer) se nominato

### 3. **Gestire Richieste GDPR**
- Monitorare `data_requests` per nuove richieste
- Rispondere entro 30 giorni (termine legale)
- Per esportazione: inviare dati in formato JSON
- Per cancellazione: eliminare tutti i dati utente

---

## 🏪 Cosa Va negli Store (Apple/Google)

### Apple App Store

#### Privacy Nutrition Label
Dichiarare nella sezione "App Privacy":
- **Dati raccolti:**
  - Nome e cognome
  - Email
  - Numero di telefono
  - Indirizzo (punto di ritiro)
  - Dati di pagamento (tramite Stripe)
  - Cronologia acquisti
  - Dati di utilizzo app

- **Finalità:**
  - Funzionalità app
  - Analytics
  - Personalizzazione
  - Comunicazioni marketing (se consenso)

- **Link Privacy Policy:** Fornire URL pubblico

#### App Store Connect
- Età minima: 18+ (per e-commerce)
- Categoria: Shopping
- Link a Privacy Policy (obbligatorio)
- Link a Termini e Condizioni (consigliato)

### Google Play Store

#### Data Safety Section
Compilare sezione "Data safety":
- Tipi di dati raccolti
- Finalità raccolta
- Condivisione con terze parti (Stripe, Supabase)
- Misure di sicurezza
- Possibilità di eliminare dati

#### Store Listing
- Link Privacy Policy (obbligatorio)
- Link Termini e Condizioni (consigliato)
- Età minima: 18+
- Categoria: Shopping

---

## 🔒 Sicurezza e Privacy

### Dati Sensibili
- ✅ Password hashate (Supabase Auth)
- ✅ Dati pagamento gestiti da Stripe (PCI-DSS compliant)
- ✅ Comunicazioni HTTPS
- ✅ RLS su tutte le tabelle

### Conservazione Dati
- Dati utente: conservati fino a cancellazione account
- Dati transazioni: 10 anni (obbligo fiscale)
- Log attività: 12 mesi
- Consensi: conservati per prova compliance

---

## ⚠️ Note Importanti

### 1. **Consulenza Legale Obbligatoria**
I documenti legali forniti sono TEMPLATE GENERICI. Devono essere:
- Revisionati da un avvocato esperto in diritto digitale
- Personalizzati per la specifica attività
- Aggiornati regolarmente

### 2. **DPO (Data Protection Officer)**
Se l'azienda:
- Tratta dati su larga scala
- Ha più di 250 dipendenti
- Tratta dati sensibili

È OBBLIGATORIO nominare un DPO.

### 3. **Registro Trattamenti**
Mantenere un registro delle attività di trattamento dati (Art. 30 GDPR).

### 4. **Data Breach**
In caso di violazione dati:
- Notificare Garante Privacy entro 72 ore
- Notificare utenti interessati se rischio elevato

### 5. **Cookies e Tracking**
Se si implementano:
- Google Analytics
- Facebook Pixel
- Altri tracker

Aggiornare Cookie Policy e richiedere consenso esplicito.

---

## 📞 Supporto e Risorse

### Risorse Utili
- [Garante Privacy Italia](https://www.garanteprivacy.it/)
- [GDPR Full Text](https://gdpr-info.eu/)
- [Codice del Consumo](https://www.mise.gov.it/index.php/it/normativa/codice-del-consumo)

### Contatti Legali Consigliati
- Avvocato specializzato in diritto digitale
- Consulente privacy/GDPR
- Commercialista (per aspetti fiscali e-commerce)

---

## ✅ Checklist Pre-Lancio

### Documenti Legali
- [ ] Privacy Policy personalizzata e approvata da legale
- [ ] Termini e Condizioni personalizzati e approvati da legale
- [ ] Cookie Policy personalizzata
- [ ] Tutti i documenti caricati nell'app

### Conformità GDPR
- [ ] Consensi implementati in registrazione
- [ ] Funzionalità esportazione dati testata
- [ ] Funzionalità cancellazione account testata
- [ ] Registro trattamenti compilato
- [ ] DPO nominato (se necessario)

### Store
- [ ] Privacy Policy pubblicata su sito web pubblico
- [ ] Link Privacy Policy inserito in App Store
- [ ] Link Privacy Policy inserito in Google Play
- [ ] Data Safety compilata (Google Play)
- [ ] Privacy Nutrition Label compilata (Apple)

### Sicurezza
- [ ] RLS verificato su tutte le tabelle
- [ ] HTTPS attivo
- [ ] Backup automatici configurati
- [ ] Piano di risposta data breach preparato

---

## 🚀 Prossimi Passi

1. **Immediato:**
   - Personalizzare documenti legali con dati azienda
   - Far revisionare da avvocato
   - Caricare documenti nell'app

2. **Prima del lancio:**
   - Completare checklist pre-lancio
   - Testare tutti i flussi GDPR
   - Preparare URL pubblici per store

3. **Post-lancio:**
   - Monitorare richieste GDPR
   - Aggiornare documenti se necessario
   - Mantenere registro trattamenti aggiornato

---

## 📄 Conclusione

L'implementazione della conformità legale è completa e pronta per l'uso. Tuttavia, è FONDAMENTALE:

1. Far revisionare tutti i documenti da un legale
2. Personalizzare i template con i dati reali dell'azienda
3. Mantenere i documenti aggiornati
4. Rispondere tempestivamente alle richieste GDPR

**La conformità legale non è un'attività una tantum, ma un processo continuo.**

---

*Ultimo aggiornamento: ${new Date().toLocaleDateString('it-IT')}*
