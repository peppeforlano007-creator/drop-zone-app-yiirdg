
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

      // First, run the lifecycle processor to update drop statuses
      await supabase.rpc('process_drop_lifecycle');

      // Only show active and approved drops (not expired, completed, or underfunded)
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
        .in('status', ['active', 'approved'])
        .gt('end_time', new Date().toISOString()) // Only show drops that haven't expired yet
        .order('created_at', { ascending: false });

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
      setDrops(data || []);
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
      
      // If drop status changed to expired/completed/underfunded, remove it from the list
      if (updatedDrop.status && !['active', 'approved'].includes(updatedDrop.status)) {
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
          <Text style={styles.infoTitle}>Come funzionano i Drop</Text>
          <Text style={styles.infoText}>
            I drop sono attivi per città specifiche. Gli articoli potranno essere ritirati solo presso il punto di ritiro della città indicata.
          </Text>
        </View>
      </View>

      <View style={styles.discountExplanationCard}>
        <View style={styles.discountExplanationHeader}>
          <IconSymbol 
            ios_icon_name="chart.line.uptrend.xyaxis" 
            android_material_icon_name="trending_up" 
            size={28} 
            color={colors.success} 
          />
          <Text style={styles.discountExplanationTitle}>Più Prenotazioni = Più Sconto!</Text>
        </View>
        
        <View style={styles.discountExplanationContent}>
          <View style={styles.discountStep}>
            <View style={styles.discountStepNumber}>
              <Text style={styles.discountStepNumberText}>1</Text>
            </View>
            <Text style={styles.discountStepText}>
              Più persone prenotano articoli dal drop, più il valore totale ordinato cresce
            </Text>
          </View>

          <View style={styles.discountStep}>
            <View style={styles.discountStepNumber}>
              <Text style={styles.discountStepNumberText}>2</Text>
            </View>
            <Text style={styles.discountStepText}>
              Man mano che il valore cresce, lo sconto aumenta automaticamente per tutti
            </Text>
          </View>

          <View style={styles.discountStep}>
            <View style={styles.discountStepNumber}>
              <Text style={styles.discountStepNumberText}>3</Text>
            </View>
            <Text style={styles.discountStepText}>
              Lo sconto continua a crescere fino alla percentuale massima del drop
            </Text>
          </View>
        </View>

        <View style={styles.shareCallToAction}>
          <IconSymbol 
            ios_icon_name="person.3.fill" 
            android_material_icon_name="group" 
            size={20} 
            color={colors.primary} 
          />
          <Text style={styles.shareCallToActionText}>
            Condividi con amici e parenti per raggiungere lo sconto massimo più velocemente!
          </Text>
        </View>

        <View style={styles.shareButtonsInfo}>
          <IconSymbol 
            ios_icon_name="square.and.arrow.up.fill" 
            android_material_icon_name="share" 
            size={16} 
            color={colors.textSecondary} 
          />
          <Text style={styles.shareButtonsInfoText}>
            Ogni drop ha il tasto "Condividi" per invitare altri a partecipare
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
          contentContainerStyle={[
            styles.listContent,
            Platform.OS !== 'ios' && styles.listContentWithTabBar,
          ]}
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
    marginBottom: 20,
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
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'System',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontFamily: 'System',
    marginBottom: 8,
  },
  infoHighlight: {
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.primary + '10',
    padding: 8,
    borderRadius: 8,
  },
  discountExplanationCard: {
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  discountExplanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  discountExplanationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'System',
    flex: 1,
  },
  discountExplanationContent: {
    gap: 12,
    marginBottom: 16,
  },
  discountStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  discountStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountStepNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: 'System',
  },
  discountStepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontFamily: 'System',
  },
  shareCallToAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  shareCallToActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'System',
    lineHeight: 20,
  },
  shareButtonsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  shareButtonsInfoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'System',
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  listContentWithTabBar: {
    paddingBottom: 120,
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
    fontFamily: 'System',
  },
});
