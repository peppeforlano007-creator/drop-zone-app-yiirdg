---
name: supplier-image-links
description: Blank gallery pages came from shop page links in immagini_aggiuntive; filtered since 2.8.15
metadata:
  type: project
---

Suppliers sometimes put Amazon product page links (amazon.it/.../dp/...) in the immagini_aggiuntive column instead of photo links. The app showed them as white pages.
**Why:** customers saw blank photos in the product gallery (Nov 2026, Novilla mattress).
**How to apply:** isValidImageUrl in utils/imageHelpers now rejects shop pages. List import discards them and says how many were skipped. The gallery shows "Foto non disponibile" when a photo fails to load. The two live products were cleaned in the database. check-app cannot log in, because there are no test credentials, so screens behind login can't be checked on the simulator.
