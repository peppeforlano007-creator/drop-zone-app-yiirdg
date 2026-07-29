
import { colors, layout } from '@/styles/commonStyles';
import React, { useEffect, useState, useCallback } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

interface Booking {
  id: string;
  product_id: string;
  drop_id: string;
  pickup_point_id: string;
  original_price: number;
  authorized_amount: number;
  discount_percentage: number;
  final_price: number;
  loyalty_discount: number;
  payment_status: string;
  status: 'active' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  products: { name: string; image_url: string } | null;
  drops: {
    name: string;
    current_discount: number;
    current_value: number;
    end_time: string;
    status: string;
    final_discount_percentage?: number | null;
    supplier_lists: {
      name: string;
      max_discount: number;
      min_discount: number;
      min_reservation_value: number;
      max_reservation_value: number;
    } | null;
  } | null;
  pickup_points: { name: string; address: string; city: string } | null;
  order_items: { pickup_status: string | null; picked_up_at: string | null }[];
}

interface PickupGroup {
  pickupPointId: string;
  pickupPointName: string;
  pickupPointAddress: string;
  bookings: Booking[];
  subtotal: number;
  allPickedUp: boolean;
}

interface DropGroup {
  dropId: string;
  dropName: string;
  dropStatus: string;
  pickupGroups: PickupGroup[];
  allPickedUp: boolean;
}

function buildDropGroups(bookings: Booking[]): DropGroup[] {
  const dropMap = new Map<string, DropGroup>();

  for (const booking of bookings) {
    const dropId = booking.drop_id;
    const drops = Array.isArray(booking.drops) ? booking.drops[0] : booking.drops;
    const dropName = drops?.name ?? 'Drop';
    const dropStatus = drops?.status ?? 'unknown';
    const pickupPointId = booking.pickup_point_id ?? 'unknown';
    const pickupPointName = booking.pickup_points?.name ?? 'Punto di ritiro';
    const pickupPointAddress = booking.pickup_points
      ? `${booking.pickup_points.address}, ${booking.pickup_points.city}`
      : '';

    if (!dropMap.has(dropId)) {
      dropMap.set(dropId, {
        dropId,
        dropName,
        dropStatus,
        pickupGroups: [],
        allPickedUp: false,
      });
    }

    const dropGroup = dropMap.get(dropId)!;
    let pickupGroup = dropGroup.pickupGroups.find(
      (pg) => pg.pickupPointId === pickupPointId
    );

    if (!pickupGroup) {
      pickupGroup = {
        pickupPointId,
        pickupPointName,
        pickupPointAddress,
        bookings: [],
        subtotal: 0,
        allPickedUp: false,
      };
      dropGroup.pickupGroups.push(pickupGroup);
    }

    pickupGroup.bookings.push(booking);
  }

  // Compute subtotals and allPickedUp flags
  for (const dropGroup of dropMap.values()) {
    for (const pg of dropGroup.pickupGroups) {
      pg.allPickedUp = pg.bookings.every(
        (b) => b.order_items[0]?.pickup_status === 'picked_up'
      );
      pg.subtotal = pg.bookings
        .filter((b) => b.order_items[0]?.pickup_status !== 'picked_up')
        .reduce((sum, b) => sum + (typeof b.final_price === 'number' ? b.final_price : 0), 0);
    }
    dropGroup.allPickedUp = dropGroup.pickupGroups.every((pg) => pg.allPickedUp);
  }

  const groups = Array.from(dropMap.values());

  // Sort: active first, then completed non-picked-up, then fully picked-up last
  groups.sort((a, b) => {
    const order = (g: DropGroup) => {
      if (g.allPickedUp) return 2;
      if (g.dropStatus === 'active') return 0;
      return 1;
    };
    return order(a) - order(b);
  });

  return groups;
}

function getDropBadgeLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'IN CORSO';
    case 'completed':
      return 'COMPLETATO';
    case 'expired':
      return 'SCADUTO';
    case 'underfunded':
      return 'NON FINANZIATO';
    case 'cancelled':
      return 'ANNULLATO';
    default:
      return status.toUpperCase();
  }
}

