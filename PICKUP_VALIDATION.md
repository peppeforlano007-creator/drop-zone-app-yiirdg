# Pickup guard and export correction — 2026-10-19

## Scope

- Drops list fails closed for unsigned-in users, missing/inactive profile pickup, or pickup read errors. No all-city fallback. Each focus refreshes the profile; stale in-flight loads are discarded.
- Direct drop detail loading requires an active profile pickup. Booking re-reads the profile and checks equality with the drop pickup. Existing success haptics are unchanged.
- Export still includes every confirmed/completed booking from the selected drop. Destination comes from the booking, never from current profile preference. Separate columns show drop pickup, current preference (explicitly not the destination), booking ID, and missing/mismatch warnings. No fallback guesses or rows suppressed. Summary counts warnings.
- No existing profile, order, booking, payment, or destination was reassigned.

## Applied database protection

Connected project DROPMARKET. Applied migrations:
- `20261019120000_validate_booking_pickup_destination.sql`
- `20261019121000_align_pickup_guard_with_status_column.sql`

The second migration corrects the initial assumption about the live schema: pickup_points has `status`, not `is_active`. Final trigger `booking_pickup_destination_guard` runs before INSERT and rejects missing/inactive profile pickup, another user's authenticated insert, mismatched profile/drop/booking pickup. It does not update old records.

## Tests

- `bun test utils/pickup-rules.test.js`: 3 passing tests, 10 assertions.
- Live SQL negative tests passed: deliberately incomplete insert without a profile pickup raises PICKUP_POINT_REQUIRED; mismatched profile/drop insert raises PICKUP_POINT_MISMATCH. Failed inserts are isolated in exception subtransactions and leave no bookings or side effects.
- Positive live insert-path test was blocked: no active drop with a matching profile pickup fixture. No test fixtures were created in the live database.
- Initial SQL test exposed absent `is_active`, fixed by second applied migration and helper update; negative tests rerun successfully.
- `bun run typecheck`: fails with 1,048 diagnostics in the imported project. Original generated Database type contains no tables/functions, causing widespread `never` errors. New profile pickup helper has no diagnostics. This is not a type-clean project; global legacy typing repair remains out of scope.
- `git diff --check` passed.

## Native preview

Request `mmvdletdm1949_5`:
- iOS native build succeeded, ID `xcb_8c9199211051459089ef77094662e833`, but launch/device controls failed readiness with HTTP 500.
- Android native build succeeded, ID `anb_003cdd1a05e74709ad392625dbd978204248706a8989b0a83e6d1cef9d539607`. Logs named device `b7a2305e-9a73-4316-8867-a64bc4118f26`, but device inspection found no leased simulator.
- check-app attempted this turn: list-devices returned no simulator leased. No app-owned screen, authenticated flow, generated Excel, or positive booking could be inspected; no walkthrough recording was possible. Native compilation success is not runtime verification.
- No store/production app build published. App-source changes need a working launch and authenticated export verification; database guard is already applied.
