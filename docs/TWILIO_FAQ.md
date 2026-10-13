
# ❓ FAQ - Domande Frequenti su Twilio

## 📱 Generale

### Q: Cos'è Twilio?
**A:** Twilio è un servizio cloud che permette di inviare SMS, effettuare chiamate e gestire comunicazioni. In questa app, lo usiamo per inviare codici OTP via SMS per verificare i numeri di telefono.

### Q: Perché devo configurare Twilio?
**A:** Twilio è necessario per inviare SMS con i codici di verifica durante la registrazione e il reset password. Senza Twilio configurato, gli utenti non possono registrarsi o reimpostare la password.

### Q: Quanto costa Twilio?
**A:** I costi variano per paese:
- **SMS Italia**: ~€0.08 per messaggio
- **SMS USA**: ~€0.01 per messaggio
- **SMS altri paesi**: varia (controlla https://www.twilio.com/sms/pricing)

### Q: Devo pagare per ogni login?
**A:** NO! Gli SMS vengono inviati solo per:
- Registrazione nuovo utente (una tantum)
- Reset password (solo quando necessario)

I login successivi usano la password, quindi NON hanno costi SMS.

---

## 🔧 Configurazione

### Q: Dove trovo le credenziali Twilio?
**A:** Le credenziali sono già fornite in questa guida:
- Account SID: `AC48f6a2a83987ccca8984d2e9e42604b0`
- Auth Token: `359587445d47d55a7689058e2234a416`
- Phone Number: `+16362183294`

Se hai bisogno di nuove credenziali, vai su https://console.twilio.com/

### Q: Dove inserisco le credenziali Twilio?
**A:** Nel Dashboard Supabase:
1. Vai su https://supabase.com/dashboard
2. Seleziona il progetto: `sippdylyuzejudmzbwdn`
3. Vai su Authentication → Providers → Phone
4. Inserisci le credenziali e salva

### Q: Posso usare un altro numero Twilio?
**A:** Sì, puoi usare qualsiasi numero Twilio verificato. Basta inserire il nuovo numero nel campo "Twilio Phone Number" nel Dashboard Supabase.

### Q: Posso usare un altro provider SMS invece di Twilio?
**A:** Sì, Supabase supporta anche altri provider come MessageBird e Vonage. Tuttavia, questa guida è specifica per Twilio.

---

## 📨 SMS e OTP

### Q: Quanto tempo è valido il codice OTP?
**A:** Il codice OTP è valido per **60 secondi**. Dopo questo tempo, l'utente deve richiedere un nuovo codice.

### Q: Quante cifre ha il codice OTP?
**A:** Il codice OTP ha **6 cifre** (es. 123456).

### Q: Posso personalizzare il messaggio SMS?
**A:** Sì! Nel Dashboard Supabase, vai su Authentication → Providers → Phone e modifica il campo "SMS Template". Assicurati di includere `{{ .Token }}` per il codice OTP.

Esempio:
```
DropZone - Il tuo codice di verifica è: {{ .Token }}
Valido per 60 secondi.
```

### Q: Posso inviare SMS in altre lingue?
**A:** Sì, puoi personalizzare il template SMS in qualsiasi lingua. Basta modificare il template nel Dashboard Supabase.

### Q: Cosa succede se l'utente non riceve l'SMS?
**A:** Possibili cause:
1. Numero non in formato internazionale (deve iniziare con +)
2. Numero errato o non valido
3. Problemi di rete dell'operatore telefonico
4. Credito Twilio insufficiente
5. Numero in blacklist

Soluzione: L'utente può cliccare "Invia nuovamente" per richiedere un nuovo codice.

---

## 🔒 Sicurezza

### Q: È sicuro inviare codici via SMS?
**A:** Sì, l'invio di codici OTP via SMS è un metodo di autenticazione a due fattori (2FA) ampiamente utilizzato. Tuttavia, per massima sicurezza:
- Il codice è valido solo 60 secondi
- Rate limiting previene abusi (max 10 OTP/ora)
- La password è richiesta per login successivi

### Q: Qualcuno può intercettare gli SMS?
**A:** Teoricamente sì, ma è molto difficile. Per mitigare questo rischio:
- Il codice scade dopo 60 secondi
- Ogni codice può essere usato una sola volta
- Rate limiting previene attacchi brute force

### Q: Cosa succede se qualcuno richiede troppi codici?
**A:** Il rate limiting blocca automaticamente le richieste eccessive:
- Max 10 OTP per ora per numero
- Max 50 OTP al giorno per numero

Dopo aver raggiunto il limite, l'utente riceve l'errore "Rate limit exceeded" e deve attendere.

### Q: Le credenziali Twilio sono sicure?
**A:** Sì, le credenziali Twilio sono salvate nel backend Supabase e NON sono esposte nell'app client. Solo Supabase può usarle per inviare SMS.

---

## 💰 Costi e Fatturazione

### Q: Quanto costa inviare 100 SMS in Italia?
**A:** Circa €8 (€0.08 per SMS × 100 SMS).

### Q: Come posso controllare i costi?
**A:** Nel Dashboard Twilio:
1. Vai su https://console.twilio.com/
2. Clicca su "Usage" → "Messaging"
3. Vedrai il numero di SMS inviati e il costo totale

### Q: Posso impostare un limite di spesa?
**A:** Sì! Nel Dashboard Twilio:
1. Vai su "Settings" → "Notifications"
2. Imposta un alert quando la spesa supera una soglia (es. €50/mese)
3. Riceverai un'email se i costi superano il limite

### Q: Cosa succede se finisce il credito Twilio?
**A:** Gli SMS non verranno più inviati e gli utenti non potranno registrarsi o reimpostare la password. Devi ricaricare il credito Twilio.

### Q: Posso usare Twilio gratuitamente?
**A:** Twilio offre un credito di prova gratuito per testare il servizio. Tuttavia, per uso in produzione, devi avere un account a pagamento.

---

## 🧪 Test e Debug

### Q: Come posso testare senza inviare SMS reali?
**A:** Twilio offre numeri di test che non inviano SMS reali. Consulta la documentazione Twilio per i dettagli.

### Q: Come posso vedere i log degli SMS inviati?
**A:** Nel Dashboard Twilio:
1. Vai su https://console.twilio.com/
2. Clicca su "Monitor" → "Logs" → "Messaging"
3. Vedrai tutti gli SMS inviati con stato di consegna

### Q: Cosa significa "Status: delivered"?
**A:** Significa che l'SMS è stato consegnato con successo al numero di telefono.

### Q: Cosa significa "Status: failed"?
**A:** Significa che l'SMS non è stato consegnato. Controlla l'errore nei log Twilio per capire il motivo.

### Q: Come posso testare con numeri internazionali?
**A:** Basta inserire il numero in formato internazionale (es. +1 per USA, +44 per UK, +39 per Italia). Twilio invierà l'SMS al numero specificato.

---

## 🚨 Problemi Comuni

### Q: "SMS non ricevuto" - Cosa faccio?
**A:** Verifica:
1. Il numero è in formato internazionale? (deve iniziare con +)
2. Il numero è corretto?
3. Hai credito Twilio sufficiente?
4. Controlla i log Twilio per vedere se l'SMS è stato inviato
5. Controlla che il numero non sia in blacklist

### Q: "Rate limit exceeded" - Cosa significa?
**A:** Hai richiesto troppi codici OTP in poco tempo. Devi attendere 1 ora prima di richiedere un nuovo codice. Questo è normale e previene abusi.

### Q: "Invalid credentials" - Cosa faccio?
**A:** Le credenziali Twilio nel Dashboard Supabase sono errate. Verifica:
1. Account SID è corretto?
2. Auth Token è corretto?
3. Phone Number è corretto e inizia con +?
4. Non ci sono spazi extra?

### Q: "Codice OTP non valido" - Perché?
**A:** Possibili cause:
1. Il codice è scaduto (valido solo 60 secondi)
2. Hai inserito il codice sbagliato
3. Hai già usato quel codice

Soluzione: Richiedi un nuovo codice.

### Q: L'app dice "Errore durante l'invio del codice" - Cosa faccio?
**A:** Possibili cause:
1. Credenziali Twilio errate nel Dashboard Supabase
2. Credito Twilio insufficiente
3. Problemi di rete
4. Rate limiting attivo

Controlla i log Twilio e Supabase per maggiori dettagli.

---

## 🌍 Internazionalizzazione

### Q: Posso inviare SMS in tutto il mondo?
**A:** Sì, Twilio supporta SMS in quasi tutti i paesi. Tuttavia, i costi variano per paese. Controlla https://www.twilio.com/sms/pricing per i dettagli.

### Q: Devo usare prefissi internazionali?
**A:** Sì, SEMPRE. Il numero deve essere in formato internazionale (es. +39 per Italia, +1 per USA, +44 per UK).

### Q: Posso usare numeri senza prefisso internazionale?
**A:** No, l'app richiede il prefisso internazionale. Senza di esso, l'SMS non verrà inviato.

### Q: Come faccio a sapere il prefisso del mio paese?
**A:** Cerca "prefisso internazionale [nome paese]" su Google. Esempi:
- Italia: +39
- USA: +1
- UK: +44
- Francia: +33
- Germania: +49
- Spagna: +34

---

## 📊 Monitoraggio e Analytics

### Q: Come posso vedere quanti SMS ho inviato?
**A:** Nel Dashboard Twilio:
1. Vai su "Usage" → "Messaging"
2. Vedrai il numero totale di SMS inviati

### Q: Come posso vedere quanti utenti si sono registrati?
**A:** Nel Dashboard Supabase:
1. Vai su "Authentication" → "Users"
2. Vedrai tutti gli utenti registrati

### Q: Posso esportare i dati degli SMS?
**A:** Sì, nel Dashboard Twilio puoi esportare i log degli SMS in formato CSV.

### Q: Posso impostare alert per attività sospette?
**A:** Sì, nel Dashboard Twilio puoi configurare alert per:
- Spese anomale
- Numero elevato di SMS falliti
- Attività insolite

---

## 🔄 Manutenzione

### Q: Devo fare manutenzione regolare?
**A:** Sì, è consigliato:
1. Controllare i log Twilio settimanalmente
2. Verificare i costi mensilmente
3. Monitorare gli utenti registrati
4. Verificare che non ci siano errori critici

### Q: Cosa succede se cambio le credenziali Twilio?
**A:** Devi aggiornare le credenziali nel Dashboard Supabase:
1. Vai su Authentication → Providers → Phone
2. Inserisci le nuove credenziali
3. Salva

Gli SMS verranno inviati con le nuove credenziali.

### Q: Posso cambiare il numero Twilio?
**A:** Sì, basta aggiornare il campo "Twilio Phone Number" nel Dashboard Supabase. Gli SMS verranno inviati dal nuovo numero.

### Q: Cosa succede se Twilio ha problemi?
**A:** Se Twilio ha problemi tecnici, gli SMS non verranno inviati. Puoi controllare lo stato di Twilio su https://status.twilio.com/

---

## 📚 Risorse

### Q: Dove trovo la documentazione Twilio?
**A:** https://www.twilio.com/docs/sms

### Q: Dove trovo la documentazione Supabase Phone Auth?
**A:** https://supabase.com/docs/guides/auth/phone-login

### Q: Dove trovo i prezzi Twilio?
**A:** https://www.twilio.com/sms/pricing

### Q: Come contatto il supporto Twilio?
**A:** https://support.twilio.com

### Q: Come contatto il supporto Supabase?
**A:** https://supabase.com/support

---

## 🎓 Best Practices

### Q: Quali sono le best practices per l'uso di Twilio?
**A:**
1. ✅ Usa rate limiting per prevenire abusi
2. ✅ Monitora i costi regolarmente
3. ✅ Imposta alert per spese anomale
4. ✅ Usa codici OTP con scadenza breve (60 secondi)
5. ✅ Richiedi password forte per login successivi
6. ✅ Personalizza il template SMS con il nome dell'app
7. ✅ Testa con numeri reali prima di andare in produzione
8. ✅ Mantieni le credenziali Twilio sicure

### Q: Quali sono le best practices per la sicurezza?
**A:**
1. ✅ Non esporre mai le credenziali Twilio nell'app client
2. ✅ Usa HTTPS per tutte le comunicazioni
3. ✅ Implementa rate limiting
4. ✅ Usa codici OTP con scadenza breve
5. ✅ Richiedi password forte
6. ✅ Monitora i log per attività sospette
7. ✅ Blocca account dopo troppi tentativi falliti
8. ✅ Usa session management con refresh token

---

## 🆘 Supporto Aggiuntivo

### Q: Ho ancora problemi, cosa faccio?
**A:** 
1. Consulta le guide dettagliate:
   - `TWILIO_INTEGRATION_GUIDE.md`
   - `TWILIO_CONFIGURATION_STEPS.md`
   - `RIEPILOGO_INTEGRAZIONE_TWILIO.md`

2. Controlla i log:
   - Dashboard Twilio: https://console.twilio.com/
   - Dashboard Supabase: https://supabase.com/dashboard

3. Contatta il supporto:
   - Twilio Support: https://support.twilio.com
   - Supabase Support: https://supabase.com/support

### Q: Posso avere assistenza personalizzata?
**A:** Sì, puoi contattare il supporto Twilio o Supabase per assistenza personalizzata. Potrebbero esserci costi aggiuntivi per il supporto premium.

---

**Ultima aggiornamento**: Gennaio 2025

**Versione**: 1.0

Se hai altre domande non coperte in questa FAQ, consulta la documentazione completa o contatta il supporto.
