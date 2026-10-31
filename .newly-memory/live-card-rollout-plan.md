---
name: live-card-rollout-plan
description: Dormant live-card + no-show enforcement built in 2.8.11; what is off and what needs the owner's written OK
metadata:
  type: project
---

Built dormant (31 Oct 2026): `booking_card_rollout.enforce_no_show_card` (default false; create_booking_atomic raises CARD_REQUIRED at >=2 events, ACCOUNT_BLOCKED at >=5/blocked), mode 'live' + `live_open` (default false), `card_user_allowed()` used by begin/finalize/guard card functions. Edge functions pick keys by mode via `_shared/booking-stripe-keys.ts`: STRIPE_BOOKING_LIVE_SECRET_KEY / _PUBLISHABLE_KEY / _WEBHOOK_SECRET (user enters in Backend secrets). Saved cards disabled in live.
**Why:** next official drop; user wants the store build with card + no-show rules; owner can't test safely.
**How to apply:** never set mode 'live' or enforce flag without the user's explicit written OK, live keys entered by them, no open test attempts, and a real 1 EUR test first. Live webhook endpoint must also be created in Stripe by the user.
