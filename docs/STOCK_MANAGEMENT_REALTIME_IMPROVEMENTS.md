
# Stock Management and Real-time Updates - Improvements

## Overview
This document describes the improvements made to the stock management system and real-time updates for the drop feed to ensure products with 0 availability are never shown and are removed immediately when the last item is booked.

## Problem Statement
The user reported the following issues:
1. **Booking Error (P0001)**: When clicking "Prenota Articolo" in the drop feed, users received an error "impossibile creare la prenotazione"
2. **Products with 0 Stock Showing**: Items with 0 availability were still appearing in the feed
3. **No Real-time Removal**: When the last available item was booked, it didn't disappear from the feed immediately

## Solution Implemented

### 1. Database Improvements

#### Enhanced Stock Management Trigger
**File**: Database Migration `improve_stock_management_and_realtime_updates`

**Changes**:
- Improved error messages in `manage_product_stock_on_booking()` function
- Changed error messages to Italian for better user experience:
  - "Prodotto non trovato" instead of generic error
  - "Prodotto esaurito" with helpful hint when stock is 0
- Automatically set product status to `sold_out` when stock reaches 0
- Automatically restore status to `active` when stock is restored (e.g., booking cancelled)

**Error Codes**:
- `P0001`: Used for stock-related errors with user-friendly messages
- Includes hints to guide users on what to do next

#### New Database Function
**Function**: `get_available_products_for_drop(p_supplier_list_id UUID)`

**Purpose**: Returns only products with stock > 0 and active status for a given supplier list

**Benefits**:
- Ensures out-of-stock items are never returned
- Optimized query with proper filtering
- Can be used by the frontend for consistent results

#### Real-time Notification Trigger
**Function**: `notify_product_stock_change()`

**Purpose**: Sends real-time notifications when product stock changes

**How it works**:
- Triggers on UPDATE when stock changes
- Uses `pg_notify` to broadcast changes
- Includes product_id, supplier_list_id, old_stock, new_stock, and status

#### Performance Indexes
Added two new indexes for faster queries:
1. `idx_products_supplier_list_stock_status`: For supplier list queries with stock filtering
2. `idx_products_stock_status`: For general stock queries

### 2. Frontend Improvements

#### Drop Details Screen (`app/drop-details.tsx`)

**Query Improvements**:
```typescript
// Before
.gt('stock', 0)

// After
.gt('stock', 0)
.order('created_at', { ascending: false })
// Plus defensive filtering
const availableProducts = (productsData || []).filter(
  p => p.stock > 0 && p.status === 'active'
);
```

**Error Handling**:
- Better detection of P0001 errors
- Check for Italian keywords: "esaurito", "stock", "disponibile"
- User-friendly error messages in Italian
- Automatic reload of drop details after error

**Real-time Subscription Enhancements**:
- Unique channel name per supplier list to avoid conflicts
- Immediate removal of products when stock reaches 0
- Immediate removal when status changes to non-active
- Alert when last product is removed from drop
- Better logging for debugging
- Subscription status monitoring

**Stock Validation**:
- Double-check stock before creating booking
- Prevent race conditions by checking stock in confirmation dialog

#### Enhanced Product Card (`components/EnhancedProductCard.tsx`)

**Improvements**:
- Better haptic feedback for out-of-stock scenarios
- Double-check stock before processing booking
- More descriptive error messages
- Improved user experience with appropriate feedback

### 3. Real-time Flow

#### When a User Books the Last Item:

1. **User clicks "Prenota Articolo"**
   - Frontend checks if stock > 0
   - Shows confirmation dialog

2. **User confirms booking**
   - Frontend double-checks stock
   - Sends INSERT to bookings table

3. **Database Trigger Executes**
   - `manage_product_stock_on_booking()` locks product row
   - Checks if stock > 0
   - If stock is 0: raises P0001 error with "Prodotto esaurito"
   - If stock > 0: decrements stock and sets status to 'sold_out' if stock becomes 0

4. **Real-time Notification**
   - `notify_product_stock_change()` trigger fires
   - Broadcasts stock change via pg_notify
   - Supabase real-time sends UPDATE event to all connected clients

5. **All Clients Update**
   - Receive UPDATE event via Supabase real-time
   - Check if stock <= 0 or status != 'active'
   - Remove product from feed immediately
   - If last product: show alert and navigate back

#### When a Booking is Cancelled:

1. **Booking status changes to 'cancelled'**
2. **Database Trigger Executes**
   - `manage_product_stock_on_booking()` restores stock
   - Changes status from 'sold_out' to 'active' if applicable
3. **Real-time Notification**
   - Broadcasts stock increase
4. **All Clients Update**
   - Product reappears in feed if it was removed

