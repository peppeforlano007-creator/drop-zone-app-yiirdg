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
Turn mmvfbtfcg3335_3:
- iOS native artifact reused successfully (xcb_8c9199211051459089ef77094662e833), but native app installation failed. Metro bundled successfully; logs show no_app_connected and no concrete userland exception.
- Android native artifact reused successfully (anb_003cdd1a05e74709ad392625dbd978204248706a8989b0a83e6d1cef9d539607); managed preview attached this source/bundle. Android UI was not inspected.
- check-app inspected specified leased iOS UDID 2E95E6D7-B9F4-41ED-9AD7-CCC0782189EE in this turn. Device responsive but only iOS Home Screen; app absent from both pages inspected. Admin screens, authentication, drafts, phase progress, final summary and button behavior remain unchecked. No walkthrough recording possible, no notification sent, no live data changed.
- Screenshot: /tmp/argent-artifacts/repo-37f121/20261019-150019-709/2E95E6D7-B9F4-41ED-9AD7-CCC0782189EE/485389000-1792422024527.png.
- No concrete source error justified another code fix/build. Installation failure remains unresolved. Compilation is not runtime verification. No store release submitted; existing store versions retain old admin behavior until updated.
