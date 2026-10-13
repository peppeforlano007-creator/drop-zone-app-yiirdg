
# Guida Rapida: Aggiornare l'App Android

## 🚀 Aggiornamento Rapido (Modifiche al Codice)

Quando modifichi solo il codice JavaScript/TypeScript (come le correzioni appena fatte):

```bash
# 1. Assicurati di aver fatto login
eas login

# 2. Pubblica l'aggiornamento
eas update --branch production --message "Correzione icone e layout Android"
```

**Tempo richiesto:** 2-5 minuti  
**Gli utenti ricevono l'update:** Al prossimo avvio dell'app

## 📱 Quando Serve un Nuovo APK

Ricostruisci l'APK SOLO se:
- ❌ Aggiungi nuove librerie native
- ❌ Modifichi permessi Android
- ❌ Cambi icona o splash screen
- ❌ Modifichi `app.json` (configurazioni native)

```bash
# Incrementa versionCode in app.json prima!
eas build --platform android --profile production
```

**Tempo richiesto:** 15-30 minuti  
**Gli utenti devono:** Scaricare e installare il nuovo APK

## ✅ Cosa È Stato Corretto

### Icone Android
Tutte le icone che apparivano come "?" ora mostrano l'icona corretta:
- Frecce navigazione liste
- Icone menu account
- Icone drop e timer
- Icone condizioni prodotto

### Layout Feed
- Immagine prodotto ridotta (55% schermo)
- Overlay contenuti aumentato (47% schermo)
- Padding inferiore aumentato per Android
- Tasto "Vorrò Partecipare al Drop" ora completamente visibile

## 🔄 Workflow Quotidiano

```
Modifica Codice → Testa in Preview → eas update → Fatto! ✨
```

## 📊 Verifica Update

```bash
# Vedi tutti gli update pubblicati
eas update:list --branch production

# Dettagli ultimo update
eas update:view [update-id]
```

## 🆘 Rollback Emergenza

Se un update causa problemi:

```bash
eas update:rollback --branch production
```

## 💡 Tips

1. **Testa sempre** in preview prima di pubblicare
2. **Usa messaggi chiari** per ogni update
3. **Monitora i log** dopo ogni pubblicazione
4. **Mantieni un backup** dell'ultima versione funzionante

## 📞 Supporto

- Documentazione EAS: https://docs.expo.dev/eas-update/
- Forum Expo: https://forums.expo.dev/
- Discord: https://chat.expo.dev/

---

**Le correzioni sono già nel codice. Pubblica con `eas update` per renderle disponibili! 🎉**
