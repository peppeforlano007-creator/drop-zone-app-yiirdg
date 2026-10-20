---
name: public-production-caution
description: The app is public with real users; the owner cannot safely test production booking flows.
metadata:
  node_type: memory
  type: feedback
  originSessionId: ecf8f11c-2f9c-47aa-8486-887a7b85b8f5
  modified: 2026-10-20T10:39:12.504Z
---

The owner says RDN STREET STOCK MARKET is already public with real users and cannot personally test the booking process. They explicitly requested extra care for inventory changes.

**Why:** A booking mistake can affect real customers and stock.
**How to apply:** Preserve published-client compatibility, use isolated or fully rolled-back synthetic fixtures, and validate changes before applying them. Never confirm test bookings on real products, broadcast messages, or reconstruct historical quantities without reliable evidence and authorization. Distinguish server-live fixes from UI changes requiring a store update, and disclose incomplete checks.
