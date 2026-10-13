
# 🚀 Guida Rapida Admin - Conformità Legale

## 📍 Dove Trovare Tutto

### Per Admin
- **Gestione Documenti Legali:** `/admin/legal-documents`
- **Impostazioni:** `/admin/settings` → "Gestisci Documenti Legali"
- **Richieste GDPR:** Database → Tabella `data_requests`

### Per Utenti
- **Privacy Policy:** `/legal/privacy-policy`
- **Termini e Condizioni:** `/legal/terms-conditions`
- **Cookie Policy:** `/legal/cookie-policy`
- **I Miei Dati:** Profilo → "I Miei Dati (GDPR)"

---

## 🎯 Primi Passi (15 minuti)

### 1. Accedi alla Gestione Documenti
```
App → Admin → Impostazioni → "Gestisci Documenti Legali"
```

### 2. Crea i 3 Documenti Obbligatori

#### A. Privacy Policy
1. Clicca "Crea Documento" su Privacy Policy
2. Il template si apre automaticamente
3. Sostituisci `[Inserire...]` con i tuoi dati:
   - Nome azienda
   - Indirizzo
   - Email
   - Telefono
   - Partita IVA
4. Clicca "Salva"

#### B. Termini e Condizioni
1. Clicca "Crea Documento" su Termini e Condizioni
2. Sostituisci `[Inserire...]` con i tuoi dati
3. Clicca "Salva"

#### C. Cookie Policy
1. Clicca "Crea Documento" su Cookie Policy
2. Sostituisci `[Inserire...]` con i tuoi dati
3. Clicca "Salva"

---

## ✏️ Cosa Sostituire nei Template

### In TUTTI i documenti, sostituisci:

```
[Inserire nome azienda]     → Es: "Drop Zone S.r.l."
[Inserire indirizzo]        → Es: "Via Roma 123, 00100 Roma"
[Inserire email]            → Es: "info@dropzone.it"
[Inserire telefono]         → Es: "+39 06 1234567"
[Inserire Partita IVA]      → Es: "IT12345678901"
```

### Informazioni Aggiuntive (se applicabili):

```
[Inserire PEC]              → Es: "dropzone@pec.it"
[Inserire DPO]              → Es: "dpo@dropzone.it" (se nominato)
[Inserire REA]              → Es: "RM-1234567"
[Inserire Capitale Sociale] → Es: "€10.000 i.v."
```

---

## 📝 Esempio Pratico

### PRIMA (Template):
```
2. TITOLARE DEL TRATTAMENTO
[Inserire nome azienda]
[Inserire indirizzo]
[Inserire email]
[Inserire telefono]
```

### DOPO (Personalizzato):
```
2. TITOLARE DEL TRATTAMENTO
Drop Zone S.r.l.
Via Roma 123, 00100 Roma (RM)
Email: privacy@dropzone.it
Telefono: +39 06 1234567
P.IVA: IT12345678901
PEC: dropzone@pec.it
```

---

## 🔄 Come Modificare un Documento

1. Vai a `/admin/legal-documents`
2. Trova il documento da modificare
3. Clicca "Modifica"
4. Fai le modifiche necessarie
5. Clicca "Salva"

**Nota:** Ogni salvataggio crea una nuova versione. La vecchia versione viene automaticamente disattivata.

---

## 👥 Gestire Richieste GDPR

### Richiesta Esportazione Dati
Quando un utente richiede i suoi dati:

1. **Controlla richiesta:**
   - Database → Tabella `data_requests`
   - Filtra per `request_type = 'export'`
   - Filtra per `status = 'pending'`

2. **Raccogli dati utente:**
   - Profilo (tabella `profiles`)
   - Prenotazioni (tabella `bookings`)
   - Ordini (tabella `orders`)
   - Consensi (tabella `user_consents`)

3. **Crea file JSON:**
   ```json
   {
     "user_id": "...",
     "email": "...",
     "full_name": "...",
     "phone": "...",
     "bookings": [...],
     "orders": [...],
     "consents": {...}
   }
   ```

4. **Invia via email:**
   - Entro 30 giorni dalla richiesta
   - Usa email sicura
   - Conferma identità utente

5. **Aggiorna stato:**
   - `status = 'completed'`
   - `completed_at = now()`

### Richiesta Cancellazione Account
Quando un utente richiede la cancellazione:

1. **Controlla richiesta:**
   - Database → Tabella `data_requests`
   - Filtra per `request_type = 'deletion'`
   - Filtra per `status = 'pending'`

2. **Verifica obblighi legali:**
   - ⚠️ Dati transazioni: conservare 10 anni (obbligo fiscale)
   - ✅ Dati personali: eliminare
   - ✅ Prenotazioni non completate: eliminare

3. **Elimina dati:**
   ```sql
   -- Elimina profilo (cascade elimina tutto)
   DELETE FROM profiles WHERE user_id = '...';
   
   -- Elimina utente auth
   -- (da fare tramite Supabase Dashboard)
   ```

4. **Aggiorna stato:**
   - `status = 'completed'`
   - `completed_at = now()`

5. **Conferma via email:**
   - Invia conferma cancellazione
   - Entro 30 giorni dalla richiesta

---

## ⚠️ Errori Comuni da Evitare

