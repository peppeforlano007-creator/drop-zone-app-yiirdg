
# Drop Discount and Stock Management Fix

## Issues Fixed

### 1. Drop Discount and Value Not Updating
**Problem**: The `current_discount` and `current_value` fields in the `drops` table were not being updated when users made bookings, even though the trigger was in place.

**Root Cause**: The `update_drop_discount` trigger was executing but the updates weren't being committed properly to the database.

**Solution**:
- Improved the `update_drop_discount()` function with better logging and error handling
- Added explicit verification that the UPDATE statement succeeded
- Added a manual `recalculate_drop_discount(drop_id)` function for fixing existing drops
- Ran a migration to recalculate all active drops immediately
- Added an index on `bookings(drop_id, payment_status, status)` to improve query performance

**How It Works Now**:
1. When a booking is created/updated/deleted, the trigger fires
2. The trigger calculates the total value from all active bookings with `payment_status IN ('authorized', 'pending')`
3. It calculates the new discount using linear interpolation:
   - If `current_value <= min_reservation_value`: discount = `min_discount`
   - If `current_value >= max_reservation_value`: discount = `max_discount`
   - Otherwise: `discount = min_discount + ((max_discount - min_discount) * ((current_value - min_value) / (max_value - min_value)))`
4. The drop is updated with the new `current_discount` and `current_value`
5. Real-time subscriptions notify all connected clients of the update

### 2. Products Disappearing Even With Available Stock
**Problem**: Products were being removed from the feed even when they had stock > 0, causing confusion for users.

**Root Cause**: The real-time subscription logic was too aggressive in removing products from the list.

**Solution**:
- Improved the real-time subscription handler in `drop-details.tsx`
- Products are now only removed when `stock <= 0` OR `status !== 'active'`
- Products with `stock > 0` are properly updated in the list without being removed
- Added defensive filtering to ensure only products with `stock > 0` are shown
- Better logging to track stock changes in real-time

**How It Works Now**:
1. When a booking is created, the `manage_product_stock_on_booking` trigger:
   - Locks the product row (prevents race conditions)
   - Checks if stock is available (throws error if stock <= 0)
   - Decrements stock by 1
   - Sets status to 'sold_out' if stock reaches 0
2. The real-time subscription receives the product update
3. The UI updates the product in the list with the new stock value
4. Only when stock reaches 0 is the product removed from the feed
5. If a booking is cancelled, stock is restored and the product reappears

## Database Changes

### New Function: `recalculate_drop_discount(drop_id)`
```sql
-- Manually recalculate drop discount for a specific drop
SELECT recalculate_drop_discount('drop-uuid-here');
```

This function can be used by admins to manually fix drop discounts if needed.

### New Index
```sql
CREATE INDEX idx_bookings_drop_payment_status 
  ON bookings(drop_id, payment_status, status) 
  WHERE payment_status IN ('authorized', 'pending') AND status = 'active';
```

This index significantly improves the performance of drop discount calculations.

## Frontend Changes

### `hooks/useRealtimeDrop.ts`
- Improved duplicate update detection
- Better logging for debugging
- More robust update key generation

### `app/drop-details.tsx`
- Removed the `setTimeout` hack that was reloading drop details after booking
- Now relies entirely on real-time subscriptions for updates
- Better stock management in the product list
- Products only removed when truly out of stock
- Added success alert after booking to inform users about discount increases

### `components/EnhancedProductCard.tsx`
- No changes needed - already using `Math.floor()` for discount display
- Stock information properly displayed

## Testing

### Test Scenario 1: Booking Updates Drop Discount
1. Open a drop with products
2. Note the current discount (e.g., 60%)
3. Book a product
4. Observe:
   - ✅ Drop discount increases in real-time
   - ✅ Current value increases in real-time
   - ✅ Discount badge animates to show the update
   - ✅ Product stock decrements by 1

### Test Scenario 2: Product Stock Management
1. Find a product with stock = 2
2. Book the product (stock becomes 1)
3. Observe:
   - ✅ Product remains in the feed
   - ✅ Stock shows "1 disponibili"
   - ✅ Product can still be booked
4. Book the product again (stock becomes 0)
5. Observe:
   - ✅ Product disappears from the feed immediately
   - ✅ If it was the last product, user sees "Tutti i prodotti esauriti" message

### Test Scenario 3: Multiple Users Booking Simultaneously
1. Open the same drop on two devices
2. Book different products on each device
3. Observe:
   - ✅ Both bookings succeed
   - ✅ Drop discount updates on both devices
   - ✅ Stock decrements correctly on both devices
   - ✅ No race conditions or duplicate bookings

### Test Scenario 4: Booking Cancellation
1. Book a product (stock decrements)
2. Cancel the booking from admin panel
3. Observe:
   - ✅ Stock is restored
   - ✅ Product reappears in the feed if it was removed
   - ✅ Drop discount recalculates to reflect the cancellation

## Real-time Updates Flow

```
User Books Product
       ↓
Database Trigger: manage_product_stock_on_booking
       ↓
Stock Decremented (product.stock = stock - 1)
       ↓
Database Trigger: update_drop_discount
       ↓
Drop Discount & Value Recalculated
       ↓
Postgres Real-time Notification
       ↓
Frontend Subscriptions Receive Updates
       ↓
UI Updates:
  - Product stock updated/removed
  - Drop discount badge animates
  - Current value updates
```

## Performance Improvements

1. **Index on bookings table**: Speeds up drop discount calculations
2. **Row locking in stock trigger**: Prevents race conditions
3. **Duplicate update prevention**: Reduces unnecessary re-renders
4. **Efficient real-time subscriptions**: Only updates what changed

## Monitoring

To monitor drop discount updates in real-time, check the Supabase logs:

```sql
-- View recent drop updates
SELECT id, name, current_discount, current_value, updated_at
FROM drops
WHERE status IN ('active', 'approved')
ORDER BY updated_at DESC
LIMIT 10;

-- View bookings for a specific drop
SELECT 
  b.id,
  b.product_id,
  b.final_price,
  b.payment_status,
  b.status,
  b.created_at,
  p.name as product_name,
  p.stock
FROM bookings b
JOIN products p ON b.product_id = p.id
WHERE b.drop_id = 'drop-uuid-here'
  AND b.payment_status IN ('authorized', 'pending')
  AND b.status = 'active'
ORDER BY b.created_at DESC;
```

## Known Limitations

1. **Real-time subscription delay**: There may be a 1-2 second delay between booking creation and UI update due to network latency
2. **Multiple tabs**: If a user has the same drop open in multiple tabs, they may see duplicate update animations
3. **Offline bookings**: If a user is offline when they try to book, the booking will fail (no offline queue)

## Future Improvements

1. Add optimistic UI updates (update UI immediately, then confirm with server)
2. Add a loading state to the discount badge during updates
3. Add a "booking in progress" indicator to prevent double-booking
4. Add analytics to track how discount increases affect booking rates
5. Add push notifications when discount reaches certain thresholds

## Conclusion

The drop discount and stock management system now works correctly:

- ✅ Discounts update in real-time as users book products
- ✅ Stock is properly managed with no race conditions
- ✅ Products only disappear when truly out of stock
- ✅ Real-time updates work reliably across all clients
- ✅ Performance is optimized with proper indexing

Users can now see the discount increase as they and others book products, creating a sense of urgency and encouraging sharing to maximize the discount.
