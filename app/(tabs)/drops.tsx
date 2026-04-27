
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/app/integrations/supabase/client';
import DropCard from '@/components/DropCard';
import { Stack, router, useFocusEffect } from 'expo-router';
import { colors, layout } from '@/styles/commonStyles';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Animated,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/IconSymbol';
import { useRealtimeDrops } from '@/hooks/useRealtimeDrop';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOYALTY_ONBOARDING_SEEN_KEY = 'loyalty_onboarding_seen';

interface Drop {
  id: string;
  name: string;
  current_discount: number;
  current_value: number;
  target_value: number;
  start_time: string;
  end_time: string;
  status: string;
  supplier_list_id: string;

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
    delivery_min_days: number | null;
    delivery_max_days: number | null;
    banner_url?: string | null;
  };
}

const INFO_POINTS = [
  {
    emoji: '📍',
    title: 'Solo per città selezionate',
    description: 'I drop sono attivi in città specifiche. Controlla se la tua città è disponibile.',
  },
  {
    emoji: '💰',
    title: 'Più prenotazioni = più sconto',
    description: 'Più persone prenotano, maggiore sarà lo sconto finale per tutti.',
  },
  {
    emoji: '🛍️',
    title: 'Paghi al ritiro',
    description: "Non paghi subito. Al momento del ritiro pagherai l'importo scontato dell'articolo.",
  },
];

