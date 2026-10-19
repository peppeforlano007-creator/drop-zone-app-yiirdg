import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface BroadcastPayload {
  title: string;
  message: string;
  type: 'general' | 'drop_activated' | 'drop_ending';
  role: 'consumer' | 'supplier' | 'pickup_point' | null;
  pickup_point_id?: string;
  related_id?: string;
  related_type?: 'drop';
}
export interface BroadcastResult {
  recipients: number;
  batches: number;
  reused: boolean;
}
export interface BroadcastRecipient { user_id: string; push_token: string | null }

// Deterministic keyset paging continues even when a server returns fewer than
// the requested 1000 rows. No assumption about the configured response cap.
export async function loadBroadcastRecipients(client: SupabaseClient, payload: BroadcastPayload): Promise<BroadcastRecipient[]> {
  const recipients: BroadcastRecipient[] = [];
  let cursor: string | undefined;
  while (true) {
    let query = client.from('profiles').select('user_id, push_token')
      .order('user_id', { ascending: true }).limit(1000);
    if (payload.role) query = query.eq('role', payload.role);
    if (payload.pickup_point_id) query = query.eq('pickup_point_id', payload.pickup_point_id);
    if (cursor) query = query.gt('user_id', cursor);
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as BroadcastRecipient[];
    if (!page.length) break;
    const nextCursor = page[page.length - 1].user_id;
    if (cursor && nextCursor <= cursor) throw new Error('Paginazione destinatari interrotta');
    recipients.push(...page);
    cursor = nextCursor;
  }
  return recipients;
}

export async function sendInAppBroadcast(client: SupabaseClient, payload: BroadcastPayload): Promise<BroadcastResult> {
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Accedi come amministratore per inviare notifiche');
  const storageKey = `admin-broadcast-pending:${user.id}`;
  const fingerprint = JSON.stringify(payload);
  const stored = await AsyncStorage.getItem(storageKey);
  const previous = stored ? JSON.parse(stored) as { fingerprint: string; key: string } : null;
  const key = previous?.fingerprint === fingerprint ? previous.key
    : `broadcast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // Keep the request key after network errors: retrying the same message is safe.
  await AsyncStorage.setItem(storageKey, JSON.stringify({ fingerprint, key }));
  const { data, error } = await client.rpc('send_admin_notification_broadcast', {
    p_request_key: key, p_payload: payload,
  });
  if (error) throw error;
  const result = data as BroadcastResult;
  if (!result || !Number.isInteger(result.recipients) || !Number.isInteger(result.batches)) {
    throw new Error('Risultato invio non verificabile. Riprova con lo stesso messaggio.');
  }
  // Local cleanup errors must not turn a committed broadcast into a reported failure.
  try { await AsyncStorage.removeItem(storageKey); } catch { /* retry remains idempotent */ }
  return result;
}
