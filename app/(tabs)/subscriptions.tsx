
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useSubscription } from '@/contexts/SubscriptionContext';
import * as Haptics from 'expo-haptics';

export default function SubscriptionsScreen() {
  const { subscriptions, activeSubscription, loading, cancelSubscription, refreshSubscriptions } = useSubscription();

  useEffect(() => {
    refreshSubscriptions();
  }, []);

  const handleCancelSubscription = (subscriptionId: string, planName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Annulla Abbonamento',
      `Sei sicuro di voler annullare l'abbonamento ${planName}? Potrai continuare ad usufruire dei benefici fino alla fine del periodo corrente.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelSubscription(subscriptionId, false);
            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Abbonamento Annullato', 'Il tuo abbonamento è stato annullato e non verrà rinnovato.');
            } else {
              Alert.alert('Errore', result.error || 'Impossibile annullare l\'abbonamento');
            }
          },
        },
      ]
    );
  };

  const handleViewPlans = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/subscription-plans');
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
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
        return 'Periodo di Prova';
      case 'past_due':
        return 'Pagamento Scaduto';
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

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'I Miei Abbonamenti',
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'I Miei Abbonamenti',
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
            Platform.OS !== 'ios' && styles.contentContainerWithTabBar,
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>I tuoi abbonamenti</Text>
            <Text style={styles.headerSubtitle}>
              Gestisci i tuoi abbonamenti e i pagamenti ricorrenti
            </Text>
          </View>

          {activeSubscription && (
            <View style={styles.activeCard}>
              <View style={styles.activeHeader}>
                <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={32} color={colors.success} />
                <View style={styles.activeInfo}>
                  <Text style={styles.activeTitle}>Abbonamento Attivo</Text>
                  <Text style={styles.activePlan}>{activeSubscription.plan?.name}</Text>
                </View>
              </View>

              <View style={styles.activeDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Stato</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeSubscription.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(activeSubscription.status) }]}>
                      {getStatusText(activeSubscription.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Prossimo rinnovo</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(activeSubscription.currentPeriodEnd)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Importo</Text>
                  <Text style={styles.detailValue}>
                    €{activeSubscription.plan?.amount.toFixed(2)}/{activeSubscription.plan?.interval === 'month' ? 'mese' : 'anno'}
                  </Text>
                </View>

                {activeSubscription.cancelAtPeriodEnd && (
                  <View style={styles.warningBox}>
                    <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={20} color={colors.warning} />
                    <Text style={styles.warningText}>
                      L&apos;abbonamento terminerà il {formatDate(activeSubscription.currentPeriodEnd)}
                    </Text>
                  </View>
                )}
              </View>

              {activeSubscription.plan?.features && activeSubscription.plan.features.length > 0 && (
                <View style={styles.featuresSection}>
                  <Text style={styles.featuresTitle}>Funzionalità incluse:</Text>
                  {activeSubscription.plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color={colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}

              {!activeSubscription.cancelAtPeriodEnd && (
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => handleCancelSubscription(activeSubscription.id, activeSubscription.plan?.name || 'Abbonamento')}
                >
                  <Text style={styles.cancelButtonText}>Annulla Abbonamento</Text>
                </Pressable>
              )}
            </View>
          )}

          {subscriptions.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Storico Abbonamenti</Text>
              {subscriptions.map(subscription => (
                <View key={subscription.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyPlan}>{subscription.plan?.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(subscription.status) }]}>
                        {getStatusText(subscription.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyDate}>
                    {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                  </Text>
                  <Text style={styles.historyAmount}>
                    €{subscription.plan?.amount.toFixed(2)}/{subscription.plan?.interval === 'month' ? 'mese' : 'anno'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!activeSubscription && subscriptions.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="star.circle" android_material_icon_name="star" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nessun abbonamento attivo</Text>
              <Text style={styles.emptyText}>
                Scopri i nostri piani e scegli quello più adatto alle tue esigenze
              </Text>
            </View>
          )}

          <Pressable style={styles.viewPlansButton} onPress={handleViewPlans}>
            <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={24} color={colors.background} />
            <Text style={styles.viewPlansButtonText}>
              {activeSubscription ? 'Cambia Piano' : 'Scopri i Piani'}
            </Text>
          </Pressable>

          <View style={styles.infoCard}>
            <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.text} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Gestione Abbonamenti</Text>
              <Text style={styles.infoText}>
                Puoi annullare il tuo abbonamento in qualsiasi momento. Continuerai ad avere accesso 
                alle funzionalità premium fino alla fine del periodo di fatturazione corrente.
              </Text>
            </View>
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
    paddingTop: 80,
    paddingBottom: 120,
  },
  contentContainerWithTabBar: {
    paddingBottom: 200,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: colors.success,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  activeInfo: {
    flex: 1,
  },
  activeTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  activePlan: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  activeDetails: {
    gap: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warning + '20',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
  },
  featuresSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cancelButton: {
    backgroundColor: colors.error + '20',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  historySection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyPlan: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  historyDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
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
    lineHeight: 20,
  },
  viewPlansButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.text,
    borderRadius: 12,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  viewPlansButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
