# Admin broadcast correction — 2026-10-19

## Scope
- Both admin send screens use send_admin_notification_broadcast for in-app notification insertion, rather than mapping one capped profiles response.
- The live RPC snapshots eligible profile user IDs and inserts every recipient in groups of 1000 within one transaction, with admin authorization and strict payload validation.
- New admin_notification_broadcasts ledger has RLS, owner/admin read policy, no client write grant, and per-admin unique request keys. A completed retry returns the original count without inserting again, including zero-recipient broadcasts.
- Pending request key is persisted before the RPC. After a network error, retry the identical message/audience to reuse that key. It is cleared after a verified success. This is not a persistent task queue or automatic UI restoration of form contents.
- Recipients for existing push loops now use keyset pagination (continuing until an empty page, even if the server cap is below 1000). Manage Notifications reuses this full list rather than another capped query with a large IN list.
- Existing push transport/registration code is preserved, not migrated. OneSignal connection was skipped. No new push integration, delivery receipts, reliable push retries, or background push worker were added. Existing push loops still require the admin app to stay active. Internal-notification atomicity/idempotency does not guarantee push delivery or exactly-once pushes.
- Both screens show phase progress and distinguish saved in-app notifications from registered devices; the final count no longer claims proven push delivery. Success haptic occurs after confirmed in-app save. Double confirmation callbacks are guarded.
- No real notification broadcast was committed or push sent during testing.

## Live database validation
Applied supabase/migrations/20261019150000_admin_broadcast_batches.sql.
- Dry run checked all 3224 consumer accounts, with expected 4 batches.
- Anonymous call rejected with insufficient_privilege.
- Real insert path and repeated request tested in an exception subtransaction: count increased by exactly 3224, retry returned reused=true and no additional inserts. All writes were rolled back intentionally and verified absent afterward. notifications has no noninternal triggers; uncommitted rows were never published.
- Existing notification/profile policies were inspected but not modified. Legacy policies include broad permissions; this migration adds an admin check to its own RPC, not a project-wide authorization repair.

## Local checks
- bun test utils/admin-broadcast.test.js utils/pickup-rules.test.js: 8 passing tests, 22 assertions.
- Tests cover 3450 recipients under an artificial 500-row cap, paging failure, stable retry keys after network errors, signed-out rejection, malformed response retention, existing pickup rules.
- bun run typecheck: 1032 diagnostics remain in imported project (empty generated database schema is a major cause). New helper has no diagnostics. Existing screen queries still have legacy table typing diagnostics. Project is not type-clean.
- git diff --check passed.

## Native preview
Pending verification for this exact source turn. No store release submitted.
