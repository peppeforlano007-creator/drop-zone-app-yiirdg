
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface DropUpdate {
  id: string;
  name?: string;
  current_discount: number;
  current_value: number;
  target_value?: number;
  status: string;
  start_time?: string;
  end_time?: string;
  updated_at: string;
}

interface UseRealtimeDropOptions {
  dropId: string;
  onUpdate?: (drop: DropUpdate) => void;
  enabled?: boolean;
}

export function useRealtimeDrop({ dropId, onUpdate, enabled = true }: UseRealtimeDropOptions) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const lastUpdateRef = useRef<string>('');

  const handleDropUpdate = useCallback((payload: any) => {
    console.log('🔄 Drop update received:', payload);
    
    try {
      const dropData = typeof payload === 'string' ? JSON.parse(payload) : payload;
      
      // Create a unique key for this update including all relevant fields
      const updateKey = `${dropData.id}-${dropData.updated_at}-${dropData.current_value}-${dropData.current_discount}`;
      
      // Prevent duplicate updates
      if (lastUpdateRef.current === updateKey) {
        console.log('⏭️ Duplicate update detected, skipping');
        return;
      }
      
      lastUpdateRef.current = updateKey;
      
      console.log('✅ Processing drop update:', {
        id: dropData.id,
        current_discount: dropData.current_discount,
        current_value: dropData.current_value,
        updated_at: dropData.updated_at,
      });
      
      if (onUpdate) {
        onUpdate(dropData);
      }
    } catch (error) {
      console.error('❌ Error parsing drop update:', error);
    }
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled || !dropId) {
      console.log('⏸️ Realtime drop subscription disabled or no dropId');
      return;
    }

    console.log('🚀 Setting up realtime subscription for drop:', dropId);

    // Create a channel for this specific drop
    const dropChannel = supabase.channel(`drop:${dropId}`, {
      config: {
        broadcast: { self: true },
      },
    });

    // Subscribe to postgres changes for this drop
    dropChannel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drops',
          filter: `id=eq.${dropId}`,
        },
        (payload) => {
          console.log('📡 Postgres change received for drop:', dropId, payload);
          if (payload.new) {
            handleDropUpdate(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('📶 Drop channel subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    setChannel(dropChannel);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up realtime subscription for drop:', dropId);
      dropChannel.unsubscribe();
      setChannel(null);
      setIsConnected(false);
      lastUpdateRef.current = '';
    };
  }, [dropId, enabled, handleDropUpdate]);

  return {
    isConnected,
    channel,
  };
}

interface UseRealtimeDropsOptions {
  pickupPointId?: string;
  onUpdate?: (drop: DropUpdate) => void;
  enabled?: boolean;
}

export function useRealtimeDrops({ pickupPointId, onUpdate, enabled = true }: UseRealtimeDropsOptions) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const lastUpdateRef = useRef<Map<string, string>>(new Map());

  const handleDropUpdate = useCallback((payload: any) => {
    console.log('🔄 Drops list update received:', payload);
    
    try {
      const dropData = typeof payload === 'string' ? JSON.parse(payload) : payload;
      
      // Create a unique key for this update
      const updateKey = `${dropData.id}-${dropData.updated_at}-${dropData.current_value}-${dropData.current_discount}`;
      
      // Prevent duplicate updates per drop
      if (lastUpdateRef.current.get(dropData.id) === updateKey) {
        console.log('⏭️ Duplicate update detected for drop:', dropData.id, 'skipping');
        return;
      }
      
      lastUpdateRef.current.set(dropData.id, updateKey);
      
      console.log('✅ Processing drops list update:', {
        id: dropData.id,
        current_discount: dropData.current_discount,
        current_value: dropData.current_value,
        updated_at: dropData.updated_at,
      });
      
      if (onUpdate) {
        onUpdate(dropData);
      }
    } catch (error) {
      console.error('❌ Error parsing drops update:', error);
    }
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled) {
      console.log('⏸️ Realtime drops subscription disabled');
      return;
    }

    console.log('🚀 Setting up realtime subscription for drops');

    // Create a channel for all drops
    const dropsChannel = supabase.channel('drops:all', {
      config: {
        broadcast: { self: true },
      },
    });

    // Subscribe to postgres changes for drops
    const subscription = dropsChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'drops',
        ...(pickupPointId && { filter: `pickup_point_id=eq.${pickupPointId}` }),
      },
      (payload) => {
        console.log('📡 Drops postgres change received:', payload);
        if (payload.new) {
          handleDropUpdate(payload.new);
        }
      }
    );

    subscription.subscribe((status) => {
      console.log('📶 Drops channel subscription status:', status);
      setIsConnected(status === 'SUBSCRIBED');
    });

    setChannel(dropsChannel);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up realtime subscription for drops');
      dropsChannel.unsubscribe();
      setChannel(null);
      setIsConnected(false);
      lastUpdateRef.current.clear();
    };
  }, [pickupPointId, enabled, handleDropUpdate]);

  return {
    isConnected,
    channel,
  };
}
