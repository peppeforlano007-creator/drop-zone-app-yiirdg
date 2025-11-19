
# Guida Rapida: Test Completo Flusso Ordini

## 🎯 Obiettivo

Testare l'intero flusso ordine dalla prenotazione del cliente fino al ritiro, utilizzando carte di credito virtuali di test Stripe.

---

## 📚 Documentazione Disponibile

1. **PAYMENT_TESTING_GUIDE.md** - Guida completa e dettagliata (20+ pagine)
2. **STRIPE_TEST_CARDS_QUICK_REFERENCE.md** - Riferimento rapido carte
3. **Questo documento** - Guida rapida per iniziare subito

---

## ⚡ Quick Start (15 minuti)

### Fase 1: Preparazione (3 min)

1. **Accedi come Admin**
   ```
   Email: [tuo admin email]
   Password: [tua password]
   ```

2. **Crea Dati di Test**
   - Vai su: **Admin Dashboard** → **Testing & Diagnostica**
   - Clicca: **"Crea Dati Test"**
   - Risultato: 1 fornitore + 5 prodotti creati

### Fase 2: Setup Consumer (3 min)

1. **Registra Nuovo Consumer**
   - Esci dall'account admin
   - Registrati come consumer
   - Seleziona punto di ritiro (es. Roma)
   - Verifica email

2. **Aggiungi Carta di Test**
   - Vai su: **Profilo** → **Metodi di Pagamento**
   - Clicca: **"Aggiungi Carta"**
   - Inserisci:
     ```
     Numero: 4242 4242 4242 4242
     CVC: 123
     Scadenza: 12/25
     Nome: Test User
     ```
   - Salva

### Fase 3: Esprimi Interesse (2 min)

1. **Naviga Feed Prodotti**
   - Vai alla tab **Home**
   - Scorri i prodotti della lista test

2. **Registra Interesse**
   - Clicca **"Vorrò Partecipare al Drop"** su 3-5 prodotti
   - Verifica che il pulsante cambi in **"Interessato"**

### Fase 4: Attiva Drop (2 min)

1. **Torna Admin**
   - Accedi come admin
   - Vai su: **Gestione Drop**

2. **Approva e Attiva**
   - Trova il drop in **"Pending Approval"**
   - Clicca **"Approva"**
   - Clicca **"Attiva"**
   - Verifica:
     - ✅ Stato: "Active"
     - ✅ Timer: 5 giorni
     - ✅ Sconto: 30%

### Fase 5: Prenota con Carta (2 min)

1. **Torna Consumer**
   - Accedi come consumer
   - Vai alla tab **Drops**

2. **Prenota Prodotto**
   - Seleziona il drop attivo
   - Scegli un prodotto
   - Clicca **"Prenota con Carta"**
   - Conferma la prenotazione

3. **Verifica**
   - Vai su **"Le Mie Prenotazioni"**
   - Controlla:
     - ✅ Stato: "Attiva"
     - ✅ Pagamento: "Autorizzato"
     - ✅ Importo bloccato visibile

### Fase 6: Completa Drop (2 min)

1. **Torna Admin**
   - Vai su: **Gestione Drop**
   - Seleziona il drop attivo

2. **Completa**
   - Clicca **"Completa Drop"**
   - Conferma l'azione

3. **Verifica Automatica**
   - I pagamenti vengono catturati automaticamente
   - L'ordine viene creato per il fornitore

### Fase 7: Verifica Finale (1 min)

1. **Come Consumer**
   - Vai su **"Le Mie Prenotazioni"**
   - Verifica:
     - ✅ Pagamento: "Addebitato"
     - ✅ Importo finale calcolato
     - ✅ Risparmio mostrato

2. **Come Admin**
   - Vai su **"Gestione Drop"** → **Ordini**
   - Verifica ordine creato con tutti i dettagli

---

## 🎴 Carte di Test Principali

### ✅ Successo (Usa questa per il test base)
```
4242 4242 4242 4242
CVC: 123
Scadenza: 12/25
```

### ❌ Fondi Insufficienti (Test errore)
```
4000 0000 0000 9995
CVC: 123
Scadenza: 12/25
```

### ⚠️ Declinato (Test rifiuto)
```
4000 0000 0000 0002
CVC: 123
Scadenza: 12/25
```

**Vedi `STRIPE_TEST_CARDS_QUICK_REFERENCE.md` per tutte le carte**

---

## 🧪 Test Nell'App

### Accesso Rapido
**Admin Dashboard** → **Test Pagamenti**

### Funzionalità
- ✅ Visualizza tutte le carte di test
- ✅ Copia numeri carta con un tap
- ✅ Testa singole carte
- ✅ Esegui suite completa di test
- ✅ Visualizza risultati in tempo reale

---

## 📊 Scenari di Test Consigliati

### 1. Happy Path (Tutto Funziona)
- Carta: 4242 4242 4242 4242
- Risultato Atteso: Prenotazione → Autorizzazione → Cattura → Ordine

### 2. Fondi Insufficienti
- Carta: 4000 0000 0000 9995
- Risultato Atteso: Errore, nessuna prenotazione creata

