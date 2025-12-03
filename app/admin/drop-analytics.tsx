
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';

const { width } = Dimensions.get('window');

interface DropAnalytics {
  id: string;
  name: string;
  status: string;
  current_discount: number;
  current_value: number;
  target_value: number;
  start_time: string;
  end_time: string;
  total_bookings: number;
  total_users: number;
  average_booking_value: number;
  conversion_rate: number;
  pickup_points: {
    name: string;
    city: string;
  };
  supplier_lists: {
    name: string;
    min_discount: number;
    max_discount: number;
  };
}

interface BookingData {
  id: string;
  user_id: string;
  product_id: string;
  original_price: number;
  final_price: number;
  discount_percentage: number;
  payment_status: string;
  status: string;
  created_at: string;
  user_email: string;
  user_full_name: string;
  product_name: string;
}

export default function DropAnalyticsScreen() {
  const { dropId } = useLocalSearchParams<{ dropId: string }>();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<DropAnalytics | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [timeRemaining, setTimeRemaining] = useState('');

  const loadAnalytics = useCallback(async () => {
    if (!dropId) return;

    try {
      setLoading(true);

      // Load drop details
      const { data: dropData, error: dropError } = await supabase
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
            max_discount
          )
        `)
        .eq('id', dropId)
        .single();

      if (dropError) {
        console.error('Error loading drop:', dropError);
        return;
      }

      // Load bookings with FIXED query - join with auth.users and profiles separately
      console.log('Loading bookings for drop:', dropId);
      
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('drop_id', dropId)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError);
      }

      // Load user data and product data separately to avoid relationship issues
      const enrichedBookings: BookingData[] = [];
      
      if (bookingsData && bookingsData.length > 0) {
        for (const booking of bookingsData) {
          // Get user email from auth.users
          const { data: userData } = await supabase.auth.admin.getUserById(booking.user_id);
          
          // Get user full name from profiles
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', booking.user_id)
            .single();
          
          // Get product name
          const { data: productData } = await supabase
            .from('products')
            .select('name')
            .eq('id', booking.product_id)
            .single();
          
          enrichedBookings.push({
            id: booking.id,
            user_id: booking.user_id,
            product_id: booking.product_id,
            original_price: booking.original_price,
            final_price: booking.final_price,
            discount_percentage: booking.discount_percentage,
            payment_status: booking.payment_status,
            status: booking.status,
            created_at: booking.created_at,
            user_email: userData?.user?.email || 'N/A',
            user_full_name: profileData?.full_name || 'N/A',
            product_name: productData?.name || 'N/A',
          });
        }
      }

      const totalBookings = enrichedBookings.length;
      const totalValue = enrichedBookings.reduce((sum, b) => sum + parseFloat(b.final_price.toString()), 0);
      const uniqueUsers = new Set(enrichedBookings.map(b => b.user_id)).size;
      const averageBookingValue = totalBookings > 0 ? totalValue / totalBookings : 0;

      // Load total interests for conversion rate
      const { count: totalInterests } = await supabase
        .from('user_interests')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_list_id', dropData.supplier_list_id);

      const conversionRate = totalInterests && totalInterests > 0 
        ? (totalBookings / totalInterests) * 100 
        : 0;

      setAnalytics({
        ...dropData,
        total_bookings: totalBookings,
        total_users: uniqueUsers,
        average_booking_value: averageBookingValue,
        conversion_rate: conversionRate,
      });

      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dropId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!analytics) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(analytics.end_time).getTime();
      const distance = endTime - now;

      if (distance < 0) {
        setTimeRemaining('Terminato');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining(`${days}g ${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [analytics]);

  const getProgressPercentage = () => {
    if (!analytics) return 0;
    return Math.min((analytics.current_value / analytics.target_value) * 100, 100);
  };

  const getDiscountProgress = () => {
    if (!analytics) return 0;
    const { min_discount, max_discount } = analytics.supplier_lists;
    const discountRange = max_discount - min_discount;
    const currentProgress = analytics.current_discount - min_discount;
    return (currentProgress / discountRange) * 100;
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
      <View style={styles.errorContainer}>
        <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="error" size={48} color={colors.error} />
        <Text style={styles.errorText}>Drop non trovato</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Analytics Drop',
          headerBackTitle: 'Indietro',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {/* Drop Header */}
          <View style={styles.headerCard}>
            <Text style={styles.dropName}>{analytics.name}</Text>
            <Text style={styles.dropLocation}>
              {analytics.pickup_points.city} - {analytics.pickup_points.name}
            </Text>
            <Text style={styles.dropSupplier}>
              Lista: {analytics.supplier_lists.name}
            </Text>
            
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.statusText, { color: colors.success }]}>
                  {analytics.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.timeRemaining}>{timeRemaining}</Text>
            </View>
          </View>

          {/* Key Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metriche Chiave</Text>
            
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <IconSymbol
                  ios_icon_name="cart.fill"
                  android_material_icon_name="shopping_cart"
                  size={28}
                  color={colors.primary}
                />
                <Text style={styles.metricValue}>{analytics.total_bookings}</Text>
                <Text style={styles.metricLabel}>Prenotazioni</Text>
              </View>

              <View style={styles.metricCard}>
                <IconSymbol
                  ios_icon_name="person.3.fill"
                  android_material_icon_name="group"
                  size={28}
                  color={colors.info}
                />
                <Text style={styles.metricValue}>{analytics.total_users}</Text>
                <Text style={styles.metricLabel}>Utenti Unici</Text>
              </View>

              <View style={styles.metricCard}>
                <IconSymbol
                  ios_icon_name="eurosign.circle.fill"
                  android_material_icon_name="euro"
                  size={28}
                  color={colors.success}
                />
                <Text style={styles.metricValue}>€{analytics.average_booking_value.toFixed(0)}</Text>
                <Text style={styles.metricLabel}>Media Prenotazione</Text>
              </View>

              <View style={styles.metricCard}>
                <IconSymbol
                  ios_icon_name="chart.line.uptrend.xyaxis"
                  android_material_icon_name="trending_up"
                  size={28}
                  color={colors.warning}
                />
                <Text style={styles.metricValue}>{analytics.conversion_rate.toFixed(1)}%</Text>
                <Text style={styles.metricLabel}>Conversione</Text>
              </View>
            </View>
          </View>

          {/* Progress Bars */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progressi</Text>
            
            {/* Value Progress */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Valore Obiettivo</Text>
                <Text style={styles.progressValue}>
                  €{analytics.current_value.toFixed(0)} / €{analytics.target_value.toFixed(0)}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${getProgressPercentage()}%` }]} />
              </View>
              <Text style={styles.progressPercentage}>{getProgressPercentage().toFixed(1)}%</Text>
            </View>

            {/* Discount Progress */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Sconto Raggiunto</Text>
                <Text style={styles.progressValue}>
                  {analytics.current_discount.toFixed(1)}% / {analytics.supplier_lists.max_discount}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${getDiscountProgress()}%`, backgroundColor: colors.warning }]} />
              </View>
              <Text style={styles.progressPercentage}>{getDiscountProgress().toFixed(1)}%</Text>
            </View>
          </View>

          {/* Recent Bookings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prenotazioni Recenti</Text>
            
            {bookings.length > 0 ? (
              bookings.slice(0, 10).map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingUser}>
                      <IconSymbol
                        ios_icon_name="person.circle.fill"
                        android_material_icon_name="account_circle"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.bookingUserName}>{booking.user_full_name}</Text>
                    </View>
                    <View style={[
                      styles.bookingStatusBadge,
                      { backgroundColor: booking.payment_status === 'pending' ? colors.warning + '20' : colors.success + '20' }
                    ]}>
                      <Text style={[
                        styles.bookingStatusText,
                        { color: booking.payment_status === 'pending' ? colors.warning : colors.success }
                      ]}>
                        {booking.payment_status}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.bookingProduct}>{booking.product_name}</Text>
                  
                  <View style={styles.bookingFooter}>
                    <Text style={styles.bookingPrice}>€{parseFloat(booking.final_price.toString()).toFixed(2)}</Text>
                    <Text style={styles.bookingDiscount}>-{booking.discount_percentage}%</Text>
                    <Text style={styles.bookingDate}>
                      {new Date(booking.created_at).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="tray"
                  android_material_icon_name="inbox"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text style={styles.emptyText}>Nessuna prenotazione ancora</Text>
              </View>
            )}
          </View>

          {/* Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({
                pathname: '/drop-details',
                params: { dropId: analytics.id },
              });
            }}
          >
            <IconSymbol
              ios_icon_name="eye.fill"
              android_material_icon_name="visibility"
              size={20}
              color="#fff"
            />
            <Text style={styles.actionButtonText}>Visualizza Drop</Text>
          </Pressable>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  dropLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dropSupplier: {
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeRemaining: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 48) / 2,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    textAlign: 'right',
  },
  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bookingUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  bookingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bookingStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bookingProduct: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  bookingDiscount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  bookingDate: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
