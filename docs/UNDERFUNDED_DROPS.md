
# Underfunded Drops Feature

## Overview

This feature handles the scenario where a drop doesn't reach the supplier's minimum order value (`min_reservation_value`) by the time it expires. When this happens, the system automatically:

1. Marks the drop as `underfunded`
2. Releases all blocked funds on users' credit cards
3. Notifies users about the situation
4. Encourages users to share future drops with friends and family

## Database Changes

### New Drop Status

Added `underfunded` status to the `drops` table status enum:

- **pending_approval**: Waiting for admin approval
- **approved**: Approved but not yet active
- **active**: Currently running
- **inactive**: Manually deactivated
- **completed**: Finished successfully
- **expired**: Time ran out
- **cancelled**: Cancelled by admin
- **underfunded**: Did not reach minimum order value ⭐ NEW

### New Column

- `underfunded_notified_at`: Timestamp when users were notified about the underfunded status

## Database Functions

### `check_underfunded_drops()`

Automatically checks for active drops that have expired and marks them as `underfunded` if they didn't reach the minimum reservation value.

**Usage:**
```sql
SELECT check_underfunded_drops();
```

This should be called:
- Periodically (e.g., every hour via a cron job)
- When viewing the admin drop management screen
- When checking drop status

### `release_underfunded_drop_funds(drop_id_param uuid)`

Releases funds for all bookings in an underfunded drop and returns user information for notifications.

**Returns:**
- `booking_id`: UUID of the booking
- `user_id`: UUID of the user
- `product_id`: UUID of the product
- `authorized_amount`: Amount that was blocked
- `user_email`: User's email for notifications

**Usage:**
```sql
SELECT * FROM release_underfunded_drop_funds('drop-uuid-here');
```

## Edge Function

### `handle-underfunded-drops`

Processes an underfunded drop by:
1. Verifying the drop status
2. Releasing all blocked funds
3. Updating booking statuses to `refunded` and `cancelled`
4. Marking the drop as notified
5. Returning information for user notifications

**Endpoint:**
```
POST /functions/v1/handle-underfunded-drops
```

**Request Body:**
```json
{
  "dropId": "uuid-of-underfunded-drop"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Funds released and users notified",
  "refundedBookings": 5,
  "notificationMessage": "Il drop \"Drop Name\" non ha raggiunto l'ordine minimo..."
}
```

## Utility Functions

### `utils/dropHelpers.ts`

#### `checkUnderfundedDrops()`

Checks for underfunded drops and returns statistics.

**Returns:**
```typescript
{
  success: boolean;
  underfundedCount: number;
  error?: string;
}
```

#### `processUnderfundedDrop(dropId: string)`

Processes a specific underfunded drop by calling the edge function.

**Returns:**
```typescript
{
  success: boolean;
  refundedBookings: number;
  error?: string;
}
```

#### `getUnderfundedDropStats()`

Gets statistics about underfunded drops.

**Returns:**
```typescript
{
  total: number;
  notified: number;
  pending: number;
  totalRefundedAmount: number;
}
```

## UI Changes

### Admin - Manage Drops Screen

**New Features:**
- Filter for "Non Finanziati" (Underfunded) drops
- Warning banner showing underfunded status and progress
- "Rilascia Fondi" (Release Funds) button for unprocessed underfunded drops
- Visual indicator when funds have been released and users notified

**Workflow:**
1. Admin views drops and sees underfunded drops highlighted
2. Admin clicks "Rilascia Fondi" button
3. System releases all blocked funds and notifies users
4. Drop is marked as processed with timestamp

### User - My Bookings Screen

**New Features:**
- Warning banner for bookings in underfunded drops
- Clear message explaining the situation
- Visual indication that funds have been released
- Strikethrough on refunded amounts

**User Experience:**
- Users see their booking status change to "Rimborsato" (Refunded)
- Clear explanation that the drop didn't reach minimum order
- Encouragement to share future drops

### Drop Details Screen

**New Features:**
- Real-time warning when drop is at risk of being underfunded
- Shows progress toward minimum order value
- Urgent call-to-action to share with friends
- Enhanced sharing message when drop is at risk

**Risk Detection:**
- Shows warning when less than 24 hours remain
- AND current value is below minimum reservation value
- Progress bar showing percentage of minimum order reached

## User Notifications

When a drop is marked as underfunded, users receive:

### Notification Message (Italian)
```
Il drop "[Drop Name]" non ha raggiunto l'ordine minimo di €[min_value].
Abbiamo raccolto solo €[current_value].
L'importo bloccato sulla tua carta è stato rilasciato.
Condividi il prossimo drop con amici e parenti per raggiungere l'obiettivo!
```

### Notification Channels (To Be Implemented)
1. **Push Notifications**: Via Expo Push Notifications
2. **Email**: Via SendGrid, AWS SES, or similar
3. **In-App**: Via notifications table/screen

