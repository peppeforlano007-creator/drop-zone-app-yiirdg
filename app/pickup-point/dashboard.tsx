
import React, { useState, useEffect } from 'react';
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
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!user?.pickupPointId) {
      console.error('No pickup point ID found');
      return;
    }

    try {
      // Load pickup point data
      const { data: ppData, error: ppError } = await supabase
        .from('pickup_points')
        .select('*')
        .eq('id', user.pickupPointId)
        .single();

      if (ppError) {
        console.error('Error loading pickup point:', ppError);
      } else {
        setPickupPoint(ppData);
      }

      // Load stats
      // Active orders
      const { count: activeCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('pickup_point_id', user.pickupPointId)
        .in('status', ['pending', 'confirmed', 'in_transit', 'arrived']);

      // Pending pickups
      const { count: pendingCount } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('pickup_status', 'ready')
        .in('order_id', 
          supabase
            .from('orders')
            .select('id')
            .eq('pickup_point_id', user.pickupPointId)
        );

      // Completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: completedCount } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('pickup_status', 'picked_up')
        .gte('picked_up_at', today.toISOString())
        .in('order_id',
          supabase
            .from('orders')
            .select('id')
            .eq('pickup_point_id', user.pickupPointId)
        );

      // Total earnings (commission from completed orders)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('commission_amount')
        .eq('pickup_point_id', user.pickupPointId)
        .eq('status', 'completed');

      const totalEarnings = ordersData?.reduce((sum, order) => sum + (Number(order.commission_amount) || 0), 0) || 0;

      setStats({
        activeOrders: activeCount || 0,
        pendingPickups: pendingCount || 0,
        completedToday: completedCount || 0,
        totalEarnings,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
              await logout();
              console.log('PickupPoint Dashboard: Logout complete, redirecting to login...');
              router.replace('/login');
            } catch (error) {
              console.error('PickupPoint Dashboard: Logout error:', error);
              Alert.alert('Errore', 'Si è verificato un errore durante il logout');
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

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/pickup-point/edit');
              }}
            >
              <View style={styles.actionIcon}>
                <IconSymbol
                  ios_icon_name="pencil.circle.fill"
                  android_material_icon_name="edit"
                  size={24}
                  color={colors.info}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Modifica Informazioni</Text>
                <Text style={styles.actionDescription}>
                  Aggiorna i dati del punto di ritiro
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
            </View>
          )}
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
});
