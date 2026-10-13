
# Wishlist Feature - Testing Guide

## Pre-Testing Setup

### 1. Database Setup
Ensure the wishlists table is created:
```sql
-- Run in Supabase SQL Editor
SELECT * FROM wishlists LIMIT 1;
```

If the table doesn't exist, run the migration:
```sql
-- Located at: app/integrations/supabase/migrations/create_wishlists_table.sql
```

### 2. Test User Setup
- Create a test user account
- Ensure user has a pickup point assigned
- Verify user can access drop feeds

### 3. Test Data Setup
- Create at least one active drop
- Ensure drop has products with stock > 0
- Verify products have images

## Test Cases

### Test 1: Add Product to Wishlist
**Steps:**
1. Log in as test user
2. Navigate to Drops tab
3. Select an active drop
4. Scroll through products
5. Tap the heart icon on a product card (top-right)

**Expected Results:**
- Heart icon fills with red color
- Haptic feedback occurs
- No error messages
- Database entry created in wishlists table

**Verification:**
```sql
SELECT * FROM wishlists WHERE user_id = 'YOUR_USER_ID';
```

### Test 2: Remove Product from Wishlist
**Steps:**
1. With product already in wishlist
2. Tap the filled red heart icon

**Expected Results:**
- Heart icon becomes outlined white
- Haptic feedback occurs
- Database entry removed from wishlists table

**Verification:**
```sql
SELECT * FROM wishlists WHERE user_id = 'YOUR_USER_ID' AND product_id = 'PRODUCT_ID';
-- Should return 0 rows
```

### Test 3: View Wishlist Screen
**Steps:**
1. Add 2-3 products to wishlist
2. Navigate to Profile tab
3. Tap "❤️ La mia wishlist"

**Expected Results:**
- Wishlist screen opens
- All saved products are displayed
- Product images load correctly
- Prices and discounts are shown
- Drop names are visible

### Test 4: Wishlist Count Badge
**Steps:**
1. Add products to wishlist
2. Navigate to Profile tab
3. Look at "❤️ La mia wishlist" menu item

**Expected Results:**
- Badge shows correct count
- Badge updates when items added/removed
- Badge disappears when count is 0

### Test 5: Navigate from Wishlist to Drop
**Steps:**
1. Open wishlist screen
2. Tap on a product card (not the X button)

**Expected Results:**
- Navigates to drop-details screen
- Scrolls to the specific product
- Product is visible on screen
- All product details are correct

### Test 6: Remove from Wishlist Screen
**Steps:**
1. Open wishlist screen
2. Tap X button on a product card
3. Confirm removal in dialog

**Expected Results:**
- Confirmation dialog appears
- Product is removed from list
- Haptic feedback occurs
- UI updates immediately

### Test 7: Empty Wishlist State
**Steps:**
1. Remove all items from wishlist
2. View wishlist screen

**Expected Results:**
- Empty state message displayed
- Heart icon with slash shown
- "Esplora Drop" button visible
- Button navigates to drops tab

### Test 8: Pull to Refresh
**Steps:**
1. Open wishlist screen
2. Pull down to refresh

**Expected Results:**
- Refresh indicator appears
- Data reloads
- Any changes are reflected

### Test 9: Inactive Drop Handling
**Steps:**
1. Add product to wishlist
2. Admin: Mark drop as completed/expired
3. User: Open wishlist
4. Tap on the product

**Expected Results:**
- "Drop Terminato" badge shown
- Alert appears when tapped
- Alert explains drop is no longer active

### Test 10: Out of Stock Handling
**Steps:**
1. Add product to wishlist
2. Admin: Set product stock to 0
3. User: Open wishlist
4. Tap on the product

**Expected Results:**
- "Esaurito" badge shown
- Alert appears when tapped
- Alert explains product is out of stock

### Test 11: Unauthenticated User
**Steps:**
1. Log out
2. Navigate to drop feed
3. Try to tap heart icon

**Expected Results:**
- Alert appears: "Accesso richiesto"
- Redirects to login screen
- No database changes

### Test 12: Duplicate Prevention
**Steps:**
1. Add product to wishlist
2. Try to add same product again (via database)

**Expected Results:**
- Unique constraint prevents duplicate
- Error is handled gracefully
- No duplicate entries in database

**Verification:**
```sql
SELECT COUNT(*) FROM wishlists 
WHERE user_id = 'USER_ID' 
AND product_id = 'PRODUCT_ID' 
AND drop_id = 'DROP_ID';
-- Should return 1
```

