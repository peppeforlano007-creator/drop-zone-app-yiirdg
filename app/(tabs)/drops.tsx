
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/app/integrations/supabase/client';
import DropCard from '@/components/DropCard';
import { Stack } from 'expo-router';
import { colors, layout } from '@/styles/commonStyles';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { useRealtimeDrops } from '@/hooks/useRealtimeDrop';

interface Drop {
  id: string;
  name: string;
  current_discount: number;
  current_value: number;
  target_value: number;
  start_time: string;
  end_time: string;
  status: string;
  pickup_points: {
    name: string;
    city: string;
  };
  supplier_lists: {
    name: string;
    min_discount: number;
    max_discount: number;
    min_reservation_value: number;
    max_reservation_value: number;
  };
}

export default function DropsScreen() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const [userPickupPointId, setUserPickupPointId] = useState<string | null>(null);

  const loadDrops = useCallback(async () => {
    try {
      console.log('=== LOADING DROPS ===');
      console.log('Timestamp:', new Date().toISOString());

      // Get user's pickup point
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('pickup_point_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.pickup_point_id) {
          setUserPickupPointId(profile.pickup_point_id);
        }
      }

      // Fetch active, approved, and completed drops
      const { data, error } = await supabase
        .from('drops')
        .select(`
          *,
          pickup_points (
            name,
            city
          ),
          supplier_lists (
            name,
            min_discount,
            max_discount,
            min_reservation_value,
            max_reservation_value
          )
        `)
        .in('status', ['active', 'approved', 'completed'])
        .order('created_at', { ascending: false });

      console.log('[drops] raw statuses returned:', data?.map(d => ({ name: d.name, status: d.status })));

      if (error) {
        console.error('❌ Error loading drops:', error);
        return;
      }

      console.log('✓ Drops loaded:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Drops details:', data.map(d => ({ 
          name: d.name, 
          status: d.status, 
          list: d.supplier_lists?.name,
          end_time: d.end_time
        })));
      }

      // Sort: active first, then approved, then completed
      const statusOrder: Record<string, number> = {
        active: 0,
        approved: 1,
        completed: 2,
      };

      const sorted = (data || []).slice().sort((a, b) => {
        const orderA = statusOrder[a.status] ?? 50;
        const orderB = statusOrder[b.status] ?? 50;
        return orderA - orderB;
      });

      setDrops(sorted);
    } catch (error) {
      console.error('❌ Exception loading drops:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadDrops();
  }, [loadDrops]);

  // Set up real-time subscription for drops updates
  const handleDropUpdate = useCallback((updatedDrop: any) => {
    console.log('Real-time drop update in list:', updatedDrop);
    
    setDrops(prevDrops => {
      const dropIndex = prevDrops.findIndex(d => d.id === updatedDrop.id);
      
      // Only remove drops that are truly gone (expired, cancelled, underfunded)
      // completed drops stay visible in the feed
      const removeStatuses = ['expired', 'cancelled', 'underfunded'];
      if (updatedDrop.status && removeStatuses.includes(updatedDrop.status)) {
        console.log('Drop status changed to', updatedDrop.status, '- removing from list');
        return prevDrops.filter(d => d.id !== updatedDrop.id);
      }
      
      if (dropIndex === -1) {
        // New drop - reload the list
        loadDrops();
        return prevDrops;
      }

      // Update existing drop
      const newDrops = [...prevDrops];
      newDrops[dropIndex] = {
        ...newDrops[dropIndex],
        current_discount: updatedDrop.current_discount,
        current_value: updatedDrop.current_value,
        status: updatedDrop.status,
        updated_at: updatedDrop.updated_at,
      };

      return newDrops;
    });
  }, [loadDrops]);

  // Do NOT filter by pickupPointId — inactive/pending drops may have no pickup point yet
  // and would be missed by the realtime subscription filter.
  const { isConnected } = useRealtimeDrops({
    onUpdate: handleDropUpdate,
    enabled: true,
  });

  const handleRefresh = () => {
    setRefreshing(true);
    loadDrops();
  };

  const activeDrops = drops.filter(d => d.status !== 'completed');
  const completedDrops = drops.filter(d => d.status === 'completed');

  const renderDrop = ({ item }: { item: Drop }) => (
    <DropCard drop={item} />
  );

  const renderCompletedSection = () => {
    if (completedDrops.length === 0) return null;
    return (
      <View style={styles.completedSection}>
        <View style={styles.completedSectionHeader}>
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check_circle"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={styles.completedSectionTitle}>Terminati</Text>
        </View>
        {completedDrops.map(drop => (
          <DropCard key={drop.id} drop={drop} />
        ))}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.infoCard}>
        <IconSymbol 
          ios_icon_name="info.circle.fill" 
          android_material_icon_name="info" 
          size={20} 
          color={colors.primary} 
        />
        <Text style={styles.infoText}>
          I drop sono attivi per città specifiche. Ritiro solo presso il punto indicato.
        </Text>
      </View>

      <View style={styles.discountCard}>
        <View style={styles.discountHeader}>
          <IconSymbol 
            ios_icon_name="chart.line.uptrend.xyaxis" 
            android_material_icon_name="trending_up" 
            size={20} 
            color={colors.success} 
          />
          <Text style={styles.discountTitle}>Più Prenotazioni = Più Sconto</Text>
        </View>
        <Text style={styles.discountText}>
          Più persone prenotano, più lo sconto cresce fino al massimo. Condividi con amici per raggiungere lo sconto massimo più velocemente!
        </Text>
      </View>

      <View style={styles.paymentReminderCard}>
        <IconSymbol 
          ios_icon_name="creditcard.fill" 
          android_material_icon_name="payment" 
          size={20} 
          color={colors.warning} 
        />
        <Text style={styles.paymentReminderText}>
          Al momento del ritiro pagherai l&apos;importo dell&apos;articolo scontato della percentuale di sconto raggiunta a chiusura drop.
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Drop Attivi',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento drops...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Drop Attivi',
          headerShown: true,
        }}
      />

      {isConnected && (
        <View style={styles.realtimeIndicator}>
          <View style={styles.realtimeDot} />
          <Text style={styles.realtimeText}>Aggiornamenti in tempo reale attivi</Text>
        </View>
      )}

      {drops.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol ios_icon_name="tray" android_material_icon_name="inbox" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Nessun drop attivo</Text>
          <Text style={styles.emptyText}>
            I drop appariranno qui quando abbastanza persone della tua città sono interessate ad una lista di articoli. Gioca nella sezione Punti e aumenta la probabilità di attivare un drop nella tua città.
          </Text>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlatList
            data={activeDrops}
            renderItem={renderDrop}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderCompletedSection}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.success + '20',
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 8,
  },
  realtimeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    fontFamily: 'System',
  },
  headerContainer: {
    marginBottom: 20,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    fontFamily: 'System',
  },
  discountCard: {
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  discountTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'System',
  },
  discountText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    fontFamily: 'System',
  },
  paymentReminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  paymentReminderText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    fontFamily: 'System',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: layout.contentPaddingBottom,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    fontFamily: 'System',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
    fontFamily: 'System',
  },
  listWrapper: {
    flex: 1,
  },
  completedSection: {
    marginTop: 8,
  },
  completedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  completedSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: 'System',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
