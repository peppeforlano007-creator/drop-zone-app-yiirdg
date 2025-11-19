
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [stats, setStats] = useState({
    pendingDrops: 0,
    activeDrops: 0,
    totalUsers: 0,
    totalSuppliers: 0,
    totalPickupPoints: 0,
    totalProducts: 0,
    totalBookings: 0,
  });

  const loadStats = useCallback(async () => {
    try {
      // Load pending drops
      const { count: pendingDrops } = await supabase
        .from('drops')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');

      // Load active drops
      const { count: activeDrops } = await supabase
        .from('drops')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Load total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Load total suppliers
      const { count: totalSuppliers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'supplier');

      // Load total pickup points
      const { count: totalPickupPoints } = await supabase
        .from('pickup_points')
        .select('*', { count: 'exact', head: true });

      // Load total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Load total bookings
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      setStats({
        pendingDrops: pendingDrops || 0,
        activeDrops: activeDrops || 0,
        totalUsers: totalUsers || 0,
        totalSuppliers: totalSuppliers || 0,
        totalPickupPoints: totalPickupPoints || 0,
        totalProducts: totalProducts || 0,
        totalBookings: totalBookings || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleManageDrops = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/admin/manage-drops');
  };

  const handleTesting = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/admin/testing');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Admin Dashboard',
          headerRight: () => (
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.headerButtonPressed,
              ]}
            >
              <IconSymbol
                ios_icon_name="rectangle.portrait.and.arrow.right"
                android_material_icon_name="logout"
                size={22}
                color={colors.primary}
              />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Dashboard Amministratore</Text>
            <Text style={styles.headerSubtitle}>
              Gestisci drop, utenti e fornitori
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="clock.badge.exclamationmark"
                android_material_icon_name="pending_actions"
                size={32}
                color={colors.warning}
              />
              <Text style={styles.statValue}>{stats.pendingDrops}</Text>
              <Text style={styles.statLabel}>Drop in Attesa</Text>
            </View>

            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="bolt.circle.fill"
                android_material_icon_name="flash_on"
                size={32}
                color={colors.success}
              />
              <Text style={styles.statValue}>{stats.activeDrops}</Text>
              <Text style={styles.statLabel}>Drop Attivi</Text>
            </View>

            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="person.3.fill"
                android_material_icon_name="group"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Utenti</Text>
            </View>

            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="building.2.fill"
                android_material_icon_name="store"
                size={32}
                color={colors.secondary}
              />
              <Text style={styles.statValue}>{stats.totalSuppliers}</Text>
              <Text style={styles.statLabel}>Fornitori</Text>
            </View>

            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="cube.box.fill"
                android_material_icon_name="inventory"
                size={32}
                color={colors.info}
              />
              <Text style={styles.statValue}>{stats.totalProducts}</Text>
              <Text style={styles.statLabel}>Prodotti</Text>
            </View>

            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="cart.fill"
                android_material_icon_name="shopping_cart"
                size={32}
                color={colors.warning}
              />
              <Text style={styles.statValue}>{stats.totalBookings}</Text>
              <Text style={styles.statLabel}>Prenotazioni</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Azioni Rapide</Text>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={handleManageDrops}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="square.stack.3d.up.fill"
                  android_material_icon_name="layers"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Gestisci Drop</Text>
                <Text style={styles.actionDescription}>
                  Approva, attiva e disattiva drop
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/create-drop');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add_circle"
                  size={24}
                  color="#10B981"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Crea Drop Manuale</Text>
                <Text style={styles.actionDescription}>
                  Crea un drop senza attendere il valore minimo
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/users');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="person.2.fill"
                  android_material_icon_name="people"
                  size={24}
                  color={colors.secondary}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Gestisci Utenti</Text>
                <Text style={styles.actionDescription}>
                  Visualizza e gestisci gli utenti
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/suppliers');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="building.2.fill"
                  android_material_icon_name="store"
                  size={24}
                  color={colors.success}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Gestisci Fornitori</Text>
                <Text style={styles.actionDescription}>
                  Approva e gestisci i fornitori
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/products');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="cube.box.fill"
                  android_material_icon_name="inventory"
                  size={24}
                  color={colors.info}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Gestisci Prodotti</Text>
                <Text style={styles.actionDescription}>
                  Visualizza e modifica i prodotti
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/pickup-points');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="mappin.circle.fill"
                  android_material_icon_name="location_on"
                  size={24}
                  color={colors.warning}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Punti di Ritiro</Text>
                <Text style={styles.actionDescription}>
                  Gestisci i punti di ritiro
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/bookings');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="cart.fill"
                  android_material_icon_name="shopping_cart"
                  size={24}
                  color="#10B981"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Gestisci Prenotazioni</Text>
                <Text style={styles.actionDescription}>
                  Visualizza tutte le prenotazioni
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/analytics');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="chart.bar.fill"
                  android_material_icon_name="analytics"
                  size={24}
                  color="#8B5CF6"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Analytics</Text>
                <Text style={styles.actionDescription}>
                  Visualizza statistiche dettagliate
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/notifications');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="bell.fill"
                  android_material_icon_name="notifications"
                  size={24}
                  color="#F59E0B"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Invia Notifiche</Text>
                <Text style={styles.actionDescription}>
                  Invia notifiche agli utenti
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/settings');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="gearshape.fill"
                  android_material_icon_name="settings"
                  size={24}
                  color="#6B7280"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Impostazioni</Text>
                <Text style={styles.actionDescription}>
                  Configura la piattaforma
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/reports');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="doc.text.fill"
                  android_material_icon_name="description"
                  size={24}
                  color="#EF4444"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Report & Export</Text>
                <Text style={styles.actionDescription}>
                  Genera ed esporta report
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/activity-log');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="list.bullet.clipboard.fill"
                  android_material_icon_name="history"
                  size={24}
                  color="#06B6D4"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Log Attività</Text>
                <Text style={styles.actionDescription}>
                  Visualizza log di sistema
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={handleTesting}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="wrench.and.screwdriver.fill"
                  android_material_icon_name="build"
                  size={24}
                  color="#10B981"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Testing & Diagnostica</Text>
                <Text style={styles.actionDescription}>
                  Test funzionalità e performance
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/payment-testing');
              }}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="creditcard.fill"
                  android_material_icon_name="credit_card"
                  size={24}
                  color="#3B82F6"
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Test Pagamenti</Text>
                <Text style={styles.actionDescription}>
                  Carte di test e flusso ordini
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>
          </View>

          <View style={styles.logoutSection}>
            <Pressable
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
              ]}
              onPress={handleLogout}
            >
              <IconSymbol
                ios_icon_name="rectangle.portrait.and.arrow.right"
                android_material_icon_name="logout"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.logoutButtonText}>Esci dall'Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerButtonPressed: {
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
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
    transform: [{ scale: 0.98 }],
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
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
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  logoutSection: {
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  logoutButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
