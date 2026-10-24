# RDN STREET STOCK MARKET — card authorization rollout

## Phase 1, 24 October 2026

**Not a complete payment implementation. No live payment is enabled.**
The owner approved a cautious staged rollout for future bookings, excluding normal
returns. Do not charge, change, or reprice existing confirmed orders. No real
customer booking, payment, notification, delivery or return may be used as a test.

### Product contract

- First genuine missed pickup: require a card for the next eligible booking.
- Five distinct missed customer orders: preserve the intended booking block;
  offering a card must not become a way around that block.
- Ordinary returns after collection NEVER count toward this new policy.
- Count one customer/order, not its number of items. A supplier order is shared
  among customers, so order_id alone is not a unique customer incident.
- Opening or abandoning checkout does not reserve goods or grow a discount.
- Once a server-verified manual authorization is finalized as a booking, reserve
  stock and include its value in the drop discount in the same transaction,
  exactly once. Retry must return the same booking, not fail as a second sale.
- At drop close, capture the frozen closing price (including applicable loyalty),
  never more than agreed. Partial capture releases the difference. Consumer
  cancellation/return/refund rights remain; prepayment is not a non-return rule.
- A prepaid item must say paid at pickup, with no cash amount to collect.

### Read-only audit findings

- The database currently restricts bookings.payment_method to COD only.
- 675 confirmed COD/pending and 500 cancelled COD/refunded bookings were observed;
  none were changed in this phase.
- Stock decrements are owned by update_stock_on_booking, not the booking RPC.
  Current triggers already include active/authorized bookings in drop progress.
- create_booking_atomic is SECURITY DEFINER and executable by PUBLIC/anon as well
  as authenticated. Its inspected body accepts p_user_id/prices/payment fields
  without a caller identity/Stripe proof check. Authenticated direct booking
  inserts/updates also exist. A future enforcement gate must cover ALL entry
  points without breaking the published COD clients. Do not just hide a button.
- The local capture-drop-payments source processes COD pending bookings only.
  Deployed version is 38; its full deployed source still needs reconciliation
  before modifying the existing production close worker. Existing drop completion
  calls this worker. Do not overwrite it with a different integration blindly.
- Returned items: 56 explicitly marked `Non ritirato dal cliente`, belonging to
  17 customer/order pairs and with no pickup evidence; 23 ordinary returns across
  15 customer/order pairs all have prior pickup evidence. No historical import
  was performed. Ambiguous history must not be inferred from shared booleans.
- orders_returned/items_returned and generic return RPCs mix return concepts.
  The old rating function uses orders_returned >= 5 to write account_blocked;
  profile protections can reject non-admin counter/block writes. UI text is NOT
  proof of a reliable five-no-show server gate. Keep existing blocks untouched;
  establish authoritative no-show-only enforcement before activation.
- Completed drops last 5 days; approved drops 5–5.04 days. Do NOT assume any bank
  authorization lasts long enough. Fetch actual latest_charge card capture_before
  and require a margin after scheduled closing. Initial conservative margin: 6h.
- STRIPE_SECRET_KEY exists, but its value, mode and account were not inspected.
  Existing subscription/webhook functions also exist; do not reuse or redeploy
  those for goods. No separate booking webhook signing secret was listed.

### Installed dormant foundation

Migration 20261024100000_disabled_booking_card_foundation adds:

- Private singleton booking_card_rollout: mode `disabled`, collect_no_shows false.
  Only `disabled` and `test` modes are allowed. `live` is structurally forbidden.
- Private booking_no_show_events, unique by user_id/order_id. No backfill.
- An observer on order item return transitions, with an immediate no-op while
  collection is off. If deliberately enabled later, it only records explicit
  missed pickups by an admin, service role or the correct pickup operator. It
  excludes previously picked-up items, normal returns, repeats and identity moves.
- A service-only **preview**, never enforcement, for the 1/5 thresholds. It does
  not use old return counters or modify profiles. Existing blocks win. Scope is
  observed future events only, not complete historical no-show counts.

No changes to booking constraints/RPCs, inventory, discount triggers, COD checkout,
profiles, existing completion/capture functions, or app UI were deployed.

The new pure server helper card-booking-guards.ts checks test-only authorization,
trusted immutable attempt identity, exact cents/currency, requires_capture/manual,
expanded card charge, actual authorization deadline and bounded partial capture.
It performs no external requests, is not connected to checkout, and is NOT proof
of payment by itself. Future callers must use Stripe-retrieved objects, never
client-supplied JSON. No payment/card details are stored by this foundation.

### Verification

- 31 pure-policy tests pass, including many sampled price/discount combinations.
- 18 isolated PostgreSQL assertions pass for observer behavior, unique customer
  orders, returns exclusion, defaults, forbidden live mode, permissions and the
  preview thresholds. Observation was enabled ONLY in disposable PostgreSQL.
- 8 isolated inventory assertions pass: authorized insertion, immediate stock and
  discount effects, duplicate rollback, exhaustion and repeated cancellation.
  The COD-only check was widened ONLY in that disposable database to model a
  future card path. No new production card-finalization path exists yet.
- New TypeScript helper passes a standalone strict typecheck. Full app typecheck
  still fails on existing unrelated app/generated-Supabase typing errors.
- No real Stripe authorization, bank hold, capture, cancellation or refund tested.
  No concurrency/webhook retry or paid-pickup UI end-to-end test exists yet.

Reproduce tests without adding dependencies to the app:

1. Install @electric-sql/pglite in a disposable test directory (tested 0.5.11).
2. `bun test tests/card-booking-guards.test.mjs`
3. Set PGLITE_MODULE to its dist/index.js and run
   `bun tests/booking-card-database.test.mjs` and
   `bun tests/booking-card-inventory.test.mjs`.

### Next gates — must all pass before live enablement

1. Reconcile deployed close-worker source and all legacy booking entry points.
2. Isolated Stripe booking test account/keys and a signed webhook, not the existing
   subscriptions webhook. Proposed separate secret names:
   STRIPE_BOOKING_TEST_SECRET_KEY and STRIPE_BOOKING_TEST_WEBHOOK_SECRET. These
   are not consumed by the current foundation. Supabase secrets go through the
   owner's protected Supabase Function secrets controls, never chat or app bundle.
3. Private immutable checkout attempts + Stripe idempotency keys + webhook event
   dedupe, server pricing, clear authorization consent and attempt-to-booking link.
4. A verified authorization creates the booking transactionally via existing stock
   accounting; out-of-stock, closure, timeout and duplicate races cancel/reconcile
   the hold. Failed cancellation goes to retry/reconciliation, never disappears.
5. Freeze closing prices and add independent reliable capture/reconciliation jobs.
   A failed payment must not silently become a paid/prepared order. Handle expired
   holds, failed/underfunded drops, user cancellation and refunds explicitly.
6. Mark prepaid bookings/items visibly and prevent double collection at pickup.
7. Native iOS + Android test-mode checkout/cancel/3DS/return paths, retry and failed
   captures, returns vs no-show, refunds and stock exhaustion all verified with
   synthetic test accounts/catalogue, never production customer orders.
8. Publish compatible clients first. Adopt a deliberate activation date/cohort and
   reviewed historical evidence import (if wanted). Old clients must get a clear
   upgrade/required-payment response only after a supported update is available.
9. Only a later reviewed migration may permit live rollout. Keep a kill switch for
   NEW authorizations while continuing safe reconciliation of existing holds.

Source for authorization limits and partial capture behavior:
https://docs.stripe.com/payments/place-a-hold-on-a-payment-method
