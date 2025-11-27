
import { colors } from '@/styles/commonStyles';
import React, { useEffect, useState, useCallback } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
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
  } | null;
  drops: {
    name: string;
    current_discount: number;
    end_time: string;
    status: string;
    supplier_lists: {
      name: string;
      max_discount: number;
    } | null;
  } | null;
}

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const loadBookings = useCallback(async () => {
    if (!user) {
      console.log('No user, skipping bookings load');
      setLoading(false);
      return;
    }

    try {
      console.log('Loading bookings for user:', user.id);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading bookings:', error);
        Alert.alert('Errore', 'Impossibile caricare le prenotazioni');
        return;
      }

      console.log('Bookings loaded:', data?.length);
      setBookings(data || []);
    } catch (error) {
      console.error('Error in loadBookings:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleCancelBooking = (bookingId: string, productName: string) => {
    Alert.alert(
      'Annulla Prenotazione',
      `Sei sicuro di voler annullare la prenotazione per "${productName}"?\n\nL'importo bloccato verrà rilasciato.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sì, annulla',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
                Alert.alert('Errore', 'Impossibile annullare la prenotazione');
                return;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Prenotazione annullata. L\'importo verrà rilasciato.');
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
      case 'active':
        return colors.success;
      case 'confirmed':
        return colors.primary;
      case 'cancelled':
        return colors.error;
      case 'completed':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Attiva';
      case 'confirmed':
        return 'Confermata';
      case 'cancelled':
        return 'Annullata';
      case 'completed':
        return 'Completata';
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'authorized':
        return colors.info;
      case 'captured':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'refunded':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'In Attesa';
      case 'authorized':
        return 'Autorizzato';
      case 'captured':
        return 'Addebitato';
      case 'failed':
        return 'Fallito';
      case 'refunded':
        return 'Rimborsato';
      default:
        return status;
    }
  };

  const getDropStatusMessage = (drop: any) => {
    if (!drop) return null;
    
    if (drop.status === 'underfunded') {
      return {
        text: '⚠️ Drop non finanziato - Fondi rilasciati',
        color: '#FF6B35',
        description: 'Questo drop non ha raggiunto l\'ordine minimo. L\'importo bloccato è stato rilasciato sulla tua carta.',
      };
    }
    if (drop.status === 'expired') {
      return {
        text: '⏰ Drop scaduto',
        color: colors.error,
        description: 'Questo drop è scaduto senza raggiungere l\'obiettivo.',
      };
    }
    if (drop.status === 'cancelled') {
      return {
        text: '❌ Drop annullato',
        color: colors.error,
        description: 'Questo drop è stato annullato.',
      };
    }
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Le Mie Prenotazioni',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento prenotazioni...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Le Mie Prenotazioni',
            headerShown: true,
          }}
        />
        <View style={styles.emptyContainer}>
          <IconSymbol ios_icon_name="person.crop.circle.badge.exclamationmark" android_material_icon_name="account_circle" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Accesso richiesto</Text>
          <Text style={styles.emptyText}>
            Effettua l&apos;accesso per visualizzare le tue prenotazioni
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Le Mie Prenotazioni',
          headerShown: true,
        }}
      />

      {bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol ios_icon_name="bag" android_material_icon_name="shopping_bag" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Nessuna prenotazione</Text>
          <Text style={styles.emptyText}>
            Le tue prenotazioni appariranno qui quando prenoti un prodotto in un drop attivo
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {bookings.map((booking) => {
            const dropStatusMessage = getDropStatusMessage(booking.drops);
            const canCancel = booking.status === 'active' && booking.payment_status === 'authorized';
            const isRefunded = booking.payment_status === 'refunded';
            
            // Safe access to nested properties with null checks and fallbacks
            const productName = booking.products?.name || 'Prodotto';
            const dropName = booking.drops?.name || 'Drop';
            const supplierName = booking.drops?.supplier_lists?.name || 'Fornitore';
            const currentDiscount = booking.drops?.current_discount ?? 0;
            const maxDiscount = booking.drops?.supplier_lists?.max_discount ?? 100;
            const dropStatus = booking.drops?.status || 'unknown';
            
            // Safe number handling with fallbacks
            const originalPrice = typeof booking.original_price === 'number' ? booking.original_price : 0;
            const authorizedAmount = typeof booking.authorized_amount === 'number' ? booking.authorized_amount : 0;
            const discountPercentage = typeof booking.discount_percentage === 'number' ? booking.discount_percentage : 0;
            const finalPrice = typeof booking.final_price === 'number' ? booking.final_price : 0;

            return (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.productName}>{productName}</Text>
                    <Text style={styles.dropName}>
                      Drop: {dropName}
                    </Text>
                    <Text style={styles.supplierName}>
                      {supplierName}
                    </Text>
                  </View>
                  <View style={styles.statusBadges}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {getStatusText(booking.status)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(booking.payment_status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getPaymentStatusColor(booking.payment_status) }]}>
                        {getPaymentStatusText(booking.payment_status)}
                      </Text>
                    </View>
                  </View>
                </View>

                {dropStatusMessage && (
                  <View style={[styles.dropStatusMessage, { backgroundColor: dropStatusMessage.color + '20' }]}>
                    <Text style={[styles.dropStatusText, { color: dropStatusMessage.color }]}>
                      {dropStatusMessage.text}
                    </Text>
                    <Text style={styles.dropStatusDescription}>
                      {dropStatusMessage.description}
                    </Text>
                  </View>
                )}

                <View style={styles.priceInfo}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Prezzo originale:</Text>
                    <Text style={styles.priceValue}>€{originalPrice.toFixed(2)}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Sconto prenotazione:</Text>
                    <Text style={styles.discountValue}>{discountPercentage.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Importo bloccato:</Text>
                    <Text style={[styles.priceValue, isRefunded && styles.refundedAmount]}>
                      €{authorizedAmount.toFixed(2)}
                      {isRefunded && ' (Rilasciato)'}
                    </Text>
                  </View>
                  {finalPrice > 0 && (
                    <View style={[styles.priceRow, styles.finalPriceRow]}>
                      <Text style={styles.finalPriceLabel}>Importo finale:</Text>
                      <Text style={styles.finalPriceValue}>€{finalPrice.toFixed(2)}</Text>
                    </View>
                  )}
                </View>

                {dropStatus === 'active' && (
                  <View style={styles.discountProgress}>
                    <Text style={styles.discountProgressLabel}>
                      Sconto attuale: {currentDiscount.toFixed(1)}% 
                      {' '}(max {maxDiscount}%)
                    </Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${(currentDiscount / maxDiscount) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.discountHint}>
                      💡 Condividi il drop per aumentare lo sconto!
                    </Text>
                  </View>
                )}

                {canCancel && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.cancelButtonPressed,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleCancelBooking(booking.id, productName);
                    }}
                  >
                    <IconSymbol
                      ios_icon_name="xmark.circle"
                      android_material_icon_name="cancel"
                      size={18}
                      color={colors.error}
                    />
                    <Text style={styles.cancelButtonText}>Annulla Prenotazione</Text>
                  </Pressable>
                )}

                <Text style={styles.bookingDate}>
                  Prenotato il {new Date(booking.created_at).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })}
        </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'System',
  },
  dropName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
    fontFamily: 'System',
  },
  supplierName: {
    fontSize: 13,
    color: colors.textTertiary,
    fontFamily: 'System',
  },
  statusBadges: {
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  dropStatusMessage: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  dropStatusText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: 'System',
  },
  dropStatusDescription: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'System',
  },
  priceInfo: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'System',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
    fontFamily: 'System',
  },
  refundedAmount: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  finalPriceRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 0,
  },
  finalPriceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'System',
  },
  finalPriceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'System',
  },
  discountProgress: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  discountProgressLabel: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'System',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  discountHint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '20',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    fontFamily: 'System',
  },
  bookingDate: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    fontFamily: 'System',
  },
});
