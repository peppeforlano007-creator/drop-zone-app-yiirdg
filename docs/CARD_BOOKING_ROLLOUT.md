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

## Phase 2a — sandbox connection only, 24 October 2026

The owner saved `STRIPE_BOOKING_TEST_SECRET_KEY` through protected Supabase
Function secrets. A deployed, protected read-only probe returned HTTP 200 and
`STRIPE_TEST_CONNECTED` after Stripe's GET `/v1/balance` returned an actual
`balance` object with `livemode: false`. No balance/account details, API secret or
Stripe response are returned or logged. This verifies key usability and test mode,
NOT authorization, capture, webhook handling, checkout or booking finalization.

- `check-booking-stripe-test` consumes only that separate test secret; it never
  reads the existing Stripe subscription secret and has no Stripe write operation.
- Migration `20261024120000_booking_stripe_readiness_jobs` adds only a new private
  diagnostic-job table and a service-only atomic claim RPC. No business table or
  existing function/trigger is changed. Jobs are issued by trusted SQL management,
  with a random 256-bit token generated and sent via pg_net inside Postgres. Only
  its SHA-256 hash is persisted in the job table. Tokens expire in ten minutes,
  and each can be claimed once. Consumers cannot enqueue, claim, read or reset jobs.
- JWT verification is disabled for this endpoint only because the one-use capability
  is its authentication. Unauthenticated/non-POST/malformed/expired/replayed calls
  cannot access the Stripe secret. There is no mobile/UI caller or CORS access.
- Test-prefix validation happens before network access. Redirects are forbidden,
  the destination and GET method are fixed, and response/error content is sanitized.
- 27 new offline probe/handler tests pass (58 including the previous 31 guards).
  16 isolated PostgreSQL assertions verify job grants, claim/replay/expiry and TTL.
- The new helper passes strict standalone TypeScript checking, and the complete
  new endpoint passes `deno check` with its own Deno configuration. The global
  Expo typecheck still fails: 2,461 preexisting diagnostic lines plus six expected
  diagnostics from incorrectly checking a Deno entry point with Expo's settings.
  No unrelated mobile typing repair or suppression was attempted.
- Post-probe audit: rollout `disabled`, no-show collection false, ledger empty;
  bookings still 675 confirmed COD/pending and 500 cancelled COD/refunded;
  production booking payment constraint remains COD-only.
- No payment, hold, capture, refund, customer/order/profile update or notification
  was created. No real or synthetic card was used. The UI is unchanged.

Next work remains a separate signed **test** booking webhook, immutable sandbox
attempts, test-only checkout/finalization and closing-price capture/reconciliation.
`STRIPE_BOOKING_TEST_WEBHOOK_SECRET` is not configured yet. The saved API key alone
must never enable collection/enforcement or live charges. Gate 2 above is only
partially complete: isolated test-key connectivity verified, webhook not done.

## Phase 2b — isolated Stripe API lifecycle, 24 October 2026

**Still no customer checkout or live payment enforcement.** The owner approved
continuing with synthetic sandbox authorization/capture/release tests. Deployed
`test-booking-card-lifecycle` v5 runs only a fixed script: Stripe `pm_card_visa`,
EUR 100 original, current 20% discount => EUR 80 authorization, simulated closing
40% discount => EUR 60 capture. A second EUR 80 authorization is canceled in full.
It has no customer/email/account/order input and never calls business-table RPCs.
The closing discount is a test fixture, not a real drop or a real scheduled close.

### Protection and reproducibility

- Separate private `booking_card_sandbox_jobs` and service-only atomic claim RPC;
  the readiness-check capability cannot authorize payment tests. Same ten-minute,
  one-use management token pattern, generated/sent inside Postgres via pg_net.
- Service can record results but cannot create jobs or alter their capability,
  immutable id or claim timestamp. Public/customer roles have no access.
- Test-secret prefix plus actual read-only Stripe test-mode attestation BEFORE
  creating anything. Every retrieved intent must match manual capture, EUR cents,
  synthetic user/drop/attempt identity and test mode. No redirects or client URLs.
- Actual charge capture_before must cover a simulated 5-day+1-hour drop plus the
  existing 6-hour margin. Observed Visa test windows were seven days; this is NOT
  a guarantee for live cards. Those must each be checked separately.
- Stable run/scenario/action idempotency keys, bounded identical request retries,
  and explicit repeat capture/cancel checks. No extra authorization on the same
  run's retry. Failed checks cancel only verified owned test holds, or report
  unresolved identities/idempotency keys for trusted review, never hide uncertainty.
- Results store only bounded checks, test-intent IDs and sanitized machine errors;
  no secret, client_secret, card data, account balance or raw Stripe response.
