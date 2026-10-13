
# 🧪 Documentazione Testing - Indice

Benvenuto nella documentazione completa per il testing dell'applicazione. Questa guida ti aiuterà a testare tutti gli aspetti del sistema, con particolare attenzione al flusso di pagamento e ordini.

---

## 📚 Documenti Disponibili

### 1. **GUIDA_RAPIDA_TEST_ORDINI.md** ⚡
**Per chi**: Sviluppatori, QA, Product Managers
**Tempo**: 15 minuti
**Contenuto**: Guida rapida per testare il flusso completo ordine-pagamento-ritiro

**Usa questo se**:
- È la tua prima volta
- Vuoi un test rapido end-to-end
- Hai poco tempo

### 2. **PAYMENT_TESTING_GUIDE.md** 📖
**Per chi**: Sviluppatori, QA Lead
**Tempo**: 1-2 ore
**Contenuto**: Guida completa e dettagliata con tutti gli scenari di test

**Usa questo se**:
- Vuoi testare approfonditamente
- Devi documentare i test
- Stai preparando il deployment

### 3. **STRIPE_TEST_CARDS_QUICK_REFERENCE.md** 🎴
**Per chi**: Tutti
**Tempo**: 2 minuti
**Contenuto**: Riferimento rapido per le carte di test Stripe

**Usa questo se**:
- Hai bisogno di un numero carta velocemente
- Vuoi vedere tutte le carte disponibili
- Stai testando scenari specifici

### 4. **TESTING_GUIDE.md** 🔍
**Per chi**: QA Team, Sviluppatori
**Tempo**: Variabile
**Contenuto**: Guida generale al testing (UI, performance, security, etc.)

**Usa questo se**:
- Devi testare aspetti non-pagamento
- Stai facendo testing pre-deployment
- Vuoi una checklist completa

---

## 🚀 Come Iniziare

### Percorso Consigliato

```
1. Leggi GUIDA_RAPIDA_TEST_ORDINI.md (15 min)
   ↓
2. Esegui il test rapido nell'app (15 min)
   ↓
3. Se tutto funziona, passa a PAYMENT_TESTING_GUIDE.md
   ↓
4. Testa tutti gli scenari (1-2 ore)
   ↓
5. Usa TESTING_GUIDE.md per test completo pre-deployment
```

### Per Ruolo

#### 👨‍💻 Sviluppatore
1. `GUIDA_RAPIDA_TEST_ORDINI.md` - Setup veloce
2. `PAYMENT_TESTING_GUIDE.md` - Test approfonditi
3. `STRIPE_TEST_CARDS_QUICK_REFERENCE.md` - Riferimento

#### 🧪 QA Tester
1. `TESTING_GUIDE.md` - Panoramica completa
2. `PAYMENT_TESTING_GUIDE.md` - Focus pagamenti
3. `GUIDA_RAPIDA_TEST_ORDINI.md` - Test rapidi

#### 📊 Product Manager
1. `GUIDA_RAPIDA_TEST_ORDINI.md` - Capire il flusso
2. `PAYMENT_TESTING_GUIDE.md` - Scenari utente
3. `TESTING_GUIDE.md` - Checklist deployment

---

## 🎯 Test Rapidi

### Test in 5 Minuti
```
1. Apri app come admin
2. Vai su "Test Pagamenti"
3. Clicca "Test Tutti"
4. Verifica risultati
```

### Test in 15 Minuti
```
1. Segui GUIDA_RAPIDA_TEST_ORDINI.md
2. Completa il flusso base
3. Verifica ordine creato
```

### Test in 1 Ora
```
1. Segui PAYMENT_TESTING_GUIDE.md
2. Testa tutti gli scenari principali
3. Documenta i risultati
```

---

## 🛠️ Strumenti di Testing

### Nell'App

#### 1. Test Pagamenti
**Percorso**: Admin Dashboard → Test Pagamenti

**Funzionalità**:
- Visualizza tutte le carte di test Stripe
- Copia numeri carta con un tap
- Testa singole carte o suite completa
- Visualizza risultati in tempo reale

#### 2. Testing & Diagnostica
**Percorso**: Admin Dashboard → Testing & Diagnostica

**Funzionalità**:
- Crea/elimina dati di test
- Esegui test automatici
- Monitora performance
- Visualizza metriche
- Genera report

### Esterni

#### Stripe Dashboard
**URL**: https://dashboard.stripe.com/test/payments

**Usa per**:
- Verificare autorizzazioni
- Controllare catture
- Vedere dettagli pagamenti
- Debug errori

#### Supabase Dashboard
**URL**: https://supabase.com/dashboard/project/sippdylyuzejudmzbwdn

**Usa per**:
- Verificare dati database
- Controllare log Edge Functions
- Monitorare performance query
- Gestire RLS policies

---

## 📋 Checklist Pre-Deployment

### Testing Funzionale
- [ ] Flusso registrazione consumer
- [ ] Aggiunta metodo di pagamento
- [ ] Espressione interesse prodotti
- [ ] Creazione automatica drop
- [ ] Approvazione e attivazione drop
- [ ] Prenotazione con carta
- [ ] Autorizzazione pagamento
- [ ] Crescita sconto
- [ ] Chiusura drop
- [ ] Cattura pagamento
- [ ] Creazione ordine
- [ ] Gestione ordine fornitore
- [ ] Gestione ritiro

### Testing Scenari Errore
- [ ] Carta declinata
- [ ] Fondi insufficienti
- [ ] Carta scaduta
- [ ] CVC errato
- [ ] Drop sotto-finanziato
- [ ] Cancellazione prenotazione
- [ ] Timeout pagamento
- [ ] Errore di rete

