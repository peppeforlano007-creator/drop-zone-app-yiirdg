---
name: admin-permissions
description: "Admin limitati a sezioni: livello 1 (app) fatto 21/11, livello 2 (server/RLS) rimandato dall'utente"
metadata:
  node_type: memory
  type: project
  originSessionId: ecf8f11c-2f9c-47aa-8486-887a7b85b8f5
  modified: 2026-11-21T09:07:57.138Z
---

profiles.admin_permissions text[]: NULL = admin completo, array = chiavi sezioni (utils/adminPermissions.ts). Filtro dashboard, blocco schermate in app/admin/_layout.tsx, spunte in Modifica Utente. Trigger DB impedisce a admin limitati di cambiare permessi/ruolo admin.

**Why:** l'utente vuole creare altri admin con accesso parziale; ha scelto "spunte una per una" e "livello 2 non adesso".
**How to apply:** i limiti valgono solo nell'app; un admin limitato ha ancora accesso completo al database via RLS e può chiamare admin-create-user/admin-update-user. Se l'utente chiede più sicurezza, fare il livello 2 (RLS per tabella + controlli nelle edge function). Arriva ai clienti solo con la prossima release (2.8.15).
