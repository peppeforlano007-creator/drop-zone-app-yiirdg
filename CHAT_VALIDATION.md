# Group chat history fix — 2026-10-19

## Confirmed cause
- Legacy conversation query sorted created_at ascending and limited to 50, showing the oldest messages. Group previews separately fetched the newest message.
- Live read-only query: Andria - RDN has 135 messages. Its 50th message is a drop shared by Nicola Nardò at 2026-10-07 21:27:44.697478+00. Latest message is at 2026-10-18 14:48:05.559044+00.
- No messages deleted, sent, edited, or migrated. No schema/server-function changes required.

## Changes
- Shared fetchChatPage reads newest first with stable descending created_at/id cursor. Older pages use both cursor fields; timestamp ties do not lose messages.
- iOS and Android conversation lists inverted with newest at offset 0, preserving normal visual chronological order. Older messages load at the visual top through onEndReached or Carica messaggi precedenti.
- Pagination ends on an empty response rather than assuming the server cap is exactly 50. Failed pages keep their cursor and show Riprova; initial failures are not presented as an empty conversation.
- ID-based merge sorts and deduplicates history/realtime races. Request generations reject stale results after refresh, navigation, or group change. History loading has an immediate ref guard against duplicate requests.
- Latest page refreshed on focus, application foreground, and subscribed/reconnected realtime state. Refresh resets older cached history to avoid a hidden gap after long disconnections; older history remains available for paging again.
- Realtime is subscribed only while the screen is focused. New inserts don't force-scroll people reading older messages. Removed unconditional scrollToEnd on every content-size change.
- Read receipt runs only after successful initial load or displaying live/latest messages while focused and active. It uses the timestamp actually loaded rather than querying a potentially newer unseen message. Receipt counts recalculate so newer arrivals can remain unread.
- Existing send/drop-sharing, push, moderation and account behavior preserved. No new animation or feature beyond chat loading fixes.

## Validation
- Read-only live SQL cursor paging returned 50 + 50 + 35 messages, 135 total and 135 distinct IDs.
- bun test utils/chat-pagination.test.js utils/admin-broadcast.test.js utils/pickup-rules.test.js: 14 passed, 35 assertions. Six new chat tests cover newest-page selection, 135 same-timestamp messages across cursors, other-group isolation, lower server caps, realtime merge race, deduplication, and error propagation.
- bun run typecheck still fails with 1031 imported-project diagnostics, mostly legacy empty generated Database tables/functions. New chat-pagination helper has no diagnostics. No claim of a type-clean project.
- git diff --check passed.

## Preview
Turn mmvfbtfcg3335_8:
- iOS native artifact reused successfully (xcb_8c9199211051459089ef77094662e833), but native installation failed. JS bundled successfully (2525 modules), no concrete app-owned error in returned logs; debugger reports metro_not_running. No manual Metro restart or alternate installation attempted.
- Android native artifact reused successfully (anb_003cdd1a05e74709ad392625dbd978204248706a8989b0a83e6d1cef9d539607), this source/bundle attached to managed preview. Runtime logs show login CountryCodePicker; Android chat UI not inspected.
- check-app inspected this turn's leased iOS UDID 043F189C-99E8-475D-91DB-E2CAE3920151. Device is responsive on system Home Screen, no RDN app on either Home Screen page. All changed chat UI behavior remains unchecked (latest/older paging, ordering, scroll retention, reopen, error UI, read receipts). No walkthrough recording possible, no login or messages attempted.
- Screenshot: /tmp/argent-artifacts/repo-37f121/20261019-161958-634/043F189C-99E8-475D-91DB-E2CAE3920151/345227000-1792426804373.png.
- No concrete userland defect identified to justify another source fix/build. Installation blocker unresolved. Compilation success is not chat runtime verification.
- Existing store installations keep the old query until updated; server data remains intact. No store release submitted.
