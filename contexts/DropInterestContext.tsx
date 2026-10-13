
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DropInterestContextValue {
  isInterested: (dropId: string) => boolean;
  toggleInterest: (dropId: string) => Promise<void>;
  loadInterest: (dropId: string) => Promise<void>;
  isLoading: (dropId: string) => boolean;
}

const DropInterestContext = createContext<DropInterestContextValue | null>(null);

export function DropInterestProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [interests, setInterests] = useState<Record<string, boolean>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const fetchedRef = useRef<Set<string>>(new Set());

  const isInterested = useCallback((dropId: string) => !!interests[dropId], [interests]);
  const isLoading = useCallback((dropId: string) => !!loadingMap[dropId], [loadingMap]);

  const loadInterest = useCallback(async (dropId: string) => {
    if (!user || fetchedRef.current.has(dropId)) return;
    fetchedRef.current.add(dropId);
    console.log('[DropInterestContext] loadInterest — dropId:', dropId, 'userId:', user.id);
    const { data, error } = await supabase
      .from('drop_interests')
      .select('id')
      .eq('drop_id', dropId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.error('[DropInterestContext] loadInterest error:', error.message);
      // Remove from fetched so it can be retried
      fetchedRef.current.delete(dropId);
      return;
    }
    console.log('[DropInterestContext] loadInterest result — dropId:', dropId, 'interested:', !!data);
    setInterests(prev => ({ ...prev, [dropId]: !!data }));
  }, [user]);

  const toggleInterest = useCallback(async (dropId: string) => {
    if (!user) return;
    const current = !!interests[dropId];
    console.log('[DropInterestContext] toggleInterest — dropId:', dropId, 'currentlyInterested:', current);
    // Optimistic update
    setInterests(prev => ({ ...prev, [dropId]: !current }));
    setLoadingMap(prev => ({ ...prev, [dropId]: true }));
    try {
      if (current) {
        const { error } = await supabase
          .from('drop_interests')
          .delete()
          .eq('drop_id', dropId)
          .eq('user_id', user.id);
        if (error) throw error;
        console.log('[DropInterestContext] interest removed — dropId:', dropId);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('pickup_point_id')
          .eq('user_id', user.id)
          .maybeSingle();
        const { error } = await supabase
          .from('drop_interests')
          .insert({
            drop_id: dropId,
            user_id: user.id,
            pickup_point_id: profile?.pickup_point_id ?? null,
          });
        if (error) throw error;
        console.log('[DropInterestContext] interest added — dropId:', dropId, 'pickup_point_id:', profile?.pickup_point_id);
      }
      // Allow re-fetch next time loadInterest is called
      fetchedRef.current.delete(dropId);
    } catch (err: any) {
      // Revert optimistic update on error
      console.error('[DropInterestContext] toggleInterest error:', err?.message);
      setInterests(prev => ({ ...prev, [dropId]: current }));
    } finally {
      setLoadingMap(prev => ({ ...prev, [dropId]: false }));
    }
  }, [user, interests]);

  return (
    <DropInterestContext.Provider value={{ isInterested, toggleInterest, loadInterest, isLoading }}>
      {children}
    </DropInterestContext.Provider>
  );
}

export function useDropInterest() {
  const ctx = useContext(DropInterestContext);
  if (!ctx) throw new Error('useDropInterest must be used within DropInterestProvider');
  return ctx;
}