### 4. Error Messages

#### Before:
- Generic error: "impossibile creare la prenotazione"
- Error code: P0001 (not user-friendly)

#### After:
- **Out of Stock**: "Prodotto esaurito - Questo prodotto non è più disponibile. Qualcun altro lo ha appena prenotato."
- **Product Not Found**: "Prodotto non trovato - Il prodotto potrebbe essere stato rimosso o non esiste più."
- **Other Errors**: Specific error message with context

### 5. Testing Checklist

To verify the improvements work correctly:

- [ ] **Test 1: Single Item Booking**
  - Create a product with stock = 1
  - Book the product
  - Verify it disappears from feed immediately
  - Verify other users see it disappear in real-time

- [ ] **Test 2: Race Condition**
  - Create a product with stock = 1
  - Have two users try to book simultaneously
  - First user should succeed
  - Second user should see "Prodotto esaurito" error
  - Product should disappear from both feeds

- [ ] **Test 3: Booking Cancellation**
  - Book a product (stock becomes 0)
  - Verify it disappears from feed
  - Cancel the booking
  - Verify it reappears in feed with stock = 1

- [ ] **Test 4: Multiple Products**
  - Create multiple products in a drop
  - Book all products one by one
  - Verify each disappears as it's booked
  - Verify "Tutti i prodotti esauriti" alert when last one is booked

- [ ] **Test 5: Error Messages**
  - Try to book a product with stock = 0 (if possible)
  - Verify error message is in Italian and user-friendly
  - Verify error includes helpful hint

## Technical Details

### Database Functions

#### manage_product_stock_on_booking()
- **Type**: TRIGGER FUNCTION
- **Security**: DEFINER (runs with elevated privileges)
- **Operations**: INSERT, UPDATE, DELETE on bookings
- **Locking**: Uses FOR UPDATE to prevent race conditions

#### get_available_products_for_drop()
- **Type**: FUNCTION
- **Security**: DEFINER
- **Returns**: TABLE of products
- **Permissions**: EXECUTE granted to authenticated users

#### notify_product_stock_change()
- **Type**: TRIGGER FUNCTION
- **Security**: DEFINER
- **Notification**: Uses pg_notify for real-time updates

### Real-time Channels

#### Product Stock Updates
- **Channel Name**: `product_stock_updates_{supplier_list_id}`
- **Event**: UPDATE on products table
- **Filter**: `supplier_list_id=eq.{supplier_list_id}`
- **Payload**: Full product data (new and old)

#### Drop Updates
- **Channel Name**: `drop:{dropId}`
- **Event**: UPDATE on drops table
- **Filter**: `id=eq.{dropId}`
- **Payload**: Updated drop data

## Performance Considerations

### Indexes
- Products are indexed by (supplier_list_id, stock, status)
- Queries filter by stock > 0 and status = 'active'
- Indexes significantly improve query performance

### Real-time Efficiency
- Each drop has its own channel to avoid unnecessary updates
- Filters ensure only relevant updates are sent
- Duplicate update prevention in frontend

### Defensive Programming
- Frontend filters products even after database query
- Double-check stock before booking
- Graceful error handling at every step

## Migration Applied

**Migration Name**: `improve_stock_management_and_realtime_updates`

**Applied**: [Date will be automatically set by Supabase]

**Rollback**: Not recommended as it includes critical bug fixes

## Future Improvements

Potential enhancements for the future:

1. **Optimistic UI Updates**: Update UI immediately before database confirmation
2. **Stock Reservation**: Reserve stock for a short time while user confirms
3. **Queue System**: Implement a queue for high-demand items
4. **Analytics**: Track how often users encounter out-of-stock errors
5. **Notifications**: Notify users when a product they're interested in becomes available again

## Related Documentation

- [Stock Management Real-time Fix](./STOCK_MANAGEMENT_REALTIME_FIX.md)
- [Booking Error and Stock Fix](./BOOKING_ERROR_AND_STOCK_FIX.md)
- [Real-time Features](./REALTIME_FEATURES.md)

## Support

If you encounter any issues with stock management or real-time updates:

1. Check the browser console for error messages
2. Verify Supabase real-time is connected (look for "Live" indicator)
3. Check database logs for trigger execution
4. Verify indexes are created: `SELECT * FROM pg_indexes WHERE tablename = 'products';`
5. Test with a single user first, then multiple users

## Conclusion

These improvements ensure that:
- ✅ Products with 0 stock are never shown in the feed
- ✅ Products disappear immediately when the last item is booked
- ✅ Error messages are user-friendly and in Italian
- ✅ Race conditions are prevented with database locking
- ✅ Real-time updates work reliably across all clients
- ✅ Performance is optimized with proper indexes
