
# 🚀 Quick Start - Configurazione Twilio (5 Minuti)

## ⚡ Configurazione Rapida

### 1️⃣ Vai su Supabase Dashboard
```
https://supabase.com/dashboard
→ Progetto: sippdylyuzejudmzbwdn
→ Authentication → Providers → Phone
```

### 2️⃣ Attiva Phone Authentication
```
☑ Enable Phone Sign-Up
SMS Provider: Twilio
```

### 3️⃣ Inserisci Credenziali Twilio

**Copia e incolla questi valori**:

```
Twilio Account SID:
AC48f6a2a83987ccca8984d2e9e42604b0

Twilio Auth Token:
359587445d47d55a7689058e2234a416

Twilio Phone Number:
+16362183294
```

### 4️⃣ Salva
```
Clicca "Save" in fondo alla pagina
```

### 5️⃣ Testa
```
1. Apri l'app
2. Vai su "Registrazione Utente"
3. Inserisci il TUO numero (es. +39 123 456 7890)
4. Compila i campi e clicca "Invia Codice"
5. Controlla il tuo cellulare per l'SMS
6. Inserisci il codice ricevuto
7. Completa la registrazione
```

---

## ✅ Fatto!

Se hai ricevuto l'SMS e completato la registrazione, tutto funziona! 🎉

---

## 📖 Guide Dettagliate

Per maggiori informazioni, consulta:

- **`TWILIO_INTEGRATION_GUIDE.md`** - Guida completa con tutti i dettagli
- **`TWILIO_CONFIGURATION_STEPS.md`** - Guida visuale passo-passo
- **`RIEPILOGO_INTEGRAZIONE_TWILIO.md`** - Riepilogo in italiano

---

## 🆘 Problemi?

### SMS non ricevuto?
1. Verifica che il numero sia in formato internazionale (+39 per Italia)
2. Controlla i log Twilio: https://console.twilio.com/
3. Verifica il credito Twilio

### Errore "Invalid credentials"?
1. Verifica di aver copiato correttamente le credenziali
2. Controlla che non ci siano spazi extra
3. Salva di nuovo nel Dashboard Supabase

### Codice non valido?
1. Il codice è valido solo 60 secondi
2. Richiedi un nuovo codice
3. Inseriscilo più velocemente

---

## 💰 Costi

- **Registrazione**: ~€0.08 per SMS (una tantum)
- **Login**: €0 (usa password, nessun SMS)
- **Reset Password**: ~€0.08 per SMS (solo quando necessario)

**Esempio**: 100 nuovi utenti/mese = ~€8

---

## 🔗 Link Utili

- **Dashboard Twilio**: https://console.twilio.com/
- **Dashboard Supabase**: https://supabase.com/dashboard
- **Twilio Logs**: https://console.twilio.com/ → Monitor → Logs → Messaging
- **Supabase Users**: https://supabase.com/dashboard → Authentication → Users

---

**Tempo stimato**: 5 minuti ⏱️

**Difficoltà**: Facile 🟢

Buona configurazione! 🚀