function DropsInfoBanner() {
  const [expanded, setExpanded] = useState(false);
  const animProgress = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bannerBg = isDark ? '#1C1C1E' : '#F5F5F7';
  const bannerBorder = isDark ? '#3A3A3C' : '#E0E0E0';
  const titleColor = isDark ? '#ECECEC' : '#1C1C1E';
  const descColor = isDark ? '#AEAEB2' : '#555555';

  const toggle = () => {
    console.log('[DropsInfoBanner] toggled, expanding:', !expanded);
    const toValue = expanded ? 0 : 1;
    Animated.timing(animProgress, {
      toValue,
      duration: 260,
      useNativeDriver: false,
    }).start();
    setExpanded(prev => !prev);
  };

  const chevronRotation = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const panelOpacity = animProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  const panelMaxHeight = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  return (
    <View style={[infoBannerStyles.wrapper, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
      <TouchableOpacity
        style={infoBannerStyles.header}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Come funziona il servizio"
      >
        <Ionicons name="information-circle-outline" size={20} color={isDark ? '#AEAEB2' : '#555555'} />
        <Text style={[infoBannerStyles.headerText, { color: titleColor }]}>Come funziona il servizio?</Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Ionicons name="chevron-down" size={18} color={isDark ? '#AEAEB2' : '#555555'} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={[infoBannerStyles.panel, { opacity: panelOpacity, maxHeight: panelMaxHeight }]}>
        <View style={[infoBannerStyles.divider, { backgroundColor: bannerBorder }]} />
        {INFO_POINTS.map((point, index) => (
          <View key={index} style={infoBannerStyles.infoRow}>
            <Text style={infoBannerStyles.infoEmoji}>{point.emoji}</Text>
            <View style={infoBannerStyles.infoTextBlock}>
              <Text style={[infoBannerStyles.infoTitle, { color: titleColor }]}>{point.title}</Text>
              <Text style={[infoBannerStyles.infoDesc, { color: descColor }]}>{point.description}</Text>
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const infoBannerStyles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  panel: {
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  infoEmoji: {
    fontSize: 20,
    lineHeight: 24,
    marginTop: 1,
  },
  infoTextBlock: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'System',
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'System',
  },
});

export default function DropsScreen() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const [userPickupPointId, setUserPickupPointId] = useState<string | null>(null);

  // Show loyalty onboarding only once
  useFocusEffect(
    useCallback(() => {
      const checkLoyaltyOnboarding = async () => {
        try {
          const seen = await AsyncStorage.getItem(LOYALTY_ONBOARDING_SEEN_KEY);
          if (!seen) {
            console.log('[Drops] Loyalty onboarding not yet seen, showing for first time');
            await AsyncStorage.setItem(LOYALTY_ONBOARDING_SEEN_KEY, 'true');
            router.push('/loyalty-program');
          } else {
            console.log('[Drops] Loyalty onboarding already seen, skipping');
          }
        } catch (err) {
          console.error('[Drops] Error checking loyalty onboarding flag:', err);
        }
      };
      checkLoyaltyOnboarding();
    }, [])
  );

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
          id,
          name,
          current_discount,
          current_value,
          target_value,
          start_time,
          end_time,
          status,
          supplier_list_id,
          created_at,
          updated_at,
          pickup_point_id,
          pickup_points (
            name,
            city
          ),
          supplier_lists (
            name,
            min_discount,
            max_discount,
            min_reservation_value,
            max_reservation_value,
            delivery_min_days,
            delivery_max_days,
            banner_url
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
        const firstCompleted = data.find(d => d.status === 'completed');
        if (firstCompleted) {
          console.log('[drops] first completed drop stats:', {
            id: firstCompleted.id,
            name: firstCompleted.name,
            current_value: firstCompleted.current_value,
            supplier_list_max: firstCompleted.supplier_lists?.max_reservation_value,
          });
        } else {
          console.log('[drops] no completed drops in result set');
        }
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

  const loadDropsRef = useRef<() => void>(loadDrops);
  useEffect(() => {
    loadDropsRef.current = loadDrops;
  }, [loadDrops]);

  useEffect(() => {
    loadDrops();
  }, [loadDrops]);

  // Set up real-time subscription for drops updates
  const handleDropUpdate = useCallback((updatedDrop: any) => {
    console.log('Real-time drop update in list:', updatedDrop);
    
    setDrops(prevDrops => {
      const dropIndex = prevDrops.findIndex(d => d.id === updatedDrop.id);

      // For all terminal statuses, trigger a full reload so joined data
      // (supplier_lists, pickup_points) is preserved and the drop appears
      // in the correct section (e.g. Terminati for completed).
      if (
        updatedDrop.status === 'completed' ||
        updatedDrop.status === 'expired' ||
        updatedDrop.status === 'cancelled' ||
        updatedDrop.status === 'underfunded'
      ) {
        console.log('Drop status changed to', updatedDrop.status, '- triggering full reload');
        loadDropsRef.current();
        return prevDrops;
      }

      if (dropIndex === -1) {
        // New drop - reload the list
        loadDropsRef.current();
        return prevDrops;
      }

      // Update existing drop — preserve all fields, only overwrite what the realtime payload provides
      const newDrops = [...prevDrops];
      newDrops[dropIndex] = {
        ...newDrops[dropIndex],
        ...(updatedDrop.current_discount != null && { current_discount: updatedDrop.current_discount }),
        ...(updatedDrop.current_value != null && { current_value: updatedDrop.current_value }),
        ...(updatedDrop.target_value != null && { target_value: updatedDrop.target_value }),
        ...(updatedDrop.final_discount_percentage != null && { final_discount_percentage: updatedDrop.final_discount_percentage }),
        ...(updatedDrop.status != null && { status: updatedDrop.status }),
        ...(updatedDrop.updated_at != null && { updated_at: updatedDrop.updated_at }),
      };

      return newDrops;
    });
  }, []);

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
    <DropCard
      drop={item}
      deliveryMinDays={item.supplier_lists?.delivery_min_days ?? null}
      deliveryMaxDays={item.supplier_lists?.delivery_max_days ?? null}
    />
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
          <DropCard
            key={drop.id}
            drop={drop}
            deliveryMinDays={drop.supplier_lists?.delivery_min_days ?? null}
            deliveryMaxDays={drop.supplier_lists?.delivery_max_days ?? null}
          />
        ))}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <DropsInfoBanner />
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

      {activeDrops.length === 0 && completedDrops.length === 0 ? (
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
    marginBottom: 4,
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
