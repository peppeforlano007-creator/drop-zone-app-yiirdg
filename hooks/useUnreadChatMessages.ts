import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/app/integrations/supabase/client';

const STORAGE_KEY = 'chat_last_read';

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

  // Load from AsyncStorage and compute on mount / userId change
  useEffect(() => {
    if (!userId) {
      setUnreadByGroup({});
      setTotalUnread(0);
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const lastRead: LastReadMap = raw ? JSON.parse(raw) : {};
        lastReadRef.current = lastRead;
        console.log('[useUnreadChatMessages] Loaded lastRead from AsyncStorage');
        if (isMounted) {
          await computeUnread(lastRead);
        }
      } catch (err) {
        console.warn('[useUnreadChatMessages] AsyncStorage read error:', err);
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
    console.log('[useUnreadChatMessages] Marking group as read:', groupId);

    // Use the server-side timestamp of the latest message to avoid device clock skew
    let serverNow: string;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.created_at) {
        serverNow = data.created_at;
      } else {
        // Fallback: use device time if no messages or error
        serverNow = new Date().toISOString();
      }
    } catch {
      serverNow = new Date().toISOString();
    }

    console.log('[useUnreadChatMessages] Last read timestamp set to:', serverNow);

    const updated: LastReadMap = { ...lastReadRef.current, [groupId]: serverNow };
    lastReadRef.current = updated;

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[useUnreadChatMessages] AsyncStorage write error:', err);
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