### Testing Performance
- [ ] Caricamento veloce
- [ ] Scroll fluido
- [ ] Aggiornamenti real-time
- [ ] Caching immagini
- [ ] Query database ottimizzate

### Testing Security
- [ ] RLS policies attive
- [ ] Dati sensibili protetti
- [ ] Input validation
- [ ] API rate limiting
- [ ] Autenticazione sicura

---

## 🎴 Carte di Test Essenziali

### Successo
```
4242 4242 4242 4242 (Visa)
CVC: 123 | Scadenza: 12/25
```

### Fondi Insufficienti
```
4000 0000 0000 9995
CVC: 123 | Scadenza: 12/25
```

### Declinato
```
4000 0000 0000 0002
CVC: 123 | Scadenza: 12/25
```

**Vedi `STRIPE_TEST_CARDS_QUICK_REFERENCE.md` per lista completa**

---

## 🐛 Risoluzione Problemi

### Problema: Carta Non Accettata
**Documenti**: 
- `PAYMENT_TESTING_GUIDE.md` → Risoluzione Problemi
- `STRIPE_TEST_CARDS_QUICK_REFERENCE.md` → Supporto

### Problema: Autorizzazione Fallita
**Documenti**:
- `PAYMENT_TESTING_GUIDE.md` → Risoluzione Problemi
- `TESTING_GUIDE.md` → Security Testing

### Problema: Drop Non Si Crea
**Documenti**:
- `GUIDA_RAPIDA_TEST_ORDINI.md` → Problemi Comuni
- `PAYMENT_TESTING_GUIDE.md` → Fase 3

### Problema: Pagamento Non Catturato
**Documenti**:
- `PAYMENT_TESTING_GUIDE.md` → Risoluzione Problemi
- Log Edge Functions (vedi sotto)

---

## 📊 Monitoraggio e Log

### Log App
```javascript
// Console del dispositivo/emulatore
// Filtra per: "🧪", "Payment", "Drop", "Booking"
```

### Log Edge Functions
```bash
# Capture payments
supabase functions logs capture-drop-payments --project-ref sippdylyuzejudmzbwdn

# Altri Edge Functions
supabase functions logs [function-name] --project-ref sippdylyuzejudmzbwdn
```

### Log Database
```
Supabase Dashboard → Logs → Database
Filtra per: errori, slow queries, RLS violations
```

### Metriche Performance
```
App → Admin → Testing & Diagnostica → Performance Metrics
```

---

## 🎓 Best Practices

### 1. Test Regolarmente
- Dopo ogni nuova feature
- Prima di ogni deployment
- Dopo modifiche al database
- Dopo aggiornamenti dipendenze

### 2. Documenta i Risultati
- Usa i report generati dall'app
- Salva screenshot di errori
- Annota comportamenti inaspettati
- Condividi con il team

### 3. Test su Dispositivi Reali
- Non solo emulatori
- iOS e Android
- Diverse versioni OS
- Diverse dimensioni schermo

### 4. Test con Dati Realistici
- Usa "Crea Dati Test" per setup veloce
- Simula scenari utente reali
- Testa con volumi di dati crescenti

### 5. Pulisci Dopo i Test
- Usa "Elimina Tutti i Dati" per reset
- Non lasciare dati di test in produzione
- Mantieni ambiente test separato

---

## 📞 Supporto e Risorse

### Documentazione
- Questa cartella `docs/`
- Stripe Docs: https://stripe.com/docs/testing
- Supabase Docs: https://supabase.com/docs

### Dashboard
- Stripe Test: https://dashboard.stripe.com/test
- Supabase: https://supabase.com/dashboard

### Nell'App
- Admin → Test Pagamenti
- Admin → Testing & Diagnostica
- Admin → Activity Log

---

## 🎯 Obiettivi Testing

### Breve Termine
- ✅ Flusso base funzionante
- ✅ Pagamenti autorizzati e catturati
- ✅ Ordini creati correttamente
- ✅ Nessun errore critico

### Medio Termine
- ✅ Tutti gli scenari testati
- ✅ Performance ottimizzata
- ✅ UI/UX validata
- ✅ Security verificata

### Lungo Termine
- ✅ Test automatizzati
- ✅ CI/CD integrato
- ✅ Monitoring produzione
- ✅ A/B testing

---

## 🚀 Prossimi Passi

1. **Inizia con la guida rapida**
   ```
   Leggi: GUIDA_RAPIDA_TEST_ORDINI.md
   Tempo: 15 minuti
   ```

2. **Esegui il primo test**
   ```
   Segui: Quick Start nella guida rapida
   Tempo: 15 minuti
   ```

3. **Approfondisci**
   ```
   Leggi: PAYMENT_TESTING_GUIDE.md
   Tempo: 1-2 ore
   ```

4. **Test completo**
   ```
   Segui: TESTING_GUIDE.md
   Tempo: Variabile
   ```

---

## ✨ Tips Finali

- 💡 Usa "Test Tutti" per verifiche rapide
- 📋 Tieni `STRIPE_TEST_CARDS_QUICK_REFERENCE.md` sempre aperto
- 🔄 Testa dopo ogni modifica significativa
- 📊 Monitora le metriche di performance
- 🐛 Documenta e risolvi i bug immediatamente
- 🎯 Focalizzati prima sul flusso critico (pagamenti)
- 🧪 Poi espandi ai casi edge
- ✅ Usa le checklist per non dimenticare nulla

---

## 📝 Feedback

Hai suggerimenti per migliorare questa documentazione?
Hai trovato errori o informazioni mancanti?
Hai bisogno di chiarimenti su qualche aspetto?

Contatta il team di sviluppo o apri una issue.

---

**Buon Testing! 🚀**

*Ultima modifica: ${new Date().toLocaleDateString('it-IT')}*