### 3. Drop Sotto-Finanziato
- Crea drop con poche prenotazioni (< €5.000)
- Lascia scadere
- Risultato Atteso: Fondi rilasciati, utenti notificati

### 4. Cancellazione Prenotazione
- Crea prenotazione
- Cancella da "Le Mie Prenotazioni"
- Risultato Atteso: Autorizzazione cancellata, fondi rilasciati

---

## 🔍 Cosa Verificare

### ✅ Checklist Prenotazione
- [ ] Carta aggiunta correttamente
- [ ] Prenotazione creata
- [ ] Pagamento autorizzato
- [ ] Importo bloccato corretto
- [ ] Sconto applicato corretto
- [ ] Prenotazione visibile in "Le Mie Prenotazioni"

### ✅ Checklist Chiusura Drop
- [ ] Drop completato
- [ ] Pagamenti catturati
- [ ] Importo finale calcolato
- [ ] Sconto finale applicato
- [ ] Ordine creato per fornitore
- [ ] Stato aggiornato correttamente

### ✅ Checklist Ordine
- [ ] Ordine visibile al fornitore
- [ ] Tutti i prodotti inclusi
- [ ] Importi corretti
- [ ] Punto di ritiro corretto
- [ ] Stato iniziale: "Pending"

---

## 🚨 Problemi Comuni

### Carta Non Accettata
**Causa**: Modalità produzione invece di test
**Soluzione**: Verifica chiavi Stripe test in Supabase

### Autorizzazione Non Creata
**Causa**: Metodo di pagamento mancante
**Soluzione**: Aggiungi carta prima di prenotare

### Pagamento Non Catturato
**Causa**: Edge Function non deployata
**Soluzione**: Verifica deployment Edge Function

### Drop Non Si Crea
**Causa**: Valore minimo non raggiunto
**Soluzione**: Aggiungi più interessi o crea drop manualmente

---

## 📱 Interfacce Chiave

### Consumer
- **Home**: Feed prodotti, esprimi interesse
- **Drops**: Visualizza drop attivi, prenota
- **Le Mie Prenotazioni**: Gestisci prenotazioni
- **Profilo**: Metodi di pagamento

### Admin
- **Dashboard**: Panoramica e azioni rapide
- **Gestione Drop**: Approva, attiva, completa
- **Test Pagamenti**: Carte di test e scenari
- **Testing & Diagnostica**: Test automatici

### Fornitore
- **Ordini**: Visualizza ordini ricevuti
- **Prodotti**: Gestisci catalogo

### Punto di Ritiro
- **Ordini**: Gestisci arrivi e ritiri
- **Dashboard**: Statistiche e commissioni

---

## 🎓 Prossimi Passi

### Dopo il Test Base

1. **Test Scenari Avanzati**
   - Leggi `PAYMENT_TESTING_GUIDE.md`
   - Testa tutti gli scenari di errore
   - Verifica edge cases

2. **Test Multi-Utente**
   - Crea più account consumer
   - Simula prenotazioni multiple
   - Verifica crescita sconto

3. **Test Flusso Completo**
   - Dalla prenotazione al ritiro
   - Include gestione fornitore
   - Include gestione punto di ritiro

4. **Test Performance**
   - Usa "Testing & Diagnostica"
   - Verifica tempi di risposta
   - Controlla caricamento immagini

---

## 📞 Supporto

### Documentazione
- `PAYMENT_TESTING_GUIDE.md` - Guida completa
- `STRIPE_TEST_CARDS_QUICK_REFERENCE.md` - Riferimento carte
- `TESTING_GUIDE.md` - Testing generale

### Strumenti
- **App**: Admin → Test Pagamenti
- **App**: Admin → Testing & Diagnostica
- **Stripe**: https://dashboard.stripe.com/test/payments
- **Supabase**: https://supabase.com/dashboard

### Log e Debug
```bash
# Log Edge Functions
supabase functions logs capture-drop-payments

# Log Database
# Vai su Supabase Dashboard → Logs

# Log App
# Controlla console del dispositivo/emulatore
```

---

## ✨ Tips & Tricks

### 🎯 Test Veloce
Usa il pulsante **"Test Tutti"** in **Test Pagamenti** per eseguire automaticamente tutti gli scenari.

### 📋 Copia Rapida
Nella schermata **Test Pagamenti**, tap sui numeri carta per copiarli negli appunti.

### 🔄 Reset Dati
Usa **"Elimina Tutti i Dati"** in **Testing & Diagnostica** per pulire e ricominciare.

### 📊 Monitora Real-time
Le prenotazioni e gli sconti si aggiornano in tempo reale grazie a Supabase Realtime.

### 🎨 Visualizza Progresso
Il cerchio di progresso nella schermata drop mostra visivamente l'avanzamento verso l'obiettivo.

---

## 🎉 Conclusione

Hai tutto quello che ti serve per testare il flusso completo degli ordini!

**Tempo stimato primo test**: 15 minuti
**Tempo test completo**: 1-2 ore

Buon testing! 🚀
