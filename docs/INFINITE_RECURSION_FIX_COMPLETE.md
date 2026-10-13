
# Infinite Recursion Fix - Complete Solution

## Problem Summary

The app was experiencing an infinite recursion error (PostgreSQL error code 42P17) when:
1. Opening the app (loading profiles)
2. Attempting to log in
3. Any operation that queried the `profiles` table

Error message: `"infinite recursion detected in policy for relation 'profiles'"`

## Root Cause

The issue was caused by **circular dependencies in Row Level Security (RLS) policies**:

1. The `profiles` table had a policy "Pickup points can view customer profiles" that queried the `order_items` and `orders` tables
2. The `order_items` table had a policy "Pickup points can view order items for their location" that queried the `profiles` table
3. This created an infinite loop: `profiles` → `order_items` → `profiles` → `order_items` → ...

### Why This Happened

When a user tried to load their profile:
1. Supabase evaluated the RLS policy on `profiles`
2. The policy checked `order_items` (which has its own RLS policies)
3. The `order_items` policy checked `profiles` (back to step 1)
4. This created an infinite recursion loop

## Solution

The solution was to **eliminate all circular dependencies** by rewriting RLS policies to use JWT metadata instead of querying other tables.

### Key Changes

1. **Use JWT Metadata for Role Checks**
   - Instead of querying `profiles` table to check user role
   - Read role directly from JWT: `auth.jwt() -> 'app_metadata' ->> 'role'`
   - This is possible because we have a trigger that syncs profile data to JWT metadata

2. **Remove Circular Queries**
   - Policies on `profiles` no longer query `profiles` indirectly through other tables
   - Policies on `order_items` and `orders` use JWT metadata for role checks
   - Each policy is self-contained and doesn't create circular dependencies

3. **Sync Metadata on Profile Changes**
   - The `sync_user_metadata` trigger ensures JWT metadata is always up-to-date
   - When a profile is created or updated, the trigger syncs `role` and `pickup_point_id` to `auth.users.raw_app_meta_data`
   - On next JWT refresh, the user will have the correct metadata

## Migration Applied

Migration name: `fix_infinite_recursion_final`

### What It Does

1. **Drops problematic policies** that created circular dependencies
2. **Creates new JWT-based policies** for:
   - `profiles` table (admin and pickup point access)
   - `order_items` table (admin and pickup point access)
   - `orders` table (admin and pickup point access)
3. **Syncs existing user metadata** to ensure all users have correct JWT data
4. **Adds verification query** to check for potential recursion issues

### Policy Examples

**Before (Caused Recursion):**
```sql
-- This policy queries profiles table, creating circular dependency
CREATE POLICY "Pickup points can view order items for their location" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM orders
      JOIN profiles ON profiles.pickup_point_id = orders.pickup_point_id
      WHERE orders.id = order_items.order_id
        AND profiles.user_id = auth.uid()
        AND profiles.role = 'pickup_point'
    )
  );
```

**After (No Recursion):**
```sql
-- This policy uses JWT metadata, no circular dependency
CREATE POLICY "Pickup points can view order items for their location" ON order_items
  FOR SELECT
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role')::text, '') = 'pickup_point'
    AND
    EXISTS (
      SELECT 1
      FROM orders o
      WHERE o.id = order_items.order_id
        AND o.pickup_point_id = COALESCE(
          (auth.jwt() -> 'app_metadata' ->> 'pickup_point_id')::uuid,
          NULL
        )
    )
  );
```

## How JWT Metadata Works

### 1. User Registration
When a user registers:
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      phone,
      role,
      pickup_point_id: pickupPointId,
    }
  }
});
```

### 2. Profile Creation
The `handle_new_user` trigger:
1. Creates a profile in the `profiles` table
2. **Immediately syncs** role and pickup_point_id to `auth.users.raw_app_meta_data`
3. This ensures the JWT has the correct metadata from the start

### 3. Profile Updates
The `sync_user_metadata` trigger:
1. Fires when `role` or `pickup_point_id` changes in `profiles`
2. Updates `auth.users.raw_app_meta_data` with the new values
3. On next JWT refresh, the user will have updated metadata

### 4. JWT Structure
The JWT now contains:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "app_metadata": {
    "role": "consumer",
    "pickup_point_id": "uuid-here"
  }
}
```

## Testing

### Verify No Recursion
Run this query to check for potential recursion issues:
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%profiles%' AND tablename != 'profiles' THEN 'WARNING: May cause recursion'
    WHEN qual LIKE '%auth.jwt()%' THEN 'OK: Uses JWT metadata'
    ELSE 'OK: No cross-table queries'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'order_items', 'orders')
ORDER BY tablename, policyname;
```

All policies should show "OK" status.

### Test User Login
1. Open the app in Expo Go
2. Try to log in with existing credentials
3. Should load profile without errors
4. Check console logs for "Profile loaded successfully"

### Test Profile Loading
1. Open the app (already logged in)
2. Should load profile immediately
3. No "infinite recursion" errors
4. Check console logs for JWT metadata

## Code Changes

### AuthContext.tsx
- Simplified profile loading logic
- Removed retry mechanisms (no longer needed)
- Removed delays (no longer needed)
- Profile loading is now straightforward and fast

### Database
- All RLS policies now use JWT metadata
- No circular dependencies
- Metadata is automatically synced via triggers

## Benefits

1. **No More Infinite Recursion** - Circular dependencies eliminated
2. **Faster Profile Loading** - No retries or delays needed
3. **Better Performance** - JWT metadata is cached, no database queries for role checks
4. **Simpler Code** - AuthContext is cleaner and easier to maintain
5. **More Reliable** - No race conditions or timing issues

## Maintenance

### Adding New Policies
When adding new RLS policies:
1. **Always use JWT metadata** for role checks: `auth.jwt() -> 'app_metadata' ->> 'role'`
2. **Never query profiles table** from other table policies
3. **Test for recursion** using the verification query above

### Adding New Roles
When adding new user roles:
1. Update the `profiles` table role check constraint
2. Ensure the `sync_user_metadata` trigger syncs the new role
3. Add RLS policies using JWT metadata for the new role

### Debugging
If you encounter RLS issues:
1. Check JWT metadata: `SELECT auth.jwt() -> 'app_metadata';`
2. Verify metadata sync: `SELECT raw_app_meta_data FROM auth.users WHERE id = 'user-id';`
3. Check for circular dependencies using the verification query
4. Review policy definitions: `SELECT * FROM pg_policies WHERE tablename = 'table_name';`

## Related Files

- `contexts/AuthContext.tsx` - Authentication context with profile loading
- `app/login.tsx` - Login screen
- `app/integrations/supabase/migrations/fix_infinite_recursion_final.sql` - Migration file
- Database triggers:
  - `handle_new_user` - Creates profile and syncs metadata on user creation
  - `sync_user_metadata` - Syncs metadata when profile changes
  - `auto_link_pickup_point_user` - Links pickup point users to their pickup point

## Conclusion

The infinite recursion issue has been **completely resolved** by:
1. Eliminating circular dependencies in RLS policies
2. Using JWT metadata instead of database queries for role checks
3. Ensuring metadata is always synced via database triggers

The app should now work correctly for all user roles (consumer, pickup_point, admin) without any recursion errors.
