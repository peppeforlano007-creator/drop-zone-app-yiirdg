---
name: no-show-card-policy
description: "Owner-approved missed-pickup policy: whole order only, card at 3rd order after 2 misses, block at 5, staged rollout."
metadata:
  node_type: memory
  type: project
  originSessionId: ecf8f11c-2f9c-47aa-8486-887a7b85b8f5
  modified: 2026-10-28T18:00:45.743Z
---

A missed pickup (mancato ritiro) is the WHOLE order and only when the customer never shows up (every item sent back with "Non ritirato dal cliente", none collected). If the customer shows up and buys some items, the order completes and the rest is an ordinary return handled in pickup-point "gestione resi" (loyalty points of that item deducted). No points are deducted for a real no-show (none were awarded). Pickup points always record returns and no-shows; every other card operation is admin only.

Rule (owner, 2026-10-28): 1st and 2nd miss: nothing. After the 2nd, the 3rd order requires a card. At 5 misses the account is blocked. Only new cases from the collection start, no backfill. Admin "programma fedeltà" lists customers with at least 1 miss plus blocked ones, with unblock (clears their misses).

For a card booking, authorize the price at the drop's current discount; once authorization is verified and the booking confirmed, decrement stock and grow the drop's progress/discount immediately, exactly once. At closing, capture the lower final discounted amount and release the rest.

**Why:** The public app has real customers; the owner cannot safely exercise real booking/payment flows. They approved a cautious staged rollout, not immediate enforcement.

**How to apply:** Keep enforcement off (rollout disabled, collection false) until test-mode bank/checkout/webhook/capture and compatible clients are verified. Public activation is not authorized. Never convert existing COD orders or retroactively charge. Do not infer no-shows from generic return counters. Saved-card step needs the owner's approval of the consent text before it is built.
