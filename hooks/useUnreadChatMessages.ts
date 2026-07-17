import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/app/integrations/supabase/client';

// Key is user-specific to prevent cross-user contamination on shared devices
const storageKey = (userId: string) => `chat_last_read_${userId}`;

type LastReadMap = Record<string, string>; // groupId -> ISO timestamp

export function useUnreadChatMessages(userId: string | undefined) {
  const [unreadByGroup, setUnreadByGroup] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastReadRef = useRef<LastReadMap>({});

  const computeUnread = useCallback(async (lastRead: LastReadMap) => {
    if (!userId) return;

    console.log('[useUnreadChatMessages] Computing unread counts for user:', userId);

    try {
      // Get all groups the user belongs to
      const { data: memberRows, error: memberErr } = await supabase
        .from('chat_groups')
        .select('id, chat_group_members!inner(user_id)')
        .eq('chat_group_members.user_id', userId);

      if (memberErr) {
        console.error('[useUnreadChatMessages] Error fetching groups:', memberErr);
        return;
      }

      if (!memberRows || memberRows.length === 0) {
        console.log('[useUnreadChatMessages] No groups found');
        setUnreadByGroup({});
        setTotalUnread(0);
        return;
      }

      const groupIds = memberRows.map((r: any) => r.id as string);
      console.log('[useUnreadChatMessages] Groups to check:', groupIds.length);

      const counts: Record<string, number> = {};

      await Promise.all(
        groupIds.map(async (groupId) => {
          const lastReadTs = lastRead[groupId];

          let query = supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .neq('sender_id', userId);

          if (lastReadTs) {
            // lastReadTs is already +1ms past the last read message, so gt is correct
            query = query.gt('created_at', lastReadTs);
          }

          const { count, error } = await query;

          if (error) {
            console.warn('[useUnreadChatMessages] Error counting for group', groupId, error);
            counts[groupId] = 0;
          } else {
            counts[groupId] = Math.min(count ?? 0, 99);
          }
        })
      );

      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      console.log('[useUnreadChatMessages] Unread counts computed, total:', total);
      setUnreadByGroup(counts);
      setTotalUnread(Math.min(total, 99));
    } catch (err) {
      console.error('[useUnreadChatMessages] Exception computing unread:', err);
    }
  }, [userId]);

  // Load from AsyncStorage + Supabase and compute on mount / userId change
  useEffect(() => {
    if (!userId) {
      setUnreadByGroup({});
      setTotalUnread(0);
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        // Load from user-specific AsyncStorage key
        const raw = await AsyncStorage.getItem(storageKey(userId));
        const localLastRead: LastReadMap = raw ? JSON.parse(raw) : {};
        console.log('[useUnreadChatMessages] Loaded lastRead from AsyncStorage for user:', userId);

        // Also load from Supabase chat_read_receipts for cross-device persistence
        const { data: receipts, error: receiptsErr } = await supabase
          .from('chat_read_receipts')
          .select('group_id, last_read_at')
          .eq('user_id', userId);

        if (receiptsErr) {
          console.warn('[useUnreadChatMessages] Error loading receipts from Supabase:', receiptsErr);
        }

        // Merge: take the more recent timestamp for each group
        const merged: LastReadMap = { ...localLastRead };
        if (receipts) {
          for (const row of receipts) {
            const existing = merged[row.group_id];
            if (!existing || row.last_read_at > existing) {
              merged[row.group_id] = row.last_read_at;
            }
          }
        }

        lastReadRef.current = merged;
        console.log('[useUnreadChatMessages] Merged lastRead from local + remote, groups:', Object.keys(merged).length);

        if (isMounted) {
          await computeUnread(merged);
        }
      } catch (err) {
        console.warn('[useUnreadChatMessages] Init error:', err);
        if (isMounted) {
          await computeUnread({});
        }
      }
    };

    init();

    // Cleanup old channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `unread-chat-${userId}-${Date.now()}`;
    console.log('[useUnreadChatMessages] Subscribing to realtime channel:', channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          console.log('[useUnreadChatMessages] Realtime INSERT received, msg id:', payload.new?.id);
          if (isMounted) {
            computeUnread(lastReadRef.current);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        console.log('[useUnreadChatMessages] Cleanup: removing channel', channelName);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, computeUnread]);

  const markGroupAsRead = useCallback(async (groupId: string) => {
    if (!userId) return;
    console.log('[useUnreadChatMessages] Marking group as read:', groupId, 'for user:', userId);

    // Use the server-side timestamp of the latest message to avoid device clock skew.
    // Add 1ms so that `gt(created_at, threshold)` strictly excludes the last read message.
    let threshold: string;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.created_at) {
        // +1ms ensures the saved timestamp is strictly after the last message,
        // so gt('created_at', threshold) will never re-count it
        threshold = new Date(new Date(data.created_at).getTime() + 1).toISOString();
      } else {
        threshold = new Date(new Date().getTime() + 1).toISOString();
      }
    } catch {
      threshold = new Date(new Date().getTime() + 1).toISOString();
    }

    console.log('[useUnreadChatMessages] Last read threshold set to:', threshold);

    const updated: LastReadMap = { ...lastReadRef.current, [groupId]: threshold };
    lastReadRef.current = updated;

    // Persist to user-specific AsyncStorage key
    try {
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(updated));
      console.log('[useUnreadChatMessages] Saved to AsyncStorage key:', storageKey(userId));
    } catch (err) {
      console.warn('[useUnreadChatMessages] AsyncStorage write error:', err);
    }

    // Persist to Supabase for cross-device sync
    try {
      const { error: upsertErr } = await supabase
        .from('chat_read_receipts')
        .upsert(
          { user_id: userId, group_id: groupId, last_read_at: threshold },
          { onConflict: 'user_id,group_id' }
        );
      if (upsertErr) {
        console.warn('[useUnreadChatMessages] Supabase upsert error:', upsertErr);
      } else {
        console.log('[useUnreadChatMessages] Upserted read receipt to Supabase for group:', groupId);
      }
    } catch (err) {
      console.warn('[useUnreadChatMessages] Supabase upsert exception:', err);
    }

    setUnreadByGroup((prev) => {
      const next = { ...prev, [groupId]: 0 };
      const total = Object.values(next).reduce((sum, n) => sum + n, 0);
      setTotalUnread(Math.min(total, 99));
      return next;
    });
  }, [userId]);

  return { unreadByGroup, totalUnread, markGroupAsRead };
}