### ❌ NON FARE:
- ❌ Lasciare `[Inserire...]` nei documenti
- ❌ Copiare documenti da altre aziende
- ❌ Ignorare richieste GDPR
- ❌ Superare i 30 giorni per rispondere
- ❌ Eliminare dati transazioni (obbligo fiscale)

### ✅ FARE:
- ✅ Personalizzare tutti i campi
- ✅ Far revisionare da avvocato
- ✅ Rispondere entro 30 giorni
- ✅ Conservare dati transazioni 10 anni
- ✅ Aggiornare documenti se cambiano leggi

---

## 📊 Monitoraggio

### Cosa Controllare Settimanalmente:
1. **Nuove richieste GDPR:**
   - Tabella `data_requests`
   - Status `pending`

2. **Richieste in scadenza:**
   - Richieste con più di 20 giorni
   - Priorità alta se > 25 giorni

3. **Consensi utenti:**
   - Tabella `user_consents`
   - Verifica consensi marketing

---

## 🆘 Quando Serve un Avvocato

### OBBLIGATORIO consultare avvocato per:
- ✅ Revisione documenti legali
- ✅ Modifiche sostanziali ai servizi
- ✅ Data breach (violazione dati)
- ✅ Contestazioni utenti
- ✅ Richieste Garante Privacy

### CONSIGLIATO consultare avvocato per:
- ⚪ Nuove funzionalità che trattano dati
- ⚪ Modifiche policy
- ⚪ Dubbi su richieste GDPR

---

## 📞 Contatti Utili

### Emergenze Legali
- **Garante Privacy:** https://www.garanteprivacy.it/
- **Telefono Garante:** +39 06 696771

### Data Breach
Se si verifica una violazione dati:
1. **Notifica Garante entro 72 ore**
2. **Notifica utenti se rischio elevato**
3. **Documenta l'incidente**
4. **Consulta avvocato immediatamente**

---

## ✅ Checklist Settimanale Admin

### Lunedì Mattina (10 minuti):
- [ ] Controlla nuove richieste GDPR
- [ ] Verifica richieste in scadenza
- [ ] Rispondi a richieste urgenti

### Venerdì Pomeriggio (5 minuti):
- [ ] Aggiorna stato richieste completate
- [ ] Verifica documenti legali aggiornati
- [ ] Controlla log errori

---

## 🎓 Formazione Consigliata

### Per Admin:
1. **GDPR Base** (2 ore)
   - Cos'è il GDPR
   - Diritti degli utenti
   - Obblighi del titolare

2. **Gestione Richieste** (1 ora)
   - Come rispondere a richieste
   - Tempistiche
   - Documentazione

3. **Data Breach** (1 ora)
   - Cosa fare in caso di violazione
   - Procedure di notifica
   - Prevenzione

### Risorse Gratuite:
- Garante Privacy: Corsi online gratuiti
- GDPR.eu: Guide e tutorial
- YouTube: "GDPR per principianti"

---

## 📱 App Mobile - Dove Trovare

### Utenti Vedono:
- **Registrazione:** Checkbox consensi obbligatori
- **Profilo → I Miei Dati:** Gestione GDPR completa
- **Profilo → Impostazioni:** Link documenti legali

### Admin Vede:
- **Admin → Impostazioni:** Link gestione documenti
- **Admin → Documenti Legali:** Editor completo

---

## 🚀 Quick Win (5 minuti)

Vuoi fare subito qualcosa di utile?

1. Apri `/admin/legal-documents`
2. Crea Privacy Policy con template
3. Sostituisci almeno nome azienda ed email
4. Salva

**Fatto!** Ora gli utenti possono vedere una Privacy Policy (anche se ancora da completare).

---

## 💡 Pro Tips

### Tip #1: Usa Variabili
Crea un documento con tutti i dati azienda:
```
Nome: Drop Zone S.r.l.
Indirizzo: Via Roma 123, 00100 Roma
Email: info@dropzone.it
Telefono: +39 06 1234567
P.IVA: IT12345678901
```
Copia-incolla quando serve.

### Tip #2: Versionamento
Ogni modifica crea una nuova versione. Puoi sempre vedere la cronologia.

### Tip #3: Backup
Esporta i documenti in PDF periodicamente per backup.

### Tip #4: Calendario
Imposta reminder:
- Ogni lunedì: Controlla richieste GDPR
- Ogni 6 mesi: Rivedi documenti legali
- Ogni anno: Consulta avvocato per aggiornamenti

---

## ❓ FAQ Rapide

**Q: Quanto tempo ho per rispondere a richieste GDPR?**
A: 30 giorni dalla richiesta.

**Q: Posso eliminare dati di transazioni?**
A: NO. Obbligo fiscale di conservazione 10 anni.

**Q: Devo avere un DPO?**
A: Solo se tratti dati su larga scala o hai >250 dipendenti.

**Q: Cosa succede se non rispondo in tempo?**
A: Sanzioni GDPR fino a €20 milioni o 4% fatturato.

**Q: Posso usare i template così come sono?**
A: NO. Devi personalizzarli e farli revisionare da avvocato.

---

**Hai domande? Consulta la guida completa in `LEGAL_COMPLIANCE_GUIDE.md`**

---

*Ultimo aggiornamento: ${new Date().toLocaleDateString('it-IT')}*
