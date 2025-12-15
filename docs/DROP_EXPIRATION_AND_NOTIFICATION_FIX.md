
# Drop Expiration and Notification System Fix

## Issues Identified

### 1. **Expired Drop Still Accepting Bookings**
- **Problem**: Drop with `end_time` of 2025-12-13 was still marked as "active" on 2025-12-15
- **Root Cause**: No automatic process to expire drops when their `end_time` passes
- **Impact**: Users could still book items on expired drops

### 2. **Missing Orders for Pickup Points**
- **Problem**: 27 bookings existed but no orders were created for the pickup point
- **Root Cause**: Drop was never properly completed, so the `handle_drop_completion` trigger never fired
- **Impact**: Pickup points couldn't see orders ready for pickup

### 3. **Missing User Notifications**
- **Problem**: Users never received notifications about drop completion or order status
- **Root Cause**: Notifications are only sent when drop status changes to "completed", which never happened
- **Impact**: Users didn't know their orders were being processed

## Solutions Implemented

### 1. **Drop Lifecycle Management**

Created comprehensive drop lifecycle functions:

#### `expire_old_drops()`
- Automatically marks drops as "expired" when `end_time` has passed
- Updates drop status from "active" or "approved" to "expired"

#### `process_drop_lifecycle()`
- Main orchestrator function that:
  1. Expires old drops
  2. Checks expired drops against minimum reservation value
  3. Completes drops that reached minimum value
  4. Marks underfunded drops and cancels their bookings
  5. Sends appropriate notifications to users

#### `complete_drop(p_drop_id)`
- Manual function for admins to complete a drop
- Validates drop status and minimum value before completing

### 2. **Booking Prevention on Closed Drops**

Created trigger `prevent_booking_on_closed_drops()`:
- Checks drop status before allowing new bookings
- Prevents bookings if:
  - Drop status is not "active" or "approved"
  - Drop `end_time` has passed
- Returns clear error messages to users

### 3. **Enhanced Drop Completion**

Updated `handle_drop_completion()` function:
- Now works with both COD (`payment_status = 'pending'`) and card payments (`payment_status = 'captured'`)
- Creates orders with all booking items
- Marks bookings as "confirmed"
- Sends notifications to all users with bookings

### 4. **UI Updates**

#### Drops List Screen (`app/(tabs)/drops.tsx`)
- Calls `process_drop_lifecycle()` on load to update drop statuses
- Only shows drops with status "active" or "approved"
- Filters out drops where `end_time` has passed
- Removes expired drops from list via real-time updates

#### Drop Details Screen (`app/drop-details.tsx`)
- Checks if drop is expired on load
- Shows "Drop Terminato" message for expired/completed drops
- Prevents booking attempts on expired drops
- Handles real-time status changes and redirects users if drop closes

## Database Changes

### New Functions
1. `expire_old_drops()` - Marks old drops as expired
2. `prevent_booking_on_closed_drops()` - Trigger function to prevent bookings
3. `complete_drop(uuid)` - Manual drop completion for admins
4. `process_drop_lifecycle()` - Main lifecycle processor

### New Trigger
- `check_drop_status_before_booking` - Runs before INSERT on bookings table

### Updated Functions
- `handle_drop_completion()` - Now supports COD payments and sends notifications

## How It Works Now

### Automatic Drop Processing

1. **When user opens Drops screen**:
   - `process_drop_lifecycle()` is called
   - Old drops are expired
   - Expired drops are evaluated:
     - If value >= minimum → marked as "completed" → orders created → notifications sent
     - If value < minimum → marked as "underfunded" → bookings cancelled → notifications sent

2. **When user tries to book**:
   - Trigger checks drop status and end_time
   - If drop is closed or expired → booking rejected with clear error message
   - If drop is active → booking proceeds normally

3. **When drop is completed**:
   - Orders are created automatically
   - Order items are created from bookings
   - Bookings are marked as "confirmed"
   - Users receive "Drop Completato" notification
   - Pickup points can see orders in their dashboard

### Manual Drop Completion (Admin)

Admins can manually complete a drop using:
```sql
SELECT complete_drop('drop-uuid-here');
```

This is useful for:
- Testing
- Manually closing drops early
- Fixing drops that didn't auto-complete

## Notification Flow

### Drop Completed
- **Trigger**: Drop status changes to "completed"
- **Recipients**: All users with confirmed bookings
- **Message**: "Il drop [name] è stato completato. Il tuo ordine è stato inviato al fornitore..."

### Drop Underfunded
- **Trigger**: Drop expires without reaching minimum value
- **Recipients**: All users with active bookings
- **Message**: "Il drop [name] non ha raggiunto il valore minimo ed è stato annullato..."

### Order Ready for Pickup
- **Trigger**: Pickup point marks order as "ready_for_pickup"
- **Recipients**: All users with items in that order
- **Message**: "Il tuo ordine [number] è arrivato ed è pronto per il ritiro..."

## Testing the Fix

### Test Scenario 1: Expired Drop
1. Create a drop with `end_time` in the past
2. Open Drops screen
3. **Expected**: Drop should be marked as expired and not shown in list

### Test Scenario 2: Booking on Expired Drop
1. Try to book an item on an expired drop
2. **Expected**: Error message "Impossibile prenotare: il drop è terminato"

### Test Scenario 3: Drop Completion
1. Create a drop with bookings that reach minimum value
2. Let drop expire or manually complete it
3. **Expected**: 
   - Orders created
   - Bookings marked as confirmed
   - Users receive notifications
   - Pickup point sees orders

### Test Scenario 4: Underfunded Drop
1. Create a drop with bookings below minimum value
2. Let drop expire
3. **Expected**:
   - Drop marked as underfunded
   - Bookings cancelled
   - Users receive cancellation notifications

## Migration Applied

The migration `fix_drop_expiration_and_completion` has been applied and includes:
- All new functions
- Updated trigger
- Automatic execution of `process_drop_lifecycle()` to fix existing drops

## Next Steps

### Recommended: Set Up Scheduled Job

For production, set up a cron job or scheduled task to run `process_drop_lifecycle()` periodically:

```sql
-- Run every hour
SELECT cron.schedule(
  'process-drop-lifecycle',
  '0 * * * *',
  $$SELECT process_drop_lifecycle();$$
);
```

This ensures drops are automatically processed even if users don't open the app.

### Monitoring

Monitor these metrics:
- Number of expired drops per day
- Number of completed vs underfunded drops
- Average time between drop expiration and completion
- User notification delivery rate

## Summary

The fix addresses all three issues:

1. ✅ **Expired drops are now properly marked** and don't accept new bookings
2. ✅ **Orders are created automatically** when drops complete
3. ✅ **Users receive notifications** at each stage of the drop lifecycle

The system now has a complete drop lifecycle management system that handles expiration, completion, and notifications automatically.