- Trusted management may reissue a failed synthetic job's token while it is still
  within its original ten-minute expiry, preserving its run id/Stripe keys. This
  was used to inspect and complete the already-captured third test without a new
  authorization. No automatic retry after Stripe's idempotency retention period.

### Actual Stripe results, not just mocks

- Two initial capture requests returned HTTP 400 `invalid_request_error`. Both
  authorized test holds were successfully canceled by the failure handler.
- Removing the optional `final_capture` parameter made ordinary partial capture
  work. Single final capture releases the rest by default; do not request
  multicapture parameters for this ordinary booking flow.
- A further verification mismatch revealed the pinned `2024-06-20` API reports
  the EUR 20 uncaptured remainder in Charge.amount_refunded, while reporting
  amount_captured=6000, PaymentIntent.amount_received=6000, status=succeeded,
  amount_capturable=0 and Charge.refunded=false. Verification now checks that
  EXACT remainder (not zero), as well as exact captured/received amounts.
  An additional refund must fail verification. This is a pinned-API observation,
  not permission to treat arbitrary refunds as authorizations or no-shows.
- After that focused fix, the same captured test completed successfully. A fresh
  independent full run also passed in one go: job
  `06ef1e05-59a0-4578-af57-f5d2a4d7f763`, HTTP 200,
  `STRIPE_SANDBOX_LIFECYCLE_VERIFIED`. Verified EUR 80 manual authorization,
  EUR 60 capture, EUR 20 unused release, EUR 80 full cancellation, and idempotent
  capture/cancel retries. No unresolved create keys or open holds in these tests.
- Unregistered management capability was rejected with HTTP 403. Supabase log
  retrieval failed with its existing source_name/UNKNOWN_IDENTIFIER tooling error;
  diagnosis used persisted bounded test results, not secret/raw API logs.

### Checks and unchanged production behavior

- 75 offline tests pass: 17 new sandbox cases + prior 58 guard/readiness cases.
  Includes ambiguous creation/capture timeouts, unchanged idempotency keys, short
  windows, failed capture/cleanup, wrong identities, live mode refusal, extra
  refund rejection and repeated runs without additional captures.
- 15 isolated PostgreSQL sandbox-job permission assertions pass. Fixture initially
  lacked Supabase service_role's actual BYPASSRLS attribute; corrected the fixture
  after verifying that attribute on the existing project (no live role change).
- 8 existing offline stock/discount and 18 no-show/ordinary-return assertions pass.
- Strict Deno typechecking passes for both new server endpoints. Global Expo
  typechecking still fails on legacy app/generated database typing, plus Deno
  files being checked with mobile TypeScript settings (2,476 diagnostic lines).
- Final audit: rollout remains `disabled`, collect_no_shows=false, zero observed
  events; same 675 confirmed COD/pending and 500 cancelled COD/refunded bookings.
  No booking/profile/catalogue, stock or drop-discount write was made. Existing
  COD clients, closing worker, subscription functions and app UI remain unchanged.

**Still required:** signed dedicated booking webhook; durable immutable checkout
attempts and atomic booking finalization; real closing-worker reconciliation and
capture retry rules; cancellation/refund handling; paid-at-pickup UI; native
sandbox checkout/3DS/decline end-to-end; compatible clients before activation.
`payment_flow_verified` deliberately remains false. Sandbox API success alone
must never activate the 1/5 policy or authorize a real customer's booking.

Source for authorization limits and partial capture behavior:
https://docs.stripe.com/payments/place-a-hold-on-a-payment-method

## Phase 2c — dormant test-cohort booking/settlement integration (2026-10-26)

**Not a public checkout rollout, not a verified native payment flow.** The new
server path is deployed but `mode=disabled`, collection=false, scopes=0,
attempts=0 and card bookings=0. No synthetic bookings were inserted in the live
database. Tests below use a disposable PostgreSQL database and mocked Stripe.
The earlier 24 October sandbox API results are not claimed as tests of this path.

### Added server path

- `20261026100000_test_card_booking_integration.sql`: private explicit test pairs,
  immutable server-priced attempts, unique intent/booking identities, service-only
  transitions and guarded card booking writes. Neither clients nor service role
  can write attempts directly; only management can enrol test pairs.
- The booking method CHECK now permits card structurally, but a BEFORE trigger
  rejects card inserts without a matching server-authorized test attempt. This
  includes calls through the legacy public SECURITY DEFINER booking RPC. Direct
  edits/deletions/downgrades of linked card bookings are rejected. Existing COD
  bookings, signatures and trigger logic are not rewritten.
- Starting checkout inserts ONLY an attempt, not a booking. Price, user, pickup,
  variant, drop end and discount are frozen from server data. No loyalty reduction
  on the initial authorization. No saved-card consent or storage is implemented.
