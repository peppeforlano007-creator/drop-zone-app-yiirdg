
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
  Linking,
  Modal,
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
  pickup_status: string;
  picked_up_at?: string;
  user_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  returned_to_sender?: boolean;
  returned_at?: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_value: number;
  created_at: string;
  shipped_at?: string;
  arrived_at?: string;
  completed_at?: string;
  order_items: OrderItem[];
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed'>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user?.pickupPointId) {
      console.error('No pickup point ID found for user:', user?.id);
      Alert.alert(
        'Errore',
        'Nessun punto di ritiro associato a questo account. Contatta l\'amministratore.'
      );
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log('Loading orders for pickup point:', user.pickupPointId);

      // Load active orders (not completed or cancelled)
      const { data: activeData, error: activeError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_value,
          created_at,
          shipped_at,
          arrived_at,
          completed_at,
          order_items (
            id,
            product_name,
            selected_size,
            selected_color,
            final_price,
            pickup_status,
            picked_up_at,
            user_id,
            returned_to_sender,
            returned_at
          )
        `)
        .eq('pickup_point_id', user.pickupPointId)
        .in('status', ['pending', 'confirmed', 'in_transit', 'arrived', 'ready_for_pickup'])
        .order('created_at', { ascending: false });

      if (activeError) {
        console.error('Error loading active orders:', activeError);
        Alert.alert('Errore', `Impossibile caricare gli ordini attivi: ${activeError.message}`);
      } else {
        console.log('Active orders loaded:', activeData?.length || 0);
        
        // Fetch customer data for each order item
        const ordersWithCustomers = await Promise.all(
          (activeData || []).map(async (order) => {
            // Get unique user IDs from order items
            const userIds = [...new Set(order.order_items?.map((item: any) => item.user_id).filter(Boolean))];
            
            // Fetch all customer profiles in one query
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('user_id, full_name, phone, email')
              .in('user_id', userIds);
            
            if (profilesError) {
              console.warn('Error loading customer profiles:', profilesError);
            }
            
            // Create a map of user_id to profile data
            const profileMap = new Map();
            if (profiles) {
              profiles.forEach(profile => {
                profileMap.set(profile.user_id, profile);
              });
            }
            
            // Enrich order items with customer data
            const itemsWithCustomers = (order.order_items || []).map((item: any) => {
              if (!item.user_id) {
                return {
                  ...item,
                  customer_name: 'N/A',
                  customer_phone: 'N/A',
                  customer_email: 'N/A',
                };
              }
              
              const profile = profileMap.get(item.user_id);
              
              if (!profile) {
                console.warn(`Profile not found for user ${item.user_id}`);
                return {
                  ...item,
                  customer_name: 'Cliente',
                  customer_phone: 'N/A',
                  customer_email: 'N/A',
                };
              }
              
              return {
                ...item,
                customer_name: profile.full_name || profile.email || 'Cliente',
                customer_phone: profile.phone || 'N/A',
                customer_email: profile.email || 'N/A',
              };
            });
            
            return {
              ...order,
              order_items: itemsWithCustomers,
            };
          })
        );
        
        setActiveOrders(ordersWithCustomers);
      }

      // Load completed orders
      const { data: completedData, error: completedError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_value,
          created_at,
          shipped_at,
          arrived_at,
          completed_at,
          order_items (
            id,
            product_name,
            selected_size,
            selected_color,
            final_price,
            pickup_status,
            picked_up_at,
            user_id,
            returned_to_sender,
            returned_at
          )
        `)
        .eq('pickup_point_id', user.pickupPointId)
        .in('status', ['completed', 'cancelled'])
        .order('completed_at', { ascending: false })
        .limit(20);

      if (completedError) {
        console.error('Error loading completed orders:', completedError);
        Alert.alert('Errore', `Impossibile caricare gli ordini completati: ${completedError.message}`);
      } else {
        console.log('Completed orders loaded:', completedData?.length || 0);
        
        // Fetch customer data for each order item
        const ordersWithCustomers = await Promise.all(
          (completedData || []).map(async (order) => {
            // Get unique user IDs from order items
            const userIds = [...new Set(order.order_items?.map((item: any) => item.user_id).filter(Boolean))];
            
            // Fetch all customer profiles in one query
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('user_id, full_name, phone, email')
              .in('user_id', userIds);
            
            if (profilesError) {
              console.warn('Error loading customer profiles:', profilesError);
            }
            
            // Create a map of user_id to profile data
            const profileMap = new Map();
            if (profiles) {
              profiles.forEach(profile => {
                profileMap.set(profile.user_id, profile);
              });
            }
            
            // Enrich order items with customer data
            const itemsWithCustomers = (order.order_items || []).map((item: any) => {
              if (!item.user_id) {
                return {
                  ...item,
                  customer_name: 'N/A',
                  customer_phone: 'N/A',
                  customer_email: 'N/A',
                };
              }
              
              const profile = profileMap.get(item.user_id);
              
              if (!profile) {
                console.warn(`Profile not found for user ${item.user_id}`);
                return {
                  ...item,
                  customer_name: 'Cliente',
                  customer_phone: 'N/A',
                  customer_email: 'N/A',
                };
              }
              
              return {
                ...item,
                customer_name: profile.full_name || profile.email || 'Cliente',
                customer_phone: profile.phone || 'N/A',
                customer_email: profile.email || 'N/A',
              };
            });
            
            return {
              ...order,
              order_items: itemsWithCustomers,
            };
          })
        );
        
        setCompletedOrders(ordersWithCustomers);
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      Alert.alert('Errore', `Si è verificato un errore: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.pickupPointId, user?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
      case 'in_transit':
        return '#3B82F6';
      case 'arrived':
        return '#F59E0B';
      case 'ready_for_pickup':
      case 'ready':
        return '#10B981';
      case 'completed':
      case 'picked_up':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.text;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'In Attesa';
      case 'confirmed':
        return 'Confermato';
      case 'in_transit':
        return 'In Transito';
      case 'arrived':
        return 'Arrivato';
      case 'ready_for_pickup':
      case 'ready':
        return 'Pronto per Ritiro';
      case 'completed':
      case 'picked_up':
        return 'Completato';
      case 'cancelled':
        return 'Annullato';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
        return 'clock.fill';
      case 'in_transit':
        return 'shippingbox.fill';
      case 'arrived':
        return 'checkmark.circle';
      case 'ready_for_pickup':
      case 'ready':
        return 'bell.badge.fill';
      case 'completed':
      case 'picked_up':
        return 'checkmark.circle.fill';
      case 'cancelled':
        return 'xmark.circle.fill';
      default:
        return 'circle';
    }
  };

  const handleMarkAsArrived = async (order: Order) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Ordine Arrivato',
      `Confermi che l'ordine ${order.order_number} è arrivato nel punto di ritiro?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({
                  status: 'ready_for_pickup',
                  arrived_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', order.id);

              if (error) {
                console.error('Error updating order:', error);
                Alert.alert('Errore', 'Impossibile aggiornare lo stato dell\'ordine');
              } else {
                // Update order items to ready status
                await supabase
                  .from('order_items')
                  .update({ pickup_status: 'ready' })
                  .eq('order_id', order.id);

                // Send notification to each customer (deduplicated by user_id)
                if (order.order_items && order.order_items.length > 0) {
                  const userIds = [...new Set(order.order_items.map(item => item.user_id).filter(Boolean))];
                  
                  for (const userId of userIds) {
                    await supabase
                      .from('notifications')
                      .insert({
                        user_id: userId,
                        title: 'Ordine Pronto per il Ritiro',
                        message: `Il tuo ordine ${order.order_number} è arrivato ed è pronto per il ritiro presso il punto di ritiro. Ricorda di portare un documento d'identità.`,
                        type: 'order_ready',
                        related_id: order.id,
                        related_type: 'order',
                        read: false,
                      });
                  }
                }
                
                Alert.alert('Successo', 'I clienti sono stati notificati che l\'ordine è pronto per il ritiro.');
                setModalVisible(false);
                loadOrders();
              }
            } catch (error: any) {
              console.error('Error marking order as arrived:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const handleMarkItemAsPickedUp = async (order: Order, item: OrderItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const customerName = item.customer_name || 'il cliente';
    
    Alert.alert(
      'Articolo Ritirato',
      `Confermi che ${customerName} ha ritirato "${item.product_name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              const now = new Date().toISOString();
              
              // Update order item to picked_up
              const { error: itemError } = await supabase
                .from('order_items')
                .update({
                  pickup_status: 'picked_up',
                  picked_up_at: now,
                })
                .eq('id', item.id);

              if (itemError) {
                console.error('Error updating order item:', itemError);
                Alert.alert('Errore', 'Impossibile aggiornare lo stato dell\'articolo');
                return;
              }

              // Check if all items in the order are picked up or returned
              const { data: allItems, error: checkError } = await supabase
                .from('order_items')
                .select('pickup_status, returned_to_sender')
                .eq('order_id', order.id);

              if (checkError) {
                console.error('Error checking order items:', checkError);
              } else {
                const allCompleted = allItems?.every(i => 
                  i.pickup_status === 'picked_up' || i.returned_to_sender === true
                );
                
                if (allCompleted) {
                  // Mark entire order as completed
                  await supabase
                    .from('orders')
                    .update({
                      status: 'completed',
                      completed_at: now,
                      updated_at: now,
                    })
                    .eq('id', order.id);
                  
                  Alert.alert(
                    'Ordine Completato', 
                    `Tutti gli articoli sono stati gestiti. L'ordine è stato completato.`
                  );
                } else {
                  Alert.alert('Successo', 'Articolo segnato come ritirato.');
                }
              }

              loadOrders();
              setModalVisible(false);
            } catch (error: any) {
              console.error('Error marking item as picked up:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const handleMarkItemAsReturned = async (order: Order, item: OrderItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Rispedisci al Fornitore',
      `Vuoi segnare "${item.product_name}" come non ritirato e da rispedire al fornitore?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              const now = new Date().toISOString();
              
              // Update order item as returned
              const { error: itemError } = await supabase
                .from('order_items')
                .update({
                  returned_to_sender: true,
                  returned_at: now,
                  return_reason: 'Non ritirato dal cliente',
                })
                .eq('id', item.id);

              if (itemError) {
                console.error('Error updating order item:', itemError);
                Alert.alert('Errore', 'Impossibile aggiornare lo stato dell\'articolo');
                return;
              }

              // Send notification to customer
              if (item.user_id) {
                await supabase
                  .from('notifications')
                  .insert({
                    user_id: item.user_id,
                    title: 'Articolo Rispedito al Fornitore',
                    message: `L'articolo "${item.product_name}" dell'ordine ${order.order_number} non è stato ritirato entro i termini e verrà rispedito al fornitore.`,
                    type: 'general',
                    related_id: order.id,
                    related_type: 'order',
                    read: false,
                  });
              }

              // Check if all items are completed
              const { data: allItems, error: checkError } = await supabase
                .from('order_items')
                .select('pickup_status, returned_to_sender')
                .eq('order_id', order.id);

              if (!checkError && allItems) {
                const allCompleted = allItems.every(i => 
                  i.pickup_status === 'picked_up' || i.returned_to_sender === true
                );
                
                if (allCompleted) {
                  // Mark entire order as completed
                  await supabase
                    .from('orders')
                    .update({
                      status: 'completed',
                      completed_at: now,
                      updated_at: now,
                    })
                    .eq('id', order.id);
                }
              }

              Alert.alert('Successo', 'Articolo segnato come da rispedire al fornitore. Il cliente è stato notificato.');
              loadOrders();
              setModalVisible(false);
            } catch (error: any) {
              console.error('Error marking item as returned:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const handleCallCustomer = (phone: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (phone && phone !== 'N/A') {
      Alert.alert(
        'Chiama Cliente',
        `Vuoi chiamare ${name} al numero ${phone}?`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Chiama',
            onPress: () => {
              Linking.openURL(`tel:${phone}`).catch(err => {
                console.error('Error opening phone dialer:', err);
                Alert.alert('Errore', 'Impossibile aprire il dialer telefonico');
              });
            },
          },
        ]
      );
    } else {
      Alert.alert('Errore', 'Numero di telefono non disponibile');
    }
  };

  const handleNotifyCustomer = async (item: OrderItem, order: Order) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!item.user_id) {
      Alert.alert('Errore', 'Impossibile notificare il cliente');
      return;
    }
    
    Alert.alert(
      'Notifica Cliente',
      `Vuoi inviare una notifica a ${item.customer_name || 'il cliente'} per ricordargli di ritirare l'articolo?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia',
          onPress: async () => {
            try {
              await supabase
                .from('notifications')
                .insert({
                  user_id: item.user_id,
                  title: 'Promemoria Ritiro Articolo',
                  message: `Ti ricordiamo che il tuo articolo "${item.product_name}" dell'ordine ${order.order_number} è pronto per il ritiro. Passa a ritirarlo quando puoi!`,
                  type: 'order_ready',
                  related_id: order.id,
                  related_type: 'order',
                  read: false,
                });
              
              Alert.alert('Successo', 'Notifica inviata al cliente');
            } catch (error: any) {
              console.error('Error sending notification:', error);
              Alert.alert('Errore', 'Impossibile inviare la notifica');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateDaysInStorage = (arrivedAt?: string) => {
    if (!arrivedAt) return 0;
    const arrived = new Date(arrivedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - arrived.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleOrderPress = (order: Order) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const renderOrderModal = () => {
    if (!selectedOrder) return null;

    const daysInStorage = calculateDaysInStorage(selectedOrder.arrived_at);

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dettagli Ordine</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setModalVisible(false);
              }}
            >
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Order Info */}
            <View style={styles.modalSection}>
              <Text style={styles.modalOrderNumber}>{selectedOrder.order_number}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                <IconSymbol 
                  ios_icon_name={getStatusIcon(selectedOrder.status)} 
                  android_material_icon_name="circle"
                  size={14} 
                  color={getStatusColor(selectedOrder.status)} 
                />
                <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                  {getStatusText(selectedOrder.status)}
                </Text>
              </View>
              {daysInStorage > 0 && selectedOrder.status !== 'completed' && (
                <Text style={styles.daysWarning}>
                  In deposito da {daysInStorage} giorni
                </Text>
              )}
            </View>

            {/* Order Actions */}
            {selectedOrder.status === 'arrived' && (
              <Pressable
                style={styles.primaryActionButton}
                onPress={() => handleMarkAsArrived(selectedOrder)}
              >
                <IconSymbol 
                  ios_icon_name="bell.badge.fill" 
                  android_material_icon_name="notifications_active"
                  size={20} 
                  color={colors.background} 
                />
                <Text style={styles.primaryActionButtonText}>Notifica Clienti - Pronto per Ritiro</Text>
              </Pressable>
            )}

            {/* Order Items */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Articoli ({selectedOrder.order_items?.length || 0})</Text>
              {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                selectedOrder.order_items.map((item, index) => (
                  <View key={index} style={styles.itemCard}>
                    {/* Item Info */}
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <View style={[styles.itemStatusBadge, { backgroundColor: getStatusColor(item.pickup_status || 'pending') + '20' }]}>
                        <Text style={[styles.itemStatusText, { color: getStatusColor(item.pickup_status || 'pending') }]}>
                          {getStatusText(item.pickup_status || 'pending')}
                        </Text>
                      </View>
                    </View>

                    {(item.selected_size || item.selected_color) && (
                      <Text style={styles.itemDetails}>
                        {item.selected_size && `Taglia: ${item.selected_size}`}
                        {item.selected_size && item.selected_color && ' • '}
                        {item.selected_color && `Colore: ${item.selected_color}`}
                      </Text>
                    )}

                    <Text style={styles.itemPrice}>€{item.final_price.toFixed(2)}</Text>

                    {/* Customer Info */}
                    <View style={styles.customerSection}>
                      <View style={styles.customerInfo}>
                        <IconSymbol 
                          ios_icon_name="person.fill" 
                          android_material_icon_name="person"
                          size={16} 
                          color={colors.textSecondary} 
                        />
                        <View style={styles.customerDetails}>
                          <Text style={styles.customerName}>{item.customer_name || 'Cliente'}</Text>
                          <Text style={styles.customerPhone}>{item.customer_phone || 'N/A'}</Text>
                        </View>
                      </View>
                      {item.customer_phone && item.customer_phone !== 'N/A' && (
                        <Pressable
                          style={styles.smallCallButton}
                          onPress={() => handleCallCustomer(item.customer_phone!, item.customer_name || 'Cliente')}
                        >
                          <IconSymbol 
                            ios_icon_name="phone.fill" 
                            android_material_icon_name="phone"
                            size={16} 
                            color={colors.background} 
                          />
                        </Pressable>
                      )}
                    </View>

                    {/* Item Actions */}
                    {(item.pickup_status === 'ready' || selectedOrder.status === 'ready_for_pickup') && !item.picked_up_at && !item.returned_to_sender && (
                      <View style={styles.itemActions}>
                        <Pressable
                          style={styles.itemActionButton}
                          onPress={() => handleMarkItemAsPickedUp(selectedOrder, item)}
                        >
                          <IconSymbol 
                            ios_icon_name="checkmark.circle.fill" 
                            android_material_icon_name="check_circle"
                            size={18} 
                            color={colors.background} 
                          />
                          <Text style={styles.itemActionButtonText}>Ritirato</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.itemActionButton, styles.secondaryItemActionButton]}
                          onPress={() => handleNotifyCustomer(item, selectedOrder)}
                        >
                          <IconSymbol 
                            ios_icon_name="bell.fill" 
                            android_material_icon_name="notifications"
                            size={18} 
                            color={colors.text} 
                          />
                          <Text style={[styles.itemActionButtonText, styles.secondaryItemActionButtonText]}>
                            Notifica
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[styles.itemActionButton, styles.dangerItemActionButton]}
                          onPress={() => handleMarkItemAsReturned(selectedOrder, item)}
                        >
                          <IconSymbol 
                            ios_icon_name="arrow.uturn.backward" 
                            android_material_icon_name="undo"
                            size={18} 
                            color={colors.error} 
                          />
                          <Text style={[styles.itemActionButtonText, styles.dangerItemActionButtonText]}>
                            Rispedisci
                          </Text>
                        </Pressable>
                      </View>
                    )}

                    {item.picked_up_at && (
                      <View style={styles.pickedUpInfo}>
                        <IconSymbol 
                          ios_icon_name="checkmark.circle.fill" 
                          android_material_icon_name="check_circle"
                          size={16} 
                          color={colors.success} 
                        />
                        <Text style={styles.pickedUpText}>
                          Ritirato il {formatDate(item.picked_up_at)}
                        </Text>
                      </View>
                    )}

                    {item.returned_to_sender && (
                      <View style={styles.returnedInfo}>
                        <IconSymbol 
                          ios_icon_name="arrow.uturn.backward.circle.fill" 
                          android_material_icon_name="undo"
                          size={16} 
                          color={colors.error} 
                        />
                        <Text style={styles.returnedText}>
                          Rispedito al fornitore
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Nessun articolo in questo ordine</Text>
              )}
            </View>

            {/* Order Summary */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Riepilogo</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Valore Totale:</Text>
                <Text style={styles.summaryValue}>€{selectedOrder.total_value.toFixed(2)}</Text>
              </View>
              {selectedOrder.arrived_at && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Data Arrivo:</Text>
                  <Text style={styles.summaryValue}>{formatDate(selectedOrder.arrived_at)}</Text>
                </View>
              )}
              {selectedOrder.completed_at && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Data Completamento:</Text>
                  <Text style={styles.summaryValue}>{formatDate(selectedOrder.completed_at)}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderOrder = (order: Order) => {
    const daysInStorage = calculateDaysInStorage(order.arrived_at);
    const hasItems = order.order_items && order.order_items.length > 0;
    const uniqueCustomers = hasItems 
      ? [...new Set(order.order_items.map(item => item.customer_name || 'Cliente'))]
      : [];

    return (
      <Pressable
        key={order.id}
        style={({ pressed }) => [
          styles.orderCard,
          pressed && styles.orderCardPressed,
        ]}
        onPress={() => handleOrderPress(order)}
      >
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              <IconSymbol 
                ios_icon_name={getStatusIcon(order.status)} 
                android_material_icon_name="circle"
                size={14} 
                color={getStatusColor(order.status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {getStatusText(order.status)}
              </Text>
            </View>
          </View>
          {daysInStorage > 0 && order.status !== 'completed' && order.status !== 'cancelled' && (
            <View style={styles.daysInStorage}>
              <Text style={styles.daysInStorageText}>{daysInStorage} giorni</Text>
            </View>
          )}
        </View>

        {/* Customers */}
        {uniqueCustomers.length > 0 && (
          <View style={styles.customersSection}>
            <IconSymbol 
              ios_icon_name="person.2.fill" 
              android_material_icon_name="people"
              size={16} 
              color={colors.textSecondary} 
            />
            <Text style={styles.customersText}>
              {uniqueCustomers.length === 1 
                ? uniqueCustomers[0]
                : `${uniqueCustomers.length} clienti`}
            </Text>
          </View>
        )}

        {/* Products Summary */}
        <View style={styles.productsSection}>
          <Text style={styles.productsLabel}>
            {hasItems ? `${order.order_items.length} articoli` : 'Nessun articolo'}
          </Text>
        </View>

        {/* Value */}
        <View style={styles.valueSection}>
          <Text style={styles.valueLabel}>Valore:</Text>
          <Text style={styles.valueAmount}>€{order.total_value.toFixed(2)}</Text>
        </View>

        {/* Tap to view */}
        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>Tocca per gestire</Text>
          <IconSymbol 
            ios_icon_name="chevron.right" 
            android_material_icon_name="chevron_right"
            size={16} 
            color={colors.textTertiary} 
          />
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento ordini...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Gestione Ordini',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, selectedTab === 'active' && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('active');
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'active' && styles.tabTextActive]}>
              Attivi ({activeOrders.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, selectedTab === 'completed' && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('completed');
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'completed' && styles.tabTextActive]}>
              Completati ({completedOrders.length})
            </Text>
          </Pressable>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
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
              {selectedTab === 'active'
                ? 'Tocca un ordine per gestire gli articoli e contattare i clienti. Ricorda di conservare i pacchi per almeno 7 giorni.'
                : 'Storico degli ordini completati e ritirati dai clienti.'}
            </Text>
          </View>

          {/* Orders List */}
          <View style={styles.ordersContainer}>
            {selectedTab === 'active'
              ? activeOrders.map(renderOrder)
              : completedOrders.map(renderOrder)}
          </View>

          {(selectedTab === 'active' ? activeOrders : completedOrders).length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol 
                ios_icon_name="shippingbox" 
                android_material_icon_name="inventory_2"
                size={64} 
                color={colors.textTertiary} 
              />
              <Text style={styles.emptyStateText}>
                {selectedTab === 'active'
                  ? 'Nessun ordine attivo al momento'
                  : 'Nessun ordine completato'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Gli ordini appariranno qui quando i drop verranno completati
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Order Details Modal */}
        {renderOrderModal()}
      </SafeAreaView>
    </>
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.text,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  tabTextActive: {
    color: colors.background,
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
  ordersContainer: {
    padding: 12,
  },
  orderCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  orderCardPressed: {
    opacity: 0.7,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysInStorage: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  daysInStorageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  customersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  customersText: {
    fontSize: 14,
    color: colors.text,
  },
  productsSection: {
    marginBottom: 12,
  },
  productsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  valueSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 8,
  },
  valueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  valueAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  tapHintText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOrderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  daysWarning: {
    fontSize: 13,
    color: colors.warning,
    marginTop: 8,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    paddingVertical: 14,
    borderRadius: 8,
    margin: 16,
    gap: 8,
  },
  primaryActionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  itemStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  customerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  customerDetails: {
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
  smallCallButton: {
    backgroundColor: colors.text,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  itemActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  itemActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryItemActionButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryItemActionButtonText: {
    color: colors.text,
  },
  dangerItemActionButton: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  dangerItemActionButtonText: {
    color: colors.error,
  },
  pickedUpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  pickedUpText: {
    fontSize: 12,
    color: colors.success,
  },
  returnedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  returnedText: {
    fontSize: 12,
    color: colors.error,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
