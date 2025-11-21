
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

interface SubscriptionWithUser {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  profiles: {
    email: string;
    full_name: string;
  };
  subscription_plans: {
    name: string;
    amount: number;
    interval: string;
  };
}

export default function AdminSubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          profiles!inner (
            email,
            full_name
          ),
          subscription_plans (
            name,
            amount,
            interval
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading subscriptions:', error);
        Alert.alert('Errore', 'Impossibile caricare gli abbonamenti');
        return;
      }

      setSubscriptions(data || []);
    } catch (error) {
      console.error('Exception loading subscriptions:', error);
      Alert.alert('Errore', 'Errore imprevisto durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return colors.success;
      case 'past_due':
        return colors.warning;
      case 'canceled':
      case 'unpaid':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Attivo';
      case 'trialing':
        return 'Prova';
      case 'past_due':
        return 'Scaduto';
      case 'canceled':
        return 'Annullato';
      case 'unpaid':
        return 'Non Pagato';
      case 'incomplete':
        return 'Incompleto';
      default:
        return status;
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.profiles.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.subscription_plans.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterStatus === 'all' || sub.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length,
    canceled: subscriptions.filter(s => s.status === 'canceled').length,
    pastDue: subscriptions.filter(s => s.status === 'past_due').length,
    mrr: subscriptions
      .filter(s => s.status === 'active' || s.status === 'trialing')
      .reduce((sum, s) => {
        const amount = Number(s.subscription_plans.amount);
        return sum + (s.subscription_plans.interval === 'month' ? amount : amount / 12);
      }, 0),
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Gestione Abbonamenti',
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={styles.loadingText}>Caricamento abbonamenti...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gestione Abbonamenti',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            Platform.OS !== 'ios' && styles.contentContainerWithPadding,
          ]}
        >
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Totale</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.success }]}>{stats.active}</Text>
              <Text style={styles.statLabel}>Attivi</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.error }]}>{stats.canceled}</Text>
              <Text style={styles.statLabel}>Annullati</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>€{stats.mrr.toFixed(0)}</Text>
              <Text style={styles.statLabel}>MRR</Text>
            </View>
          </View>

          {/* Search and Filter */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca per email, nome o piano..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
              {['all', 'active', 'trialing', 'past_due', 'canceled'].map(status => (
                <Pressable
                  key={status}
                  style={[
                    styles.filterChip,
                    filterStatus === status && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFilterStatus(status);
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterStatus === status && styles.filterChipTextActive,
                    ]}
                  >
                    {status === 'all' ? 'Tutti' : getStatusText(status)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Subscriptions List */}
          <View style={styles.listContainer}>
            {filteredSubscriptions.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol ios_icon_name="tray" android_material_icon_name="inbox" size={64} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>Nessun abbonamento trovato</Text>
                <Text style={styles.emptyText}>
                  {searchQuery || filterStatus !== 'all'
                    ? 'Prova a modificare i filtri di ricerca'
                    : 'Non ci sono ancora abbonamenti'}
                </Text>
              </View>
            ) : (
              filteredSubscriptions.map(subscription => (
                <View key={subscription.id} style={styles.subscriptionCard}>
                  <View style={styles.subscriptionHeader}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {subscription.profiles.full_name || 'Nome non disponibile'}
                      </Text>
                      <Text style={styles.userEmail}>{subscription.profiles.email}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(subscription.status) }]}>
                        {getStatusText(subscription.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.subscriptionDetails}>
                    <View style={styles.detailRow}>
                      <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>
                        {subscription.subscription_plans.name} - €{subscription.subscription_plans.amount.toFixed(2)}/
                        {subscription.subscription_plans.interval === 'month' ? 'mese' : 'anno'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar_today" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>
                        Rinnovo: {formatDate(subscription.current_period_end)}
                      </Text>
                    </View>

                    {subscription.cancel_at_period_end && (
                      <View style={styles.warningRow}>
                        <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={16} color={colors.warning} />
                        <Text style={styles.warningText}>
                          Terminerà il {formatDate(subscription.current_period_end)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Pressable
                    style={styles.viewStripeButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      // Open Stripe subscription in browser
                      const stripeUrl = `https://dashboard.stripe.com/test/subscriptions/${subscription.stripe_subscription_id}`;
                      Alert.alert(
                        'Apri in Stripe',
                        'Vuoi aprire questo abbonamento nella dashboard di Stripe?',
                        [
                          { text: 'Annulla', style: 'cancel' },
                          {
                            text: 'Apri',
                            onPress: () => {
                              // In a real app, you'd use Linking.openURL(stripeUrl)
                              console.log('Opening Stripe URL:', stripeUrl);
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.viewStripeButtonText}>Visualizza in Stripe</Text>
                    <IconSymbol ios_icon_name="arrow.up.right" android_material_icon_name="open_in_new" size={16} color={colors.text} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  contentContainer: {
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 40,
  },
  contentContainerWithPadding: {
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.background,
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  subscriptionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subscriptionDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warning + '20',
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
  },
  viewStripeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  viewStripeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
