
import React, { useState, useCallback } from 'react';
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

  const searchOrder = useCallback(async () => {
    if (!orderNumber.trim()) {
      Alert.alert('Errore', 'Inserisci un numero ordine');
      return;
    }

    if (!user?.pickupPointId) {
      Alert.alert('Errore', 'Nessun punto di ritiro associato');
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Search for order
      const { data: orderData, error: orderError } = await supabase
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
        .eq('order_number', orderNumber.trim())
        .eq('pickup_point_id', user.pickupPointId)
        .single();

      if (orderError || !orderData) {
        console.error('Error searching order:', orderError);
        Alert.alert('Ordine Non Trovato', 'Nessun ordine trovato con questo numero per il tuo punto di ritiro.');
        setOrder(null);
        return;
      }

      // Fetch customer data for each order item
      const userIds = [...new Set(orderData.order_items.map((item: any) => item.user_id).filter(Boolean))];
      
      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);
        
        if (profilesError) {
          console.warn('Error loading customer profiles:', profilesError);
        } else if (profiles) {
          profiles.forEach(profile => {
            profileMap.set(profile.user_id, profile);
          });
        }
      }
      
      // Enrich order items with customer data
      const itemsWithCustomers = orderData.order_items.map((item: any) => {
        const profile = profileMap.get(item.user_id);
        return {
          ...item,
          customer_name: profile?.full_name || 'Cliente',
          customer_phone: profile?.phone || 'N/A',
        };
      });

      setOrder({
        ...orderData,
        order_items: itemsWithCustomers,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Error searching order:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante la ricerca');
    } finally {
      setLoading(false);
    }
  }, [orderNumber, user?.pickupPointId]);

  const handleReturnItem = async (item: OrderItem) => {
    if (item.picked_up_at) {
      Alert.alert('Errore', 'Questo articolo è già stato ritirato dal cliente');
      return;
    }

    if (item.returned_to_sender) {
      Alert.alert('Errore', 'Questo articolo è già stato segnato come reso');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Conferma Reso',
      `Confermi il reso di "${item.product_name}" per ${item.customer_name}?\n\nQuesta azione:\n- Abbasserà il rating del cliente\n- Dopo 100 articoli restituiti, l'account verrà bloccato`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma Reso',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(item.id);

              // Call the handle_item_return function
              const { data, error } = await supabase.rpc('handle_item_return', {
                p_user_id: item.user_id,
                p_order_item_id: item.id,
                p_return_reason: 'Reso al punto di ritiro',
              });

              if (error) {
                console.error('Error processing return:', error);
                Alert.alert('Errore', 'Impossibile processare il reso');
                return;
              }

              // Send notification to customer
              await supabase
                .from('notifications')
                .insert({
                  user_id: item.user_id,
                  title: 'Articolo Reso',
                  message: `L'articolo "${item.product_name}" è stato reso al punto di ritiro. ${data.message}`,
                  type: 'general',
                  related_id: item.id,
                  related_type: 'order',
                  read: false,
                });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              Alert.alert(
                'Reso Registrato',
                data.message,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Refresh order data
                      searchOrder();
                    },
                  },
                ]
              );
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
              Gestisci i resi dei singoli articoli. Ogni reso abbasserà il rating del cliente. 
              Dopo 100 articoli restituiti, l&apos;account verrà bloccato temporaneamente.
            </Text>
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <Text style={styles.sectionTitle}>Cerca Ordine</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Inserisci numero ordine (es. ORD-123456)"
                placeholderTextColor={colors.textTertiary}
                value={orderNumber}
                onChangeText={setOrderNumber}
                autoCapitalize="characters"
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

          {/* Order Items */}
          {order && (
            <View style={styles.orderSection}>
              <View style={styles.orderHeader}>
                <Text style={styles.sectionTitle}>Ordine: {order.order_number}</Text>
                <Text style={styles.itemCount}>{order.order_items.length} articoli</Text>
              </View>

              {order.order_items.map((item, index) => (
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
                  {item.picked_up_at ? (
                    <View style={styles.statusBadge}>
                      <IconSymbol 
                        ios_icon_name="checkmark.circle.fill" 
                        android_material_icon_name="check_circle"
                        size={16} 
                        color={colors.success} 
                      />
                      <Text style={styles.statusText}>Già Ritirato</Text>
                    </View>
                  ) : item.returned_to_sender ? (
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
          {!order && !loading && (
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
