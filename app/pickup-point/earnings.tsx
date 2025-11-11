
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';

interface EarningsData {
  month: string;
  ordersDelivered: number;
  commission: number;
  status: 'paid' | 'pending' | 'processing';
}

interface OrderCommission {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveredDate: Date;
  commission: number;
  status: 'paid' | 'pending';
}

export default function EarningsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month');

  const monthlyEarnings: EarningsData[] = [
    { month: 'Gennaio 2025', ordersDelivered: 45, commission: 112.50, status: 'paid' },
    { month: 'Febbraio 2025', ordersDelivered: 52, commission: 130.00, status: 'paid' },
    { month: 'Marzo 2025', ordersDelivered: 38, commission: 95.00, status: 'processing' },
    { month: 'Aprile 2025', ordersDelivered: 28, commission: 70.00, status: 'pending' },
  ];

  const recentOrders: OrderCommission[] = [
    {
      id: '1',
      orderNumber: 'ORD-2025-1234',
      customerName: 'Mario Rossi',
      deliveredDate: new Date('2025-04-15'),
      commission: 2.50,
      status: 'pending',
    },
    {
      id: '2',
      orderNumber: 'ORD-2025-1233',
      customerName: 'Laura Bianchi',
      deliveredDate: new Date('2025-04-14'),
      commission: 2.50,
      status: 'pending',
    },
    {
      id: '3',
      orderNumber: 'ORD-2025-1232',
      customerName: 'Giuseppe Verdi',
      deliveredDate: new Date('2025-04-13'),
      commission: 2.50,
      status: 'pending',
    },
    {
      id: '4',
      orderNumber: 'ORD-2025-1231',
      customerName: 'Anna Neri',
      deliveredDate: new Date('2025-03-28'),
      commission: 2.50,
      status: 'paid',
    },
    {
      id: '5',
      orderNumber: 'ORD-2025-1230',
      customerName: 'Marco Gialli',
      deliveredDate: new Date('2025-03-27'),
      commission: 2.50,
      status: 'paid',
    },
  ];

  const totalEarnings = monthlyEarnings.reduce((sum, item) => sum + item.commission, 0);
  const totalOrders = monthlyEarnings.reduce((sum, item) => sum + item.ordersDelivered, 0);
  const pendingEarnings = monthlyEarnings
    .filter(item => item.status === 'pending')
    .reduce((sum, item) => sum + item.commission, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#10B981';
      case 'processing':
        return '#F59E0B';
      case 'pending':
        return colors.textSecondary;
      default:
        return colors.text;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagato';
      case 'processing':
        return 'In elaborazione';
      case 'pending':
        return 'In attesa';
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Guadagni e Commissioni',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <IconSymbol name="eurosign.circle.fill" size={32} color={colors.text} />
              <Text style={styles.summaryValue}>€{totalEarnings.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Totale Guadagnato</Text>
            </View>

            <View style={styles.summaryCard}>
              <IconSymbol name="shippingbox.fill" size={32} color={colors.text} />
              <Text style={styles.summaryValue}>{totalOrders}</Text>
              <Text style={styles.summaryLabel}>Ordini Consegnati</Text>
            </View>
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <IconSymbol name="clock.fill" size={32} color="#F59E0B" />
              <Text style={styles.summaryValue}>€{pendingEarnings.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>In Attesa</Text>
            </View>

            <View style={styles.summaryCard}>
              <IconSymbol name="chart.line.uptrend.xyaxis" size={32} color="#10B981" />
              <Text style={styles.summaryValue}>€2.50</Text>
              <Text style={styles.summaryLabel}>Per Ordine</Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <IconSymbol name="info.circle.fill" size={20} color={colors.text} />
              <Text style={styles.infoTitle}>Come funziona</Text>
            </View>
            <Text style={styles.infoText}>
              - Guadagni €2.50 per ogni ordine consegnato{'\n'}
              - Le commissioni vengono calcolate mensilmente{'\n'}
              - Il pagamento avviene entro il 15 del mese successivo{'\n'}
              - I pagamenti vengono effettuati tramite bonifico bancario
            </Text>
          </View>

          {/* Monthly Earnings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storico Mensile</Text>

            {monthlyEarnings.map((item, index) => (
              <View key={index} style={styles.earningsCard}>
                <View style={styles.earningsHeader}>
                  <Text style={styles.earningsMonth}>{item.month}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {getStatusText(item.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.earningsDetails}>
                  <View style={styles.earningsRow}>
                    <View style={styles.earningsItem}>
                      <IconSymbol name="shippingbox" size={18} color={colors.textSecondary} />
                      <Text style={styles.earningsItemLabel}>Ordini</Text>
                      <Text style={styles.earningsItemValue}>{item.ordersDelivered}</Text>
                    </View>

                    <View style={styles.earningsDivider} />

                    <View style={styles.earningsItem}>
                      <IconSymbol name="eurosign" size={18} color={colors.textSecondary} />
                      <Text style={styles.earningsItemLabel}>Commissione</Text>
                      <Text style={styles.earningsItemValue}>€{item.commission.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Recent Orders */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ordini Recenti</Text>

            {recentOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={styles.orderCustomer}>{order.customerName}</Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={styles.orderCommission}>€{order.commission.toFixed(2)}</Text>
                    <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                      <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>
                        {getStatusText(order.status)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.orderDate}>Consegnato: {formatDate(order.deliveredDate)}</Text>
              </View>
            ))}
          </View>

          {/* Bank Info */}
          <View style={styles.bankCard}>
            <View style={styles.bankHeader}>
              <IconSymbol name="creditcard.fill" size={24} color={colors.text} />
              <Text style={styles.bankTitle}>Conto per Pagamenti</Text>
            </View>
            <Text style={styles.bankText}>
              I pagamenti vengono effettuati sul conto bancario registrato.{'\n'}
              Per modificare i dati bancari, contatta il supporto.
            </Text>
          </View>
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
  summaryContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    margin: 12,
    marginTop: 0,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  section: {
    padding: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  earningsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsMonth: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  earningsDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  earningsDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  earningsItemLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  earningsItemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
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
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  orderCustomer: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  orderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  orderCommission: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bankCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    margin: 12,
    marginTop: 0,
    marginBottom: 32,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  bankTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  bankText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
});
