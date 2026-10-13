
# RLS Infinite Recursion Fix - Complete Resolution

## Problem Summary

The app was experiencing infinite recursion errors when:
1. Opening the app (loading profiles)
2. Attempting to login (8 errors during authentication)
3. Loading WhatsApp number from app_settings

Error message: `code: 42P17, message: infinite recursion detected in policy for relation "profile"`

## Root Cause

The infinite recursion was caused by circular dependencies in Row Level Security (RLS) policies:

1. **Profiles Table RLS Policies** called `is_admin()` function
2. **is_admin() Function** queried the `profiles` table to check user role
3. This created a circular dependency: `profiles RLS → is_admin() → profiles query → profiles RLS → ...`

Even though `is_admin()` was marked as `SECURITY DEFINER` (which should bypass RLS), the function was written in **PL/pgSQL** which doesn't fully optimize the security context, leading to recursion.

## Solution Implemented

### 1. Converted Helper Functions to SQL

Changed all helper functions from PL/pgSQL to pure SQL with `STABLE` and `SECURITY DEFINER`:

```sql
-- Before (PL/pgSQL)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- After (SQL with STABLE)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;
```

**Key improvements:**
- `LANGUAGE sql` - Pure SQL functions are more efficient and better optimized
- `STABLE` - Function result can be cached within a transaction (performance boost)
- `SECURITY DEFINER` - Bypasses RLS policies when executing
- `SET search_path` - Prevents SQL injection attacks

### 2. Simplified RLS Policies

Restructured RLS policies to minimize function calls and use direct `auth.uid()` checks where possible:

```sql
-- User can view their own profile (no function call needed)
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO public
USING (user_id = auth.uid());

-- Admin can view all profiles (safe because is_admin() uses SECURITY DEFINER + STABLE)
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO public
USING (is_admin());
```

### 3. Updated All Helper Functions

Applied the same fix to all helper functions:
- `is_admin()` - Check if user is admin
- `is_pickup_point()` - Check if user is pickup point
- `get_user_pickup_point_id()` - Get pickup point ID for user

### 4. Fixed App Settings Policies

Simplified app_settings policies to allow public read access:

```sql
-- Anyone can read app settings (no authentication needed)
CREATE POLICY "Anyone can read app settings"
ON app_settings FOR SELECT
TO public
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert app settings"
ON app_settings FOR INSERT
TO public
WITH CHECK (is_admin());
```

## Why This Fix Works

1. **STABLE Functions**: The `STABLE` keyword tells PostgreSQL that the function result won't change within a transaction, allowing it to cache the result. This means `is_admin()` is only executed once per transaction, not for every row.

2. **SECURITY DEFINER**: This ensures the function executes with the privileges of the function owner (who has full access), completely bypassing RLS policies.

3. **SQL vs PL/pgSQL**: Pure SQL functions are better optimized by PostgreSQL's query planner and have better integration with the security context.

4. **Direct auth.uid() Checks**: Where possible, we use direct `auth.uid()` comparisons instead of function calls, which is the most efficient approach.

## Testing

After applying the migration, the following queries work without recursion errors:

```sql
-- Test profile access
SELECT COUNT(*) FROM profiles;

-- Test app_settings access
SELECT setting_key, setting_value FROM app_settings;

-- Test admin check
SELECT is_admin();

-- Test pickup point check
SELECT is_pickup_point();
```

## Migration Applied

Migration name: `fix_infinite_recursion_comprehensive`

This migration:
1. Drops old helper functions
2. Creates new SQL-based STABLE functions
3. Drops and recreates all RLS policies on profiles table
4. Updates app_settings policies
5. Grants execute permissions on helper functions

## Expected Results

After this fix:
- ✅ App opens without errors
- ✅ Login works without recursion errors
- ✅ Profile loading is fast and error-free
- ✅ WhatsApp number loads correctly
- ✅ Admin functions work properly
- ✅ Pickup point functions work properly

## Performance Benefits

The new implementation also provides performance improvements:
- Function results are cached within transactions (STABLE)
- Reduced database queries due to caching
- Better query plan optimization by PostgreSQL
- Faster authentication and profile loading

## Security

The fix maintains all security requirements:
- RLS policies are still enforced
- Users can only see their own data (unless admin)
- Admins have full access
- Pickup points can only see relevant customer profiles
- SQL injection is prevented with `SET search_path`

## Future Recommendations

1. **Monitor Performance**: Keep an eye on query performance, especially for admin operations
2. **Add Indexes**: Consider adding indexes on `profiles.role` and `profiles.user_id` if not already present
3. **Regular Testing**: Test authentication flow regularly to catch any regressions
4. **Documentation**: Keep this document updated if RLS policies change

## Related Files

- Migration: `app/integrations/supabase/migrations/fix_infinite_recursion_comprehensive.sql`
- Auth Context: `contexts/AuthContext.tsx`
- Supabase Client: `app/integrations/supabase/client.ts`