## Payment Flow

### Normal Drop Flow
1. User books product → Funds authorized (blocked)
2. Drop ends successfully → Funds captured (charged)
3. User receives product

### Underfunded Drop Flow
1. User books product → Funds authorized (blocked)
2. Drop expires without reaching minimum → Marked as underfunded
3. Admin processes underfunded drop → Funds released (authorization cancelled)
4. Users notified → No charge occurs

## Testing

### Manual Testing Steps

1. **Create a test drop with low minimum value**
   ```sql
   -- Set a low minimum value for testing
   UPDATE supplier_lists 
   SET min_reservation_value = 100 
   WHERE id = 'your-list-id';
   ```

2. **Create bookings below minimum**
   - Book products totaling less than minimum value
   - Wait for drop to expire (or manually set end_time to past)

3. **Check for underfunded drops**
   ```sql
   SELECT check_underfunded_drops();
   ```

4. **Verify drop status**
   ```sql
   SELECT id, name, status, current_value, underfunded_notified_at
   FROM drops
   WHERE status = 'underfunded';
   ```

5. **Process underfunded drop**
   - Go to Admin → Manage Drops
   - Filter by "Non Finanziati"
   - Click "Rilascia Fondi"

6. **Verify bookings updated**
   ```sql
   SELECT id, payment_status, status
   FROM bookings
   WHERE drop_id = 'underfunded-drop-id';
   ```

### Automated Testing

Add tests in `utils/dropTestHelpers.ts`:

```typescript
export async function testUnderfundedDropFlow(): Promise<TestResult> {
  // 1. Create drop with low minimum
  // 2. Create bookings below minimum
  // 3. Expire the drop
  // 4. Check underfunded status
  // 5. Process underfunded drop
  // 6. Verify funds released
  // 7. Verify users notified
}
```

## Production Considerations

### Automated Processing

Set up a cron job or scheduled task to:
1. Check for underfunded drops every hour
2. Automatically process them (or notify admins)

**Example using Supabase Edge Functions + Cron:**
```typescript
// Create a scheduled edge function
Deno.cron("check-underfunded-drops", "0 * * * *", async () => {
  // Check and process underfunded drops
  await checkUnderfundedDrops();
});
```

### Payment Integration

When integrating with real payment providers (Stripe, etc.):

1. **Authorization**: Use `capture_method: 'manual'` when creating PaymentIntent
2. **Release**: Cancel the PaymentIntent instead of capturing it
3. **Webhooks**: Listen for payment status updates

### Notification Integration

Implement actual notification sending:

1. **Push Notifications**:
   ```typescript
   import * as Notifications from 'expo-notifications';
   
   await Notifications.scheduleNotificationAsync({
     content: {
       title: 'Drop Non Finanziato',
       body: notificationMessage,
     },
     trigger: null,
   });
   ```

2. **Email**:
   ```typescript
   // Using SendGrid, AWS SES, or similar
   await sendEmail({
     to: userEmail,
     subject: 'Drop Non Finanziato - Fondi Rilasciati',
     body: notificationMessage,
   });
   ```

3. **In-App Notifications**:
   ```sql
   INSERT INTO notifications (user_id, type, title, message)
   VALUES (user_id, 'underfunded_drop', 'Drop Non Finanziato', message);
   ```

## Security Considerations

### RLS Policies

The database functions use `SECURITY DEFINER` to bypass RLS, but:
- Only admins can call the edge function (verified via JWT)
- Functions only update bookings for the specific drop
- No user data is exposed without proper authorization

### Edge Function Security

- Requires valid JWT token (user must be authenticated)
- Should add admin role check in production
- Validates drop status before processing

## Future Enhancements

1. **Partial Fulfillment**: Allow drops to proceed if they reach a certain percentage (e.g., 80%) of minimum
2. **Extension Period**: Give users 24 hours to reach minimum before cancelling
3. **Automatic Sharing**: Suggest users to share when drop is at risk
4. **Supplier Notification**: Notify suppliers when their drops are underfunded
5. **Analytics**: Track underfunded drop patterns to optimize minimum values

## Troubleshooting

### Drop not marked as underfunded

**Check:**
1. Is the drop status 'active'?
2. Has the end_time passed?
3. Is current_value < min_reservation_value?
4. Run `check_underfunded_drops()` manually

### Funds not released

**Check:**
1. Is the drop status 'underfunded'?
2. Are bookings in 'authorized' payment status?
3. Check edge function logs for errors
4. Verify Supabase service role key is set

### Users not notified

**Check:**
1. Is `underfunded_notified_at` set?
2. Check edge function response
3. Implement actual notification sending (currently logged only)

## Support

For issues or questions:
1. Check the logs in Supabase Dashboard → Edge Functions
2. Review the drop status and booking statuses in the database
3. Test with the utility functions in `utils/dropHelpers.ts`
