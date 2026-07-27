
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import { getLoyaltyLevel } from '@/utils/loyaltyHelpers';

interface OrderItem {
  id: string;
  product_name: string;
  selected_size?: string;
  selected_color?: string;
  final_price: number;
  user_id: string;
  customer_name?: string;
  customer_phone?: string;
  picked_up_at?: string;
  returned_to_sender?: boolean;
  returned_at?: string;
}

interface Order {
  id: string;
  order_number: string;
  order_items: OrderItem[];
}

export default function ReturnsScreen() {
  const { user } = useAuth();
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [customerFilter, setCustomerFilter] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCustomerFilter('');
  }, [order]);

  const searchOrder = useCallback(async (query?: string) => {
    const q = String(query ?? orderNumber ?? '').trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setOrder(null);
      return;
    }
    if (!user?.pickupPointId) return;

    try {
      setLoading(true);
      console.log('[searchOrder] Ricerca live per query:', q);

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_items (
            id,
            product_name,
            selected_size,
            selected_color,
            final_price,
            user_id,
            picked_up_at,
            returned_to_sender
          )
        `)
        .ilike('order_number', `%${q}%`)
        .eq('pickup_point_id', user.pickupPointId)
        .limit(10);

      if (ordersError || !ordersData || ordersData.length === 0) {
        console.log('[searchOrder] Nessun risultato per query:', q);
        setSearchResults([]);
        setOrder(null);
        return;
      }

      console.log('[searchOrder] Trovati', ordersData.length, 'ordini per query:', q);

      // Enrich all orders with customer data
      const enriched: Order[] = [];
      for (const orderData of ordersData) {
        const userIds = [...new Set(orderData.order_items.map((item: any) => item.user_id).filter(Boolean))];
        let profileMap = new Map();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, phone')
            .in('user_id', userIds);
          profiles?.forEach((p: any) => profileMap.set(p.user_id, p));
        }
        enriched.push({
          ...orderData,
          order_items: orderData.order_items.map((item: any) => ({
            ...item,
            customer_name: profileMap.get(item.user_id)?.full_name || 'Cliente',
            customer_phone: profileMap.get(item.user_id)?.phone || 'N/A',
          })),
        });
      }

      if (enriched.length === 1) {
        setOrder(enriched[0]);
        setSearchResults([]);
      } else {
        setSearchResults(enriched);
        setOrder(null);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Error searching order:', error);
    } finally {
      setLoading(false);
    }
  }, [orderNumber, user?.pickupPointId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchOrder(orderNumber);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [orderNumber]);

  const handleReturnItem = async (item: OrderItem) => {
    console.log('[handleReturnItem] Registra Reso pressed for item:', item.id, 'picked_up_at:', item.picked_up_at);
    if (item.returned_to_sender) {
      Alert.alert('Errore', 'Questo articolo è già stato segnato come reso');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    console.log('[Returns] Conferma reso richiesta per articolo:', item.id, 'prodotto:', item.product_name, 'utente:', item.user_id);

    Alert.alert(
      'Conferma Reso',
      `Confermi il reso di "${item.product_name}" per ${item.customer_name}?\n\nQuesta azione:\n- Scalerà i punti fedeltà guadagnati su questo articolo\n- Registrerà il reso nel profilo del cliente`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma Reso',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(item.id);
              console.log('[Returns] Avvio reso diretto per articolo:', item.id, 'prezzo:', item.final_price);

              // 1. Mark item as returned
              const { error: itemError } = await supabase
                .from('order_items')
                .update({ returned_to_sender: true, returned_at: new Date().toISOString() })
                .eq('id', item.id);

              if (itemError) {
                console.error('[Returns] Errore aggiornamento order_items:', itemError);
                Alert.alert('Errore', 'Impossibile aggiornare l\'articolo');
                return;
              }
              console.log('[Returns] Articolo marcato come reso:', item.id);

              // 2. Deduct loyalty points (= final_price rounded)
              const pointsToDeduct = Math.round(Number(item.final_price) || 0);
              console.log('[Returns] Punti fedeltà da scalare:', pointsToDeduct, 'per utente:', item.user_id);

              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('loyalty_points')
                .eq('user_id', item.user_id)
                .single();

              if (!profileError && profileData) {
                const currentPoints = profileData.loyalty_points || 0;
                const newPoints = Math.max(0, currentPoints - pointsToDeduct);
                const newLevel = getLoyaltyLevel(newPoints);
                console.log('[Returns] Aggiornamento punti fedeltà:', currentPoints, '->', newPoints, 'livello:', newLevel);
                await supabase
                  .from('profiles')
                  .update({ loyalty_points: newPoints, points_total: newPoints, points_balance: newPoints, loyalty_level: newLevel })
                  .eq('user_id', item.user_id);
              } else if (profileError) {
                console.warn('[Returns] Impossibile caricare profilo per punti fedeltà:', profileError);
              }

              // 3. Send notification
              console.log('[Returns] Invio notifica reso a utente:', item.user_id);
              await supabase
                .from('notifications')
                .insert({
                  user_id: item.user_id,
                  title: 'Articolo Reso',
                  message: `L'articolo "${item.product_name}" è stato reso. Sono stati scalati ${pointsToDeduct} punti fedeltà.`,
                  type: 'item_returned',
                  related_id: item.id,
                  related_type: 'order',
                  read: false,
                });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              console.log('[Returns] Reso completato con successo per articolo:', item.id);

              Alert.alert('Reso Registrato', `Reso registrato. Scalati ${pointsToDeduct} punti fedeltà a ${item.customer_name}.`, [
                { text: 'OK', onPress: () => searchOrder() },
              ]);
            } catch (error: any) {
              console.error('Error processing return:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const filteredItems = order
    ? customerFilter.trim().length > 0
      ? order.order_items.filter(item =>
          (item.customer_name ?? '').toLowerCase().includes(customerFilter.trim().toLowerCase())
        )
      : order.order_items
    : [];

  const itemCountLabel = customerFilter.trim().length > 0
    ? `${filteredItems.length} di ${order?.order_items.length ?? 0} articoli`
    : `${order?.order_items.length ?? 0} articoli`;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Gestione Resi',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <IconSymbol 
              ios_icon_name="info.circle.fill" 
              android_material_icon_name="info"
              size={20} 
              color={colors.info} 
            />
            <Text style={styles.infoText}>
              Gestisci i resi dei singoli articoli. Ogni reso scala i punti fedeltà guadagnati sull&apos;articolo restituito.
            </Text>
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <Text style={styles.sectionTitle}>Cerca Ordine</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca per numero ordine o ultime cifre..."
                placeholderTextColor={colors.textTertiary}
                value={orderNumber}
                onChangeText={setOrderNumber}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.searchButton,
                  pressed && styles.searchButtonPressed,
                  loading && styles.searchButtonDisabled,
                ]}
                onPress={searchOrder}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <React.Fragment>
                    <IconSymbol 
                      ios_icon_name="magnifyingglass" 
                      android_material_icon_name="search"
                      size={20} 
                      color={colors.background} 
                    />
                    <Text style={styles.searchButtonText}>Cerca</Text>
                  </React.Fragment>
                )}
              </Pressable>
            </View>
          </View>

          {/* Risultati multipli */}
          {searchResults.length > 1 && (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>
                Risultati (
                {searchResults.length}
                )
              </Text>
              {searchResults.map((result) => (
                <Pressable
                  key={result.id}
                  style={({ pressed }) => [styles.resultCard, pressed && { opacity: 0.7 }]}
                  onPress={() => {
                    console.log('[searchResults] Ordine selezionato:', result.order_number);
                    setOrder(result);
                    setSearchResults([]);
                    setOrderNumber(result.order_number);
                  }}
                >
                  <Text style={styles.resultOrderNumber}>{result.order_number}</Text>
                  <Text style={styles.resultItemCount}>{result.order_items.length} articoli</Text>
                  <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={16} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          )}

          {/* Order Items */}
          {order && (
            <View style={styles.orderSection}>
              <View style={styles.orderHeader}>
                <Text style={styles.sectionTitle}>Ordine: {order.order_number}</Text>
                <Text style={styles.itemCount}>{itemCountLabel}</Text>
              </View>

              {/* Customer Filter */}
              <View style={styles.customerFilterWrapper}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={18}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={styles.customerFilterInput}
                  placeholder="Filtra per nome cliente..."
                  placeholderTextColor={colors.textTertiary}
                  value={customerFilter}
                  onChangeText={(text) => {
                    console.log('[customerFilter] Filtro cliente aggiornato:', text);
                    setCustomerFilter(text);
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {filteredItems.length === 0 && customerFilter.trim().length > 0 && (
                <Text style={[styles.emptyStateText, { marginVertical: 24 }]}>
                  Nessun articolo trovato per questo cliente
                </Text>
              )}

              {filteredItems.map((item, index) => (
                <View key={index} style={styles.itemCard}>
                  {/* Item Info */}
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      {(item.selected_size || item.selected_color) && (
                        <Text style={styles.itemDetails}>
                          {item.selected_size && `Taglia: ${item.selected_size}`}
                          {item.selected_size && item.selected_color && ' • '}
                          {item.selected_color && `Colore: ${item.selected_color}`}
                        </Text>
                      )}
                      <Text style={styles.itemPrice}>€{item.final_price.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Customer Info */}
                  <View style={styles.customerSection}>
                    <IconSymbol 
                      ios_icon_name="person.fill" 
                      android_material_icon_name="person"
                      size={16} 
                      color={colors.textSecondary} 
                    />
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>{item.customer_name}</Text>
                      <Text style={styles.customerPhone}>{item.customer_phone}</Text>
                    </View>
                  </View>

                  {/* Status & Actions */}
                  {item.returned_to_sender ? (
                    <View style={[styles.statusBadge, styles.statusBadgeReturned]}>
                      <IconSymbol 
                        ios_icon_name="arrow.uturn.backward.circle.fill" 
                        android_material_icon_name="undo"
                        size={16} 
                        color={colors.error} 
                      />
                      <Text style={[styles.statusText, styles.statusTextReturned]}>Già Reso</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.returnButton,
                        pressed && styles.returnButtonPressed,
                        processing === item.id && styles.returnButtonDisabled,
                      ]}
                      onPress={() => handleReturnItem(item)}
                      disabled={processing === item.id}
                    >
                      {processing === item.id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <React.Fragment>
                          <IconSymbol 
                            ios_icon_name="arrow.uturn.backward" 
                            android_material_icon_name="undo"
                            size={20} 
                            color={colors.error} 
                          />
                          <Text style={styles.returnButtonText}>Registra Reso</Text>
                        </React.Fragment>
                      )}
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {!order && !loading && searchResults.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol 
                ios_icon_name="magnifyingglass" 
                android_material_icon_name="search"
                size={64} 
                color={colors.textTertiary} 
              />
              <Text style={styles.emptyStateText}>
                Cerca un ordine per gestire i resi
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Inserisci il numero ordine nel campo sopra
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
    borderRadius: 12,
    padding: 16,
    margin: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  searchSection: {
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  searchContainer: {
    gap: 12,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  searchButtonPressed: {
    opacity: 0.7,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  orderSection: {
    padding: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success + '30',
    borderRadius: 8,
    paddingVertical: 10,
  },
  statusBadgeReturned: {
    backgroundColor: colors.error + '15',
    borderColor: colors.error + '30',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  statusTextReturned: {
    color: colors.error,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '30',
    borderRadius: 8,
    paddingVertical: 12,
  },
  returnButtonPressed: {
    opacity: 0.7,
  },
  returnButtonDisabled: {
    opacity: 0.5,
  },
  returnButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  customerFilterWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 10,
  },
  customerFilterInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  resultsSection: {
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  resultOrderNumber: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  resultItemCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
});
