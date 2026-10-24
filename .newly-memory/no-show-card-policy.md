---
name: no-show-card-policy
description: "Owner-approved staged card authorization policy applies only to missed pickups, never normal returns."
metadata:
  node_type: memory
  type: project
  originSessionId: ecf8f11c-2f9c-47aa-8486-887a7b85b8f5
  modified: 2026-10-24T10:45:38.626Z
---

The owner wants card authorization from the next booking after the first genuine missed pickup, retaining the intended block after five missed customer orders. Ordinary returns must never count. Count customer orders, not individual articles.

For a card booking, authorize the price at the drop's current discount; once bank authorization is verified and the booking confirmed, decrement item stock and grow the drop's progress/discount immediately, exactly once. At closing, capture the lower final discounted amount and release unused authorization.

**Why:** The public app has real customers; the owner cannot safely exercise real booking/payment flows. They explicitly approved a cautious staged rollout, not immediate enforcement.

**How to apply:** Keep enforcement off until test-mode bank/checkout/webhook/capture and compatible clients are verified. Do not change or retroactively charge existing confirmed orders. Do not infer no-shows from generic return counters or returned_to_sender alone. Any historical classification/import needs deliberate review, not automatic backfill. Keep the app's identity RDN STREET STOCK MARKET.
