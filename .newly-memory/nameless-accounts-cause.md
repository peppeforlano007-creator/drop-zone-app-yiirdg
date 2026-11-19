---
name: nameless-accounts-cause
description: Why many profiles show N/A (no name) and what was fixed, Nov 2026
metadata:
  type: project
---

About 1 in 5 new consumer profiles had no full_name (1035 since 2026-09-01). They had no consents and most had no pickup point, so they never went through registration. Most likely source: forgot-password called signInWithOtp without shouldCreateUser:false and created accounts.
**Why:** the owner sees "N/A" customers.
**How to apply:** registration now has separate Nome/Cognome fields (required, at least 2 letters), and forgot-password no longer creates users. Both ship with 2.8.15. Prompting existing nameless users to add a name was offered and is not done.
