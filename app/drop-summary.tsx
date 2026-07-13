
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors, layout } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';

interface BookingItem {
  id: string;
  product_id: string;
  original_price: number;
  final_price: number;
  discount_percentage: number;
  loyalty_discount: number;
  status: string;
  pickup_point_id: string;
  products: {
    id: string;
    name: string;
    image_url: string | null;
  };
}

interface Drop {
  id: string;
  name: string;
  completed_at: string | null;
  current_discount: number;
}

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  city: string;
}

export default function DropSummaryScreen() {
  const { dropId } = useLocalSearchParams<{ dropId: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [pickupPoint, setPickupPoint] = useState<PickupPoint | null>(null);

  const loadData = useCallback(async () => {
    if (!user || !dropId) return;

    console.log('[DropSummary] Loading data for dropId:', dropId, 'userId:', user.id);

    try {
      const [dropResult, bookingsResult] = await Promise.all([
        supabase
          .from('drops')
          .select('id, name, completed_at, current_discount')
          .eq('id', dropId)
          .single(),
        supabase
          .from('bookings')
          .select('id, product_id, original_price, final_price, discount_percentage, loyalty_discount, status, pickup_point_id, products(id, name, image_url)')
          .eq('drop_id', dropId)
          .eq('user_id', user.id)
          .eq('status', 'confirmed'),
      ]);

      if (dropResult.error) {
        console.error('[DropSummary] Error loading drop:', dropResult.error);
        Alert.alert('Errore', 'Impossibile caricare i dettagli del drop.');
        return;
      }

      if (bookingsResult.error) {
        console.error('[DropSummary] Error loading bookings:', bookingsResult.error);
        Alert.alert('Errore', 'Impossibile caricare le prenotazioni.');
        return;
      }

      console.log('[DropSummary] Drop loaded:', dropResult.data?.name);
      console.log('[DropSummary] Bookings loaded:', bookingsResult.data?.length, 'items');

      setDrop(dropResult.data);
      const bookingItems = (bookingsResult.data || []) as BookingItem[];
      setBookings(bookingItems);

      // Load pickup point from first booking
      if (bookingItems.length > 0 && bookingItems[0].pickup_point_id) {
        const pickupId = bookingItems[0].pickup_point_id;
        console.log('[DropSummary] Loading pickup point:', pickupId);

        const { data: ppData, error: ppError } = await supabase
          .from('pickup_points')
          .select('id, name, address, city')
          .eq('id', pickupId)
          .single();

        if (ppError) {
          console.error('[DropSummary] Error loading pickup point:', ppError);
        } else {
          console.log('[DropSummary] Pickup point loaded:', ppData?.name);
          setPickupPoint(ppData);
        }
      }
    } catch (err) {
      console.error('[DropSummary] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, dropId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGoToBookings = () => {
    console.log('[DropSummary] CTA pressed: navigating to my-bookings');
    router.push('/(tabs)/my-bookings');
  };

  const handleBack = () => {
    console.log('[DropSummary] Back button pressed');
    router.back();
  };

  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.final_price), 0);
  const totalSavings = bookings.reduce(
    (sum, b) => sum + (Number(b.original_price) - Number(b.final_price)),
    0
  );

  const completedAtDisplay = drop?.completed_at
    ? new Date(drop.completed_at).toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const totalAmountDisplay = totalAmount.toFixed(2);
  const totalSavingsDisplay = totalSavings.toFixed(2);

  // Loyalty discount: prendi il valore dalla prima booking (è uguale per tutte le booking dello stesso utente)
  const loyaltyDiscount = bookings.length > 0 ? Number(bookings[0].loyalty_discount ?? 0) : 0;
  const hasLoyaltyDiscount = loyaltyDiscount > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={styles.loadingText}>Caricamento riepilogo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="chevron_left"
            size={24}
            color={colors.text}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Riepilogo Ordine</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Drop info */}
        <View style={styles.dropInfoCard}>
          <Text style={styles.dropName}>{drop?.name ?? '—'}</Text>
          <View style={styles.dropDateRow}>
            <IconSymbol
              ios_icon_name="checkmark.seal.fill"
              android_material_icon_name="verified"
              size={16}
              color={colors.success}
            />
            <Text style={styles.dropDateLabel}>Completato il</Text>
            <Text style={styles.dropDateValue}>{completedAtDisplay}</Text>
          </View>
        </View>

        {/* Items list */}
        <Text style={styles.sectionTitle}>Articoli Prenotati</Text>

        {bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nessuna prenotazione confermata per questo drop.</Text>
          </View>
        ) : (
          bookings.map((booking) => {
            const productName = booking.products?.name ?? 'Prodotto';
            const originalPrice = Number(booking.original_price).toFixed(2);
            const finalPrice = Number(booking.final_price).toFixed(2);
            const savings = (Number(booking.original_price) - Number(booking.final_price)).toFixed(2);
            const discountPct = Number(booking.discount_percentage);

            return (
              <View key={booking.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{productName}</Text>
                  {discountPct > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>
                        {'-'}
                        {discountPct}
                        {'%'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.itemPriceRow}>
                  <Text style={styles.originalPrice}>
                    {'€'}
                    {originalPrice}
                  </Text>
                  <Text style={styles.finalPrice}>
                    {'€'}
                    {finalPrice}
                  </Text>
                </View>
                {Number(savings) > 0 && (
                  <Text style={styles.savingsText}>
                    {'Risparmi €'}
                    {savings}
                  </Text>
                )}
              </View>
            );
          })
        )}

        {/* Loyalty discount section */}
        {hasLoyaltyDiscount && (
          <View style={styles.loyaltyCard}>
            <View style={styles.loyaltyIconRow}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={20}
                color="#F5A623"
              />
              <Text style={styles.loyaltyTitle}>Sconto Fedeltà Applicato</Text>
            </View>
            <Text style={styles.loyaltyDetail}>
              {'Sconto attivo: '}
              {loyaltyDiscount}
              {'%'}
            </Text>
          </View>
        )}

        {/* Total box */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>TOTALE DA PAGARE AL RITIRO</Text>
          <Text style={styles.totalAmount}>
            {'€'}
            {totalAmountDisplay}
          </Text>
          {totalSavings > 0 && (
            <Text style={styles.totalSavings}>
              {'Hai risparmiato €'}
              {totalSavingsDisplay}
              {' in totale'}
            </Text>
          )}
        </View>

        {/* Pickup point */}
        {pickupPoint && (
          <View style={styles.pickupCard}>
            <View style={styles.pickupIconRow}>
              <IconSymbol
                ios_icon_name="mappin.circle.fill"
                android_material_icon_name="location_on"
                size={20}
                color={colors.text}
              />
              <Text style={styles.pickupTitle}>Punto di Ritiro</Text>
            </View>
            <Text style={styles.pickupName}>{pickupPoint.name}</Text>
            <Text style={styles.pickupAddress}>
              {pickupPoint.address}
            </Text>
            <Text style={styles.pickupCity}>{pickupPoint.city}</Text>
          </View>
        )}

        {/* CTA */}
        <Pressable style={styles.ctaButton} onPress={handleGoToBookings}>
          <Text style={styles.ctaButtonText}>Vai alle mie prenotazioni</Text>
        </Pressable>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: layout.contentPaddingBottom,
    gap: 16,
  },
  dropInfoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  dropName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  dropDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropDateLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dropDateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: -4,
  },
  emptyCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  discountBadge: {
    backgroundColor: '#10B98120',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  finalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  savingsText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '500',
  },
  loyaltyCard: {
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5A62340',
    gap: 6,
  },
  loyaltyIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loyaltyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B8860B',
  },
  loyaltyDetail: {
    fontSize: 14,
    color: '#B8860B',
    fontWeight: '500',
  },
  totalBox: {
    backgroundColor: colors.text,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    textAlign: 'center',
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  totalSavings: {
    fontSize: 13,
    color: '#A8F0C8',
    fontWeight: '500',
    textAlign: 'center',
  },
  pickupCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  pickupIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pickupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  pickupName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  pickupAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  pickupCity: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  ctaButton: {
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
