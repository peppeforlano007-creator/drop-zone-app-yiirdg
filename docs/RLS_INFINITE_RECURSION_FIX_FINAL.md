
# RLS Infinite Recursion Fix - Final Solution

## Problem Summary

The application was experiencing infinite recursion errors when accessing the `profiles` table:

```
Error: code: 42P17
message: infinite recursion detected in policy for relation "profile"
```

This error occurred in multiple places:
- When loading profiles on app startup
- When attempting to log in
- When loading WhatsApp settings
- When accessing any feature that required role-based authorization

## Root Cause

The infinite recursion was caused by a circular dependency in the RLS (Row Level Security) policies:

1. **Helper functions** (`is_admin()`, `is_pickup_point()`, `get_user_pickup_point_id()`) queried the `profiles` table
2. **RLS policies on the `profiles` table** called these helper functions
3. **When the helper functions tried to query `profiles`**, the RLS policies were triggered again
4. **This created an infinite loop** → recursion error

### Example of the Problem

```sql
-- Helper function (OLD - PROBLEMATIC)
CREATE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles  -- ← Queries profiles table
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- RLS Policy (OLD - PROBLEMATIC)
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (
  is_admin()  -- ← Calls function that queries profiles
);
```

When a user tried to query `profiles`:
1. RLS policy checks `is_admin()`
2. `is_admin()` queries `profiles` table
3. RLS policy checks `is_admin()` again
4. **INFINITE RECURSION** 💥

## Solution

The solution completely eliminates the circular dependency by using JWT metadata instead of querying the `profiles` table:

### 1. Store Role Information in JWT

Instead of querying the `profiles` table, we store role information in `auth.users.raw_app_meta_data`, which is included in the JWT token and doesn't have RLS restrictions.

### 2. Updated Helper Functions

```sql
-- NEW - Uses JWT metadata (NO recursion)
CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'auth', 'public', 'pg_temp'
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin',
    false
  );
$$;

CREATE FUNCTION public.is_pickup_point()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'auth', 'public', 'pg_temp'
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'pickup_point',
    false
  );
$$;

CREATE FUNCTION public.get_user_pickup_point_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'auth', 'public', 'pg_temp'
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'pickup_point_id')::uuid,
    NULL
  );
$$;
```

### 3. Automatic Metadata Sync

A trigger automatically syncs profile data to JWT metadata:

```sql
CREATE FUNCTION public.sync_user_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', NEW.role,
      'pickup_point_id', NEW.pickup_point_id
    )
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_user_metadata_trigger
AFTER INSERT OR UPDATE OF role, pickup_point_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_metadata();
```

### 4. Updated RLS Policies

All RLS policies now use JWT-based checks:

```sql
-- Example: Admin policy (NEW - NO recursion)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin',
    false
  )
);

-- Example: User's own profile (NEW - NO recursion)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO public
USING (user_id = auth.uid());

-- Example: Pickup point policy (NEW - NO recursion)
CREATE POLICY "Pickup points can view customer profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'pickup_point',
    false
  )
  AND EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.user_id = profiles.user_id
    AND o.pickup_point_id = COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'pickup_point_id')::uuid,
      NULL
    )
  )
);
```

## Key Benefits

1. **No Circular Dependencies**: Helper functions don't query `profiles` table
2. **Better Performance**: JWT metadata is cached and doesn't require database queries
3. **Consistent Authorization**: All policies use the same JWT-based approach
4. **Automatic Sync**: Triggers ensure metadata is always up-to-date
5. **Security**: `SECURITY DEFINER` functions bypass RLS when needed

## Migrations Applied

1. **`fix_infinite_recursion_final`**: 
   - Dropped old helper functions
   - Created new JWT-based helper functions
   - Created metadata sync trigger
   - Updated all `profiles` RLS policies
   - Synced existing user data to JWT metadata

2. **`update_handle_new_user_sync_metadata`**:
   - Updated user creation function to sync metadata immediately
   - Ensures new users have correct JWT metadata from the start

3. **`cleanup_duplicate_policies`**:
   - Removed duplicate policies
   - Ensured consistency across all tables
   - Updated other tables to use JWT-based checks

## Testing

### Verify Helper Functions Work

```sql
-- Should return false (not authenticated)
SELECT 
    public.is_admin() as is_admin_result,
    public.is_pickup_point() as is_pickup_point_result,
    public.get_user_pickup_point_id() as pickup_point_id_result;
```

### Verify Metadata Sync

```sql
-- Check that all users have synced metadata
SELECT 
    u.id,
    u.email,
    p.role as profile_role,
    u.raw_app_meta_data->>'role' as metadata_role,
    CASE 
        WHEN p.role = u.raw_app_meta_data->>'role' THEN 'OK'
        ELSE 'MISMATCH'
    END as sync_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id;
```

### Verify RLS Policies

```sql
-- Check all profiles policies use JWT
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.jwt()%' OR qual LIKE '%auth.uid()%' THEN 'JWT-based ✓'
        WHEN qual LIKE '%is_admin()%' OR qual LIKE '%is_pickup_point()%' THEN 'Uses helper (may recurse)'
        WHEN qual LIKE '%FROM profiles%' THEN 'Queries profiles (will recurse)'
        ELSE 'Unknown'
    END as check_type
FROM pg_policies
WHERE tablename = 'profiles';
```

## Application Changes

No application code changes are required! The fix is entirely at the database level:

- Helper functions still exist with the same names
- They return the same results
- But they use JWT metadata instead of querying the database

## Important Notes

1. **JWT Refresh**: When a user's role changes, they need to refresh their session to get the updated JWT with new metadata. This happens automatically on next login.

2. **Existing Sessions**: Users with active sessions will continue to use their old JWT until it expires or they log out and back in.

3. **Metadata Sync**: The trigger ensures that any profile updates automatically sync to JWT metadata, but the user needs to refresh their session to see the changes.

4. **Security**: The `SECURITY DEFINER` attribute on helper functions allows them to bypass RLS, which is safe because they only read JWT metadata, not database tables.

## Troubleshooting

### If you still see recursion errors:

1. **Check if metadata is synced**:
   ```sql
   SELECT u.email, p.role, u.raw_app_meta_data->>'role' as jwt_role
   FROM auth.users u
   JOIN profiles p ON p.user_id = u.id
   WHERE u.raw_app_meta_data->>'role' IS NULL;
   ```

2. **Manually sync metadata**:
   ```sql
   UPDATE auth.users u
   SET raw_app_meta_data = 
     COALESCE(u.raw_app_meta_data, '{}'::jsonb) || 
     jsonb_build_object(
       'role', p.role,
       'pickup_point_id', p.pickup_point_id
     )
   FROM public.profiles p
   WHERE u.id = p.user_id;
   ```

3. **Check for old policies**:
   ```sql
   SELECT tablename, policyname, qual
   FROM pg_policies
   WHERE qual LIKE '%FROM profiles%'
   OR qual LIKE '%FROM public.profiles%';
   ```

## Conclusion

This fix completely eliminates the infinite recursion issue by breaking the circular dependency between RLS policies and helper functions. The solution is robust, performant, and maintains the same security guarantees as before.

**Status**: ✅ **RESOLVED**

All infinite recursion errors should now be eliminated. Users can log in, view profiles, and access all features without encountering the 42P17 error.
