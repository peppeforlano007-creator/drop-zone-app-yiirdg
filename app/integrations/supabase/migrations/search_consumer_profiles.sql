
-- Migration: Add search_consumer_profiles RPC function
-- This function runs with SECURITY DEFINER to bypass RLS on the profiles table,
-- allowing authenticated users to search for other consumer profiles by name or phone.
-- Without this, the default RLS policy (user_id = auth.uid()) blocks cross-user reads
-- and causes the Supabase query to hang indefinitely.

CREATE OR REPLACE FUNCTION search_consumer_profiles(
  p_query TEXT,
  p_exclude_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    p.phone
  FROM profiles p
  WHERE
    p.role = 'consumer'
    AND p.user_id <> p_exclude_user_id
    AND (
      p.full_name ILIKE '%' || p_query || '%'
      OR p.phone ILIKE '%' || p_query || '%'
    )
  ORDER BY p.full_name ASC NULLS LAST
  LIMIT 20;
END;
$$;

-- Only authenticated users can call this function
GRANT EXECUTE ON FUNCTION search_consumer_profiles(TEXT, UUID) TO authenticated;
-- Revoke from anon to prevent unauthenticated searches
REVOKE EXECUTE ON FUNCTION search_consumer_profiles(TEXT, UUID) FROM anon;
