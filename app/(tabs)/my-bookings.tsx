
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

interface Booking {
  id: string;
  product_id: string;
  drop_id: string;
  original_price: number;
  authorized_amount: number;
  discount_percentage: number;
  final_price: number;
  payment_status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
  status: 'active' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  products: {
    name: string;
    image_url: string;
  };
  drops: {
    name: string;
    current_discount: number;
    end_time: string;
    status: string;
    supplier_lists: {
      name: string;
      max_discount: number;
    };
  };
}

export default function MyBookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = useCallback(async () => {
    try {
      console.log('Loading bookings for user:', user?.id);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          product_id,
          drop_id,
          original_price,
          authorized_amount,
          discount_percentage,
          final_price,
          payment_status,
          status,
          created_at,
          updated_at,
          products (
            name,
            image_url
          ),
          drops (
            name,
            current_discount,
            end_time,
            status,
            supplier_lists (
              name,
              max_discount
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading bookings:', error);
        return;
      }

      console.log('Bookings loaded:', data?.length || 0);
      setBookings(data || []);
    } catch (error) {
      console.error('Error in loadBookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleCancelBooking = (bookingId: string, productName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Annulla Prenotazione',
      `Sei sicuro di voler annullare la prenotazione per ${productName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sì, Annulla',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bookings')
                .update({
                  status: 'cancelled',
                  payment_status: 'refunded',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', bookingId);

              if (error) {
                console.error('Error cancelling booking:', error);
                Alert.alert('Errore', 'Non è stato possibile annullare la prenotazione');
                return;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Prenotazione Annullata', 'La prenotazione è stata annullata con successo');
              loadBookings();
            } catch (error) {
              console.error('Error in handleCancelBooking:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authorized':
        return '#FF9800';
      case 'captured':
        return '#4CAF50';
      case 'cancelled':
      case 'refunded':
        return '#9E9E9E';
      case 'failed':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'authorized':
        return 'In Attesa';
      case 'captured':
        return 'Pagato';
      case 'cancelled':
        return 'Annullato';
      case 'refunded':
        return 'Rimborsato';
      case 'failed':
        return 'Fallito';
      default:
        return status;
    }
  };

  const activeBookings = bookings.filter(
    b => b.payment_status === 'authorized' && b.status === 'active'
  );
  
  const completedBookings = bookings.filter(
    b => b.payment_status === 'captured' || b.status === 'cancelled'
  );

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Le Mie Prenotazioni',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={styles.loadingText}>Caricamento prenotazioni...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Le Mie Prenotazioni',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            Platform.OS !== 'ios' && styles.contentContainerWithTabBar,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.text}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Le Mie Prenotazioni</Text>
            <Text style={styles.headerSubtitle}>
              Gestisci le tue prenotazioni attive
            </Text>
          </View>

          {activeBookings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prenotazioni Attive</Text>
              {activeBookings.map(booking => {
                const timeRemaining = new Date(booking.drops.end_time).getTime() - Date.now();
                const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
                const currentPrice = Number(booking.original_price) * (1 - booking.drops.current_discount / 100);
                const minPossiblePrice = Number(booking.original_price) * (1 - booking.drops.supplier_lists.max_discount / 100);

                return (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      <View style={styles.bookingInfo}>
                        <Text style={styles.productName}>{booking.products.name}</Text>
                        <Text style={styles.supplierName}>{booking.drops.supplier_lists.name}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(booking.payment_status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(booking.payment_status) },
                          ]}
                        >
                          {getStatusText(booking.payment_status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bookingDetails}>
                      <View style={styles.detailRow}>
                        <IconSymbol 
                          ios_icon_name="clock" 
                          android_material_icon_name="schedule" 
                          size={16} 
                          color={colors.textSecondary} 
                        />
                        <Text style={styles.detailText}>
                          {daysRemaining > 0
                            ? `${daysRemaining} giorni rimanenti`
                            : 'Drop terminato'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <IconSymbol 
                          ios_icon_name="percent" 
                          android_material_icon_name="percent" 
                          size={16} 
                          color={colors.textSecondary} 
                        />
                        <Text style={styles.detailText}>
                          Sconto attuale: {booking.drops.current_discount.toFixed(0)}%
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <IconSymbol 
                          ios_icon_name="lock.fill" 
                          android_material_icon_name="lock" 
                          size={16} 
                          color={colors.textSecondary} 
                        />
                        <Text style={styles.detailText}>
                          Bloccato: €{Number(booking.authorized_amount).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.priceInfo}>
                      <View>
                        <Text style={styles.priceLabel}>Prezzo Attuale</Text>
                        <Text style={styles.currentPrice}>
                          €{currentPrice.toFixed(2)}
                        </Text>
                        <Text style={styles.priceSubtext}>
                          (Sconto {booking.drops.current_discount.toFixed(0)}%)
                        </Text>
                      </View>
                      <View style={styles.priceRange}>
                        <Text style={styles.priceRangeLabel}>Prezzo Minimo</Text>
                        <Text style={styles.priceRangeText}>
                          €{minPossiblePrice.toFixed(2)}
                        </Text>
                        <Text style={styles.priceSubtext}>
                          (Max {booking.drops.supplier_lists.max_discount}%)
                        </Text>
                      </View>
                    </View>

                    <View style={styles.savingsInfo}>
                      <IconSymbol 
                        ios_icon_name="checkmark.circle.fill" 
                        android_material_icon_name="check_circle" 
                        size={16} 
                        color="#4CAF50" 
                      />
                      <Text style={styles.savingsText}>
                        Alla fine del drop, pagherai solo il prezzo finale con lo sconto raggiunto
                      </Text>
                    </View>

                    {booking.status === 'active' && (
                      <Pressable
                        style={styles.cancelButton}
                        onPress={() => handleCancelBooking(booking.id, booking.products.name)}
                      >
                        <IconSymbol 
                          ios_icon_name="xmark.circle" 
                          android_material_icon_name="cancel" 
                          size={20} 
                          color="#ef4444" 
                        />
                        <Text style={styles.cancelButtonText}>Annulla Prenotazione</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {completedBookings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Storico</Text>
              {completedBookings.map(booking => {
                const authorizedAmount = Number(booking.authorized_amount);
                const finalPrice = Number(booking.final_price);
                const savings = authorizedAmount - finalPrice;

                return (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      <View style={styles.bookingInfo}>
                        <Text style={styles.productName}>{booking.products.name}</Text>
                        <Text style={styles.supplierName}>{booking.drops.supplier_lists.name}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(booking.payment_status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(booking.payment_status) },
                          ]}
                        >
                          {getStatusText(booking.payment_status)}
                        </Text>
                      </View>
                    </View>

                    {booking.payment_status === 'captured' && (
                      <>
                        <View style={styles.finalPriceInfo}>
                          <View style={styles.priceRow}>
                            <Text style={styles.finalPriceLabel}>Importo Bloccato</Text>
                            <Text style={styles.authorizedAmountText}>
                              €{authorizedAmount.toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.priceRow}>
                            <Text style={styles.finalPriceLabel}>Importo Pagato</Text>
                            <Text style={styles.finalPrice}>
                              €{finalPrice.toFixed(2)}
                            </Text>
                          </View>
                          {savings > 0 && (
                            <View style={styles.savingsRow}>
                              <IconSymbol 
                                ios_icon_name="checkmark.circle.fill" 
                                android_material_icon_name="check_circle" 
                                size={16} 
                                color="#4CAF50" 
                              />
                              <Text style={styles.savingsAmount}>
                                Hai risparmiato €{savings.toFixed(2)}!
                              </Text>
                            </View>
                          )}
                          <Text style={styles.finalDiscount}>
                            Sconto finale: {booking.discount_percentage.toFixed(0)}%
                          </Text>
                        </View>
                      </>
                    )}

                    <Text style={styles.dateText}>
                      {booking.payment_status === 'captured'
                        ? `Pagato il ${new Date(booking.updated_at).toLocaleDateString('it-IT')}`
                        : `Prenotato il ${new Date(booking.created_at).toLocaleDateString('it-IT')}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {bookings.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol 
                ios_icon_name="cart" 
                android_material_icon_name="shopping_cart" 
                size={64} 
                color={colors.textTertiary} 
              />
              <Text style={styles.emptyTitle}>Nessuna Prenotazione</Text>
              <Text style={styles.emptyText}>
                Le tue prenotazioni appariranno qui quando prenoti prodotti nei drop attivi
              </Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Come funziona il pagamento?</Text>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>1.</Text>
                <Text style={styles.infoText}>
                  Quando prenoti, blocchiamo sulla tua carta l&apos;importo al prezzo scontato attuale
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>2.</Text>
                <Text style={styles.infoText}>
                  Durante il drop, lo sconto aumenta man mano che più persone prenotano
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>3.</Text>
                <Text style={styles.infoText}>
                  Alla fine del drop, addebitiamo solo l&apos;importo finale con lo sconto raggiunto
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>4.</Text>
                <Text style={styles.infoText}>
                  Se il prezzo finale è inferiore all&apos;importo bloccato, paghi meno! 🎉
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>5.</Text>
                <Text style={styles.infoText}>
                  Puoi annullare la prenotazione in qualsiasi momento prima della fine del drop
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  contentContainerWithTabBar: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bookingInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  supplierName: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  priceSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  priceRange: {
    alignItems: 'flex-end',
  },
  priceRangeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  priceRangeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  savingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  savingsText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  finalPriceInfo: {
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finalPriceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  authorizedAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  finalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  savingsAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  finalDiscount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBullet: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    width: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
