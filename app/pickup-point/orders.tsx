
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
import { getLoyaltyLevel } from '@/utils/loyaltyHelpers';
import { sendPushNotification } from '@/utils/pushNotifications';

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
  pickup_points?: {
    name: string;
    city: string;
  } | null;
}

interface CustomerOrder {
  key: string;
  order: Order;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerOrderNumber: string;
  items: OrderItem[];
  totalValue: number;
  effectiveStatus: 'pending' | 'ready' | 'completed';
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'pending' | 'ready' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomerOrder, setSelectedCustomerOrder] = useState<CustomerOrder | null>(null);
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
          pickup_points (
            name,
            city
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

      const enrichedOrders: Order[] = [];

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
        
        enrichedOrders.push({
          ...order,
          order_items: itemsWithCustomers,
        });
      }

      console.log('Total enriched orders:', enrichedOrders.length);
      setAllOrders(enrichedOrders);
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

  const computeCustomerEffectiveStatus = (items: OrderItem[]): 'pending' | 'ready' | 'completed' => {
    if (items.length === 0) return 'pending';
    const allHandled = items.every(i => i.picked_up_at || i.returned_to_sender);
    if (allHandled) return 'completed';
    const allReady = items.every(
      i => i.pickup_status === 'ready' || i.pickup_status === 'picked_up' || i.returned_to_sender
    );
    if (allReady) return 'ready';
    return 'pending';
  };

  const explodeOrdersByCustomer = (orders: Order[]): CustomerOrder[] => {
    const result: CustomerOrder[] = [];
    for (const order of orders) {
      const byUser = new Map<string, OrderItem[]>();
      for (const item of order.order_items || []) {
        const uid = item.user_id || 'unknown';
        if (!byUser.has(uid)) byUser.set(uid, []);
        byUser.get(uid)!.push(item);
      }
      const userIds = Array.from(byUser.keys());
      userIds.forEach((uid, idx) => {
        const items = byUser.get(uid)!;
        const first = items[0];
        const suffix = userIds.length > 1 ? ` (${idx + 1}/${userIds.length})` : '';
        const effectiveStatus = computeCustomerEffectiveStatus(items);
        result.push({
          key: `${order.id}-${uid}`,
          order,
          userId: uid,
          customerName: first.customer_name || 'Cliente',
          customerPhone: first.customer_phone || 'N/A',
          customerEmail: first.customer_email || 'N/A',
          customerOrderNumber: `${order.order_number}${suffix}`,
          items,
          totalValue: items.reduce((s, i) => s + Number(i.final_price || 0), 0),
          effectiveStatus,
        });
      });
    }
    return result;
  };

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

  const sendNotificationToUser = async (userId: string, title: string, message: string, orderId: string, notificationType: string = 'order_ready') => {
    try {
      console.log(`Sending notification to user ${userId}: ${title}`);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: title,
          message: message,
          type: notificationType,
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

  const handleMarkAsReceived = async (order: Order, customerOrder?: CustomerOrder | null) => {
    console.log('[handleMarkAsReceived] pressed for order:', order.id, order.order_number, 'customerOrder:', customerOrder?.customerOrderNumber ?? null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const confirmMessage = `Confermi che l'ordine ${customerOrder?.customerOrderNumber ?? order.order_number} è arrivato nel punto di ritiro?\n\n${customerOrder ? customerOrder.customerName : 'I clienti'} ricever${customerOrder ? 'à' : 'anno'} una notifica che l'ordine è pronto per il ritiro.`;
    Alert.alert(
      'Ordine Ricevuto in Store',
      confirmMessage,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              console.log('[handleMarkAsReceived] confirmed for order:', order.id, 'customerOrder:', customerOrder?.userId ?? 'all');
              const now = new Date().toISOString();

              // Step 1: Update only the selected customer's items (or all items for legacy fallback)
              let itemsQuery = supabase
                .from('order_items')
                .update({
                  pickup_status: 'ready',
                  customer_notified_at: now,
                })
                .eq('order_id', order.id);

              if (customerOrder) {
                console.log('[handleMarkAsReceived] scoping item update to userId:', customerOrder.userId);
                itemsQuery = itemsQuery.eq('user_id', customerOrder.userId);
              }

              const { error: itemsError } = await itemsQuery;

              if (itemsError) {
                console.error('Error updating order items:', itemsError);
                Alert.alert('Errore', 'Impossibile aggiornare gli articoli dell\'ordine');
                return;
              }

              // Step 2: Re-fetch all items for this order and check if ALL are ready/handled
              const { data: allOrderItems, error: fetchError } = await supabase
                .from('order_items')
                .select('id, pickup_status, picked_up_at, returned_to_sender')
                .eq('order_id', order.id);

              if (fetchError) {
                console.error('[handleMarkAsReceived] Error re-fetching order items:', fetchError);
              }

              const allItemsReady = allOrderItems && allOrderItems.length > 0 && allOrderItems.every(
                i => i.pickup_status === 'ready' || i.pickup_status === 'picked_up' || i.returned_to_sender
              );

              if (allItemsReady) {
                console.log('[handleMarkAsReceived] all items ready — updating order status to ready_for_pickup:', order.id);
                const { error: orderError } = await supabase
                  .from('orders')
                  .update({
                    status: 'ready_for_pickup',
                    arrived_at: now,
                    updated_at: now,
                  })
                  .eq('id', order.id);

                if (orderError) {
                  console.error('Error updating order status:', orderError);
                }
              } else {
                console.log('[handleMarkAsReceived] not all items ready yet — order status unchanged for order:', order.id);
              }

              // Send notification — only to the selected customer if customerOrder is present, otherwise to all
              if (order.order_items && order.order_items.length > 0) {
                const allUserIds = [...new Set(order.order_items.map(item => item.user_id).filter(Boolean))];
                const userIds = customerOrder ? allUserIds.filter(uid => uid === customerOrder.userId) : allUserIds;
                
                let notificationsSent = 0;
                let notificationsFailed = 0;

                for (const userId of userIds) {
                  const pickupName = order.pickup_points?.name ?? 'il punto di ritiro';
                  const pickupCity = order.pickup_points?.city ? ` - ${order.pickup_points.city}` : '';
                  const pickupLabel = `${pickupName}${pickupCity}`;
                  console.log(`[Orders] Invio notifica ordine pronto a utente ${userId}, pickup: ${pickupLabel}`);
                  const success = await sendNotificationToUser(
                    userId,
                    `🎉 Ordine Pronto per il Ritiro presso ${pickupLabel}!`,
                    `Il tuo ordine ${order.order_number} è arrivato ed è pronto per il ritiro presso ${pickupLabel}. Ricorda di portare un documento d'identità valido.`,
                    order.id
                  );

                  if (success) {
                    notificationsSent++;
                  } else {
                    notificationsFailed++;
                  }

                  // Invia push notification
                  try {
                    const { data: profile } = await supabase
                      .from('profiles')
                      .select('push_token')
                      .eq('user_id', userId)
                      .single();

                    if (profile?.push_token) {
                      console.log(`[Orders] Invio push order_ready a utente ${userId}, pickup: ${pickupLabel}`);
                      await sendPushNotification(
                        profile.push_token,
                        'Ordine Pronto 📦',
                        `Il tuo ordine ${order.order_number} è pronto per il ritiro presso ${pickupLabel}!`,
                        { type: 'order_ready', orderId: order.id }
                      );
                    } else {
                      console.warn(`[Orders] push_token NULL per utente ${userId} — push non inviato per ordine ${order.order_number}. L'utente potrebbe non aver concesso i permessi o non aver ancora aperto l'app.`);
                    }
                  } catch (e) {
                    console.error('[Orders] Errore invio push order_ready:', e);
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

  const handleMarkOrderAsDelivered = async (order: Order, customerOrder?: CustomerOrder | null) => {
    console.log('[handleMarkOrderAsDelivered] pressed for order:', order.id, order.order_number, 'customerOrder:', customerOrder?.customerOrderNumber ?? null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const confirmMessage = `Confermi che gli articoli di ${customerOrder?.customerName ?? 'tutti i clienti'} (${customerOrder?.customerOrderNumber ?? order.order_number}) sono stati consegnati?\n\nIl cliente riceverà una notifica di conferma.`;
    Alert.alert(
      'Ordine Consegnato',
      confirmMessage,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              console.log('[handleMarkOrderAsDelivered] confirmed for order:', order.id, 'customerOrder:', customerOrder?.userId ?? 'all');
              const now = new Date().toISOString();
              
              // Get items to update — only the selected customer's items if customerOrder is present
              const itemsToUpdate = (customerOrder ? customerOrder.items : order.order_items).filter(
                item => !item.picked_up_at && !item.returned_to_sender
              );

              if (itemsToUpdate.length === 0) {
                Alert.alert('Info', 'Tutti gli articoli sono già stati gestiti.');
                return;
              }

              // Update items to picked_up
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

              // Add loyalty points for each unique user (points = total amount spent)
              const uniqueUserIds = [...new Set(itemsToUpdate.map(item => item.user_id).filter(Boolean))];
              const pointsEarnedByUser: Record<string, number> = {};

              for (const userId of uniqueUserIds) {
                const userItems = itemsToUpdate.filter(item => item.user_id === userId);
                const pointsToAdd = Math.round(
                  userItems.reduce((sum, item) => sum + (Number(item.final_price) || 0), 0)
                );
                pointsEarnedByUser[userId] = pointsToAdd;
                console.log(`Adding ${pointsToAdd} loyalty points for user ${userId} (total spent across ${userItems.length} items)`);

                const { data: profileData, error: profileFetchError } = await supabase
                  .from('profiles')
                  .select('loyalty_points, loyalty_level')
                  .eq('user_id', userId)
                  .single();

                if (profileFetchError) {
                  console.error('Error fetching profile for loyalty update:', profileFetchError);
                  continue;
                }

                const currentPoints = profileData?.loyalty_points ?? 0;
                const newPoints = currentPoints + pointsToAdd;
                const newLevel = getLoyaltyLevel(newPoints);

                const { error: loyaltyUpdateError } = await supabase
                  .from('profiles')
                  .update({ loyalty_points: newPoints, points_total: newPoints, loyalty_level: newLevel })
                  .eq('user_id', userId);

                if (loyaltyUpdateError) {
                  console.error('Error updating loyalty points:', loyaltyUpdateError);
                } else {
                  console.log(`Loyalty updated for user ${userId}: ${currentPoints} -> ${newPoints} (${newLevel})`);
                }
              }

              // Send notification to each customer with detailed confirmation
              let notificationsSent = 0;
              let notificationsFailed = 0;

              for (const userId of uniqueUserIds) {
                const pointsEarned = pointsEarnedByUser[userId] ?? 0;
                const success = await sendNotificationToUser(
                  userId,
                  '✅ Ordine Consegnato con Successo',
                  `L'ordine ${order.order_number} è stato consegnato con successo presso il punto di ritiro. Grazie per aver utilizzato il nostro servizio! Hai guadagnato ${pointsEarned} punti fedeltà.`,
                  order.id,
                  'order_delivered'
                );

                if (success) {
                  notificationsSent++;
                } else {
                  notificationsFailed++;
                }

                // Invia push notification
                try {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('push_token')
                    .eq('user_id', userId)
                    .single();

                  if (profile?.push_token) {
                    const pointsEarnedForUser = pointsEarnedByUser[userId] ?? 0;
                    console.log(`[Orders] Invio push order_delivered a utente ${userId}`);
                    await sendPushNotification(
                      profile.push_token,
                      '✅ Ordine Consegnato',
                      `L'ordine ${order.order_number} è stato consegnato. Hai guadagnato ${pointsEarnedForUser} punti fedeltà!`,
                      { type: 'order_delivered', orderId: order.id }
                    );
                  }
                } catch (e) {
                  console.error('[Orders] Errore invio push order_delivered:', e);
                }
              }

              console.log(`Delivery notifications sent: ${notificationsSent}, failed: ${notificationsFailed}`);

              // Mark order as completed only if ALL items across the entire order are now handled
              const { data: allItems } = await supabase
                .from('order_items')
                .select('id, picked_up_at, returned_to_sender')
                .eq('order_id', order.id);

              const allHandled = allItems && allItems.length > 0 && allItems.every(
                i => i.picked_up_at || i.returned_to_sender
              );

              if (allHandled) {
                console.log('[handleMarkOrderAsDelivered] all items handled, marking order as completed:', order.id);
                await supabase
                  .from('orders')
                  .update({ status: 'completed', completed_at: now, updated_at: now })
                  .eq('id', order.id);
              }
              
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

  const handleMarkOrderAsReturned = async (order: Order, customerOrder?: CustomerOrder | null) => {
    console.log('[handleMarkOrderAsReturned] pressed for order:', order.id, order.order_number, 'customerOrder:', customerOrder?.customerOrderNumber ?? null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const confirmMessage = `Vuoi segnare gli articoli di ${customerOrder?.customerName ?? 'tutti i clienti'} (${customerOrder?.customerOrderNumber ?? order.order_number}) come non ritirati e da rispedire al fornitore?\n\nQuesta azione ridurrà il rating del cliente.`;
    Alert.alert(
      'Rispedisci Ordine al Fornitore',
      confirmMessage,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[handleMarkOrderAsReturned] confirmed for order:', order.id, 'customerOrder:', customerOrder?.userId ?? 'all');
              const now = new Date().toISOString();
              
              // Get items to update — only the selected customer's items if customerOrder is present
              const itemsToUpdate = (customerOrder ? customerOrder.items : order.order_items).filter(
                item => !item.picked_up_at && !item.returned_to_sender
              );

              if (itemsToUpdate.length === 0) {
                Alert.alert('Info', 'Tutti gli articoli sono già stati gestiti.');
                return;
              }

              // Update items as returned
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

                // Invia push notification
                try {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('push_token')
                    .eq('user_id', userId)
                    .single();

                  if (profile?.push_token) {
                    console.log(`[Orders] Invio push order_returned a utente ${userId}`);
                    await sendPushNotification(
                      profile.push_token,
                      '⚠️ Ordine Rispedito',
                      `L'ordine ${order.order_number} non è stato ritirato e verrà rispedito al fornitore.`,
                      { type: 'order_returned', orderId: order.id }
                    );
                  }
                } catch (e) {
                  console.error('[Orders] Errore invio push order_returned:', e);
                }
              }

              console.log(`Return notifications sent: ${notificationsSent}, failed: ${notificationsFailed}`);

              // Mark order as completed only if ALL items across the entire order are now handled
              const { data: allItems } = await supabase
                .from('order_items')
                .select('id, picked_up_at, returned_to_sender')
                .eq('order_id', order.id);

              const allHandled = allItems && allItems.length > 0 && allItems.every(
                i => i.picked_up_at || i.returned_to_sender
              );

              if (allHandled) {
                console.log('[handleMarkOrderAsReturned] all items handled, marking order as completed:', order.id);
                await supabase
                  .from('orders')
                  .update({ status: 'completed', completed_at: now, updated_at: now })
                  .eq('id', order.id);
              }

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

  const handleMarkItemAsReturned = async (item: OrderItem, order: Order) => {
    console.log('[handleMarkItemAsReturned] pressed for item:', item.id, 'product:', item.product_name, 'order:', order.order_number);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Rispedisci articolo al fornitore',
      `Vuoi rispedire "${item.product_name}" di ${item.customer_name || 'Cliente'} (ordine ${order.order_number}) al fornitore?\n\nQuesta azione ridurrà il rating del cliente.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[handleMarkItemAsReturned] confirmed for item:', item.id);
              const now = new Date().toISOString();

              // a. Update the single order_items row
              const { error: itemUpdateError } = await supabase
                .from('order_items')
                .update({
                  returned_to_sender: true,
                  returned_at: now,
                  return_reason: 'Non ritirato dal cliente',
                })
                .eq('id', item.id);

              if (itemUpdateError) {
                console.error('Error updating order item as returned:', itemUpdateError);
                Alert.alert('Errore', 'Impossibile aggiornare l\'articolo');
                return;
              }

              // b. Deduct loyalty points equal to the item's price
              const pointsToDeduct = Math.round(Number(item.final_price) || 0);
              console.log(`[handleMarkItemAsReturned] deducting ${pointsToDeduct} loyalty points for user ${item.user_id} (item price: ${item.final_price})`);

              const { data: profileForDeduct, error: profileDeductFetchError } = await supabase
                .from('profiles')
                .select('loyalty_points, loyalty_level')
                .eq('user_id', item.user_id)
                .single();

              if (profileDeductFetchError) {
                console.error('Error fetching profile for loyalty deduction:', profileDeductFetchError);
              } else {
                const currentPoints = profileForDeduct?.loyalty_points ?? 0;
                const newPoints = Math.max(0, currentPoints - pointsToDeduct);
                const newLevel = getLoyaltyLevel(newPoints);
                console.log(`[handleMarkItemAsReturned] loyalty update for user ${item.user_id}: ${currentPoints} -> ${newPoints} (${newLevel})`);

                const { error: loyaltyDeductError } = await supabase
                  .from('profiles')
                  .update({ loyalty_points: newPoints, points_total: newPoints, loyalty_level: newLevel })
                  .eq('user_id', item.user_id);

                if (loyaltyDeductError) {
                  console.error('Error deducting loyalty points:', loyaltyDeductError);
                }
              }

              // Also call RPC for rating/return tracking
              const { error: rpcError } = await supabase.rpc('handle_order_return', {
                p_user_id: item.user_id,
                p_order_item_id: item.id,
              });

              if (rpcError) {
                console.error('Error calling handle_order_return for item:', rpcError);
              }

              // c. Send notification to the item's customer
              await sendNotificationToUser(
                item.user_id,
                '⚠️ Articolo Rispedito al Fornitore',
                `Il prodotto "${item.product_name}" dell'ordine ${order.order_number} non è stato ritirato entro i termini e verrà rispedito al fornitore. Il tuo rating è stato aggiornato.`,
                order.id
              );
              console.log('[handleMarkItemAsReturned] notification sent to user:', item.user_id);

              // d. Check if ALL items in the order are now handled
              const updatedItems = order.order_items.map(i =>
                i.id === item.id ? { ...i, returned_to_sender: true } : i
              );
              const allHandled = updatedItems.length > 0 && updatedItems.every(
                i => i.picked_up_at || i.returned_to_sender
              );

              if (allHandled) {
                console.log('[handleMarkItemAsReturned] all items handled, marking order as completed:', order.id);
                await supabase
                  .from('orders')
                  .update({ status: 'completed', completed_at: now, updated_at: now })
                  .eq('id', order.id);
              }

              Alert.alert('Successo', `L'articolo "${item.product_name}" è stato segnato come da rispedire al fornitore.`);

              // e. Refresh orders
              loadOrders();
              setModalVisible(false);
            } catch (error: any) {
              console.error('Error in handleMarkItemAsReturned:', error);
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

              const pickupName = order.pickup_points?.name ?? 'il punto di ritiro';
              const pickupCity = order.pickup_points?.city ? ` - ${order.pickup_points.city}` : '';
              const pickupLabel = `${pickupName}${pickupCity}`;

              for (const userId of uniqueUserIds) {
                console.log(`[Orders] handleNotifyAllCustomers — invio notifica a utente ${userId}, ordine ${order.order_number}`);
                const success = await sendNotificationToUser(
                  userId,
                  '🔔 Promemoria Ritiro Ordine',
                  `Ti ricordiamo che il tuo ordine ${order.order_number} è pronto per il ritiro presso ${pickupLabel}. Passa a ritirarlo quando puoi!`,
                  order.id
                );

                if (success) {
                  notificationsSent++;
                } else {
                  notificationsFailed++;
                }

                // Invia push notification
                try {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('push_token')
                    .eq('user_id', userId)
                    .single();

                  if (profile?.push_token) {
                    console.log(`[Orders] handleNotifyAllCustomers — invio push a utente ${userId}, token: ${profile.push_token}`);
                    await sendPushNotification(
                      profile.push_token,
                      'Ritira il tuo ordine 📦',
                      `Il tuo ordine ${order.order_number} è pronto per il ritiro presso ${pickupLabel}!`,
                      { type: 'order_reminder', orderId: order.id }
                    );
                  } else {
                    console.warn(`[Orders] handleNotifyAllCustomers — push_token NULL per utente ${userId}, ordine ${order.order_number}. Push non inviato.`);
                  }
                } catch (e) {
                  console.error(`[Orders] handleNotifyAllCustomers — errore invio push a utente ${userId}:`, e);
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
    // Use per-customer effectiveStatus when a customer card was tapped, otherwise fall back to order-level status
    const customerEffective = selectedCustomerOrder?.effectiveStatus;
    const isPending = customerEffective
      ? customerEffective === 'pending'
      : (selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed' || selectedOrder.status === 'in_transit');
    const isReady = customerEffective
      ? customerEffective === 'ready'
      : (selectedOrder.status === 'ready_for_pickup' || selectedOrder.status === 'arrived');
    
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
                setSelectedCustomerOrder(null);
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
              <Text style={styles.modalOrderNumber}>{selectedCustomerOrder?.customerOrderNumber ?? selectedOrder.order_number}</Text>
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
                onPress={() => handleMarkAsReceived(selectedOrder, selectedCustomerOrder)}
              >
                <IconSymbol 
                  ios_icon_name="checkmark.circle.fill" 
                  android_material_icon_name="check-circle"
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
                    onPress={() => handleMarkOrderAsDelivered(selectedOrder, selectedCustomerOrder)}
                  >
                    <IconSymbol 
                      ios_icon_name="checkmark.circle.fill" 
                      android_material_icon_name="check-circle"
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
                  
                </View>
              </View>
            )}

            {/* Order Items */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Articoli ({(selectedCustomerOrder?.items ?? selectedOrder.order_items)?.length || 0})</Text>
              {(selectedCustomerOrder?.items ?? selectedOrder.order_items) && (selectedCustomerOrder?.items ?? selectedOrder.order_items).length > 0 ? (
                (selectedCustomerOrder?.items ?? selectedOrder.order_items).map((item, index) => (
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
                          android_material_icon_name="check-circle"
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

                    {!item.picked_up_at && !item.returned_to_sender && isReady && (
                      <Pressable
                        style={styles.itemReturnButton}
                        onPress={() => {
                          console.log('[Rispedisci button] pressed for item:', item.id, item.product_name);
                          handleMarkItemAsReturned(item, selectedOrder);
                        }}
                      >
                        <IconSymbol
                          ios_icon_name="arrow.uturn.backward"
                          android_material_icon_name="undo"
                          size={14}
                          color={colors.error}
                        />
                        <Text style={styles.itemReturnButtonText}>Rispedisci</Text>
                      </Pressable>
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
                <Text style={styles.summaryValue}>€{(selectedCustomerOrder?.totalValue ?? selectedOrder.total_value).toFixed(2)}</Text>
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

  const renderCustomerOrder = (co: CustomerOrder) => {
    const daysInStorage = calculateDaysInStorage(co.order.arrived_at);
    const itemsLabel = co.items.length === 1 ? co.items[0].product_name : `${co.items.length} articoli`;
    const totalDisplay = co.totalValue.toFixed(2);
    // Use effectiveStatus for the badge so partially-received orders show the correct per-customer state
    const effectiveStatusKey = co.effectiveStatus === 'ready' ? 'ready_for_pickup' : co.effectiveStatus;
    const statusColor = getStatusColor(effectiveStatusKey);
    const statusIcon = getStatusIcon(effectiveStatusKey);
    const statusLabel = getStatusText(effectiveStatusKey);
    const showDays = daysInStorage > 0 && co.effectiveStatus !== 'completed';
    const showPhone = co.customerPhone !== 'N/A';

    return (
      <Pressable
        key={co.key}
        style={({ pressed }) => [styles.orderCard, pressed && styles.orderCardPressed]}
        onPress={() => {
          console.log('[renderCustomerOrder] card pressed:', co.customerOrderNumber, 'userId:', co.userId);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedOrder(co.order);
          setSelectedCustomerOrder(co);
          setModalVisible(true);
        }}
      >
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderNumber}>{co.customerOrderNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <IconSymbol
                ios_icon_name={statusIcon}
                android_material_icon_name="circle"
                size={14}
                color={statusColor}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          {showDays && (
            <View style={styles.daysInStorage}>
              <Text style={styles.daysInStorageText}>{daysInStorage} giorni</Text>
            </View>
          )}
        </View>

        {/* Customer */}
        <View style={styles.customersSection}>
          <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={16} color={colors.textSecondary} />
          <Text style={styles.customersText}>{co.customerName}</Text>
          {showPhone && (
            <Text style={[styles.customersText, { color: colors.textTertiary, marginLeft: 4 }]}>
              {'\u2022 '}{co.customerPhone}
            </Text>
          )}
        </View>

        {/* Products Summary */}
        <View style={styles.productsSection}>
          <Text style={styles.productsLabel}>{itemsLabel}</Text>
        </View>

        {/* Value */}
        <View style={styles.valueSection}>
          <Text style={styles.valueLabel}>Totale:</Text>
          <Text style={styles.valueAmount}>€{totalDisplay}</Text>
        </View>

        {/* Tap hint */}
        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>Tocca per gestire</Text>
          <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={16} color={colors.textTertiary} />
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

  const allCustomerOrders = explodeOrdersByCustomer(allOrders);
  const pendingCustomerOrders = allCustomerOrders.filter(co => co.effectiveStatus === 'pending');
  const readyCustomerOrders = allCustomerOrders.filter(co => co.effectiveStatus === 'ready');
  const completedCustomerOrders = allCustomerOrders.filter(co => co.effectiveStatus === 'completed');
  const currentCustomerOrders =
    selectedTab === 'pending' ? pendingCustomerOrders :
    selectedTab === 'ready' ? readyCustomerOrders :
    completedCustomerOrders;
  const pendingCustomerCount = pendingCustomerOrders.length;
  const readyCustomerCount = readyCustomerOrders.length;
  const completedCustomerCount = completedCustomerOrders.length;

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
              console.log('[OrdersScreen] tab pressed: pending');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('pending');
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'pending' && styles.tabTextActive]}>
              In Arrivo ({pendingCustomerCount})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, selectedTab === 'ready' && styles.tabActive]}
            onPress={() => {
              console.log('[OrdersScreen] tab pressed: ready');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('ready');
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'ready' && styles.tabTextActive]}>
              Da Consegnare ({readyCustomerCount})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, selectedTab === 'completed' && styles.tabActive]}
            onPress={() => {
              console.log('[OrdersScreen] tab pressed: completed');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('completed');
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'completed' && styles.tabTextActive]}>
              Completati ({completedCustomerCount})
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
            {currentCustomerOrders.map(renderCustomerOrder)}
          </View>

          {currentCustomerOrders.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol 
                ios_icon_name="shippingbox" 
                android_material_icon_name="inventory-2"
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
  itemReturnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  itemReturnButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
