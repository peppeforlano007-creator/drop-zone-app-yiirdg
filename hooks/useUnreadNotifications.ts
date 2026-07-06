import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUnreadNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    const loadCount = async () => {
      try {
        console.log('[useUnreadNotifications] Loading unread count for user:', user.id);
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);
        if (isMounted) setUnreadCount(count || 0);
      } catch (e) {
        console.warn('[useUnreadNotifications] loadCount error:', e);
      }
    };

    loadCount();

    // Remove any existing channel before creating a new one
    if (channelRef.current) {
      console.log('[useUnreadNotifications] Removing existing channel before creating new one');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Use a unique channel name with timestamp to avoid conflicts
    const channelName = `unread-notifications-${user.id}-${Date.now()}`;
    console.log('[useUnreadNotifications] Subscribing to channel:', channelName);
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[useUnreadNotifications] Realtime change detected, reloading count');
          loadCount();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        console.log('[useUnreadNotifications] Cleanup: removing channel', channelName);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  return unreadCount;
}
