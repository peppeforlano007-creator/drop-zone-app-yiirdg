
# Admin Settings - Drop Configuration Fix

## Summary

Fixed the admin settings screen to properly save and use the drop duration, minimum drop value, and maximum drop value settings. These settings now work correctly when:

1. **Creating drops manually** - Admin creates a drop from the admin panel
2. **Activating drops automatically** - System creates a drop when user interests reach the minimum value
3. **Importing supplier lists** - Default values are pre-filled when creating a new supplier list

## Changes Made

### 1. Database Settings Storage

All platform settings are now stored in the `app_settings` table:

- `drop_duration_days` - Duration of a drop in days (default: 5)
- `min_drop_value` - Minimum value to activate a drop in euros (default: 5000)
- `max_drop_value` - Maximum value for a drop in euros (default: 30000)
- `platform_commission_rate` - Platform commission percentage (default: 10)
- `whatsapp_support_number` - WhatsApp support number

### 2. Admin Settings Screen (`app/admin/settings.tsx`)

**Updated:**
- Now loads ALL settings from the database on startup
- Saves ALL settings (not just WhatsApp number) when "Salva Impostazioni" is clicked
- Added validation for drop settings:
  - Duration must be between 1-30 days
  - Min/max values must be positive
  - Min value must be less than max value
- Added informative text explaining when these settings are used
- Settings are properly persisted to the database

### 3. Database Function (`check_and_create_drop`)

**Updated:**
- Now reads `drop_duration_days` from `app_settings` table
- Falls back to 5 days if setting is not found
- Automatically applies the configured duration when creating drops based on user interests

**SQL Migration:**
```sql
-- The function now includes:
SELECT COALESCE(
  (SELECT setting_value::INTEGER FROM app_settings WHERE setting_key = 'drop_duration_days'),
  5
) INTO v_drop_duration_days;
```

### 4. Manual Drop Creation (`app/admin/create-drop.tsx`)

**Updated:**
- Loads drop duration from platform settings on screen load
- Uses `getPlatformSettings()` helper function
- Displays the configured duration in the UI
- Creates drops with the configured duration instead of hardcoded 5 days

### 5. Supplier List Creation (`app/admin/create-list.tsx`)

**Updated:**
- Loads platform settings on screen load
- Pre-fills min/max reservation values from platform settings
- Added info box explaining that values come from platform settings
- Users can still override these values for specific lists

### 6. Helper Function (`utils/dropHelpers.ts`)

**Added:**
```typescript
export async function getPlatformSettings(): Promise<{
  dropDurationDays: number;
  minDropValue: number;
  maxDropValue: number;
  platformCommissionRate: number;
}>
```

This function:
- Loads all platform settings from the database
- Returns sensible defaults if settings are not found
- Can be used throughout the app for consistent settings access

## How It Works

### Flow 1: Manual Drop Creation

1. Admin opens "Crea Drop Manuale"
2. Screen loads `drop_duration_days` from `app_settings`
3. Admin selects supplier list and pickup point
4. Drop is created with the configured duration
5. Duration is shown in confirmation message

### Flow 2: Automatic Drop Activation

1. User shows interest in a product
2. Database trigger `check_and_create_drop` is fired
3. Function checks if minimum value threshold is reached
4. If yes, reads `drop_duration_days` from `app_settings`
5. Creates drop with configured duration

### Flow 3: Supplier List Import

1. Admin opens "Crea Nuova Lista"
2. Screen loads platform settings
3. Min/max reservation values are pre-filled
4. Admin can modify these values if needed
5. List is created with the specified values

## Testing

To test the changes:

1. **Go to Admin Settings:**
   - Navigate to Admin → Impostazioni
   - Change "Durata Drop (giorni)" to 7
   - Change "Valore Minimo Drop" to 3000
   - Change "Valore Massimo Drop" to 25000
   - Click "Salva Impostazioni"

2. **Test Manual Drop Creation:**
   - Go to Admin → Crea Drop Manuale
   - Select a supplier list and pickup point
   - Verify the confirmation message shows "durerà 7 giorni"
   - Create the drop
   - Check the drop's end_time is 7 days from now

3. **Test Automatic Drop Creation:**
   - Have users show interest in products from the same list/pickup point
   - When total interest value reaches €3,000 (new minimum)
   - A drop should be automatically created with 7-day duration

4. **Test Supplier List Creation:**
   - Go to Admin → Crea Nuova Lista
   - Verify "Valore Min" shows 3000
   - Verify "Valore Max" shows 25000
   - These can be modified for the specific list

## Database Schema

The `app_settings` table structure:

```sql
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Benefits

1. **Centralized Configuration** - All platform settings in one place
2. **No Code Changes Needed** - Admins can adjust settings without developer intervention
3. **Consistent Behavior** - Same settings used across manual and automatic drop creation
4. **Flexible** - Easy to add new platform settings in the future
5. **User-Friendly** - Clear UI with explanations of what each setting does

## Future Enhancements

Potential improvements:

1. Add setting for automatic drop approval (currently always requires approval)
2. Add setting for drop extension duration
3. Add setting for notification timing (e.g., notify users X hours before drop ends)
4. Add setting for minimum number of users required for a drop
5. Add setting for maximum number of active drops per pickup point
