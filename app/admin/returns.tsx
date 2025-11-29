
import React, { useState, useEffect, useCallback } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { errorHandler, ErrorCategory, ErrorSeverity } from '@/utils/errorHandler';

interface ReturnData {
  id: string;
  order_id: string;
  product_name: string;
  selected_size?: string;
  selected_color?: string;
  final_price: number;
  returned_at: string;
  return_reason?: string;
  user_id: string;
  user_name: string;
  user_email: string;
  pickup_point_id: string;
  pickup_point_name: string;
  pickup_point_city: string;
  order_number: string;
}

interface PickupPointStats {
  id: string;
  name: string;
  city: string;
  total_returns: number;
  total_value: number;
}

export default function ReturnsScreen() {
  const [returns, setReturns] = useState<ReturnData[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<ReturnData[]>([]);
  const [pickupPointStats, setPickupPointStats] = useState<PickupPointStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<string>('all');

  const filterReturns = useCallback(() => {
    let filtered = returns;

    if (selectedPickupPoint !== 'all') {
      filtered = filtered.filter(ret => ret.pickup_point_id === selectedPickupPoint);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ret =>
        ret.user_name?.toLowerCase().includes(query) ||
        ret.user_email?.toLowerCase().includes(query) ||
        ret.product_name?.toLowerCase().includes(query) ||
        ret.order_number?.toLowerCase().includes(query) ||
        ret.pickup_point_name?.toLowerCase().includes(query)
      );
    }

    setFilteredReturns(filtered);
  }, [returns, searchQuery, selectedPickupPoint]);

  useEffect(() => {
    loadReturns();
  }, []);

  useEffect(() => {
    filterReturns();
  }, [filterReturns]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      
      console.log('Loading returns...');
      
      // Load all returned order items
      const { data: returnedItems, error: returnsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('returned_to_sender', true)
        .order('returned_at', { ascending: false })
        .limit(500);

      if (returnsError) {
        console.error('Error loading returns:', returnsError);
        errorHandler.handleSupabaseError(returnsError, { context: 'load_returns' });
        return;
      }

      console.log('Returns loaded:', returnedItems?.length || 0);

      if (!returnedItems || returnedItems.length === 0) {
        setReturns([]);
        setPickupPointStats([]);
        return;
      }

      // Get unique IDs for batch loading
      const userIds = [...new Set(returnedItems.map(r => r.user_id))];
      const orderIds = [...new Set(returnedItems.map(r => r.order_id))];

      console.log('Loading related data...');
      console.log('- Users:', userIds.length);
      console.log('- Orders:', orderIds.length);

      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (usersError) {
        console.error('Error loading users:', usersError);
      }

      // Load orders to get pickup point info
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, pickup_point_id')
        .in('id', orderIds);

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
      }

      // Get pickup point IDs
      const pickupPointIds = [...new Set(ordersData?.map(o => o.pickup_point_id) || [])];

      // Load pickup points
      const { data: pickupPointsData, error: pickupPointsError } = await supabase
        .from('pickup_points')
        .select('id, name, city')
        .in('id', pickupPointIds);

      if (pickupPointsError) {
        console.error('Error loading pickup points:', pickupPointsError);
      }

      // Create maps for quick lookup
      const usersMap = new Map(usersData?.map(u => [u.user_id, u]) || []);
      const ordersMap = new Map(ordersData?.map(o => [o.id, o]) || []);
      const pickupPointsMap = new Map(pickupPointsData?.map(p => [p.id, p]) || []);

      // Enrich returns with related data
      const enrichedReturns: ReturnData[] = returnedItems.map(item => {
        const user = usersMap.get(item.user_id);
        const order = ordersMap.get(item.order_id);
        const pickupPoint = order ? pickupPointsMap.get(order.pickup_point_id) : null;

        return {
          id: item.id,
          order_id: item.order_id,
          product_name: item.product_name || 'N/A',
          selected_size: item.selected_size,
          selected_color: item.selected_color,
          final_price: item.final_price || 0,
          returned_at: item.returned_at || item.created_at,
          return_reason: item.return_reason,
          user_id: item.user_id,
          user_name: user?.full_name || 'N/A',
          user_email: user?.email || 'N/A',
          pickup_point_id: order?.pickup_point_id || '',
          pickup_point_name: pickupPoint?.name || 'N/A',
          pickup_point_city: pickupPoint?.city || 'N/A',
          order_number: order?.order_number || 'N/A',
        };
      });

      console.log('Returns enriched successfully');

      // Calculate stats by pickup point
      const statsMap = new Map<string, PickupPointStats>();
      
      enrichedReturns.forEach(ret => {
        if (!ret.pickup_point_id) return;
        
        if (statsMap.has(ret.pickup_point_id)) {
          const stats = statsMap.get(ret.pickup_point_id)!;
          stats.total_returns += 1;
          stats.total_value += ret.final_price;
        } else {
          statsMap.set(ret.pickup_point_id, {
            id: ret.pickup_point_id,
            name: ret.pickup_point_name,
            city: ret.pickup_point_city,
            total_returns: 1,
            total_value: ret.final_price,
          });
        }
      });

      const stats = Array.from(statsMap.values()).sort((a, b) => b.total_returns - a.total_returns);

      setReturns(enrichedReturns);
      setPickupPointStats(stats);
    } catch (error) {
      console.error('Error loading returns:', error);
      errorHandler.handleError(
        'Errore imprevisto durante il caricamento dei resi',
        ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM,
        { context: 'load_returns' },
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReturns();
  };

  const renderReturn = (returnItem: ReturnData) => {
    return (
      <Pressable
        key={returnItem.id}
        style={({ pressed }) => [
          styles.returnCard,
          pressed && styles.returnCardPressed,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert(
            'Dettagli Reso',
            `Ordine: ${returnItem.order_number}\n\nCliente: ${returnItem.user_name}\nEmail: ${returnItem.user_email}\n\nProdotto: ${returnItem.product_name}\nTaglia: ${returnItem.selected_size || 'N/A'}\nColore: ${returnItem.selected_color || 'N/A'}\n\nValore: €${returnItem.final_price.toFixed(2)}\n\nPunto di Ritiro: ${returnItem.pickup_point_name} - ${returnItem.pickup_point_city}\n\nMotivo: ${returnItem.return_reason || 'Non specificato'}\n\nData: ${new Date(returnItem.returned_at).toLocaleString('it-IT')}`
          );
        }}
      >
        <View style={styles.returnHeader}>
          <View style={styles.returnInfo}>
            <Text style={styles.returnProduct}>{returnItem.product_name}</Text>
            <Text style={styles.returnDetail}>
              <IconSymbol 
                ios_icon_name="person.fill" 
                android_material_icon_name="person" 
                size={12} 
                color={colors.textSecondary} 
              />
              {' '}{returnItem.user_name}
            </Text>
            <Text style={styles.returnDetail}>
              <IconSymbol 
                ios_icon_name="envelope.fill" 
                android_material_icon_name="email" 
                size={12} 
                color={colors.textSecondary} 
              />
              {' '}{returnItem.user_email}
            </Text>
            <Text style={styles.returnDetail}>
              <IconSymbol 
                ios_icon_name="mappin.circle.fill" 
                android_material_icon_name="location_on" 
                size={12} 
                color={colors.textSecondary} 
              />
              {' '}{returnItem.pickup_point_name} - {returnItem.pickup_point_city}
            </Text>
            {returnItem.return_reason && (
              <Text style={styles.returnReason}>
                Motivo: {returnItem.return_reason}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.returnFooter}>
          <View style={styles.returnPrice}>
            <Text style={styles.priceLabel}>Valore</Text>
            <Text style={styles.priceValue}>€{returnItem.final_price.toFixed(2)}</Text>
          </View>
          <Text style={styles.returnDate}>
            {new Date(returnItem.returned_at).toLocaleDateString('it-IT')}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderPickupPointStats = () => {
    if (pickupPointStats.length === 0) return null;

    return (
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Resi per Punto di Ritiro</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollContent}
        >
          {pickupPointStats.map((stat) => (
            <Pressable
              key={stat.id}
              style={({ pressed }) => [
                styles.statCard,
                selectedPickupPoint === stat.id && styles.statCardSelected,
                pressed && styles.statCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPickupPoint(selectedPickupPoint === stat.id ? 'all' : stat.id);
              }}
            >
              <Text style={styles.statName}>{stat.name}</Text>
              <Text style={styles.statCity}>{stat.city}</Text>
              <View style={styles.statValues}>
                <View style={styles.statValueItem}>
                  <Text style={styles.statValueNumber}>{stat.total_returns}</Text>
                  <Text style={styles.statValueLabel}>Resi</Text>
                </View>
                <View style={styles.statValueItem}>
                  <Text style={[styles.statValueNumber, { color: colors.error }]}>
                    €{stat.total_value.toFixed(0)}
                  </Text>
                  <Text style={styles.statValueLabel}>Valore</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento resi...</Text>
      </View>
    );
  }

  const totalReturns = filteredReturns.length;
  const totalValue = filteredReturns.reduce((sum, r) => sum + r.final_price, 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Visualizza Resi',
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
              placeholder="Cerca resi..."
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

        {renderPickupPointStats()}

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
              <Text style={styles.summaryLabel}>Totale Resi</Text>
              <Text style={styles.summaryValue}>{totalReturns}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Valore Totale</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                €{totalValue.toFixed(2)}
              </Text>
            </View>
          </View>

          {filteredReturns.length > 0 ? (
            filteredReturns.map(renderReturn)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="arrow.uturn.backward.circle"
                android_material_icon_name="assignment_return"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessun reso trovato</Text>
              <Text style={styles.emptyText}>
                {returns.length === 0 
                  ? 'Non ci sono ancora resi nel sistema'
                  : 'Prova a modificare i filtri di ricerca'}
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
  statsSection: {
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statsScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + '10',
  },
  statCardPressed: {
    opacity: 0.7,
  },
  statName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statCity: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  statValues: {
    flexDirection: 'row',
    gap: 16,
  },
  statValueItem: {
    alignItems: 'center',
  },
  statValueNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statValueLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
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
  returnCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  returnCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  returnHeader: {
    marginBottom: 12,
  },
  returnInfo: {
    gap: 6,
  },
  returnProduct: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  returnDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  returnReason: {
    fontSize: 13,
    color: colors.error,
    fontStyle: 'italic',
    marginTop: 4,
  },
  returnFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  returnPrice: {
    alignItems: 'flex-start',
  },
  priceLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
  },
  returnDate: {
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
