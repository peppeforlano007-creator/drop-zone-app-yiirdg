# Remaining booking stock — 2026-10-20

## Production diagnosis
- Verified enabled legacy booking trigger reset product stock to 0 on first active booking and to 1 on cancellation.
- create_booking_atomic simultaneously treated stock as original capacity minus active booking counts.
- check_and_decrement_stock also tried a second decrement and referenced removed card columns.
- No attached handle_booking_stock_restore trigger, no real size/color variants and no real-variant bookings at deployment. Migration aborts if historical real-variant bookings or a second restoration trigger appear.
- Existing production: 191 products with stock > 1; booking counts 675 confirmed / 500 cancelled. No negative product stock.

## Live change
- Applied 20261020100000_remaining_booking_stock.sql with dedicated Supabase migration tool.
- Stock is remaining availability. One BEFORE trigger owns decrement/release for RPCs and direct client inserts/updates/deletes.
- Locks in drop -> product -> variant order. The drop lock also serializes the existing discount triggers; their formula/eligibility remains unchanged.
- Each reserving booking consumes exactly one product unit and, if applicable, one real variant unit. No SUM of untouched historical variant capacity and no booking-count subtraction.
- Phantom variants normalize to NULL on insertion; their meaningless stock is not consumed/restored.
- Duplicate guard serialized under product lock, including old direct-client calls. Old size/color direct inserts resolve only an unambiguous real variant.
- Both RPC signatures and return shapes retained. Legacy decrement RPC delegates to central booking path without subtracting again; removed card-column references are not retained in COD-only schema.
- Active/confirmed -> cancelled or deletion restores once. Repeated cancellation/refund metadata updates do not restore again. Confirmed/completed transitions do not consume again. Completed deletion/cancellation does not automatically relist delivered goods. Existing order-return RPCs are unchanged and do not automatically restock delivered returns.
- Booking product/variant/user/drop/pickup identity cannot be moved in place; existing order metadata updates remain possible. Parent deletion cascade tested locally.
- No historical inventory reconstruction, bulk stock changes, user-profile mutations, real-product test bookings, external notifications or store release.

## Atomic deployment gate
- Migration contains synthetic catalogue/drop/bookings inside an exception subtransaction. All fixture writes and transactional pg_notify emissions are discarded even on success. Any assertion failure aborts the migration.
- First deployment was refused by the gate: expected fractional discount did not account for production numeric(5,2) rounding. Confirmed old trigger/functions remained live and zero fixture rows leaked.
- Corrected ONLY test expectation/fixture precision to two decimal places; discount calculation unchanged. Re-tested locally, then migration applied successfully.
- Actual production gate passed 5 -> 4 -> 3 -> 2 -> 1 -> 0, next-booking rejection, current_value/discount, cancellation exactly once, and zero retained fixture rows.
- Post-deploy SQL confirmed BEFORE inventory trigger enabled, old zeroing removed, count subtraction removed, 0 negative stock, 191 multi-unit products unchanged, same booking counts, 0 fixture products/lists.

## Mobile changes (require app update)
- Complete coherent product/variant refresh shared by Realtime and existing 15-second polling fallback. Includes explicit zero-stock rows and re-adds restored products.
- Variant loading paginated and retains exhausted variants. Failed/partial variant loads do not silently turn variant products into no-variant products.
- Raw realtime product rows retain enriched variant metadata; subsequent refresh updates variants too.
- Duplicate exhaustion timers prevented; restock invalidates pending timeout AND running fade completion. Changing drops/unmounting clears jobs.
- Existing sold-out notice and fade preserved. Layout, photos, categories/counter and primary actions not redesigned.
- Booking controls await server result, lock repeated presses and issue success haptic only after success. Duplicate/variant errors distinguished from actual stock exhaustion.
- Server fixes already apply to published clients. Published UI does not gain these refresh/busy-state fixes until an app update.

## Automated checks
- Exact migration tested on isolated PostgreSQL 15 with narrowed production-like schema, correct numeric precision and equivalent discount triggers. This is not a full clone of Supabase PostgreSQL 17 or RLS/auth runtime.
- booking_stock_rollback.sql: 28 assertions; no fixture rows retained. Covers five units, exhausted stock, stock=1 regression, duplicate/phantom equivalence, cancellation retry, reactivation, completion, deletion, real variants, old RPC, old direct INSERT, invalid pickup rollback, immutable identity, catalogue cascade and closed drop.
- Four independent-session concurrency scenarios passed: 12 buyers for 1 unit; 12 buyers for 5 units; 8 repeated requests from same buyer + 8 cancellation retries; 20 buyers across two products in one drop with correct accumulated value.
- Bun: 27 tests passed, 0 failed, 77 assertions across stock-updates/feed/chat/notifications/pickup suites. Five new stock refresh tests cover timer deduplication, restock before/during fade, cleanup and variant metadata merge.
- bun run typecheck still fails with 1016 legacy diagnostics (empty generated Supabase schema types and existing component/model errors). No diagnostics in stock-updates helper. Project is NOT type-clean.
- git diff --check passed.

## Native verification
- Exact source submitted and awaited for BOTH platforms in turn mmvgfbfr55889_3, revision 69571fbafbeb21da378667eccd2e0274e765aac7b453b45a9674ca2440e106cd.
- iOS reused native artifact xcb_8c9199211051459089ef77094662e833 succeeded; exact bundle attached. Launch showed branded splash, then login (not the earlier installation failure).
- Android reused native artifact anb_003cdd1a05e74709ad392625dbd978204248706a8989b0a83e6d1cef9d539607 succeeded; exact bundle attached. Android UI not inspected.
- check-app a9cc84ccbd3cb1aaf inspected current leased iOS UDID 0494449B-2697-4CBE-9C87-3EF9089A8A75: login Benvenuto / Numero di Cellulare / Password / Accedi / Registrati renders without visible overlap or errors. No taps, credentials, writes or recording.
- Feed access BLOCKED BY AUTHENTICATION, not a clean stock-flow verification. Remaining-stock labels, >1 visibility, variants, photos/prices, counter/filter layout, booking confirmation, busy-state/double-submit behavior, zero-stock variants, restock reappearance and stale fade cancellation remain UNCHECKED ON DEVICE. No isolated authenticated device fixture available; no real booking/cancellation attempted.
- Screenshot: /tmp/argent-artifacts/repo-37f121/20261020-104202-3567/0494449B-2697-4CBE-9C87-3EF9089A8A75/42747000-1792492928056.png.
