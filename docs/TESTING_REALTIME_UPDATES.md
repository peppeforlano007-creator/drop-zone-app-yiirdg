
# Testing Real-Time Updates - Quick Guide

## Quick Test Procedure

### Test 1: Drop Discount Updates ✅

**Steps**:
1. Open a drop on Device A
2. Note the current discount (e.g., 65%)
3. On Device B, book a product from the same drop
4. Watch Device A - the discount should update within 1-2 seconds
5. The discount badge should animate (bounce effect)
6. You should see a "Live" indicator in the top right

**Expected Result**:
- Discount increases based on the new booking value
- Both devices show the same discount
- Animation plays when discount changes
- Console shows: `✅ Drop state updated: old_discount=65, new_discount=66`

### Test 2: Product Stock Updates ✅

**Steps**:
1. Open a drop on Device A
2. Find a product with stock > 1 (e.g., "23 disponibili")
3. On Device B, book that same product
4. Watch Device A - the stock count should decrease by 1
5. The green text should update (e.g., "23 disponibili" → "22 disponibili")

**Expected Result**:
- Stock count decreases immediately
- Green text updates in real-time
- Product remains visible (not removed)
- Console shows: `✅ Product updated in list: [product-id] stock: 22`

### Test 3: Product Removal When Out of Stock ✅

**Steps**:
1. Open a drop on Device A
2. Find a product with stock = 1 (e.g., "1 disponibile")
3. On Device B, book that product
4. Watch Device A - the product should disappear from the feed
5. If it was the last product, you should see an alert

**Expected Result**:
- Product disappears from the feed
- Next product in the list is shown
- Console shows: `🗑️ Product out of stock or inactive, removing from list`
- If last product: Alert shows "Tutti i prodotti esauriti"

## Console Log Reference

### Successful Flow

```
🚀 Setting up realtime subscription for drop: [drop-id]
📶 Drop channel subscription status: SUBSCRIBED
📡 Postgres change received for drop: [drop-id]
✅ Processing drop update: { discount: 66, value: 1500 }
✅ Drop state updated: old_discount=65, new_discount=66
```

### Product Stock Update

```
📡 Product stock update received: { product_id: [id], stock: 22 }
✅ Product updated in list: [product-id] stock: 22
```

### Product Out of Stock

```
📡 Product stock update received: { product_id: [id], stock: 0 }
🗑️ Product out of stock or inactive, removing from list: [product-id]
```

### Duplicate Detection

```
📡 Postgres change received for drop: [drop-id]
⏭️ Duplicate update detected, skipping
```

## Database Verification

### Check Drop Values Match

```sql
SELECT 
  d.name,
  d.current_discount,
  d.current_value,
  (SELECT COALESCE(SUM(final_price), 0) 
   FROM bookings 
   WHERE drop_id = d.id 
   AND status = 'active' 
   AND payment_status IN ('authorized', 'pending')) as calculated_value,
  CASE 
    WHEN d.current_value = (SELECT COALESCE(SUM(final_price), 0) 
                            FROM bookings 
                            WHERE drop_id = d.id 
                            AND status = 'active' 
                            AND payment_status IN ('authorized', 'pending'))
    THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM drops d
WHERE d.status = 'active';
```

**Expected**: All rows should show `✅ MATCH`

### Check Product Stock

```sql
SELECT 
  p.name,
  p.stock,
  p.status,
  (SELECT COUNT(*) 
   FROM bookings 
   WHERE product_id = p.id 
   AND status = 'active') as active_bookings
FROM products p
WHERE p.supplier_list_id IN (
  SELECT supplier_list_id 
  FROM drops 
  WHERE status = 'active'
)
ORDER BY p.updated_at DESC
LIMIT 10;
```

**Expected**: Stock should reflect the number of active bookings

## Troubleshooting

### Issue: Discount Not Updating

**Check**:
1. Is the "Live" indicator showing?
2. Console shows `📶 Drop channel subscription status: SUBSCRIBED`?
3. Run the database verification query - does it show `✅ MATCH`?

**Solution**:
- If not subscribed: Check internet connection
- If mismatch: Run `SELECT update_drop_discount()` manually
- Check Supabase logs for trigger errors

### Issue: Stock Not Updating

**Check**:
1. Console shows product stock updates?
2. Product status is 'active'?
3. Stock value in database is correct?

**Solution**:
- Refresh the drop details screen
- Check if the product was removed (stock = 0)
- Verify the real-time subscription is active

### Issue: Products Disappearing Incorrectly

**Check**:
1. What is the actual stock in the database?
2. What is the product status?
3. Console shows removal reason?

**Solution**:
- If stock > 0 and status = 'active': This is a bug, report it
- If stock = 0 or status != 'active': This is correct behavior
- Check for booking cancellations that should restore stock

## Performance Metrics

### Expected Response Times

- **Drop discount update**: < 2 seconds
- **Product stock update**: < 1 second
- **Product removal**: < 1 second
- **Real-time connection**: < 3 seconds

### Database Query Performance

```sql
-- Should execute in < 100ms
EXPLAIN ANALYZE
SELECT COALESCE(SUM(final_price), 0)
FROM bookings
WHERE drop_id = '[drop-id]'
  AND payment_status IN ('authorized', 'pending')
  AND status = 'active';
```

**Expected**: Uses index `idx_bookings_drop_status_payment`

## Test Scenarios

### Scenario 1: Multiple Users Booking Simultaneously

1. Have 3+ users open the same drop
2. All users book different products at the same time
3. Verify:
   - All discounts update correctly
   - No products are oversold
   - Stock counts are accurate
   - No race conditions occur

### Scenario 2: Booking Cancellation

1. User A books a product (stock: 5 → 4)
2. Admin cancels the booking
3. Verify:
   - Stock is restored (4 → 5)
   - Product reappears in feed if it was removed
   - Drop value decreases
   - Discount recalculates

### Scenario 3: Last Product Booked

1. Find a product with stock = 1
2. Book it
3. Verify:
   - Product disappears from feed
   - "ESAURITO" overlay shows briefly
   - Next product is displayed
   - If last product: Alert is shown

## Success Criteria

✅ All three issues are resolved:
1. Drop discount and value update in real-time
2. Products only disappear when stock = 0
3. Product card availability updates in real-time

✅ No console errors
✅ Database values match calculated values
✅ Real-time connection is stable
✅ Performance is acceptable (< 2s updates)

---

**Last Updated**: 2025-11-25
**Status**: All tests passing ✅
