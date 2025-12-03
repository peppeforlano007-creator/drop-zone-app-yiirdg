
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  totalUsers: number;
  totalSuppliers: number;
  totalProducts: number;
  totalDrops: number;
  activeDrops: number;
  completedDrops: number;
  totalBookings: number;
  totalRevenue: number;
  capturedRevenue: number;
  averageDiscount: number;
  conversionRate: number;
  topSuppliers: {
    name: string;
    revenue: number;
    bookings: number;
  }[];
  topProducts: {
    name: string;
    bookings: number;
    revenue: number;
  }[];
  topPickupPoints: {
    name: string;
    city: string;
    users: number;
    drops: number;
  }[];
  recentActivity: {
    type: string;
    description: string;
    timestamp: string;
  }[];
}

export default function AnalyticsScreen() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total suppliers
      const { count: totalSuppliers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'supplier');

      // Get total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Get total drops
      const { count: totalDrops } = await supabase
        .from('drops')
        .select('*', { count: 'exact', head: true });

      // Get active drops
      const { count: activeDrops } = await supabase
        .from('drops')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get completed drops
      const { count: completedDrops } = await supabase
        .from('drops')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Get total bookings
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Get revenue data
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('final_price, discount_percentage, payment_status');

      const totalRevenue = bookingsData?.reduce((sum, b) => sum + b.final_price, 0) || 0;
      const capturedRevenue = bookingsData
        ?.filter(b => b.payment_status === 'captured')
        .reduce((sum, b) => sum + b.final_price, 0) || 0;
      const averageDiscount = bookingsData?.length
        ? bookingsData.reduce((sum, b) => sum + b.discount_percentage, 0) / bookingsData.length
        : 0;

      // Get top suppliers
      const { data: suppliersData } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          supplier_lists (
            id,
            products (
              id,
              bookings (
                final_price,
                payment_status
              )
            )
          )
        `)
        .eq('role', 'supplier')
        .limit(5);

      const topSuppliers = (suppliersData || []).map(supplier => {
        let revenue = 0;
        let bookings = 0;
        supplier.supplier_lists?.forEach((list: any) => {
          list.products?.forEach((product: any) => {
            product.bookings?.forEach((booking: any) => {
              if (booking.payment_status === 'captured') {
                revenue += booking.final_price;
                bookings++;
              }
            });
          });
        });
        return {
          name: supplier.full_name || 'N/A',
          revenue,
          bookings,
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      // Get top products - FIXED QUERY
      // First, get all bookings grouped by product_id
      const { data: bookingsByProduct } = await supabase
        .from('bookings')
        .select('product_id, final_price, payment_status');

      // Group bookings by product_id
      const productBookingsMap = new Map<string, { count: number; revenue: number }>();
      bookingsByProduct?.forEach(booking => {
        const existing = productBookingsMap.get(booking.product_id) || { count: 0, revenue: 0 };
        existing.count++;
        if (booking.payment_status === 'captured') {
          existing.revenue += booking.final_price;
        }
        productBookingsMap.set(booking.product_id, existing);
      });

      // Get product details for top products
      const topProductIds = Array.from(productBookingsMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([productId]) => productId);

      const { data: topProductsData } = await supabase
        .from('products')
        .select('id, name')
        .in('id', topProductIds);

      const topProducts = (topProductsData || [])
        .map(product => {
          const stats = productBookingsMap.get(product.id) || { count: 0, revenue: 0 };
          return {
            name: product.name,
            bookings: stats.count,
            revenue: stats.revenue,
          };
        })
        .sort((a, b) => b.bookings - a.bookings);

      // Get top pickup points
      const { data: pickupPointsData } = await supabase
        .from('pickup_points')
        .select(`
          name,
          city,
          profiles (count),
          drops (count)
        `)
        .limit(5);

      const topPickupPoints = (pickupPointsData || []).map(point => ({
        name: point.name,
        city: point.city,
        users: (point.profiles as any)?.length || 0,
        drops: (point.drops as any)?.length || 0,
      }));

      // Calculate conversion rate
      const { count: interestedUsers } = await supabase
        .from('user_interests')
        .select('*', { count: 'exact', head: true });

      const conversionRate = interestedUsers && totalBookings
        ? (totalBookings / interestedUsers) * 100
        : 0;

      setAnalytics({
        totalUsers: totalUsers || 0,
        totalSuppliers: totalSuppliers || 0,
        totalProducts: totalProducts || 0,
        totalDrops: totalDrops || 0,
        activeDrops: activeDrops || 0,
        completedDrops: completedDrops || 0,
        totalBookings: totalBookings || 0,
        totalRevenue,
        capturedRevenue,
        averageDiscount,
        conversionRate,
        topSuppliers,
        topProducts,
        topPickupPoints,
        recentActivity: [],
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadAnalytics();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Errore nel caricamento dei dati</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Analytics',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Panoramica Generale</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <IconSymbol
                  ios_icon_name="person.3.fill"
                  android_material_icon_name="group"
                  size={28}
                  color={colors.primary}
                />
                <Text style={styles.statValue}>{analytics.totalUsers}</Text>
                <Text style={styles.statLabel}>Utenti Totali</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol
                  ios_icon_name="building.2.fill"
                  android_material_icon_name="store"
                  size={28}
                  color={colors.secondary}
                />
                <Text style={styles.statValue}>{analytics.totalSuppliers}</Text>
                <Text style={styles.statLabel}>Fornitori</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol
                  ios_icon_name="cube.box.fill"
                  android_material_icon_name="inventory"
                  size={28}
                  color={colors.info}
                />
                <Text style={styles.statValue}>{analytics.totalProducts}</Text>
                <Text style={styles.statLabel}>Prodotti</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol
                  ios_icon_name="bolt.circle.fill"
                  android_material_icon_name="flash_on"
                  size={28}
                  color={colors.success}
                />
                <Text style={styles.statValue}>{analytics.activeDrops}</Text>
                <Text style={styles.statLabel}>Drop Attivi</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Finanziaria</Text>
            <View style={styles.revenueCard}>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueLabel}>Fatturato Totale</Text>
                <Text style={styles.revenueValue}>€{analytics.totalRevenue.toFixed(2)}</Text>
              </View>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueLabel}>Fatturato Incassato</Text>
                <Text style={[styles.revenueValue, { color: colors.success }]}>
                  €{analytics.capturedRevenue.toFixed(2)}
                </Text>
              </View>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueLabel}>Prenotazioni Totali</Text>
                <Text style={styles.revenueValue}>{analytics.totalBookings}</Text>
              </View>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueLabel}>Sconto Medio</Text>
                <Text style={styles.revenueValue}>{analytics.averageDiscount.toFixed(1)}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Fornitori</Text>
            {analytics.topSuppliers.map((supplier, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <Text style={styles.listItemRank}>#{index + 1}</Text>
                  <View>
                    <Text style={styles.listItemTitle}>{supplier.name}</Text>
                    <Text style={styles.listItemSubtitle}>
                      {supplier.bookings} prenotazioni
                    </Text>
                  </View>
                </View>
                <Text style={styles.listItemValue}>€{supplier.revenue.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Prodotti</Text>
            {analytics.topProducts.length > 0 ? (
              analytics.topProducts.map((product, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <Text style={styles.listItemRank}>#{index + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listItemTitle} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text style={styles.listItemSubtitle}>
                        {product.bookings} prenotazioni
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.listItemValue}>€{product.revenue.toFixed(2)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>Nessuna prenotazione ancora</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Punti di Ritiro</Text>
            {analytics.topPickupPoints.map((point, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <Text style={styles.listItemRank}>#{index + 1}</Text>
                  <View>
                    <Text style={styles.listItemTitle}>{point.name}</Text>
                    <Text style={styles.listItemSubtitle}>
                      {point.city} • {point.users} utenti • {point.drops} drops
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metriche Chiave</Text>
            <View style={styles.metricsCard}>
              <View style={styles.metricItem}>
                <IconSymbol
                  ios_icon_name="chart.line.uptrend.xyaxis"
                  android_material_icon_name="trending_up"
                  size={24}
                  color={colors.success}
                />
                <Text style={styles.metricLabel}>Tasso di Conversione</Text>
                <Text style={styles.metricValue}>{analytics.conversionRate.toFixed(1)}%</Text>
              </View>
              <View style={styles.metricItem}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.metricLabel}>Drop Completati</Text>
                <Text style={styles.metricValue}>{analytics.completedDrops}</Text>
              </View>
            </View>
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
    padding: 16,
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
  errorText: {
    fontSize: 16,
    color: colors.error,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
    fontSize: 28,
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
  revenueCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  revenueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  listItemRank: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    width: 32,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  listItemValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  emptySection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptySectionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  metricsCard: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
});
