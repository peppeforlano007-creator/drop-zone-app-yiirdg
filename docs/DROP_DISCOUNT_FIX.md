
# Fix: Drop Discount Not Increasing with Bookings

## Problem
The discount percentage for drops was not increasing as users booked items, even after the minimum reservation value was reached. The drop remained stuck at the minimum discount percentage.

## Root Cause
The database function `update_drop_discount()` was only counting bookings with `payment_status = 'authorized'` (card payments), but the app now uses Cash on Delivery (COD) with `payment_status = 'pending'`. This meant COD bookings were not being counted when calculating the drop's current value and discount.

## Solution
Updated the `update_drop_discount()` database function to include both payment statuses:
- `authorized` - for card payments (legacy)
- `pending` - for COD payments (current implementation)

### Changes Made

1. **Database Migration**: `fix_drop_discount_calculation_for_cod`
   - Modified `update_drop_discount()` function to count bookings with both `payment_status IN ('authorized', 'pending')`
   - Improved discount calculation logic with proper boundary checks
   - Updated `check_underfunded_drops()` to use `min_reservation_value` instead of `target_value`

2. **Code Cleanup**: `app/drop-details.tsx`
   - Removed manual drop update logic from `handleBook()` function
   - The database trigger now automatically handles discount calculation
   - Added comment explaining that the trigger handles the update

## How It Works Now

1. **User books an item** → Booking is created with `payment_status = 'pending'` and `status = 'active'`
2. **Database trigger fires** → `trigger_update_drop_discount` on bookings table
3. **Function calculates** → Sums all active bookings (both 'authorized' and 'pending')
4. **Discount updates** → Linear interpolation between min and max discount based on value progress
5. **Real-time update** → `broadcast_drop_update` trigger notifies all connected clients

## Discount Calculation Formula

```
if current_value <= min_reservation_value:
    discount = min_discount
elif current_value >= max_reservation_value:
    discount = max_discount
else:
    progress = (current_value - min_value) / (max_value - min_value)
    discount = min_discount + (max_discount - min_discount) * progress
```

## Example

For the "Andria - Westwing" drop:
- Min discount: 50%
- Max discount: 80%
- Min reservation value: €1,000
- Max reservation value: €30,000

**Before fix:**
- 22 bookings totaling €4,193.49
- Current value: €0.00 ❌
- Current discount: 50.00% ❌

**After fix:**
- 22 bookings totaling €4,193.49
- Current value: €4,193.49 ✅
- Current discount: 53.30% ✅

The discount increased from 50% to 53.30% because:
```
progress = (4193.49 - 1000) / (30000 - 1000) = 0.110
discount = 50 + (80 - 50) * 0.110 = 53.30%
```

## Testing

To verify the fix is working:

1. Create a booking in an active drop
2. Check that the drop's `current_value` increases by the booking's `final_price`
3. Check that the drop's `current_discount` increases proportionally
4. Verify real-time updates are broadcast to all connected clients

## Database Query for Verification

```sql
SELECT 
    d.id,
    d.name,
    d.current_value,
    d.current_discount,
    sl.min_discount,
    sl.max_discount,
    sl.min_reservation_value,
    sl.max_reservation_value,
    (SELECT COUNT(*) FROM bookings WHERE drop_id = d.id AND status = 'active') as booking_count,
    (SELECT SUM(final_price) FROM bookings WHERE drop_id = d.id AND status = 'active') as total_booking_value
FROM drops d
JOIN supplier_lists sl ON d.supplier_list_id = sl.id
WHERE d.status = 'active';
```

## Notes

- The fix is backward compatible with card payments (if re-enabled in the future)
- Existing bookings were automatically recalculated after the migration
- The real-time subscription ensures all users see the updated discount immediately
- The discount calculation happens automatically via database trigger, no manual updates needed in the app code
