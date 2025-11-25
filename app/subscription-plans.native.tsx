
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useSubscription } from '@/contexts/SubscriptionContext';
import * as Haptics from 'expo-haptics';

export default function SubscriptionPlansScreen() {
  const { plans, activeSubscription, createSubscription } = useSubscription();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectPlan = async (planId: string, priceId: string) => {
    if (isProcessing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Abbonamento Non Disponibile',
      'La funzionalità di abbonamento è stata rimossa. Tutti i servizi sono ora gratuiti.',
      [{ text: 'OK' }]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Piani di Abbonamento',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Scegli il tuo piano</Text>
            <Text style={styles.headerSubtitle}>
              Sblocca funzionalità premium e ottieni il massimo dalla piattaforma
            </Text>
          </View>

          {activeSubscription && (
            <View style={styles.currentPlanBanner}>
              <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={24} color={colors.success} />
              <Text style={styles.currentPlanText}>
                Piano attuale: {activeSubscription.plan?.name}
              </Text>
            </View>
          )}

          <View style={styles.plansContainer}>
            {plans.map((plan, index) => {
              const isCurrentPlan = activeSubscription?.subscriptionPlanId === plan.id;
              const isProcessingThisPlan = selectedPlanId === plan.id && isProcessing;

              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    isCurrentPlan && styles.planCardActive,
                    index === 1 && styles.planCardFeatured,
                  ]}
                >
                  {index === 1 && (
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredText}>PIÙ POPOLARE</Text>
                    </View>
                  )}

                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.description && (
                      <Text style={styles.planDescription}>{plan.description}</Text>
                    )}
                  </View>

                  <View style={styles.planPricing}>
                    <Text style={styles.planPrice}>€{plan.amount.toFixed(0)}</Text>
                    <Text style={styles.planInterval}>
                      /{plan.interval === 'month' ? 'mese' : 'anno'}
                    </Text>
                  </View>

                  {plan.features && plan.features.length > 0 && (
                    <View style={styles.planFeatures}>
                      {plan.features.map((feature, featureIndex) => (
                        <View key={featureIndex} style={styles.featureRow}>
                          <IconSymbol
                            ios_icon_name="checkmark.circle.fill"
                            android_material_icon_name="check_circle"
                            size={20}
                            color={index === 1 ? colors.text : colors.success}
                          />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Pressable
                    style={[
                      styles.selectButton,
                      isCurrentPlan && styles.selectButtonActive,
                      index === 1 && styles.selectButtonFeatured,
                      isProcessingThisPlan && styles.selectButtonProcessing,
                    ]}
                    onPress={() => handleSelectPlan(plan.id, plan.stripePriceId)}
                    disabled={isCurrentPlan || isProcessing}
                  >
                    {isProcessingThisPlan ? (
                      <ActivityIndicator color={index === 1 ? colors.background : colors.text} />
                    ) : (
                      <Text
                        style={[
                          styles.selectButtonText,
                          isCurrentPlan && styles.selectButtonTextActive,
                          index === 1 && styles.selectButtonTextFeatured,
                        ]}
                      >
                        {isCurrentPlan ? 'Piano Attuale' : 'Seleziona Piano'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.faqTitle}>Domande Frequenti</Text>
            
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Posso annullare in qualsiasi momento?</Text>
              <Text style={styles.faqAnswer}>
                Sì, puoi annullare il tuo abbonamento in qualsiasi momento. Continuerai ad avere 
                accesso alle funzionalità premium fino alla fine del periodo di fatturazione.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Posso cambiare piano?</Text>
              <Text style={styles.faqAnswer}>
                Sì, puoi passare a un piano superiore o inferiore in qualsiasi momento. 
                Le modifiche saranno applicate al prossimo ciclo di fatturazione.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Come funziona la fatturazione?</Text>
              <Text style={styles.faqAnswer}>
                Gli abbonamenti vengono fatturati automaticamente all&apos;inizio di ogni periodo 
                (mensile o annuale) utilizzando il metodo di pagamento predefinito.
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
  contentContainer: {
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 40,
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
    lineHeight: 20,
  },
  currentPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.success + '20',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
  },
  currentPlanText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  plansContainer: {
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.border,
  },
  planCardActive: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  planCardFeatured: {
    borderColor: colors.text,
    backgroundColor: colors.text,
    transform: [{ scale: 1.02 }],
  },
  featuredBadge: {
    position: 'absolute',
    top: -12,
    left: 24,
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.5,
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  planPrice: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -2,
  },
  planInterval: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  planFeatures: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  selectButton: {
    backgroundColor: colors.text,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectButtonActive: {
    backgroundColor: colors.success,
  },
  selectButtonFeatured: {
    backgroundColor: colors.background,
  },
  selectButtonProcessing: {
    opacity: 0.6,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  selectButtonTextActive: {
    color: colors.background,
  },
  selectButtonTextFeatured: {
    color: colors.text,
  },
  faqSection: {
    paddingHorizontal: 20,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 24,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
