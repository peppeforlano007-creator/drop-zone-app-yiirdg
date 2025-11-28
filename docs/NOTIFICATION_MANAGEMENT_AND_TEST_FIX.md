
# Notification Management System & Drop Test Fix

## Overview
This document describes the implementation of the notification management system and the fix for the drop status transition test error.

## Changes Made

### 1. Database Migration - Notification Flows Table

Created a new table `notification_flows` to manage automatic notification configurations:

**Table Structure:**
- `id`: UUID primary key
- `name`: Flow name
- `description`: Flow description
- `trigger_type`: Type of event that triggers the notification
  - `drop_activated`
  - `drop_ending_soon`
  - `drop_completed`
  - `order_ready`
  - `order_shipped`
  - `payment_captured`
  - `discount_increased`
  - `new_product_added`
- `target_audience`: Who receives the notification
  - `all`: All users
  - `consumers`: Only consumers
  - `suppliers`: Only suppliers
  - `pickup_points`: Only pickup point managers
- `filter_config`: JSONB field for additional filtering
- `notification_title`: Title of the notification
- `notification_message`: Message content
- `is_active`: Whether the flow is active
- `created_at`, `updated_at`: Timestamps
- `created_by`: Admin who created the flow

**RLS Policies:**
- Only admins can view, create, update, and delete notification flows
- Uses JWT metadata to check admin role

**Default Flows:**
Five default notification flows are pre-configured:
1. Drop Attivato
2. Drop in Scadenza
3. Drop Completato
4. Ordine Pronto
5. Sconto Aumentato

### 2. Notification Management Screen

**File:** `app/admin/manage-notifications.tsx`

**Features:**

#### A. View All Notification Flows
- Displays all configured automatic notification flows
- Shows flow name, description, trigger type, and target audience
- Displays the notification title and message preview
- Toggle switch to enable/disable flows
- Delete button to remove flows

#### B. Create New Notification Flow
- Form to create custom notification flows
- Fields:
  - Name (required)
  - Description (optional)
  - Trigger Type (required) - select from predefined triggers
  - Target Audience (required) - all, consumers, suppliers, pickup_points
  - Notification Title (required)
  - Notification Message (required)
- Validation for required fields
- Success/error feedback with haptics

#### C. Send Mass Notifications
- Send custom notifications to filtered audiences
- **Filters:**
  - **Tutti**: All users in the system
  - **Solo Utenti**: Only consumer users
  - **Per Punto Ritiro**: Users associated with a specific pickup point
    - Sub-filter: Select specific pickup point
    - Example: "All users with Andria as their pickup point"
- Fields:
  - Title (required, max 100 chars)
  - Message (required, max 300 chars)
  - Audience selection with visual chips
  - Pickup point selection (horizontal scrollable list)
- Preview of notification before sending
- Confirmation dialog with recipient count
- Success feedback with number of users notified

**UI/UX Features:**
- Clean, modern interface with card-based layout
- Color-coded action buttons
- Haptic feedback for all interactions
- Loading states and error handling
- Empty state when no flows exist
- Horizontal scrollable chips for trigger types and pickup points
- Toggle switches for enabling/disabling flows
- Badge indicators for active/inactive states

### 3. Drop Test Helpers Fix

**File:** `utils/dropTestHelpers.ts`

**Problem:**
The test functions `testDropDiscountCalculation()` and `testDropStatusTransitions()` were being called without a `dropId` parameter, causing the error:
```
Failed to fetch drop: invalid input syntax for type uuid: "undefined"
```

**Solution:**
Made the `dropId` parameter optional for both functions. When not provided:
1. The function queries the database for an existing drop
2. Uses the first available drop for testing
3. Returns a helpful error message if no drops exist

**Updated Functions:**

#### `testDropDiscountCalculation(dropId?: string)`
- Now accepts optional dropId
- If not provided, fetches first active or completed drop
- Returns clear error message if no drops found
- Includes drop name in test results for better clarity

#### `testDropStatusTransitions(dropId?: string)`
- Now accepts optional dropId
- If not provided, fetches first available drop
- Returns comprehensive transition rules documentation
- Shows current status and allowed transitions
- Includes detailed explanation of each transition type

**Test Results Include:**
- Drop ID and name
- Current status
- Allowed transitions from current state
- Complete transition rules documentation
- Helpful hints if no drops exist

### 4. Admin Dashboard Update

**File:** `app/admin/dashboard.tsx`

**Changes:**
Added two new quick action cards:
1. **Gestisci Notifiche**
   - Icon: bell.badge.fill / notifications_active
   - Color: #FF2D55 (pink)
   - Route: `/admin/manage-notifications`
   - Description: "Flussi e notifiche massive"

2. Moved existing "Invia Notifiche" card to be adjacent to the new card

**Layout:**
The quick actions grid now includes 10 cards arranged in a responsive grid layout.

