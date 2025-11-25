
# Fix RLS Policies and Manual Drop Creation

## Issues Addressed

### 1. RLS Policy Error (42501)
**Problem**: Users receive error code 42501 when trying to express interest in products ("vorrò partecipare al drop").

**Error Message**: 
```
Errore impossibile aggiungere l'interesse 
codice: 42501 
messaggio: new row violates row-level security policy for table "drops"
```

**Root Cause**: The Row-Level Security (RLS) policies on the `user_interests` and `drops` tables were too restrictive, preventing users from inserting their interests.

### 2. Missing Manual Drop Creation
**Problem**: Admin panel was missing the ability to manually create drops by selecting a supplier list.

**Solution**: Enhanced the create-drop screen with proper supplier list selection and improved UI.

## Changes Made

### 1. Database Migration
A new migration file has been created: `app/integrations/supabase/migrations/fix_rls_policies_and_manual_drops.sql`

This migration:
- Fixes RLS policies on `user_interests` table to allow users to insert their own interests
- Fixes RLS policies on `drops` table to allow automatic drop creation and admin management
- Adds missing columns to `drops` table for tracking lifecycle events
- Creates/updates the `check_and_create_drops()` function for automatic drop creation
- Creates a trigger to automatically check for drop creation when interests are added
- Adds performance indexes
- Grants necessary permissions

### 2. Updated Admin Screens

#### `app/admin/create-drop.tsx`
- Enhanced UI with better visual feedback
- Added icons for better UX
- Improved error handling and logging
- Shows supplier names alongside list names
- Better empty states when no lists or pickup points exist
- Displays detailed information about selected lists

#### `app/admin/manage-drops.tsx`
- Added "Crea Drop Manuale" button at the top
- Improved layout and navigation
- Better empty state with call-to-action

## How to Apply the Fix

### Step 1: Apply the Database Migration

You need to apply the SQL migration to your Supabase database. You have two options:

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `sippdylyuzejudmzbwdn`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `app/integrations/supabase/migrations/fix_rls_policies_and_manual_drops.sql`
6. Paste it into the SQL editor
7. Click **Run** to execute the migration
8. Verify that all statements executed successfully (check for any error messages)

#### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref sippdylyuzejudmzbwdn

# Apply the migration
supabase db push
```

### Step 2: Verify the Fix

After applying the migration, test the following:

#### Test 1: User Interest Creation
1. Log in as a regular user (not admin)
2. Navigate to the home feed
3. Try clicking "vorrò partecipare al drop" on a product
4. **Expected Result**: Interest should be added successfully without error 42501

#### Test 2: Manual Drop Creation
1. Log in as an admin user
2. Navigate to **Admin** → **Gestisci Drop**
3. Click the **"Crea Drop Manuale"** button at the top
4. Select a supplier list
5. Select a pickup point
6. Click **"Crea Drop"**
7. **Expected Result**: Drop should be created successfully with status "Approvato"

#### Test 3: Automatic Drop Creation
1. Have multiple users express interest in products from the same supplier list and pickup point
2. When the total value of interests reaches the minimum reservation value
3. **Expected Result**: A drop should be automatically created with status "pending_approval"

### Step 3: Monitor for Issues

After applying the fix, monitor your application logs for:

- Any remaining RLS policy errors
- Successful interest creation logs
- Automatic drop creation logs
- Manual drop creation logs

## Technical Details

### RLS Policies Created/Updated

#### user_interests Table
- `Users can view their own interests` - SELECT policy
- `Users can insert their own interests` - INSERT policy (KEY FIX)
- `Users can delete their own interests` - DELETE policy
- `Admins can view all interests` - SELECT policy for admins

#### drops Table
- `Anyone can view active drops` - SELECT policy for active/approved drops
- `Users can view drops for their pickup point` - SELECT policy
- `Admins can view all drops` - SELECT policy for admins
- `Admins can insert drops` - INSERT policy for manual creation
- `Admins can update drops` - UPDATE policy
- `Admins can delete drops` - DELETE policy
- `System can create drops` - INSERT policy for automatic creation

### New Columns Added to drops Table
- `approved_at` - Timestamp when drop was approved
- `approved_by` - User ID who approved the drop
- `activated_at` - Timestamp when drop was activated
- `deactivated_at` - Timestamp when drop was deactivated
- `underfunded_notified_at` - Timestamp when users were notified about underfunded drop
- `cancelled_at` - Timestamp when drop was cancelled
- `cancelled_by` - User ID who cancelled the drop
- `cancellation_reason` - Reason for cancellation

### Functions Created/Updated
- `check_and_create_drops()` - Checks conditions and creates drops automatically
- `trigger_check_drops()` - Trigger function called after interest insertion

### Indexes Added
Performance indexes on:
- `user_interests`: user_id, product_id, supplier_list_id, pickup_point_id
- `drops`: status, supplier_list_id, pickup_point_id, end_time

## Troubleshooting

### If you still get error 42501:

1. **Verify RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('user_interests', 'drops');
   ```
   Both should show `rowsecurity = true`

2. **Check policies exist**:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('user_interests', 'drops');
   ```
   You should see all the policies listed above

3. **Verify permissions**:
   ```sql
   SELECT grantee, privilege_type 
   FROM information_schema.role_table_grants 
   WHERE table_name IN ('user_interests', 'drops');
   ```
   `authenticated` role should have SELECT, INSERT, DELETE on user_interests

### If automatic drop creation doesn't work:

1. **Test the function manually**:
   ```sql
   SELECT check_and_create_drops();
   ```

2. **Check trigger exists**:
   ```sql
   SELECT * FROM pg_trigger 
   WHERE tgname = 'after_interest_insert_check_drops';
   ```

3. **Check function logs**:
   Look for NOTICE messages in your Supabase logs when interests are added

## Additional Notes

- The migration is idempotent - it can be run multiple times safely
- All existing data is preserved
- The migration uses `IF NOT EXISTS` and `IF EXISTS` clauses to prevent errors
- SECURITY DEFINER functions are used to bypass RLS when needed for system operations

## Support

If you encounter any issues after applying this fix:

1. Check the Supabase logs for detailed error messages
2. Verify all migration statements executed successfully
3. Test with a fresh user account (not admin) to isolate permission issues
4. Check that your user profile has a valid `pickup_point_id` set

## Summary

This fix resolves the RLS policy error that prevented users from expressing interest in products and implements the manual drop creation feature for administrators. The migration ensures proper security while allowing necessary operations to function correctly.
