
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  activeDrops: number;
  pendingOrders: number;
  totalRevenue: number;
  pendingApprovals: number;
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProducts: 0,
    activeDrops: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total products
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get active drops
      const { count: dropsCount } = await supabase
        .from('drops')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get pending orders
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed']);

      // Get pending drop approvals
      const { count: approvalsCount } = await supabase
        .from('drops')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');

      // Get total revenue from completed orders
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_value')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, order) => sum + Number(order.total_value), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalProducts: productsCount || 0,
        activeDrops: dropsCount || 0,
        pendingOrders: ordersCount || 0,
        totalRevenue,
        pendingApprovals: approvalsCount || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Esci',
      'Sei sicuro di voler uscire dalla dashboard admin?',
      [
        {
          text: 'Annulla',
          style: 'cancel',
        },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              console.log('Admin Dashboard: Logging out...');
              await logout();
              console.log('Admin Dashboard: Logout successful, redirecting to login...');
              router.replace('/login');
            } catch (error) {
              console.error('Admin Dashboard: Logout error:', error);
              Alert.alert('Errore', 'Si è verificato un errore durante il logout. Riprova.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const quickActions = [
    {
      title: 'Gestisci Drop',
      description: 'Approva e gestisci i drop',
      icon: { ios: 'bolt.circle.fill', android: 'flash_on' },
      route: '/admin/manage-drops',
      color: '#FF9500',
      badge: stats.pendingApprovals > 0 ? stats.pendingApprovals : null,
    },
    {
      title: 'Utenti',
      description: 'Gestisci gli utenti',
      icon: { ios: 'person.3.fill', android: 'group' },
      route: '/admin/users',
      color: '#007AFF',
    },
    {
      title: 'Prodotti',
      description: 'Gestisci i prodotti',
      icon: { ios: 'cube.box.fill', android: 'inventory' },
      route: '/admin/products',
      color: '#34C759',
    },
    {
      title: 'Punti di Ritiro',
      description: 'Gestisci i punti di ritiro',
      icon: { ios: 'mappin.circle.fill', android: 'location_on' },
      route: '/admin/pickup-points',
      color: '#FF3B30',
    },
    {
      title: 'Fornitori',
      description: 'Gestisci i fornitori',
      icon: { ios: 'building.2.fill', android: 'store' },
      route: '/admin/suppliers',
      color: '#5856D6',
    },
    {
      title: 'Gestisci Notifiche',
      description: 'Flussi e notifiche massive',
      icon: { ios: 'bell.badge.fill', android: 'notifications_active' },
      route: '/admin/manage-notifications',
      color: '#FF2D55',
    },
    {
      title: 'Invia Notifiche',
      description: 'Invia notifiche agli utenti',
      icon: { ios: 'paperplane.fill', android: 'send' },
      route: '/admin/notifications',
      color: '#AF52DE',
    },
    {
      title: 'Analytics',
      description: 'Visualizza statistiche',
      icon: { ios: 'chart.bar.fill', android: 'analytics' },
      route: '/admin/analytics',
      color: '#00C7BE',
    },
    {
      title: 'Testing',
      description: 'Test e diagnostica',
      icon: { ios: 'wrench.and.screwdriver.fill', android: 'build' },
      route: '/admin/testing',
      color: '#8E8E93',
    },
    {
      title: 'Impostazioni',
      description: 'Configurazione app',
      icon: { ios: 'gearshape.fill', android: 'settings' },
      route: '/admin/settings',
      color: '#636366',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Dashboard Admin',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Dashboard Admin',
          headerShown: true,
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header with Logout Button */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Dashboard Admin</Text>
            <Text style={styles.subtitle}>Panoramica generale della piattaforma</Text>
          </View>
          
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
              loggingOut && styles.logoutButtonDisabled,
            ]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <React.Fragment>
                <IconSymbol
                  ios_icon_name="rectangle.portrait.and.arrow.right"
                  android_material_icon_name="logout"
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.logoutButtonText}>Esci</Text>
              </React.Fragment>
            )}
          </Pressable>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="person.3.fill" android_material_icon_name="group" size={28} color="#007AFF" />
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Utenti Totali</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="cube.box.fill" android_material_icon_name="inventory" size={28} color="#34C759" />
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Prodotti Attivi</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="bolt.circle.fill" android_material_icon_name="flash_on" size={28} color="#FF9500" />
            <Text style={styles.statValue}>{stats.activeDrops}</Text>
            <Text style={styles.statLabel}>Drop Attivi</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="shippingbox.fill" android_material_icon_name="local_shipping" size={28} color="#FF3B30" />
            <Text style={styles.statValue}>{stats.pendingOrders}</Text>
            <Text style={styles.statLabel}>Ordini Pendenti</Text>
          </View>

          <View style={[styles.statCard, styles.statCardWide]}>
            <IconSymbol ios_icon_name="eurosign.circle.fill" android_material_icon_name="euro" size={28} color="#00C7BE" />
            <Text style={styles.statValue}>€{stats.totalRevenue.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Fatturato Totale</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.actionCard,
                  pressed && styles.actionCardPressed,
                ]}
                onPress={() => handleNavigation(action.route)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <IconSymbol
                    ios_icon_name={action.icon.ios}
                    android_material_icon_name={action.icon.android}
                    size={24}
                    color={action.color}
                  />
                  {action.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{action.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    minWidth: 90,
    boxShadow: '0px 2px 8px rgba(255, 59, 48, 0.2)',
  },
  logoutButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
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
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardWide: {
    minWidth: '100%',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