function getDropBadgeColor(status: string): string {
  switch (status) {
    case 'active':
      return colors.success;
    case 'completed':
      return colors.info;
    case 'expired':
    case 'underfunded':
    case 'cancelled':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const { user } = useAuth();
  const unreadCount = useUnreadNotifications();

  const loadBookings = useCallback(async () => {
    if (!user) {
      console.log('[MyBookings] No user, skipping bookings load');
      setLoading(false);
      return;
    }

    try {
      console.log('[MyBookings] Loading bookings for user:', user.id);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          products!bookings_product_id_fkey (name, image_url),
          drops (
            name, current_discount, current_value, end_time, status, final_discount_percentage,
            supplier_lists (name, max_discount, min_discount, min_reservation_value, max_reservation_value)
          ),
          pickup_points (name, address, city),
          order_items (pickup_status, picked_up_at)
        `)
        .eq('user_id', user.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MyBookings] Error loading bookings:', error);
        Alert.alert('Errore', 'Impossibile caricare le prenotazioni');
        return;
      }

      console.log('[MyBookings] Bookings loaded:', data?.length);
      setBookings((data as Booking[]) || []);
    } catch (err) {
      console.error('[MyBookings] Error in loadBookings:', err);
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
    console.log('[MyBookings] Pull-to-refresh triggered');
    setRefreshing(true);
    loadBookings();
  };

  const handleCancelBooking = (bookingId: string, productName: string) => {
    console.log('[MyBookings] Cancel booking pressed:', bookingId, productName);
    Alert.alert(
      'Annulla Prenotazione',
      `Sei sicuro di voler annullare la prenotazione per "${productName}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sì, annulla',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[MyBookings] Confirming cancel for booking:', bookingId);
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
                console.error('[MyBookings] Error cancelling booking:', error);
                Alert.alert('Errore', 'Impossibile annullare la prenotazione');
                return;
              }

              console.log('[MyBookings] Booking cancelled successfully:', bookingId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Prenotazione annullata con successo.');
              loadBookings();
            } catch (err) {
              console.error('[MyBookings] Error in handleCancelBooking:', err);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'confirmed': return colors.primary;
      case 'cancelled': return colors.error;
      case 'completed': return colors.info;
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Attiva';
      case 'confirmed': return 'Confermata';
      case 'cancelled': return 'Annullata';
      case 'completed': return 'Completata';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'authorized': return colors.info;
      case 'captured': return colors.success;
      case 'failed': return colors.error;
      case 'refunded': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'In Attesa';
      case 'authorized': return 'Autorizzato';
      case 'captured': return 'Addebitato';
      case 'failed': return 'Fallito';
      case 'refunded': return 'Rimborsato';
      default: return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Le Mie Prenotazioni', headerShown: true }} />
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
        <Stack.Screen options={{ title: 'Le Mie Prenotazioni', headerShown: true }} />
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="person.crop.circle.badge.exclamationmark"
            android_material_icon_name="account-circle"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>Accesso richiesto</Text>
          <Text style={styles.emptyText}>
            Effettua l&apos;accesso per visualizzare le tue prenotazioni
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const dropGroups = buildDropGroups(bookings);
  const activeGroups = dropGroups.filter((g) => !g.allPickedUp);
  const historyGroups = dropGroups.filter((g) => g.allPickedUp);

  // Total to pay: confirmed bookings not yet picked up
  const totalToPay = bookings
    .filter(
      (b) =>
        b.status === 'confirmed' &&
        b.order_items[0]?.pickup_status !== 'picked_up'
    )
    .reduce(
      (sum, b) => sum + (typeof b.final_price === 'number' ? b.final_price : 0),
      0
    );

  const bellCountText = unreadCount > 99 ? '99+' : String(unreadCount);

  const renderBookingRow = (booking: Booking) => {
    const drops = Array.isArray(booking.drops) ? booking.drops[0] : booking.drops;
    const isPickedUp = booking.order_items[0]?.pickup_status === 'picked_up';
    const productName = booking.products?.name ?? 'Prodotto';
    const dropStatus = drops?.status ?? 'unknown';
    const isDropCompleted = dropStatus === 'completed';
    const originalPrice = typeof booking.original_price === 'number' ? booking.original_price : 0;
    const finalPrice = typeof booking.final_price === 'number' ? booking.final_price : 0;
    const authorizedAmount = typeof booking.authorized_amount === 'number' ? booking.authorized_amount : 0;
    const dropFinalDiscount = drops?.final_discount_percentage;
    const loyaltyDiscount = Number(booking.loyalty_discount ?? 0);
    const rawDiscount = typeof booking.discount_percentage === 'number' ? booking.discount_percentage : 0;
    const discountPercentage = (isDropCompleted && dropFinalDiscount != null)
      ? Number(dropFinalDiscount)
      : Math.max(0, rawDiscount - loyaltyDiscount);
    const currentDiscount = drops?.current_discount ?? 0;
    const maxDiscount = drops?.supplier_lists?.max_discount ?? 100;
    const canCancel = booking.status === 'active' && dropStatus === 'active';
    const isRefunded = booking.payment_status === 'refunded';

    const discountBadgeText = `-${discountPercentage.toFixed(1)}%`;
    const originalPriceText = `€${originalPrice.toFixed(2)}`;
    const finalPriceText = `€${finalPrice.toFixed(2)}`;
    const authorizedAmountText = `€${authorizedAmount.toFixed(2)}`;
    const progressWidth = maxDiscount > 0 ? `${Math.min((currentDiscount / maxDiscount) * 100, 100)}%` as `${number}%` : '0%' as `${number}%`;

    console.log('[MyBookings] Rendering booking row:', {
      bookingId: booking.id,
      productName,
      isPickedUp,
      discountPercentage,
      loyaltyDiscount,
      finalPrice,
    });

    return (
      <View key={booking.id} style={styles.bookingRow}>
        {/* Product name + status badges */}
        <View style={styles.bookingRowHeader}>
          <Text style={styles.bookingProductName}>{productName}</Text>
          <View style={styles.rowBadges}>
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

        {/* Price line */}
        {isPickedUp ? (
          <View style={styles.pickedUpRow}>
            <Text style={styles.pickedUpBadge}>
              ✅ Ritirato
            </Text>
            <Text style={styles.pickedUpPrice}>{finalPriceText}</Text>
          </View>
        ) : (
          <View style={styles.priceLineRow}>
            <View style={styles.priceLineLeft}>
              <Text style={styles.originalPriceText}>{originalPriceText}</Text>
              <IconSymbol name="arrow.right" size={14} color="#888" style={styles.arrowIcon} />
              <Text style={styles.finalPriceInline}>{finalPriceText}</Text>
              {!isDropCompleted && discountPercentage > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{discountBadgeText}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Discount badges row */}
        {isDropCompleted && (
          <View style={styles.discountBadgesRow}>

            {loyaltyDiscount > 0 && (
              <View style={styles.loyaltyDiscountBadge}>
                <Text style={styles.loyaltyDiscountBadgeText}>
                  {'⭐ Fedeltà -'}{loyaltyDiscount.toFixed(1)}{'%'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Authorized amount (non-completed drops) */}
        {!isDropCompleted && (
          <View style={styles.authorizedRow}>
            <Text style={styles.authorizedLabel}>Importo prenotato:</Text>
            <Text style={[styles.authorizedValue, isRefunded && styles.refundedAmount]}>
              {authorizedAmountText}
              {isRefunded ? ' (Annullato)' : ''}
            </Text>
          </View>
        )}

        {/* Active drop progress bar */}
        {dropStatus === 'active' && !isPickedUp && (
          <View style={styles.discountProgress}>
            <Text style={styles.discountProgressLabel}>
              Sconto attuale: {currentDiscount.toFixed(1)}%
              {' '}(max {maxDiscount}%)
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.discountHint}>
              💡 Condividi il drop per aumentare lo sconto!
            </Text>
          </View>
        )}

        {/* Cancel button */}
        {canCancel && (
          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
            onPress={() => {
              console.log('[MyBookings] Cancel button pressed for booking:', booking.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleCancelBooking(booking.id, productName);
            }}
          >
            <IconSymbol
              ios_icon_name="xmark.circle"
              android_material_icon_name="cancel"
              size={16}
              color={colors.error}
            />
            <Text style={styles.cancelButtonText}>Annulla Prenotazione</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderPickupGroup = (pg: PickupGroup, dimmed: boolean) => {
    const subtotalText = `€${pg.subtotal.toFixed(2)}`;
    return (
      <View key={pg.pickupPointId} style={[styles.pickupGroup, dimmed && styles.dimmed]}>
        <View style={styles.pickupGroupHeader}>
          <IconSymbol
            ios_icon_name="mappin.circle.fill"
            android_material_icon_name="location-on"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.pickupGroupName}>{pg.pickupPointName}</Text>
          {pg.pickupPointAddress ? (
            <Text style={styles.pickupGroupAddress}>{pg.pickupPointAddress}</Text>
          ) : null}
        </View>

        {pg.bookings.map((b) => renderBookingRow(b))}

        {!pg.allPickedUp && (
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotale:</Text>
            <Text style={styles.subtotalValue}>{subtotalText}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderDropGroup = (group: DropGroup, dimmed: boolean) => {
    const badgeLabel = getDropBadgeLabel(group.dropStatus);
    const badgeColor = getDropBadgeColor(group.dropStatus);

    return (
      <View key={group.dropId} style={[styles.dropGroupCard, dimmed && styles.dimmed]}>
        <View style={styles.dropGroupHeader}>
          <Text style={styles.dropGroupIcon}>📦</Text>
          <Text style={styles.dropGroupName}>{group.dropName}</Text>
          <View style={[styles.dropBadge, { backgroundColor: badgeColor + '22' }]}>
            <Text style={[styles.dropBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>
        </View>

        {group.pickupGroups.map((pg) => renderPickupGroup(pg, dimmed))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Le Mie Prenotazioni',
          headerShown: true,
          headerRight: () => (
            <Pressable
              onPress={() => {
                console.log('[MyBookings] Bell icon pressed, navigating to notifications');
                router.push('/(tabs)/notifications');
              }}
              style={{ marginRight: 8, position: 'relative' }}
            >
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={24}
                color={colors.text}
              />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{bellCountText}</Text>
                </View>
              )}
            </Pressable>
          ),
        }}
      />

      {bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="bag"
            android_material_icon_name="shopping-bag"
            size={64}
            color={colors.textSecondary}
          />
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
          {/* Total to pay banner */}
          {totalToPay > 0 && (
            <View style={styles.totalBanner}>
              <Text style={styles.totalBannerLabel}>💰 TOTALE DA PAGARE AL RITIRO</Text>
              <Text style={styles.totalBannerAmount}>€{totalToPay.toFixed(2)}</Text>
            </View>
          )}

          {/* Active / non-picked-up drop groups */}
          {activeGroups.map((g) => renderDropGroup(g, false))}

          {/* History section */}
          {historyGroups.length > 0 && (
            <View style={styles.historySection}>
              <Pressable
                style={({ pressed }) => [
                  styles.historyHeader,
                  pressed && styles.historyHeaderPressed,
                ]}
                onPress={() => {
                  console.log('[MyBookings] History section toggled, expanded:', !historyExpanded);
                  setHistoryExpanded((v) => !v);
                }}
              >
                <Text style={styles.historySeparatorLine} />
                <Text style={styles.historyHeaderText}>
                  Ordini Ritirati ({historyGroups.length})
                </Text>
                <IconSymbol
                  ios_icon_name={historyExpanded ? 'chevron.up' : 'chevron.down'}
                  android_material_icon_name={historyExpanded ? 'expand-less' : 'expand-more'}
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>

              {historyExpanded &&
                historyGroups.map((g) => renderDropGroup(g, true))}
            </View>
          )}
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
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: layout.contentPaddingBottom,
  },

  // ── Total banner ──────────────────────────────────────────────
  totalBanner: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  totalBannerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  totalBannerAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Drop group card ───────────────────────────────────────────
  dropGroupCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundSecondary,
    gap: 8,
  },
  dropGroupIcon: {
    fontSize: 18,
  },
  dropGroupName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  dropBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dropBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Pickup group ──────────────────────────────────────────────
  pickupGroup: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickupGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    gap: 6,
  },
  pickupGroupName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  pickupGroupAddress: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // ── Booking row ───────────────────────────────────────────────
  bookingRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border + '80',
  },
  bookingRowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  bookingProductName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rowBadges: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Price line
  priceLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  originalPriceText: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  arrowIcon: {
    marginHorizontal: 4,
  },
  finalPriceInline: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  discountBadge: {
    backgroundColor: colors.success + '22',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  discountBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  dropDiscountBadge: {
    backgroundColor: '#10B98120',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dropDiscountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  loyaltyDiscountBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  loyaltyDiscountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B8860B',
  },

  // Picked up
  pickedUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pickedUpBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  pickedUpPrice: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },

  // Loyalty
  loyaltyLine: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
    marginBottom: 4,
  },

  // Authorized amount
  authorizedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  authorizedLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  authorizedValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  refundedAmount: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },

  // Progress bar
  discountProgress: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  discountProgressLabel: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 6,
  },
  progressBar: {
    height: 7,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
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
  },

  // Subtotal
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  // Cancel button
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '18',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },

  // History section
  historySection: {
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  historyHeaderPressed: {
    opacity: 0.6,
  },
  historySeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  historyHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 0,
  },

  // Dimmed (history items)
  dimmed: {
    opacity: 0.55,
  },

  // Bell badge
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
});