- `booking-card-test` verifies the JWT with Auth.getUser, checks ownership and the
  explicit expiring test cohort, and exposes start/confirm/status/cancel actions.
  Only start can return the owner's test client secret, with no-store headers.
  No request chooses an amount, Stripe origin, payment method or live key.
- After an independent Stripe GET verifies exact metadata, test mode, EUR,
  amount, manual uncaptured authorization and actual capture_before > end+6h,
  finalization locks the drop and attempt and inserts one booking. Existing stock
  and discount triggers run in the SAME transaction. Repeated calls return the
  same booking. Failed insertion rolls stock/discount back and persists release.
- `prepare_test_card_settlement` waits for a completed drop with its published
  final_discount_percentage. It freezes group+loyalty and final cents once.
  Higher-than-authorized prices are never captured; zero price releases the hold.
  New-authorizations OFF / expired cohort does not stop existing reconciliation.
- `reconcile-booking-cards-test` retrieves Stripe first on every retry, uses stable
  idempotency keys, independently verifies final capture/cancellation, then records
  payment and booking state atomically. Lost capture or DB responses converge
  without another stock deduction/capture. No early capture to beat expiry.
- `20261026110000_test_card_reconciliation_jobs.sql` schedules an independent
  minute-by-minute recovery worker using 5-minute, hashed, single-use management
  capabilities. An empty attempt table causes NO network call. It does not read
  the existing reusable service-key database setting. No third-party key is
  returned to the sandbox. Ambiguous creations beyond 23h become review-required,
  rather than reusing possibly expired Stripe idempotency keys.
- No new booking webhook is installed: polling is the durable recovery/closing
  path for this dormant test stage. The dedicated signed webhook remains an
  activation checklist item; client redirects/events are never authorization proof.

### Compatibility boundary / remaining gates

The deployed legacy `capture-drop-payments` version 38 has NOT been downloaded
and reconciled with local source; these tools do not expose its deployed source.
It was NOT overwritten. The new path observes its published closing discount and
settles only linked test attempts. It does not yet create card order_items or
send customer/supplier notifications through the legacy COD order pipeline.

Before any test-cohort native walkthrough, reconcile the exact deployed closing
worker and prepare synthetic, non-public catalogue/accounts. Before any public
activation, finish the native Stripe card/3DS UI, visible paid/no-cash-due pickup
status, order pipeline, refund/return handling, operator failure/review handling,
signed webhook configuration and coverage of every legacy COD bypass. Confirm
store-client compatibility and a deliberate activation cohort/date. Existing
confirmed orders must never be converted to card. The first/five genuine missed
pickup policy stays disabled; ordinary returns remain excluded.

### Checks performed in this turn

- 99 passing Bun tests / 683 assertions across new payment flow, earlier pure
  guards, sandbox and readiness helpers. Stateful mocked payment tests cover
  authorization, repeated callbacks, lost finalization/capture/record responses,
  sold-out cleanup, abandoned/expired checkout, short authorization windows,
  no early capture, zero total, foreign/live intent rejection, extra refunds,
  the 23h creation guard and stable request bodies/idempotency keys.
- 52 isolated PostgreSQL assertions use the actual new integration migration and
  existing stock/discount triggers. Verified attempt opening has zero stock/value
  effect, finalization/retries affect once, sold-out failure is rolled back,
  legacy RPC cannot fabricate card proof, clients cannot mark paid/downgrade,
  release restores once, kill-switch reconciliation, frozen closing amount,
  paid result, zero price, higher-than-authorized refusal and private permissions.
  These are not a load/concurrency benchmark against live PostgreSQL.
- 21 isolated scheduler/capability assertions, 18 existing no-show/return
  assertions and 8 existing inventory/discount compatibility assertions pass.
- Strict Deno typechecking passes for both new endpoints and their shared code.
  Mobile tsconfig now excludes the Deno-only function directory; each runtime is
  checked with its own settings, not suppressed with ts-ignore. `bun run
  typecheck` still fails on existing app/generated Supabase typing (first errors
  in chat). No claim of an overall clean app typecheck.
- Live empty-queue management job ef99a790-4331-486d-a182-3d99eb6a5812,
  pg_net request 1656: HTTP 200, NO_CARD_WORK, checked=0. This did NOT contact
  Stripe or touch bookings. Unauthenticated checkout returns SIGN_IN_REQUIRED;
  unregistered worker capability returns FORBIDDEN.
- Final native startup results are reported in chat. No native card authorization,
  saved card, 3DS, public order creation or pickup collection was tested.

The integration is intentionally partial and dormant. Do not summarize it as
public payments working or completed end-to-end until the remaining gates pass.
