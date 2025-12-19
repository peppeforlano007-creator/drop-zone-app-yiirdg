
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
  drops?: {
    status: string;
    completed_at?: string;
  };
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'pending' | 'ready' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
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

      // Load ALL orders for this pickup point with drop info
      const { data: allOrders, error: ordersError } = await supabase
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
          drops (
            status,
            completed_at
          ),
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
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        Alert.alert('Errore', `Impossibile caricare gli ordini: ${ordersError.message}`);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('Orders loaded:', allOrders?.length || 0);

      // Separate orders into pending, ready, and completed
      const pending: Order[] = [];
      const ready: Order[] = [];
      const completed: Order[] = [];

      for (const order of allOrders || []) {
        const items = order.order_items || [];
        
        // Fetch customer data for each order item
        const userIds = [...new Set(items.map((item: any) => item.user_id).filter(Boolean))];
        
        let profileMap = new Map();
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name, phone, email')
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
        const itemsWithCustomers = items.map((item: any) => {
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
        
        const enrichedOrder = {
          ...order,
          order_items: itemsWithCustomers,
        };

        // Categorize orders based on status
        if (order.status === 'completed' || order.status === 'cancelled') {
          completed.push(enrichedOrder);
        } else if (order.status === 'ready_for_pickup' || order.status === 'arrived') {
          // Check if all items are handled
          const allItemsHandled = items.length > 0 && items.every(item => 
            item.pickup_status === 'picked_up' || item.returned_to_sender === true
          );
          
          if (allItemsHandled) {
            completed.push(enrichedOrder);
          } else {
            ready.push(enrichedOrder);
          }
        } else {
          // pending, confirmed, in_transit
          pending.push(enrichedOrder);
        }
      }

      console.log('Pending orders:', pending.length);
      console.log('Ready orders:', ready.length);
      console.log('Completed orders:', completed.length);
      
      setPendingOrders(pending);
      setReadyOrders(ready);
      setCompletedOrders(completed);
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

  const sendNotificationToUser = async (userId: string, title: string, message: string, orderId: string) => {
    try {
      console.log(`Sending notification to user ${userId}: ${title}`);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: title,
          message: message,
          type: 'order_ready',
          related_id: orderId,
          related_type: 'order',
          read: false,
        })
        .select();

      if (error) {
        console.error('Error inserting notification:', error);
        throw error;
      }

      console.log('Notification sent successfully:', data);
      return true;
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      return false;
    }
  };

  const handleMarkAsReceived = async (order: Order) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Ordine Ricevuto in Store',
      `Confermi che l'ordine ${order.order_number} è arrivato nel punto di ritiro?\n\nI clienti riceveranno una notifica che l'ordine è pronto per il ritiro.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              const now = new Date().toISOString();
              
              // Update order status to ready_for_pickup
              const { error: orderError } = await supabase
                .from('orders')
                .update({
                  status: 'ready_for_pickup',
                  arrived_at: now,
                  updated_at: now,
                })
                .eq('id', order.id);

              if (orderError) {
                console.error('Error updating order:', orderError);
                Alert.alert('Errore', 'Impossibile aggiornare lo stato dell\'ordine');
                return;
              }

              // Update all order items to ready status
              const { error: itemsError } = await supabase
                .from('order_items')
                .update({ 
                  pickup_status: 'ready',
                  customer_notified_at: now,
                })
                .eq('order_id', order.id);

              if (itemsError) {
                console.error('Error updating order items:', itemsError);
              }

              // Send notification to each customer (deduplicated by user_id)
              if (order.order_items && order.order_items.length > 0) {
                const userIds = [...new Set(order.order_items.map(item => item.user_id).filter(Boolean))];
                
                let notificationsSent = 0;
                let notificationsFailed = 0;

                for (const userId of userIds) {
                  const success = await sendNotificationToUser(
                    userId,
                    '🎉 Ordine Pronto per il Ritiro!',
                    `Il tuo ordine ${order.order_number} è arrivato ed è pronto per il ritiro presso il punto di ritiro. Ricorda di portare un documento d'identità valido.`,
                    order.id
                  );

                  if (success) {
                    notificationsSent++;
                  } else {
                    notificationsFailed++;
                  }
                }

                console.log(`Notifications sent: ${notificationsSent}, failed: ${notificationsFailed}`);
                
                if (notificationsFailed > 0) {
                  Alert.alert(
                    'Attenzione',
                    `Ordine aggiornato con successo. ${notificationsSent} notifiche inviate, ${notificationsFailed} non riuscite.`
                  );
                } else {
                  Alert.alert(
                    'Successo',
                    `I clienti (${notificationsSent}) sono stati notificati che l'ordine è pronto per il ritiro.`
                  );
                }
              } else {
                Alert.alert('Successo', 'Ordine aggiornato con successo.');
              }
              
              setModalVisible(false);
              loadOrders();
            } catch (error: any) {
              console.error('Error marking order as received:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const handleMarkOrderAsDelivered = async (order: Order) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    Alert.alert(
      'Ordine Consegnato',
      `Confermi che l'intero ordine ${order.order_number} è stato consegnato ai clienti?\n\nI clienti riceveranno una notifica di conferma della consegna.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              const now = new Date().toISOString();
              
              // Get all items that haven't been picked up yet
              const itemsToUpdate = order.order_items.filter(
                item => !item.picked_up_at && !item.returned_to_sender
              );

              if (itemsToUpdate.length === 0) {
                Alert.alert('Info', 'Tutti gli articoli sono già stati gestiti.');
                return;
              }

              // Update all order items to picked_up
              const { error: itemsError } = await supabase
                .from('order_items')
                .update({
                  pickup_status: 'picked_up',
                  picked_up_at: now,
                })
                .in('id', itemsToUpdate.map(item => item.id));

              if (itemsError) {
                console.error('Error updating order items:', itemsError);
                Alert.alert('Errore', 'Impossibile aggiornare gli articoli dell\'ordine');
                return;
              }

              // Call handle_order_pickup for each unique user
              const uniqueUserIds = [...new Set(itemsToUpdate.map(item => item.user_id).filter(Boolean))];
              
              for (const userId of uniqueUserIds) {
                const { error: functionError } = await supabase.rpc('handle_order_pickup', {
                  p_user_id: userId,
                });

                if (functionError) {
                  console.error('Error calling handle_order_pickup:', functionError);
                }
              }

              // Send notification to each customer with detailed confirmation
              let notificationsSent = 0;
              let notificationsFailed = 0;

              for (const userId of uniqueUserIds) {
                const success = await sendNotificationToUser(
                  userId,
                  '✅ Ordine Consegnato con Successo',
                  `L'ordine ${order.order_number} è stato consegnato con successo presso il punto di ritiro. Grazie per aver utilizzato il nostro servizio! Hai guadagnato 10 punti fedeltà.`,
                  order.id
                );

                if (success) {
                  notificationsSent++;
                } else {
                  notificationsFailed++;
                }
              }

              console.log(`Delivery notifications sent: ${notificationsSent}, failed: ${notificationsFailed}`);

              // Mark entire order as completed
              await supabase
                .from('orders')
                .update({
                  status: 'completed',
                  completed_at: now,
                  updated_at: now,
                })
                .eq('id', order.id);
              
              if (notificationsFailed > 0) {
                Alert.alert(
                  'Attenzione',
                  `L'ordine è stato segnato come consegnato. ${notificationsSent} notifiche inviate, ${notificationsFailed} non riuscite.`
                );
              } else {
                Alert.alert(
                  'Successo',
                  `L'ordine è stato segnato come consegnato e completato. ${notificationsSent} clienti notificati.`
                );
              }
              
              loadOrders();
              setModalVisible(false);
            } catch (error: any) {
              console.error('Error marking order as delivered:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const handleMarkOrderAsReturned = async (order: Order) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Rispedisci Ordine al Fornitore',
      `Vuoi segnare l'intero ordine ${order.order_number} come non ritirato e da rispedire al fornitore?\n\nQuesta azione ridurrà il rating di tutti i clienti coinvolti e dopo 5 ordini non ritirati gli account verranno bloccati.\n\nI clienti riceveranno una notifica.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: 'destructive',
          onPress: async () => {
            try {
              const now = new Date().toISOString();
              
              // Get all items that haven't been returned yet
              const itemsToUpdate = order.order_items.filter(
                item => !item.picked_up_at && !item.returned_to_sender
              );

              if (itemsToUpdate.length === 0) {
                Alert.alert('Info', 'Tutti gli articoli sono già stati gestiti.');
                return;
              }

              // Update all order items as returned
              const { error: itemsError } = await supabase
                .from('order_items')
                .update({
                  returned_to_sender: true,
                  returned_at: now,
                  return_reason: 'Non ritirato dal cliente',
                })
                .in('id', itemsToUpdate.map(item => item.id));

              if (itemsError) {
                console.error('Error updating order items:', itemsError);
                Alert.alert('Errore', 'Impossibile aggiornare gli articoli dell\'ordine');
                return;
              }

              // Call handle_order_return for each item
              for (const item of itemsToUpdate) {
                const { error: functionError } = await supabase.rpc('handle_order_return', {
                  p_user_id: item.user_id,
                  p_order_item_id: item.id,
                });

                if (functionError) {
                  console.error('Error calling handle_order_return:', functionError);
                }
              }

              // Send notification to each unique customer
              const uniqueUserIds = [...new Set(itemsToUpdate.map(item => item.user_id).filter(Boolean))];
              
              let notificationsSent = 0;
              let notificationsFailed = 0;

              for (const userId of uniqueUserIds) {
                const success = await sendNotificationToUser(
                  userId,
                  '⚠️ Ordine Rispedito al Fornitore',
                  `L'ordine ${order.order_number} non è stato ritirato entro i termini e verrà rispedito al fornitore. Il tuo rating è stato aggiornato. Dopo 5 ordini non ritirati, l'account verrà bloccato.`,
                  order.id
                );

                if (success) {
                  notificationsSent++;
                } else {
                  notificationsFailed++;
                }
              }

              console.log(`Return notifications sent: ${notificationsSent}, failed: ${notificationsFailed}`);

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
                'Successo',
                `L'ordine è stato segnato come da rispedire al fornitore. ${notificationsSent} clienti notificati e i loro rating sono stati aggiornati.`
              );
              
              loadOrders();
              setModalVisible(false);
            } catch (error: any) {
              console.error('Error marking order as returned:', error);
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

  const handleNotifyAllCustomers = async (order: Order) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Get unique customers who haven't picked up yet
    const pendingItems = order.order_items.filter(
      item => !item.picked_up_at && !item.returned_to_sender
    );
    
    if (pendingItems.length === 0) {
      Alert.alert('Info', 'Tutti gli articoli sono già stati gestiti.');
      return;
    }

    const uniqueUserIds = [...new Set(pendingItems.map(item => item.user_id).filter(Boolean))];
    const uniqueCustomers = [...new Set(pendingItems.map(item => item.customer_name || 'Cliente'))];
    
    Alert.alert(
      'Notifica Clienti',
      `Vuoi inviare una notifica promemoria a ${uniqueCustomers.length === 1 ? uniqueCustomers[0] : `${uniqueCustomers.length} clienti`} per ricordargli di ritirare l'ordine?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia',
          onPress: async () => {
            try {
              let notificationsSent = 0;
              let notificationsFailed = 0;

              for (const userId of uniqueUserIds) {
                const success = await sendNotificationToUser(
                  userId,
                  '🔔 Promemoria Ritiro Ordine',
                  `Ti ricordiamo che il tuo ordine ${order.order_number} è pronto per il ritiro presso il punto di ritiro. Passa a ritirarlo quando puoi!`,
                  order.id
                );

                if (success) {
                  notificationsSent++;
                } else {
                  notificationsFailed++;
                }
              }
              
              if (notificationsFailed > 0) {
                Alert.alert(
                  'Attenzione',
                  `${notificationsSent} notifiche inviate con successo, ${notificationsFailed} non riuscite.`
                );
              } else {
                Alert.alert(
                  'Successo',
                  `Notifica inviata a ${notificationsSent} ${notificationsSent === 1 ? 'cliente' : 'clienti'}`
                );
              }
            } catch (error: any) {
              console.error('Error sending notifications:', error);
              Alert.alert('Errore', 'Impossibile inviare le notifiche');
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
    const isPending = selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed' || selectedOrder.status === 'in_transit';
    const isReady = selectedOrder.status === 'ready_for_pickup' || selectedOrder.status === 'arrived';
    
    // Check if there are any items that haven't been handled yet
    const hasUnhandledItems = selectedOrder.order_items.some(
      item => !item.picked_up_at && !item.returned_to_sender
    );

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

            {/* Order Actions - Show "Ricevuto in Store" button for pending orders */}
            {isPending && (
              <Pressable
                style={styles.primaryActionButton}
                onPress={() => handleMarkAsReceived(selectedOrder)}
              >
                <IconSymbol 
                  ios_icon_name="checkmark.circle.fill" 
                  android_material_icon_name="check_circle"
                  size={20} 
                  color={colors.background} 
                />
                <Text style={styles.primaryActionButtonText}>Segna come Ricevuto in Store</Text>
              </Pressable>
            )}

            {/* Order-Level Actions for Ready Orders */}
            {isReady && hasUnhandledItems && (
              <View style={styles.orderActionsSection}>
                <Text style={styles.sectionTitle}>Azioni Ordine</Text>
                <View style={styles.orderActionsContainer}>
                  <Pressable
                    style={styles.orderActionButton}
                    onPress={() => handleMarkOrderAsDelivered(selectedOrder)}
                  >
                    <IconSymbol 
                      ios_icon_name="checkmark.circle.fill" 
                      android_material_icon_name="check_circle"
                      size={20} 
                      color={colors.background} 
                    />
                    <Text style={styles.orderActionButtonText}>Consegnato</Text>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.orderActionButton, styles.secondaryOrderActionButton]}
                    onPress={() => handleNotifyAllCustomers(selectedOrder)}
                  >
                    <IconSymbol 
                      ios_icon_name="bell.fill" 
                      android_material_icon_name="notifications"
                      size={20} 
                      color={colors.text} 
                    />
                    <Text style={[styles.orderActionButtonText, styles.secondaryOrderActionButtonText]}>
                      Notifica i Clienti
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.orderActionButton, styles.dangerOrderActionButton]}
                    onPress={() => handleMarkOrderAsReturned(selectedOrder)}
                  >
                    <IconSymbol 
                      ios_icon_name="arrow.uturn.backward" 
                      android_material_icon_name="undo"
                      size={20} 
                      color={colors.error} 
                    />
                    <Text style={[styles.orderActionButtonText, styles.dangerOrderActionButtonText]}>
                      Rispedisci
                    </Text>
                  </Pressable>
                </View>
              </View>
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

  const currentOrders = selectedTab === 'pending' ? pendingOrders : selectedTab === 'ready' ? readyOrders : completedOrders;

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
            style={[styles.tab, selectedTab === 'pending' && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('pending');
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'pending' && styles.tabTextActive]}>
              In Arrivo ({pendingOrders.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, selectedTab === 'ready' && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('ready');
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'ready' && styles.tabTextActive]}>
              Da Consegnare ({readyOrders.length})
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
              {selectedTab === 'pending'
                ? 'Ordini in transito verso il tuo punto di ritiro. Segna come "Ricevuto in Store" quando arrivano per notificare i clienti.'
                : selectedTab === 'ready'
                ? 'Ordini pronti per il ritiro. Usa i pulsanti "Consegnato", "Notifica i Clienti" o "Rispedisci" per gestire l\'intero ordine. I clienti riceveranno notifiche per ogni azione.'
                : 'Storico degli ordini completati e ritirati dai clienti.'}
            </Text>
          </View>

          {/* Orders List */}
          <View style={styles.ordersContainer}>
            {currentOrders.map(renderOrder)}
          </View>

          {currentOrders.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol 
                ios_icon_name="shippingbox" 
                android_material_icon_name="inventory_2"
                size={64} 
                color={colors.textTertiary} 
              />
              <Text style={styles.emptyStateText}>
                {selectedTab === 'pending'
                  ? 'Nessun ordine in arrivo al momento'
                  : selectedTab === 'ready'
                  ? 'Nessun ordine da consegnare'
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
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.text,
  },
  tabText: {
    fontSize: 13,
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
  orderActionsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderActionsContainer: {
    gap: 10,
  },
  orderActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  orderActionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
  secondaryOrderActionButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryOrderActionButtonText: {
    color: colors.text,
  },
  dangerOrderActionButton: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  dangerOrderActionButtonText: {
    color: colors.error,
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
