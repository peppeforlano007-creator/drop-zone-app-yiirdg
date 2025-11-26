
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalUsers: number;
  totalSuppliers: number;
  totalPickupPoints: number;
  activeDrops: number;
  completedDrops: number;
  totalBookings: number;
  totalRevenue: number;
}

export default function AdminDashboardScreen() {
  const { logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalSuppliers: 0,
    totalPickupPoints: 0,
    activeDrops: 0,
    completedDrops: 0,
    totalBookings: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      console.log('Admin Dashboard: Loading stats...');

      // Load all stats in parallel
      const [
        usersResult,
        suppliersResult,
        pickupPointsResult,
        activeDropsResult,
        completedDropsResult,
        bookingsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'consumer'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'supplier'),
        supabase.from('pickup_points').select('*', { count: 'exact', head: true }),
        supabase.from('drops').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('drops').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('bookings').select('final_price').eq('payment_status', 'captured'),
      ]);

      // Log any errors
      if (usersResult.error) console.error('Error loading users count:', usersResult.error);
      if (suppliersResult.error) console.error('Error loading suppliers count:', suppliersResult.error);
      if (pickupPointsResult.error) console.error('Error loading pickup points count:', pickupPointsResult.error);
      if (activeDropsResult.error) console.error('Error loading active drops count:', activeDropsResult.error);
      if (completedDropsResult.error) console.error('Error loading completed drops count:', completedDropsResult.error);
      if (bookingsResult.error) console.error('Error loading bookings:', bookingsResult.error);

      const totalRevenue = bookingsResult.data?.reduce((sum, b) => sum + (b.final_price || 0), 0) || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalSuppliers: suppliersResult.count || 0,
        totalPickupPoints: pickupPointsResult.count || 0,
        activeDrops: activeDropsResult.count || 0,
        completedDrops: completedDropsResult.count || 0,
        totalBookings: bookingsResult.data?.length || 0,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Errore', 'Si è verificato un errore durante il logout');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Gestione Utenti',
      icon: 'person.3.fill',
      androidIcon: 'people',
      route: '/admin/users',
      color: '#007AFF',
    },
    {
      title: 'Gestione Fornitori',
      icon: 'building.2.fill',
      androidIcon: 'business',
      route: '/admin/suppliers',
      color: '#FF9500',
    },
    {
      title: 'Punti di Ritiro',
      icon: 'mappin.circle.fill',
      androidIcon: 'location_on',
      route: '/admin/pickup-points',
      color: '#34C759',
    },
    {
      title: 'Gestione Prodotti',
      icon: 'cube.box.fill',
      androidIcon: 'inventory',
      route: '/admin/products',
      color: '#5856D6',
    },
    {
      title: 'Gestione Drop',
      icon: 'flame.fill',
      androidIcon: 'local_fire_department',
      route: '/admin/manage-drops',
      color: '#FF3B30',
    },
    {
      title: 'Gestisci Prenotazioni',
      icon: 'cart.fill',
      androidIcon: 'shopping_cart',
      route: '/admin/bookings',
      color: '#FF2D55',
    },
    {
      title: 'Esporta Ordini Fornitori',
      icon: 'square.and.arrow.down.fill',
      androidIcon: 'download',
      route: '/admin/export-orders',
      color: '#32ADE6',
      badge: stats.completedDrops > 0 ? stats.completedDrops.toString() : undefined,
    },
    {
      title: 'Analytics',
      icon: 'chart.bar.fill',
      androidIcon: 'analytics',
      route: '/admin/analytics',
      color: '#AF52DE',
    },
    {
      title: 'Testing & Debug',
      icon: 'wrench.and.screwdriver.fill',
      androidIcon: 'build',
      route: '/admin/testing',
      color: '#8E8E93',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento dashboard...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Admin Dashboard',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
              ]}
            >
              <IconSymbol
                ios_icon_name="rectangle.portrait.and.arrow.right"
                android_material_icon_name="logout"
                size={24}
                color={colors.error}
              />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: '#007AFF15' }]}>
                <IconSymbol ios_icon_name="person.3.fill" android_material_icon_name="people" size={24} color="#007AFF" />
                <Text style={styles.statValue}>{stats.totalUsers}</Text>
                <Text style={styles.statLabel}>Utenti</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FF950015' }]}>
                <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="business" size={24} color="#FF9500" />
                <Text style={styles.statValue}>{stats.totalSuppliers}</Text>
                <Text style={styles.statLabel}>Fornitori</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: '#34C75915' }]}>
                <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={24} color="#34C759" />
                <Text style={styles.statValue}>{stats.totalPickupPoints}</Text>
                <Text style={styles.statLabel}>Punti Ritiro</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FF3B3015' }]}>
                <IconSymbol ios_icon_name="flame.fill" android_material_icon_name="local_fire_department" size={24} color="#FF3B30" />
                <Text style={styles.statValue}>{stats.activeDrops}</Text>
                <Text style={styles.statLabel}>Drop Attivi</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: '#5856D615' }]}>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color="#5856D6" />
                <Text style={styles.statValue}>{stats.completedDrops}</Text>
                <Text style={styles.statLabel}>Drop Completati</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FF2D5515' }]}>
                <IconSymbol ios_icon_name="cart.fill" android_material_icon_name="shopping_cart" size={24} color="#FF2D55" />
                <Text style={styles.statValue}>{stats.totalBookings}</Text>
                <Text style={styles.statLabel}>Prenotazioni</Text>
              </View>
            </View>

            <View style={[styles.revenueCard, { backgroundColor: '#32ADE615' }]}>
              <IconSymbol ios_icon_name="eurosign.circle.fill" android_material_icon_name="euro" size={32} color="#32ADE6" />
              <View style={styles.revenueInfo}>
                <Text style={styles.revenueLabel}>Fatturato Totale</Text>
                <Text style={styles.revenueValue}>€{stats.totalRevenue.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(item.route as any);
                }}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                  <IconSymbol
                    ios_icon_name={item.icon}
                    android_material_icon_name={item.androidIcon}
                    size={24}
                    color={item.color}
                  />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                {item.badge && (
                  <View style={[styles.badge, { backgroundColor: item.color }]}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron_right"
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            ))}
          </View>

          {/* Logout Button at Bottom */}
          <Pressable
            style={({ pressed }) => [
              styles.logoutButtonBottom,
              pressed && styles.logoutButtonBottomPressed,
            ]}
            onPress={handleLogout}
          >
            <IconSymbol
              ios_icon_name="rectangle.portrait.and.arrow.right"
              android_material_icon_name="logout"
              size={20}
              color={colors.error}
            />
            <Text style={styles.logoutButtonText}>Esci</Text>
          </Pressable>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  revenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  revenueInfo: {
    flex: 1,
  },
  revenueLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  menuContainer: {
    gap: 12,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  menuItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  logoutButton: {
    padding: 8,
    marginRight: 8,
  },
  logoutButtonPressed: {
    opacity: 0.6,
  },
  logoutButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  logoutButtonBottomPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