### Test 13: Multiple Products in Same Drop
**Steps:**
1. Add multiple products from same drop to wishlist
2. View wishlist
3. Tap each product

**Expected Results:**
- All products shown in wishlist
- Each navigates to correct product
- Scroll position is correct for each

### Test 14: Products from Different Drops
**Steps:**
1. Add products from different drops
2. View wishlist
3. Verify each product shows correct drop name

**Expected Results:**
- Each product shows its drop name
- Tapping navigates to correct drop
- No mixing of drop information

### Test 15: Animation and Haptics
**Steps:**
1. Add product to wishlist
2. Remove product from wishlist
3. Observe animations and feel haptics

**Expected Results:**
- Heart scales up then down when tapped
- Haptic feedback on add
- Haptic feedback on remove
- Smooth animations

## Performance Testing

### Test 16: Large Wishlist
**Steps:**
1. Add 20+ products to wishlist
2. Open wishlist screen
3. Scroll through list

**Expected Results:**
- Screen loads quickly
- Smooth scrolling
- Images load progressively
- No lag or stuttering

### Test 17: Concurrent Operations
**Steps:**
1. Rapidly tap heart icon multiple times
2. Observe behavior

**Expected Results:**
- Loading indicator shows
- Only one operation processes
- No duplicate entries
- Correct final state

## Security Testing

### Test 18: RLS Policies
**Steps:**
1. User A adds products to wishlist
2. User B tries to access User A's wishlist (via API)

**Expected Results:**
- User B cannot see User A's wishlist
- RLS policies block unauthorized access
- No data leakage

**Verification:**
```sql
-- As User B, try to query User A's wishlist
SELECT * FROM wishlists WHERE user_id = 'USER_A_ID';
-- Should return 0 rows or error
```

### Test 19: Admin Access
**Steps:**
1. Log in as admin
2. Query wishlists table

**Expected Results:**
- Admin can view all wishlists
- Read-only access (cannot modify)
- Useful for analytics

## Edge Cases

### Test 20: Product Deleted
**Steps:**
1. Add product to wishlist
2. Admin: Delete product from database
3. User: Open wishlist

**Expected Results:**
- Product removed from wishlist (CASCADE)
- No errors shown
- Wishlist displays remaining items

### Test 21: Drop Deleted
**Steps:**
1. Add product to wishlist
2. Admin: Delete drop from database
3. User: Open wishlist

**Expected Results:**
- Product removed from wishlist (CASCADE)
- No errors shown
- Wishlist displays remaining items

### Test 22: User Deleted
**Steps:**
1. User adds products to wishlist
2. Admin: Delete user account
3. Check database

**Expected Results:**
- All user's wishlist items deleted (CASCADE)
- No orphaned records
- Clean database state

## Regression Testing

After any code changes, re-run:
- Test 1: Add to wishlist
- Test 2: Remove from wishlist
- Test 3: View wishlist
- Test 5: Navigate to drop
- Test 11: Unauthenticated user

## Automated Testing Checklist

Create automated tests for:
- [ ] Database schema validation
- [ ] RLS policy enforcement
- [ ] API endpoint responses
- [ ] Component rendering
- [ ] Navigation flows
- [ ] Error handling

## Bug Report Template

If you find a bug, report it with:
```
**Title:** Brief description

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
What should happen

**Actual Result:**
What actually happened

**Environment:**
- Device: iOS/Android
- App Version: X.X.X
- User Role: consumer/admin

**Screenshots:**
Attach if applicable

**Database State:**
Relevant SQL query results

**Console Logs:**
Any error messages
```

## Success Criteria

All tests pass when:
- ✅ Users can add/remove products from wishlist
- ✅ Wishlist screen displays correctly
- ✅ Navigation works as expected
- ✅ Count badge updates properly
- ✅ Status badges show correctly
- ✅ Animations are smooth
- ✅ Haptics work on all actions
- ✅ RLS policies enforce security
- ✅ No duplicate entries possible
- ✅ Edge cases handled gracefully
- ✅ Performance is acceptable
- ✅ Empty states display correctly
- ✅ Error messages are user-friendly

## Post-Testing

After successful testing:
1. Document any issues found
2. Verify all fixes
3. Update user documentation
4. Train support team
5. Monitor production logs
6. Gather user feedback
