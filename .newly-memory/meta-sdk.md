---
name: meta-sdk
description: Meta (Facebook) App Events SDK added in 2.8.11; ids and rules
metadata:
  type: project
---

SDK react-native-fbsdk-next + expo-tracking-transparency aggiunti il 02/11 (prima non erano nel repository, ma le build pubblicate li avevano). App ID 1420595826086758, Client Token 36386b7fa50d655e9b298aed5109e8cf (pubblico), scheme fb1420595826086758. Init in utils/metaAnalytics.ts dopo ATT. Eventi custom: registrazione, prenotazione, pagamento carta autorizzato.
**Why:** Meta non rilevava più installazioni.
**How to apply:** NON pubblicare 2.8.11 senza SDK. Token Conversions API (se serve) solo via scheda segreti, mai in chat.
