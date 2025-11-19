
# Carte di Test Stripe - Riferimento Rapido

## 🎯 Carte Più Usate

### ✅ Successo Garantito
```
Numero:  4242 4242 4242 4242
CVC:     123
Scadenza: 12/25
Nome:    Qualsiasi nome
```

### ❌ Fondi Insufficienti
```
Numero:  4000 0000 0000 9995
CVC:     123
Scadenza: 12/25
```

### ⚠️ Declinato Generico
```
Numero:  4000 0000 0000 0002
CVC:     123
Scadenza: 12/25
```

---

## 📋 Tutte le Carte di Test

### Carte di Successo

| Tipo | Numero | CVC | Note |
|------|--------|-----|------|
| Visa | 4242 4242 4242 4242 | 123 | Standard |
| Visa Debit | 4000 0566 5566 5556 | 123 | Carta di debito |
| Mastercard | 5555 5555 5555 4444 | 123 | Standard |
| Mastercard (2-series) | 2223 0031 2200 3222 | 123 | Nuova serie |
| Mastercard Debit | 5200 8282 8282 8210 | 123 | Carta di debito |
| American Express | 3782 822463 10005 | 1234 | 4 cifre CVC |

### Carte Declinate

| Tipo Errore | Numero | Codice |
|-------------|--------|--------|
| Fondi insufficienti | 4000 0000 0000 9995 | insufficient_funds |
| Declinato generico | 4000 0000 0000 0002 | generic_decline |
| Carta rubata | 4000 0000 0000 9979 | stolen_card |
| Carta smarrita | 4000 0000 0000 9987 | lost_card |

### Carte con Errori

| Tipo Errore | Numero | Codice |
|-------------|--------|--------|
| Carta scaduta | 4000 0000 0000 0069 | expired_card |
| CVC errato | 4000 0000 0000 0127 | incorrect_cvc |
| Errore elaborazione | 4000 0000 0000 0119 | processing_error |

### Carte 3D Secure

| Tipo | Numero | Comportamento |
|------|--------|---------------|
| 3DS Richiesto | 4000 0027 6000 3184 | Richiede autenticazione |
| 3DS Opzionale | 4000 0025 0000 3155 | Autenticazione opzionale |

---

## 🚀 Come Usare

### 1. Aggiungi Carta nell'App
- Vai su **Profilo** → **Metodi di Pagamento**
- Clicca **Aggiungi Carta**
- Inserisci i dati della carta di test
- Salva

### 2. Testa una Prenotazione
- Naviga nel feed prodotti
- Esprimi interesse su prodotti
- Attendi creazione drop (o crea manualmente da admin)
- Prenota un prodotto con la carta di test
- Verifica il risultato atteso

### 3. Verifica il Risultato
- **Successo**: Prenotazione creata, pagamento autorizzato
- **Declinato**: Errore mostrato, nessuna prenotazione
- **Errore**: Messaggio di errore appropriato

---

## 📝 Note Importanti

1. **Solo Modalità Test**: Queste carte funzionano SOLO in modalità test Stripe
2. **Nessun Addebito Reale**: Non viene mai addebitato denaro reale
3. **CVC Qualsiasi**: Usa qualsiasi CVC valido (3 cifre, 4 per Amex)
4. **Data Futura**: Usa qualsiasi data di scadenza futura
5. **Nome Qualsiasi**: Il nome sulla carta può essere qualsiasi

---

## 🔗 Risorse

- **Documentazione Completa**: `docs/PAYMENT_TESTING_GUIDE.md`
- **Test nell'App**: Admin → Test Pagamenti
- **Stripe Docs**: https://stripe.com/docs/testing
- **Dashboard Stripe**: https://dashboard.stripe.com/test/payments

---

## 🎬 Flusso di Test Rapido

1. **Setup** (5 min)
   - Crea account consumer
   - Aggiungi carta Visa test (4242...)
   - Esprimi interesse su 3+ prodotti

2. **Drop** (2 min)
   - Admin: Approva e attiva drop
   - Verifica timer e sconto iniziale

3. **Prenotazione** (2 min)
   - Prenota prodotto con carta
   - Verifica autorizzazione

4. **Chiusura** (2 min)
   - Admin: Completa drop
   - Verifica cattura pagamento

5. **Verifica** (1 min)
   - Controlla importo finale
   - Verifica ordine creato

**Tempo Totale**: ~12 minuti

---

## ❓ Risoluzione Problemi

### Carta Non Accettata
- ✅ Verifica modalità test Stripe
- ✅ Controlla numero carta corretto
- ✅ Usa data futura
- ✅ CVC corretto (3 o 4 cifre)

### Autorizzazione Fallita
- ✅ Verifica metodo di pagamento salvato
- ✅ Drop deve essere "Active"
- ✅ Prodotto disponibile
- ✅ Controlla log app

### Pagamento Non Catturato
- ✅ Edge Function deployata
- ✅ Drop in stato "Completed"
- ✅ Chiavi Stripe configurate
- ✅ Controlla log Edge Function

---

## 📞 Supporto

Per problemi o domande:
1. Controlla `docs/PAYMENT_TESTING_GUIDE.md`
2. Usa "Testing & Diagnostica" nell'app
3. Verifica log Stripe Dashboard
4. Controlla log Supabase Edge Functions
