import type { SupabaseClient } from '@supabase/supabase-js';

// The imported generated Database type contains no tables. Keep this small,
// explicitly-shaped read separate until the legacy types can be regenerated.
export async function loadActiveProfilePickup(client: SupabaseClient, userId: string): Promise<string | null> {
  const { data: profile, error } = await client.from('profiles')
    .select('pickup_point_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  const pickupId: string | null = profile?.pickup_point_id ?? null;
  if (!pickupId) return null;
  const { data: point, error: pointError } = await client.from('pickup_points')
    .select('id').eq('id', pickupId).eq('status', 'active').maybeSingle();
  if (pointError) throw pointError;
  return point ? pickupId : null;
}
