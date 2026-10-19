# Drop product counter and category filter — 2026-10-19

## Scope
- Full-screen EnhancedProductCard and its photos, details, pricing, booking/favorite actions are unchanged.
- Compact counter below the existing discount/completed-status area, no second progress bar. Viewability changes only when a page is at least 60% visible. Last page includes Fine lista.
- Filtra opens a native Modal bottom panel with single-category selection and product counts. Category selection starts at its first product; clearing with X or Tutte restores the remembered unfiltered product by ID, falling back to the nearest index if removed.
- Category grouping normalizes whitespace/case for display only, without database/import changes. Null/blank categories are Senza categoria. Filter hidden if no useful categorization (all missing or just one group).
- Counter total always uses the current filtered catalogue. Existing all-vs-in-stock drop-status rules preserved.
- Product loader pages beyond 1000, uses stable created_at/id descending ordering, continues until empty even under a smaller server cap, deduplicates IDs, and propagates failures instead of displaying a partial total. Offset pagination is not a transactional database snapshot; realtime changes continue through existing subscriptions.
- Existing stock polling/booking-trigger refresh now uses the complete paged loader too. No removal based on missing refresh rows. Stock-only updates do not force-scroll during a swipe.
- Share resolves directly from the rendered product, not a filtered index into the original list. Wishlist deep-link positions once instead of repeatedly jumping after stock changes.
- Sheet uses platform-owned slide presentation, skipped when Reduce Motion is enabled. Selection haptic; no new animation on every page or counter update.

## Automated checks
- bun test utils/drop-feed.test.js utils/chat-pagination.test.js utils/admin-broadcast.test.js utils/pickup-rules.test.js: 22 passed, 0 failed, 64 assertions.
- Eight new feed tests cover grouping without rewriting imports, filtering/missing category, counter/final/empty states, ID-based position restoration/removal, 1240 products with server cap 200, stock/list visibility, partial-page failure, empty catalogue.
- git diff --check passed.
- bun run typecheck still fails: 1018 legacy diagnostics, primarily empty generated Supabase Database definitions. No diagnostics in new drop-feed helper or DropCategorySheet. Project is not type-clean.

## Native preview / unchecked UI
- Exact source submitted and awaited for both platforms in turn mmvfio8dw6560_3.
- iOS native artifact reused successfully: xcb_8c9199211051459089ef77094662e833. iOS bundle compiled successfully (2527 modules), but app installation failed. Logs report no_app_connected; no concrete app-source error identified.
- Android native artifact reused successfully: anb_003cdd1a05e74709ad392625dbd978204248706a8989b0a83e6d1cef9d539607. Exact source/bundle attached to managed preview; Android feed UI not checked.
- check-app confirmed current leased iOS UDID C2289A83-D57D-4AF7-A848-95FB13529D04, only Home/system apps on both pages and no RDN app. No recording possible. Counter, filtering, restore, sharing preview, last-page label, layout and presentation motion remain visually unchecked.
- Screenshot: /tmp/argent-artifacts/repo-37f121/20261019-173427-618/C2289A83-D57D-4AF7-A848-95FB13529D04/398511000-1792431273436.png.
- No test bookings, favorites, messages, notifications, SMS, profile changes, schema changes, or store release performed.