## Usage Guide

### For Admins - Managing Notification Flows

1. **Access the Screen:**
   - Navigate to Admin Dashboard
   - Tap "Gestisci Notifiche"

2. **View Existing Flows:**
   - All configured flows are displayed in cards
   - Each card shows:
     - Flow name and description
     - Trigger type badge
     - Target audience badge
     - Notification preview
     - Active/inactive toggle
     - Delete button

3. **Create New Flow:**
   - Tap "Nuovo Flusso" button
   - Fill in the form:
     - Enter flow name
     - Add description (optional)
     - Select trigger type from chips
     - Choose target audience
     - Write notification title
     - Write notification message
   - Tap "Crea Flusso"

4. **Send Mass Notification:**
   - Tap "Notifica Massiva" button
   - Enter notification title and message
   - Select audience:
     - **Tutti**: Sends to all users
     - **Solo Utenti**: Sends only to consumers
     - **Per Punto Ritiro**: Sends to users of selected pickup point
   - If "Per Punto Ritiro" selected, choose pickup point from list
   - Tap "Invia"
   - Confirm in dialog
   - System shows how many users received the notification

5. **Enable/Disable Flows:**
   - Use the toggle switch on each flow card
   - Disabled flows won't trigger automatic notifications

6. **Delete Flows:**
   - Tap "Elimina" button on flow card
   - Confirm deletion in dialog

### For Developers - Testing Drop Functionality

1. **Access Testing Screen:**
   - Navigate to Admin Dashboard
   - Tap "Testing"

2. **Run Drop Status Transition Test:**
   - Scroll to "Test Individuali" section
   - Tap "Test Transizioni Stato Drop"
   - Test now runs successfully without requiring a dropId
   - Results show:
     - Current drop status
     - Allowed transitions
     - Complete transition rules

3. **Run Drop Discount Calculation Test:**
   - Tap "Test Calcolo Sconti Drop"
   - Test automatically finds an active drop
   - Results show discount calculation accuracy

## Technical Details

### Database Queries

**Fetch Notification Flows:**
```typescript
const { data, error } = await supabase
  .from('notification_flows')
  .select('*')
  .order('created_at', { ascending: false });
```

**Send Mass Notification:**
```typescript
// Get target users
let query = supabase.from('profiles').select('user_id, email, full_name, role, pickup_point_id');

if (massAudience === 'users') {
  query = query.eq('role', 'consumer');
} else if (massAudience === 'pickup_points' && selectedPickupPoint) {
  query = query.eq('pickup_point_id', selectedPickupPoint).eq('role', 'consumer');
}

const { data: users } = await query;

// Create notifications
const notifications = users.map(user => ({
  user_id: user.user_id,
  title: massTitle,
  message: massMessage,
  type: 'general',
  read: false,
}));

await supabase.from('notifications').insert(notifications);
```

### Security

- All notification flow operations require admin role
- RLS policies enforce admin-only access
- JWT metadata used for role checking (no infinite recursion)
- Input validation on all forms
- Confirmation dialogs for destructive actions

### Performance

- Indexed columns: `trigger_type`, `is_active`
- Efficient queries with proper filtering
- Batch insert for mass notifications
- Optimistic UI updates where possible

## Future Enhancements

Potential improvements for future iterations:

1. **Advanced Filtering:**
   - Filter by user registration date
   - Filter by user activity level
   - Filter by booking history
   - Combine multiple filters

2. **Scheduled Notifications:**
   - Schedule notifications for future delivery
   - Recurring notifications
   - Time zone support

3. **Notification Templates:**
   - Rich text formatting
   - Image attachments
   - Deep links to specific screens
   - Personalization variables (user name, etc.)

4. **Analytics:**
   - Track notification delivery rates
   - Monitor open rates
   - A/B testing for notification content
   - User engagement metrics

5. **Notification History:**
   - View all sent notifications
   - Resend previous notifications
   - Export notification logs

6. **Multi-language Support:**
   - Translate notifications automatically
   - Language-specific templates
   - User language preferences

## Testing Checklist

- [x] Create notification flow
- [x] View all notification flows
- [x] Enable/disable notification flows
- [x] Delete notification flows
- [x] Send mass notification to all users
- [x] Send mass notification to consumers only
- [x] Send mass notification to specific pickup point users
- [x] Verify notifications are created in database
- [x] Test drop status transition without dropId
- [x] Test drop discount calculation without dropId
- [x] Verify admin dashboard shows new menu items
- [x] Test form validation
- [x] Test error handling
- [x] Test haptic feedback
- [x] Test loading states

## Conclusion

The notification management system provides admins with powerful tools to:
- Configure automatic notification flows
- Send targeted mass notifications
- Filter recipients by role and pickup point
- Manage notification content centrally

The drop test fix ensures that testing can proceed smoothly without requiring manual dropId input, making the testing process more user-friendly and robust.
