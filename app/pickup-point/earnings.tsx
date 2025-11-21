
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';

interface MonthlyEarnings {
  month: string;
  year: number;
  ordersDelivered: number;
  commission: number;
  status: 'paid' | 'pending' | 'processing';
}

interface OrderCommission {
  id: string;
  order_number: string;
  customer_name: string;
  completed_at: string;
  commission: number;
  status: string;
}

export default function EarningsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderCommission[]>([]);
  const [pickupPoint, setPickupPoint] = useState<any>(null);

  const loadEarningsData = useCallback(async () => {
    if (!user?.pickupPointId) {
      console.error('No pickup point ID found');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log('Loading earnings data for pickup point:', user.pickupPointId);

      // Load pickup point data to get commission rate
      const { data: ppData, error: ppError } = await supabase
        .from('pickup_points')
        .select('*')
        .eq('id', user.pickupPointId)
        .single();

      if (ppError) {
        console.error('Error loading pickup point:', ppError);
      } else {
        setPickupPoint(ppData);
      }

      const commissionRate = ppData?.commission_rate || 5;

      // Load all completed orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_value,
          commission_amount,
          status,
          completed_at,
          order_items (
            user_id
          )
        `)
        .eq('pickup_point_id', user.pickupPointId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
      } else {
        console.log('Completed orders loaded:', ordersData?.length || 0);

        // Group orders by month
        const monthlyData: { [key: string]: MonthlyEarnings } = {};
        
        if (ordersData && ordersData.length > 0) {
          for (const order of ordersData) {
            const date = new Date(order.completed_at);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthName = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
            const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                month: monthNameCapitalized,
                year: date.getFullYear(),
                ordersDelivered: 0,
                commission: 0,
                status: 'paid', // You can implement logic to determine if it's paid or pending
              };
            }

            monthlyData[monthKey].ordersDelivered += 1;
            monthlyData[monthKey].commission += Number(order.commission_amount) || (Number(order.total_value) * commissionRate / 100);
          }
        }

        // Convert to array and sort by date (most recent first)
        const monthlyArray = Object.values(monthlyData).sort((a, b) => {
          return b.year - a.year || b.month.localeCompare(a.month);
        });

        setMonthlyEarnings(monthlyArray);

        // Load recent orders with customer names
        const recentOrdersWithCustomers = await Promise.all(
          (ordersData || []).slice(0, 10).map(async (order) => {
            let customerName = 'Cliente';
            
            if (order.order_items && order.order_items.length > 0) {
              const userId = order.order_items[0].user_id;
              const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', userId)
                .single();
              
              if (profileData?.full_name) {
                customerName = profileData.full_name;
              }
            }

            return {
              id: order.id,
              order_number: order.order_number,
              customer_name: customerName,
              completed_at: order.completed_at,
              commission: Number(order.commission_amount) || (Number(order.total_value) * commissionRate / 100),
              status: order.status,
            };
          })
        );

        setRecentOrders(recentOrdersWithCustomers);
      }
    } catch (error) {
      console.error('Error loading earnings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.pickupPointId]);

  useEffect(() => {
    loadEarningsData();
  }, [loadEarningsData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadEarningsData();
  };

  const totalEarnings = monthlyEarnings.reduce((sum, item) => sum + item.commission, 0);
  const totalOrders = monthlyEarnings.reduce((sum, item) => sum + item.ordersDelivered, 0);
  const pendingEarnings = monthlyEarnings
    .filter(item => item.status === 'pending')
    .reduce((sum, item) => sum + item.commission, 0);

  const commissionPerOrder = pickupPoint?.commission_rate || 5;

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento guadagni...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Guadagni e Commissioni',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <IconSymbol 
                ios_icon_name="eurosign.circle.fill" 
                android_material_icon_name="euro"
                size={32} 
                color={colors.success} 
              />
              <Text style={styles.summaryValue}>€{totalEarnings.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Totale Guadagnato</Text>
            </View>

            <View style={styles.summaryCard}>
              <IconSymbol 
                ios_icon_name="shippingbox.fill" 
                android_material_icon_name="inventory_2"
                size={32} 
                color={colors.primary} 
              />
              <Text style={styles.summaryValue}>{totalOrders}</Text>
              <Text style={styles.summaryLabel}>Ordini Consegnati</Text>
            </View>
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <IconSymbol 
                ios_icon_name="clock.fill" 
                android_material_icon_name="schedule"
                size={32} 
                color="#F59E0B" 
              />
              <Text style={styles.summaryValue}>€{pendingEarnings.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>In Attesa</Text>
            </View>

            <View style={styles.summaryCard}>
              <IconSymbol 
                ios_icon_name="chart.line.uptrend.xyaxis" 
                android_material_icon_name="trending_up"
                size={32} 
                color="#10B981" 
              />
              <Text style={styles.summaryValue}>{commissionPerOrder}%</Text>
              <Text style={styles.summaryLabel}>Commissione</Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <IconSymbol 
                ios_icon_name="info.circle.fill" 
                android_material_icon_name="info"
                size={20} 
                color={colors.info} 
              />
              <Text style={styles.infoTitle}>Come funziona</Text>
            </View>
            <Text style={styles.infoText}>
              - Guadagni il {commissionPerOrder}% su ogni ordine consegnato{'\n'}
              - Le commissioni vengono calcolate mensilmente{'\n'}
              - Il pagamento avviene entro il 15 del mese successivo{'\n'}
              - I pagamenti vengono effettuati tramite bonifico bancario
            </Text>
          </View>

          {/* Monthly Earnings */}
          {monthlyEarnings.length > 0 && (
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
                        <IconSymbol 
                          ios_icon_name="shippingbox" 
                          android_material_icon_name="inventory_2"
                          size={18} 
                          color={colors.textSecondary} 
                        />
                        <Text style={styles.earningsItemLabel}>Ordini</Text>
                        <Text style={styles.earningsItemValue}>{item.ordersDelivered}</Text>
                      </View>

                      <View style={styles.earningsDivider} />

                      <View style={styles.earningsItem}>
                        <IconSymbol 
                          ios_icon_name="eurosign" 
                          android_material_icon_name="euro"
                          size={18} 
                          color={colors.textSecondary} 
                        />
                        <Text style={styles.earningsItemLabel}>Commissione</Text>
                        <Text style={styles.earningsItemValue}>€{item.commission.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Recent Orders */}
          {recentOrders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ordini Recenti</Text>

              {recentOrders.map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderNumber}>{order.order_number}</Text>
                      <Text style={styles.orderCustomer}>{order.customer_name}</Text>
                    </View>
                    <View style={styles.orderRight}>
                      <Text style={styles.orderCommission}>€{order.commission.toFixed(2)}</Text>
                      <View style={[styles.orderStatusBadge, { backgroundColor: colors.success + '20' }]}>
                        <Text style={[styles.orderStatusText, { color: colors.success }]}>
                          Completato
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.orderDate}>Consegnato: {formatDate(order.completed_at)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {monthlyEarnings.length === 0 && recentOrders.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol 
                ios_icon_name="chart.bar" 
                android_material_icon_name="bar_chart"
                size={64} 
                color={colors.textTertiary} 
              />
              <Text style={styles.emptyStateText}>
                Nessun guadagno registrato
              </Text>
              <Text style={styles.emptyStateSubtext}>
                I guadagni appariranno qui quando gli ordini verranno completati
              </Text>
            </View>
          )}

          {/* Bank Info */}
          <View style={styles.bankCard}>
            <View style={styles.bankHeader}>
              <IconSymbol 
                ios_icon_name="creditcard.fill" 
                android_material_icon_name="credit_card"
                size={24} 
                color={colors.text} 
              />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
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
