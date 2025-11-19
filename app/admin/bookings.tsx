
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { errorHandler } from '@/utils/errorHandler';

interface BookingData {
  id: string;
  user_id: string;
  product_id: string;
  drop_id: string;
  original_price: number;
  authorized_amount: number;
  discount_percentage: number;
  final_price: number;
  payment_status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
  status: 'active' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  products: {
    name: string;
    image_url: string;
  };
  drops: {
    name: string;
    status: string;
  };
}

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'confirmed' | 'cancelled' | 'completed'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded'>('all');

  const filterBookings = useCallback(() => {
    let filtered = bookings;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(booking => booking.payment_status === paymentFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.profiles?.full_name?.toLowerCase().includes(query) ||
        booking.profiles?.email?.toLowerCase().includes(query) ||
        booking.products?.name?.toLowerCase().includes(query) ||
        booking.drops?.name?.toLowerCase().includes(query)
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, searchQuery, statusFilter, paymentFilter]);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [filterBookings]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles (
            full_name,
            email
          ),
          products (
            name,
            image_url
          ),
          drops (
            name,
            status
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error loading bookings:', error);
        errorHandler.handleSupabaseError(error, { context: 'load_bookings' });
        return;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.info;
      case 'confirmed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      case 'completed':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
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
        return colors.textTertiary;
      default:
        return colors.textSecondary;
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'In Attesa';
      case 'authorized':
        return 'Autorizzato';
      case 'captured':
        return 'Pagato';
      case 'failed':
        return 'Fallito';
      case 'refunded':
        return 'Rimborsato';
      default:
        return status;
    }
  };

  const renderBooking = (booking: BookingData) => {
    return (
      <Pressable
        key={booking.id}
        style={({ pressed }) => [
          styles.bookingCard,
          pressed && styles.bookingCardPressed,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert('Prenotazione', `ID: ${booking.id}`);
        }}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingUser}>{booking.profiles?.full_name || 'N/A'}</Text>
            <Text style={styles.bookingEmail}>{booking.profiles?.email || 'N/A'}</Text>
            <Text style={styles.bookingProduct}>
              Prodotto: {booking.products?.name || 'N/A'}
            </Text>
            <Text style={styles.bookingDrop}>
              Drop: {booking.drops?.name || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.priceRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Prezzo Originale</Text>
              <Text style={styles.priceValue}>€{booking.original_price.toFixed(2)}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Sconto</Text>
              <Text style={[styles.priceValue, { color: colors.success }]}>
                {booking.discount_percentage}%
              </Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Prezzo Finale</Text>
              <Text style={[styles.priceValue, { color: colors.primary }]}>
                €{booking.final_price.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bookingFooter}>
          <View style={styles.badges}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                {getStatusLabel(booking.status)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(booking.payment_status) + '20' }]}>
              <Text style={[styles.statusText, { color: getPaymentStatusColor(booking.payment_status) }]}>
                {getPaymentStatusLabel(booking.payment_status)}
              </Text>
            </View>
          </View>
          <Text style={styles.bookingDate}>
            {new Date(booking.created_at).toLocaleDateString('it-IT')}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento prenotazioni...</Text>
      </View>
    );
  }

  const totalValue = filteredBookings.reduce((sum, b) => sum + b.final_price, 0);
  const capturedValue = filteredBookings
    .filter(b => b.payment_status === 'captured')
    .reduce((sum, b) => sum + b.final_price, 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gestisci Prenotazioni',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={20}
              color={colors.textTertiary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca prenotazioni..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <Text style={styles.filterLabel}>Stato:</Text>
            {[
              { key: 'all', label: 'Tutti' },
              { key: 'active', label: 'Attive' },
              { key: 'confirmed', label: 'Confermate' },
              { key: 'completed', label: 'Completate' },
              { key: 'cancelled', label: 'Annullate' },
            ].map((item) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.filterButton,
                  statusFilter === item.key && styles.filterButtonActive,
                  pressed && styles.filterButtonPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStatusFilter(item.key as any);
                }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    statusFilter === item.key && styles.filterButtonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

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
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Totale Prenotazioni</Text>
              <Text style={styles.summaryValue}>{filteredBookings.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Valore Totale</Text>
              <Text style={styles.summaryValue}>€{totalValue.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Valore Pagato</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                €{capturedValue.toFixed(2)}
              </Text>
            </View>
          </View>

          {filteredBookings.length > 0 ? (
            filteredBookings.map(renderBooking)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="cart"
                android_material_icon_name="shopping_cart"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessuna prenotazione trovata</Text>
              <Text style={styles.emptyText}>
                Prova a modificare i filtri di ricerca
              </Text>
            </View>
          )}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  filterContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonPressed: {
    opacity: 0.7,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  bookingHeader: {
    marginBottom: 12,
  },
  bookingInfo: {
    gap: 4,
  },
  bookingUser: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  bookingEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bookingProduct: {
    fontSize: 14,
    color: colors.text,
    marginTop: 4,
  },
  bookingDrop: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  bookingDetails: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bookingDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
