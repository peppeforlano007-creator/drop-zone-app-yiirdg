
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
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
  profiles?: {
    full_name?: string;
    phone?: string;
  };
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed'>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    if (!user?.pickupPointId) {
      console.error('No pickup point ID found');
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
            user_id
          )
        `)
        .eq('pickup_point_id', user.pickupPointId)
        .in('status', ['pending', 'confirmed', 'in_transit', 'arrived', 'ready_for_pickup'])
        .order('created_at', { ascending: false });

      if (activeError) {
        console.error('Error loading active orders:', activeError);
        Alert.alert('Errore', 'Impossibile caricare gli ordini attivi');
      } else {
        console.log('Active orders loaded:', activeData?.length || 0);
        
        // Fetch user profiles for each order
        const ordersWithProfiles = await Promise.all(
          (activeData || []).map(async (order) => {
            if (order.order_items && order.order_items.length > 0) {
              const userId = order.order_items[0].user_id;
              const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('user_id', userId)
                .single();
              
              return { ...order, profiles: profileData };
            }
            return order;
          })
        );
        
        setActiveOrders(ordersWithProfiles);
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
            user_id
          )
        `)
        .eq('pickup_point_id', user.pickupPointId)
        .in('status', ['completed', 'cancelled'])
        .order('completed_at', { ascending: false })
        .limit(20);

      if (completedError) {
        console.error('Error loading completed orders:', completedError);
        Alert.alert('Errore', 'Impossibile caricare gli ordini completati');
      } else {
        console.log('Completed orders loaded:', completedData?.length || 0);
        
        // Fetch user profiles for each order
        const ordersWithProfiles = await Promise.all(
          (completedData || []).map(async (order) => {
            if (order.order_items && order.order_items.length > 0) {
              const userId = order.order_items[0].user_id;
              const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('user_id', userId)
                .single();
              
              return { ...order, profiles: profileData };
            }
            return order;
          })
        );
        
        setCompletedOrders(ordersWithProfiles);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante il caricamento degli ordini');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
        return '#10B981';
      case 'completed':
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
        return 'Pronto per Ritiro';
      case 'completed':
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
        return 'bell.badge.fill';
      case 'completed':
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
                Alert.alert('Successo', 'Il cliente è stato notificato che l\'ordine è pronto per il ritiro.');
                loadOrders();
              }
            } catch (error) {
              console.error('Error marking order as arrived:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const handleMarkAsPickedUp = async (order: Order) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const customerName = order.profiles?.full_name || 'il cliente';
    
    Alert.alert(
      'Ordine Ritirato',
      `Confermi che ${customerName} ha ritirato l'ordine ${order.order_number}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              const now = new Date().toISOString();
              
              // Update order status
              const { error: orderError } = await supabase
                .from('orders')
                .update({
                  status: 'completed',
                  completed_at: now,
                  updated_at: now,
                })
                .eq('id', order.id);

              if (orderError) {
                console.error('Error updating order:', orderError);
                Alert.alert('Errore', 'Impossibile aggiornare lo stato dell\'ordine');
                return;
              }

              // Update all order items to picked_up
              const { error: itemsError } = await supabase
                .from('order_items')
                .update({
                  pickup_status: 'picked_up',
                  picked_up_at: now,
                })
                .eq('order_id', order.id);

              if (itemsError) {
                console.error('Error updating order items:', itemsError);
              }

              const commissionAmount = order.total_value * 0.05; // Assuming 5% commission
              Alert.alert(
                'Successo', 
                `Ordine completato! La commissione di €${commissionAmount.toFixed(2)} è stata aggiunta al tuo conto.`
              );
              loadOrders();
            } catch (error) {
              console.error('Error marking order as picked up:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const handleCallCustomer = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (phone) {
      Alert.alert('Chiama Cliente', `Vuoi chiamare ${phone}?`);
    } else {
      Alert.alert('Errore', 'Numero di telefono non disponibile');
    }
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

  const renderOrder = (order: Order) => {
    const customerName = order.profiles?.full_name || 'Cliente';
    const customerPhone = order.profiles?.phone || 'N/A';
    const daysInStorage = calculateDaysInStorage(order.arrived_at);

    return (
      <View key={order.id} style={styles.orderCard}>
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

        {/* Customer Info */}
        <View style={styles.customerSection}>
          <View style={styles.customerInfo}>
            <IconSymbol 
              ios_icon_name="person.fill" 
              android_material_icon_name="person"
              size={18} 
              color={colors.textSecondary} 
            />
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.customerPhone}>{customerPhone}</Text>
            </View>
          </View>
          {customerPhone !== 'N/A' && (
            <Pressable
              style={styles.callButton}
              onPress={() => handleCallCustomer(customerPhone)}
            >
              <IconSymbol 
                ios_icon_name="phone.fill" 
                android_material_icon_name="phone"
                size={18} 
                color={colors.background} 
              />
            </Pressable>
          )}
        </View>

        {/* Products */}
        <View style={styles.productsSection}>
          <Text style={styles.productsLabel}>Prodotti:</Text>
          {order.order_items && order.order_items.length > 0 ? (
            order.order_items.map((item, index) => (
              <Text key={index} style={styles.productItem}>
                • {item.product_name}
                {item.selected_size && ` - Taglia: ${item.selected_size}`}
                {item.selected_color && ` - Colore: ${item.selected_color}`}
              </Text>
            ))
          ) : (
            <Text style={styles.productItem}>Nessun prodotto</Text>
          )}
        </View>

        {/* Value */}
        <View style={styles.valueSection}>
          <Text style={styles.valueLabel}>Valore Ordine:</Text>
          <Text style={styles.valueAmount}>€{order.total_value.toFixed(2)}</Text>
        </View>

        {/* Dates */}
        {order.arrived_at && (
          <View style={styles.dateSection}>
            <IconSymbol 
              ios_icon_name="calendar" 
              android_material_icon_name="calendar_today"
              size={16} 
              color={colors.textSecondary} 
            />
            <Text style={styles.dateText}>
              Arrivato: {formatDate(order.arrived_at)}
            </Text>
          </View>
        )}
        {order.completed_at && (
          <View style={styles.dateSection}>
            <IconSymbol 
              ios_icon_name="checkmark.circle" 
              android_material_icon_name="check_circle"
              size={16} 
              color={colors.textSecondary} 
            />
            <Text style={styles.dateText}>
              Ritirato: {formatDate(order.completed_at)}
            </Text>
          </View>
        )}

        {/* Actions */}
        {order.status === 'arrived' && (
          <Pressable
            style={styles.actionButton}
            onPress={() => handleMarkAsArrived(order)}
          >
            <IconSymbol 
              ios_icon_name="bell.badge.fill" 
              android_material_icon_name="notifications_active"
              size={20} 
              color={colors.background} 
            />
            <Text style={styles.actionButtonText}>Notifica Cliente</Text>
          </Pressable>
        )}
        {order.status === 'ready_for_pickup' && (
          <Pressable
            style={styles.actionButton}
            onPress={() => handleMarkAsPickedUp(order)}
          >
            <IconSymbol 
              ios_icon_name="checkmark.circle.fill" 
              android_material_icon_name="check_circle"
              size={20} 
              color={colors.background} 
            />
            <Text style={styles.actionButtonText}>Segna come Ritirato</Text>
          </Pressable>
        )}
      </View>
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
                ? 'Gestisci gli ordini in arrivo e pronti per il ritiro. Ricorda di conservare i pacchi per almeno 7 giorni.'
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  customerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  callButton: {
    backgroundColor: colors.text,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productsSection: {
    marginBottom: 16,
  },
  productsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  productItem: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  valueSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
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
});
