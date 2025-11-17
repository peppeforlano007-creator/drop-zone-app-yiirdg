
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/app/integrations/supabase/client';
import DropCard from '@/components/DropCard';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
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
      console.log('Loading drops...');

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
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading drops:', error);
        return;
      }

      console.log('Drops loaded:', data?.length);
      setDrops(data || []);
    } catch (error) {
      console.error('Error in loadDrops:', error);
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

  const { isConnected } = useRealtimeDrops({
    pickupPointId: userPickupPointId || undefined,
    onUpdate: handleDropUpdate,
    enabled: true,
  });

  const handleRefresh = () => {
    setRefreshing(true);
    loadDrops();
  };

  const renderDrop = ({ item }: { item: Drop }) => (
    <DropCard drop={item} />
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.infoCard}>
        <View style={styles.infoIconContainer}>
          <IconSymbol 
            ios_icon_name="info.circle.fill" 
            android_material_icon_name="info" 
            size={24} 
            color={colors.primary} 
          />
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>
            I drop sono attivi per città specifiche. Gli articoli potranno essere ritirati solo presso il punto di ritiro della città indicata. 
            Lo sconto attuale è quello visualizzato, ma aumenta man mano che condividi con amici e parenti e più persone prenotano con carta, 
            fino a raggiungere lo sconto massimo del drop.
          </Text>
        </View>
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
            I drop appariranno qui quando raggiungeranno il valore minimo di prenotazioni
          </Text>
        </View>
      ) : (
        <FlatList
          data={drops}
          renderItem={renderDrop}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
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
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontFamily: 'System',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    fontFamily: 'System',
  },
});
