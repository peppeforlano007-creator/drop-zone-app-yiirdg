
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';

interface PickupPointData {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  commission_rate: number;
  consumer_info?: string;
}

interface Stats {
  activeOrders: number;
  pendingPickups: number;
  completedToday: number;
  totalEarnings: number;
  activeDrops: number;
  totalBookings: number;
}

export default function PickupPointDashboardScreen() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pickupPoint, setPickupPoint] = useState<PickupPointData | null>(null);
  const [stats, setStats] = useState<Stats>({
    activeOrders: 0,
    pendingPickups: 0,
    completedToday: 0,
    totalEarnings: 0,
    activeDrops: 0,
    totalBookings: 0,
  });

  const loadDashboardData = useCallback(async () => {
    if (!user?.pickupPointId) {
      console.error('No pickup point ID found for user:', user?.email);
      Alert.alert(
        'Errore',
        'No pickup point ID found. Contatta l\'amministratore per assistenza.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]
      );
      setLoading(false);
      return;
    }

    try {
      console.log('Loading dashboard data for pickup point:', user.pickupPointId);

      // Load pickup point data
      const { data: ppData, error: ppError } = await supabase
        .from('pickup_points')
        .select('*')
        .eq('id', user.pickupPointId)
        .single();

      if (ppError) {
        console.error('Error loading pickup point:', ppError);
        Alert.alert('Errore', 'Impossibile caricare i dati del punto di ritiro');
      } else {
        console.log('Pickup point loaded:', ppData?.name);
        setPickupPoint(ppData);
      }

      // Load active orders count
      const { count: activeCount, error: activeError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('pickup_point_id', user.pickupPointId)
        .in('status', ['pending', 'confirmed', 'in_transit', 'arrived', 'ready_for_pickup']);

      if (activeError) {
        console.error('Error loading active orders:', activeError);
      } else {
        console.log('Active orders count:', activeCount);
      }

      // Load pending pickups - first get order IDs for this pickup point
      const { data: orderIds, error: orderIdsError } = await supabase
        .from('orders')
        .select('id')
        .eq('pickup_point_id', user.pickupPointId);

      let pendingCount = 0;
      if (orderIdsError) {
        console.error('Error loading order IDs:', orderIdsError);
      } else if (orderIds && orderIds.length > 0) {
        const ids = orderIds.map(o => o.id);
        const { count, error: pendingError } = await supabase
          .from('order_items')
          .select('*', { count: 'exact', head: true })
          .eq('pickup_status', 'ready')
          .in('order_id', ids);

        if (pendingError) {
          console.error('Error loading pending pickups:', pendingError);
        } else {
          pendingCount = count || 0;
          console.log('Pending pickups count:', pendingCount);
        }
      }

      // Load completed today - first get order IDs, then query order_items
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let completedCount = 0;
      if (orderIds && orderIds.length > 0) {
        const ids = orderIds.map(o => o.id);
        const { count, error: completedError } = await supabase
          .from('order_items')
          .select('*', { count: 'exact', head: true })
          .eq('pickup_status', 'picked_up')
          .gte('picked_up_at', today.toISOString())
          .in('order_id', ids);

        if (completedError) {
          console.error('Error loading completed pickups:', completedError);
        } else {
          completedCount = count || 0;
          console.log('Completed today count:', completedCount);
        }
      }

      // Load total earnings from completed orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('commission_amount')
        .eq('pickup_point_id', user.pickupPointId)
        .eq('status', 'completed');

      let totalEarnings = 0;
      if (ordersError) {
        console.error('Error loading earnings:', ordersError);
      } else {
        totalEarnings = ordersData?.reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0) || 0;
        console.log('Total earnings:', totalEarnings);
      }

      // Load active drops count for this pickup point
      const { count: dropsCount, error: dropsError } = await supabase
        .from('drops')
        .select('*', { count: 'exact', head: true })
        .eq('pickup_point_id', user.pickupPointId)
        .eq('status', 'active');

      if (dropsError) {
        console.error('Error loading active drops:', dropsError);
      } else {
        console.log('Active drops count:', dropsCount);
      }

      // Load total bookings for this pickup point
      const { count: bookingsCount, error: bookingsError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('pickup_point_id', user.pickupPointId)
        .in('status', ['active', 'confirmed']);

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError);
      } else {
        console.log('Total bookings count:', bookingsCount);
      }

      setStats({
        activeOrders: activeCount || 0,
        pendingPickups: pendingCount,
        completedToday: completedCount,
        totalEarnings,
        activeDrops: dropsCount || 0,
        totalBookings: bookingsCount || 0,
      });

      console.log('Dashboard data loaded successfully');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante il caricamento dei dati');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.pickupPointId, user?.email]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Conferma Logout',
      'Sei sicuro di voler uscire?',
      [
        {
          text: 'Annulla',
          style: 'cancel',
        },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setLoggingOut(true);
            try {
              console.log('PickupPoint Dashboard: Logging out...');
              
              // Clear user state first to prevent navigation issues
              await logout();
              
              // Small delay to ensure state is cleared
              await new Promise(resolve => setTimeout(resolve, 100));
              
              console.log('PickupPoint Dashboard: Logout complete, redirecting to login...');
              
              // Use replace to prevent back navigation
              router.replace('/login');
            } catch (error) {
              console.error('PickupPoint Dashboard: Logout error:', error);
              // Even if there's an error, try to navigate to login
              router.replace('/login');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  if (!user?.pickupPointId) {
    return (
      <View style={styles.errorContainer}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle.fill"
          android_material_icon_name="error"
          size={64}
          color={colors.error}
        />
        <Text style={styles.errorTitle}>Errore</Text>
        <Text style={styles.errorText}>
          No pickup point ID found. Contatta l&apos;amministratore per assistenza.
        </Text>
        <Pressable
          style={styles.errorButton}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.errorButtonText}>Torna al Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Ciao,</Text>
              <Text style={styles.pickupPointName}>{pickupPoint?.name || 'Punto di Ritiro'}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.logoutButton,
                (pressed || loggingOut) && styles.logoutButtonPressed,
              ]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <IconSymbol
                  ios_icon_name="rectangle.portrait.and.arrow.right"
                  android_material_icon_name="logout"
                  size={24}
                  color={colors.error}
                />
              )}
            </Pressable>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="shippingbox.fill"
                android_material_icon_name="inventory_2"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.statValue}>{stats.activeOrders}</Text>
              <Text style={styles.statLabel}>Ordini Attivi</Text>
            </View>

            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="clock.fill"
                android_material_icon_name="schedule"
                size={32}
                color={colors.warning}
              />
              <Text style={styles.statValue}>{stats.pendingPickups}</Text>
              <Text style={styles.statLabel}>In Attesa di Ritiro</Text>
            </View>

            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={32}
                color={colors.success}
              />
              <Text style={styles.statValue}>{stats.completedToday}</Text>
              <Text style={styles.statLabel}>Completati Oggi</Text>
            </View>

            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="eurosign.circle.fill"
                android_material_icon_name="euro"
                size={32}
                color={colors.info}
              />
              <Text style={styles.statValue}>€{stats.totalEarnings.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Guadagni Totali</Text>
            </View>

            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="flame.fill"
                android_material_icon_name="local_fire_department"
                size={32}
                color={colors.error}
              />
              <Text style={styles.statValue}>{stats.activeDrops}</Text>
              <Text style={styles.statLabel}>Drop Attivi</Text>
            </View>

            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="cart.fill"
                android_material_icon_name="shopping_cart"
                size={32}
                color={colors.success}
              />
              <Text style={styles.statValue}>{stats.totalBookings}</Text>
              <Text style={styles.statLabel}>Prenotazioni Totali</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Azioni Rapide</Text>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/pickup-point/orders');
              }}
            >
              <View style={styles.actionIcon}>
                <IconSymbol
                  ios_icon_name="list.bullet.rectangle"
                  android_material_icon_name="list_alt"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Gestisci Ordini</Text>
                <Text style={styles.actionDescription}>
                  Visualizza e gestisci gli ordini in arrivo
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/pickup-point/earnings');
              }}
            >
              <View style={styles.actionIcon}>
                <IconSymbol
                  ios_icon_name="chart.bar.fill"
                  android_material_icon_name="bar_chart"
                  size={24}
                  color={colors.success}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Guadagni</Text>
                <Text style={styles.actionDescription}>
                  Visualizza i tuoi guadagni e statistiche
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Pickup Point Info */}
          {pickupPoint && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informazioni Punto di Ritiro</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <IconSymbol
                    ios_icon_name="location.fill"
                    android_material_icon_name="location_on"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.infoText}>
                    {pickupPoint.address}, {pickupPoint.city}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <IconSymbol
                    ios_icon_name="phone.fill"
                    android_material_icon_name="phone"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.infoText}>{pickupPoint.phone}</Text>
                </View>
                <View style={styles.infoRow}>
                  <IconSymbol
                    ios_icon_name="envelope.fill"
                    android_material_icon_name="email"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.infoText}>{pickupPoint.email}</Text>
                </View>
                <View style={styles.infoRow}>
                  <IconSymbol
                    ios_icon_name="percent"
                    android_material_icon_name="percent"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.infoText}>
                    Commissione: {pickupPoint.commission_rate}%
                  </Text>
                </View>
              </View>
              <View style={styles.infoNote}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={18}
                  color={colors.info}
                />
                <Text style={styles.infoNoteText}>
                  Per modificare le informazioni del punto di ritiro, contatta l&apos;amministratore.
                </Text>
              </View>
            </View>
          )}

          {/* Real-time Data Info */}
          <View style={styles.section}>
            <View style={styles.realTimeCard}>
              <IconSymbol
                ios_icon_name="arrow.clockwise.circle.fill"
                android_material_icon_name="sync"
                size={24}
                color={colors.success}
              />
              <View style={styles.realTimeContent}>
                <Text style={styles.realTimeTitle}>Dati in Tempo Reale</Text>
                <Text style={styles.realTimeText}>
                  Tutti i dati visualizzati sono aggiornati in tempo reale dal database dell&apos;app.
                  Scorri verso il basso per aggiornare.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pickupPointName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  logoutButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonPressed: {
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionCardPressed: {
    opacity: 0.7,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.info + '30',
    gap: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  realTimeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.success + '30',
    gap: 12,
  },
  realTimeContent: {
    flex: 1,
  },
  realTimeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  realTimeText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
