import type { SupabaseClient } from '@supabase/supabase-js';

export const CHAT_PAGE_SIZE = 50;
export interface ChatCursor { id: string; created_at: string }
export interface RawChatMessage extends ChatCursor {
  group_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  drop_id: string | null;
  product_id: string | null;
}

// Newest first, deterministic even when several messages have the same timestamp.
export function mergeChatMessages<T extends ChatCursor>(existing: T[], incoming: T[]): T[] {
  const unique = new Map(existing.map(message => [message.id, message]));
  for (const message of incoming) unique.set(message.id, message);
  return [...unique.values()].sort((a, b) => {
    const first = a.created_at === b.created_at ? a.id : a.created_at;
    const second = a.created_at === b.created_at ? b.id : b.created_at;
    return first > second ? -1 : first < second ? 1 : 0;
  });
}

export async function fetchChatPage(client: SupabaseClient, groupId: string, before?: ChatCursor): Promise<RawChatMessage[]> {
  let query = client.from('chat_messages')
    .select('id, group_id, sender_id, content, message_type, drop_id, product_id, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(CHAT_PAGE_SIZE);
  if (before) {
    // Both cursor fields originate in the database, not in message text.
    query = query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as RawChatMessage[];
}
