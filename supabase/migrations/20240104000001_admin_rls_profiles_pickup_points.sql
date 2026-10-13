-- Migration: Add RLS policies for admins to read all profiles and pickup_points
-- This fixes the export-orders screen where profile data (phone, email, etc.)
-- was showing as N/A because the admin could not read other users' profiles.

-- ============================================================================
-- PROFILES: Allow admins to read all profiles (for export)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can read all profiles for export" ON profiles;

CREATE POLICY "Admins can read all profiles for export"
ON profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- ============================================================================
-- PICKUP_POINTS: Allow admins to read all pickup points (for export)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can read all pickup points for export" ON pickup_points;

CREATE POLICY "Admins can read all pickup points for export"
ON pickup_points FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role = 'admin'
  )
);
