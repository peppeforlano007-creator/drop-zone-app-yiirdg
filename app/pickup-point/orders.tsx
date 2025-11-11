
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  products: string[];
  totalValue: number;
  status: 'in-transit' | 'arrived' | 'ready-for-pickup' | 'completed';
  arrivalDate?: Date;
  pickupDate?: Date;
  daysInStorage: number;
}

export default function OrdersScreen() {
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed'>('active');

  const activeOrders: Order[] = [
    {
      id: '1',
      orderNumber: 'ORD-2025-1234',
      customerName: 'Mario Rossi',
      customerPhone: '+39 333 1234567',
      products: ['Designer Leather Jacket', 'Luxury Handbag'],
      totalValue: 385.50,
      status: 'ready-for-pickup',
      arrivalDate: new Date('2025-04-10'),
      daysInStorage: 5,
    },
    {
      id: '2',
      orderNumber: 'ORD-2025-1233',
      customerName: 'Laura Bianchi',
      customerPhone: '+39 333 2345678',
      products: ['Wireless Headphones'],
      totalValue: 196.00,
      status: 'arrived',
      arrivalDate: new Date('2025-04-14'),
      daysInStorage: 1,
    },
    {
      id: '3',
      orderNumber: 'ORD-2025-1232',
      customerName: 'Giuseppe Verdi',
      customerPhone: '+39 333 3456789',
      products: ['Smart Watch', 'Portable Speaker'],
      totalValue: 350.00,
      status: 'in-transit',
      daysInStorage: 0,
    },
  ];

  const completedOrders: Order[] = [
    {
      id: '4',
      orderNumber: 'ORD-2025-1231',
      customerName: 'Anna Neri',
      customerPhone: '+39 333 4567890',
      products: ['Modern Coffee Table'],
      totalValue: 117.00,
      status: 'completed',
      arrivalDate: new Date('2025-03-25'),
      pickupDate: new Date('2025-03-28'),
      daysInStorage: 3,
    },
    {
      id: '5',
      orderNumber: 'ORD-2025-1230',
      customerName: 'Marco Gialli',
      customerPhone: '+39 333 5678901',
      products: ['Designer Sunglasses'],
      totalValue: 140.00,
      status: 'completed',
      arrivalDate: new Date('2025-03-24'),
      pickupDate: new Date('2025-03-27'),
      daysInStorage: 3,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-transit':
        return '#3B82F6';
      case 'arrived':
        return '#F59E0B';
      case 'ready-for-pickup':
        return '#10B981';
      case 'completed':
        return colors.textSecondary;
      default:
        return colors.text;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in-transit':
        return 'In Transito';
      case 'arrived':
        return 'Arrivato';
      case 'ready-for-pickup':
        return 'Pronto per Ritiro';
      case 'completed':
        return 'Completato';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in-transit':
        return 'shippingbox';
      case 'arrived':
        return 'checkmark.circle';
      case 'ready-for-pickup':
        return 'bell.badge';
      case 'completed':
        return 'checkmark.circle.fill';
      default:
        return 'circle';
    }
  };

  const handleMarkAsArrived = (order: Order) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Ordine Arrivato',
      `Confermi che l'ordine ${order.orderNumber} è arrivato nel punto di ritiro?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () => {
            console.log('Order marked as arrived:', order.id);
            Alert.alert('Successo', 'Il cliente è stato notificato che l\'ordine è pronto per il ritiro.');
          },
        },
      ]
    );
  };

  const handleMarkAsPickedUp = (order: Order) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Ordine Ritirato',
      `Confermi che ${order.customerName} ha ritirato l'ordine ${order.orderNumber}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () => {
            console.log('Order marked as picked up:', order.id);
            Alert.alert('Successo', 'Ordine completato! La commissione di €2.50 è stata aggiunta al tuo conto.');
          },
        },
      ]
    );
  };

  const handleCallCustomer = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Calling customer:', phone);
    Alert.alert('Chiama Cliente', `Vuoi chiamare ${phone}?`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderOrder = (order: Order) => (
    <View key={order.id} style={styles.orderCard}>
      {/* Header */}
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <IconSymbol name={getStatusIcon(order.status)} size={14} color={getStatusColor(order.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusText(order.status)}
            </Text>
          </View>
        </View>
        {order.daysInStorage > 0 && (
          <View style={styles.daysInStorage}>
            <Text style={styles.daysInStorageText}>{order.daysInStorage} giorni</Text>
          </View>
        )}
      </View>

      {/* Customer Info */}
      <View style={styles.customerSection}>
        <View style={styles.customerInfo}>
          <IconSymbol name="person.fill" size={18} color={colors.textSecondary} />
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{order.customerName}</Text>
            <Text style={styles.customerPhone}>{order.customerPhone}</Text>
          </View>
        </View>
        <Pressable
          style={styles.callButton}
          onPress={() => handleCallCustomer(order.customerPhone)}
        >
          <IconSymbol name="phone.fill" size={18} color={colors.background} />
        </Pressable>
      </View>

      {/* Products */}
      <View style={styles.productsSection}>
        <Text style={styles.productsLabel}>Prodotti:</Text>
        {order.products.map((product, index) => (
          <Text key={index} style={styles.productItem}>• {product}</Text>
        ))}
      </View>

      {/* Value */}
      <View style={styles.valueSection}>
        <Text style={styles.valueLabel}>Valore Ordine:</Text>
        <Text style={styles.valueAmount}>€{order.totalValue.toFixed(2)}</Text>
      </View>

      {/* Dates */}
      {order.arrivalDate && (
        <View style={styles.dateSection}>
          <IconSymbol name="calendar" size={16} color={colors.textSecondary} />
          <Text style={styles.dateText}>
            Arrivato: {formatDate(order.arrivalDate)}
          </Text>
        </View>
      )}
      {order.pickupDate && (
        <View style={styles.dateSection}>
          <IconSymbol name="checkmark.circle" size={16} color={colors.textSecondary} />
          <Text style={styles.dateText}>
            Ritirato: {formatDate(order.pickupDate)}
          </Text>
        </View>
      )}

      {/* Actions */}
      {order.status === 'arrived' && (
        <Pressable
          style={styles.actionButton}
          onPress={() => handleMarkAsArrived(order)}
        >
          <IconSymbol name="bell.badge" size={20} color={colors.background} />
          <Text style={styles.actionButtonText}>Notifica Cliente</Text>
        </Pressable>
      )}
      {order.status === 'ready-for-pickup' && (
        <Pressable
          style={styles.actionButton}
          onPress={() => handleMarkAsPickedUp(order)}
        >
          <IconSymbol name="checkmark.circle.fill" size={20} color={colors.background} />
          <Text style={styles.actionButtonText}>Segna come Ritirato</Text>
        </Pressable>
      )}
    </View>
  );

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

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <IconSymbol name="info.circle.fill" size={20} color={colors.text} />
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
              <IconSymbol name="shippingbox" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyStateText}>
                {selectedTab === 'active'
                  ? 'Nessun ordine attivo al momento'
                  : 'Nessun ordine completato'}
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
