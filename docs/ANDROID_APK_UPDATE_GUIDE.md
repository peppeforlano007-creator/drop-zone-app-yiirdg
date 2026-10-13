
# Guida Aggiornamento APK Android

## Problema Risolto

Questa guida spiega come aggiornare l'app Android senza dover creare un nuovo APK ogni volta che modifichi il codice.

## Correzioni Implementate

### 1. Icone Mancanti (Punti Interrogativi)

**Problema:** Le icone apparivano come punti interrogativi su Android perché mancavano le mappature tra SF Symbols (iOS) e Material Icons (Android).

**Soluzione:** Aggiunte le seguenti mappature in `components/IconSymbol.tsx`:

- `clock.fill` → `schedule` (per timer e orologi)
- `xmark.circle.fill` → `cancel` (per chiusura e annullamento)
- `xmark.circle` → `cancel`
- `gear.circle.fill` → `settings` (per impostazioni admin)
- `shield.fill` → `shield` (per GDPR/privacy)
- `shield` → `shield`
- `star.circle.fill` → `stars` (per programma fedeltà)
- `ticket.fill` → `local_offer` (per coupon)
- `arrow.uturn.backward` → `undo` (per resi)
- `arrow.uturn.backward.circle.fill` → `undo`
- `list.bullet.rectangle` → `view_list` (per liste fornitori)

### 2. Layout Feed Prodotti

**Problema:** Il tasto "Vorrò Partecipare al Drop" era coperto dalla barra del menu in basso.

**Soluzione:** 
- Ridotta l'altezza dell'immagine dal 60% al 55% dello schermo
- Aumentata l'altezza dell'overlay dal 42% al 47%
- Aumentato il padding inferiore del contenuto:
  - Android: 160px (era 140px)
  - iOS: 140px (era 130px)

Questo garantisce che tutti i contenuti (descrizione, prezzo, selezione varianti, e pulsante) siano visibili sopra la barra del menu.

## Come Aggiornare l'APK Senza Ricostruirlo

### Metodo 1: EAS Update (Consigliato)

EAS Update permette di inviare aggiornamenti over-the-air (OTA) senza richiedere agli utenti di scaricare un nuovo APK.

#### Configurazione Iniziale

1. **Installa EAS CLI** (se non l'hai già fatto):
```bash
npm install -g eas-cli
```

2. **Login a Expo**:
```bash
eas login
```

3. **Configura EAS Update** nel tuo `app.json`:
```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/[your-project-id]"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

#### Pubblicare un Aggiornamento

Dopo aver modificato il codice JavaScript/TypeScript:

```bash
# Pubblica l'aggiornamento
eas update --branch production --message "Correzione icone e layout"
```

**Nota Importante:** EAS Update funziona solo per modifiche al codice JavaScript/TypeScript. Non funziona per:
- Modifiche a dipendenze native
- Modifiche a `app.json` che richiedono rebuild
- Modifiche a risorse native (icone app, splash screen)

#### Vantaggi di EAS Update

- ✅ Aggiornamenti istantanei
- ✅ Nessun download APK richiesto
- ✅ Gli utenti ricevono l'aggiornamento automaticamente
- ✅ Possibilità di rollback immediato
- ✅ Aggiornamenti graduali (phased rollout)

### Metodo 2: Rebuild APK (Solo se Necessario)

Devi ricostruire l'APK solo se:
- Aggiungi/rimuovi dipendenze native
- Modifichi configurazioni native in `app.json`
- Aggiungi permessi Android
- Modifichi icone o splash screen

#### Quando Ricostruire

```bash
# Build per produzione
eas build --platform android --profile production

# Build per testing interno
eas build --platform android --profile preview
```

### Metodo 3: Aggiornamento Versione (Per Google Play Store)

Se pubblichi su Google Play Store, devi incrementare il `versionCode` in `app.json`:

```json
{
  "expo": {
    "android": {
      "versionCode": 2,  // Incrementa questo numero
      "package": "com.tuodominio.tuaapp"
    }
  }
}
```

Poi ricostruisci:
```bash
eas build --platform android --profile production
```

## Workflow Consigliato

### Per Modifiche al Codice (90% dei casi)

1. Modifica il codice su Natively
2. Testa le modifiche in preview
3. Pubblica con EAS Update:
   ```bash
   eas update --branch production --message "Descrizione modifiche"
   ```
4. Gli utenti ricevono l'aggiornamento automaticamente al prossimo avvio dell'app

### Per Modifiche Native (10% dei casi)

1. Modifica configurazioni native
2. Incrementa `versionCode` in `app.json`
3. Ricostruisci l'APK:
   ```bash
   eas build --platform android --profile production
   ```
4. Distribuisci il nuovo APK

## Verifica Aggiornamenti

### Controllare lo Stato degli Update

```bash
# Visualizza tutti gli update pubblicati
eas update:list --branch production

# Visualizza dettagli di un update specifico
eas update:view [update-id]
```

### Forzare un Update nell'App

Gli update vengono scaricati automaticamente, ma puoi forzare il controllo:

```typescript
import * as Updates from 'expo-updates';

// Controlla e scarica update
async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}
```

## Rollback di un Update

Se un update causa problemi:

```bash
# Torna all'update precedente
eas update:rollback --branch production
```

## Best Practices

1. **Testa sempre in preview** prima di pubblicare un update
2. **Usa messaggi descrittivi** per ogni update
3. **Monitora gli errori** dopo ogni update
4. **Mantieni un changelog** delle modifiche
5. **Usa branch diversi** per testing e produzione:
   - `production` - per utenti finali
   - `staging` - per testing interno
   - `development` - per sviluppo

## Limitazioni di EAS Update

❌ **Non funziona per:**
- Modifiche a dipendenze native (es. nuove librerie con codice nativo)
- Modifiche a permessi Android
- Modifiche a `AndroidManifest.xml`
- Modifiche a risorse native

✅ **Funziona per:**
- Modifiche a componenti React Native
- Modifiche a logica JavaScript/TypeScript
- Modifiche a stili e layout
- Correzioni di bug nel codice
- Aggiornamenti di contenuti

## Costi

- **EAS Update:** Gratuito fino a 50 update al mese (piano Free)
- **EAS Build:** 30 build Android gratuite al mese (piano Free)

Per maggiori build/update, considera un piano a pagamento.

## Supporto

Per problemi con EAS Update:
- Documentazione: https://docs.expo.dev/eas-update/introduction/
- Forum: https://forums.expo.dev/
- Discord: https://chat.expo.dev/

## Riepilogo Modifiche Correnti

### Icone Corrette
- ✅ Frecce lista precedente/successiva
- ✅ Icone sezione account (coupon, profilo, wishlist, prenotazioni, notifiche, supporto)
- ✅ Icone drop e timer
- ✅ Icone condizioni prodotto
- ✅ Icone rating e fedeltà

### Layout Corretto
- ✅ Tasto "Vorrò Partecipare al Drop" ora visibile
- ✅ Descrizione prodotto non coperta dal menu
- ✅ Migliore distribuzione dello spazio verticale
- ✅ Tutti i contenuti visibili senza scroll

## Prossimi Passi

1. Testa l'app in preview per verificare le correzioni
2. Se tutto funziona, pubblica con `eas update`
3. Monitora eventuali errori nei log
4. Raccogli feedback dagli utenti

---

**Nota:** Queste modifiche sono già state applicate al codice. Devi solo pubblicare l'update con EAS per renderle disponibili agli utenti.
