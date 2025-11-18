
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { usePayment, PaymentMethod } from '@/contexts/PaymentContext';
import * as Haptics from 'expo-haptics';

export default function PaymentMethodsScreen() {
  const { paymentMethods, removePaymentMethod, setDefaultPaymentMethod } = usePayment();

  const handleAddCard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/add-payment-method');
  };

  const handleSetDefault = (methodId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDefaultPaymentMethod(methodId);
  };

  const handleRemove = (method: PaymentMethod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Rimuovi Metodo di Pagamento',
      `Sei sicuro di voler rimuovere ${method.brand} •••• ${method.last4}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: () => removePaymentMethod(method.id),
        },
      ]
    );
  };

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return 'creditcard.fill';
      case 'mastercard':
        return 'creditcard.fill';
      case 'amex':
        return 'creditcard.fill';
      default:
        return 'creditcard';
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Metodi di Pagamento',
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
            <Text style={styles.headerTitle}>I tuoi metodi di pagamento</Text>
            <Text style={styles.headerSubtitle}>
              Gestisci le tue carte e altri metodi di pagamento
            </Text>
          </View>

          {paymentMethods.length > 0 ? (
            <View style={styles.methodsList}>
              {paymentMethods.map(method => (
                <View key={method.id} style={styles.methodCard}>
                  <View style={styles.methodHeader}>
                    <View style={styles.methodInfo}>
                      <IconSymbol
                        name={getCardIcon(method.brand)}
                        size={32}
                        color={colors.text}
                      />
                      <View style={styles.methodDetails}>
                        <Text style={styles.methodBrand}>
                          {method.brand?.toUpperCase() || 'CARTA'}
                        </Text>
                        <Text style={styles.methodNumber}>•••• {method.last4}</Text>
                        {method.expiryMonth && method.expiryYear && (
                          <Text style={styles.methodExpiry}>
                            Scade {method.expiryMonth.toString().padStart(2, '0')}/
                            {method.expiryYear.toString().slice(-2)}
                          </Text>
                        )}
                      </View>
                    </View>
                    {method.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>PREDEFINITA</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.methodActions}>
                    {!method.isDefault && (
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleSetDefault(method.id)}
                      >
                        <IconSymbol name="checkmark.circle" size={20} color={colors.text} />
                        <Text style={styles.actionText}>Imposta come predefinita</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.actionButton, styles.removeButton]}
                      onPress={() => handleRemove(method)}
                    >
                      <IconSymbol name="trash" size={20} color="#ef4444" />
                      <Text style={[styles.actionText, styles.removeText]}>Rimuovi</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="creditcard" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nessun metodo di pagamento</Text>
              <Text style={styles.emptyText}>
                Aggiungi una carta per prenotare i prodotti nei drop attivi
              </Text>
            </View>
          )}

          <Pressable style={styles.addButton} onPress={handleAddCard}>
            <IconSymbol name="plus.circle.fill" size={24} color={colors.text} />
            <Text style={styles.addButtonText}>Aggiungi Metodo di Pagamento</Text>
          </Pressable>

          <View style={styles.infoCard}>
            <IconSymbol name="lock.shield.fill" size={24} color={colors.text} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Pagamenti Sicuri</Text>
              <Text style={styles.infoText}>
                I tuoi dati di pagamento sono protetti con crittografia di livello bancario.
                Utilizziamo Stripe per processare i pagamenti in modo sicuro.
              </Text>
            </View>
          </View>

          <View style={styles.howItWorksCard}>
            <Text style={styles.howItWorksTitle}>Come funzionano i pagamenti?</Text>
            <View style={styles.stepsList}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>
                  Quando prenoti con carta, blocchiamo l&apos;importo massimo sulla tua carta
                </Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>
                  Durante il drop, lo sconto aumenta man mano che più persone prenotano
                </Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>
                  Alla fine del drop, addebitiamo solo l&apos;importo finale con lo sconto raggiunto
                </Text>
              </View>
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
    paddingTop: 80,
    paddingBottom: 120,
  },
  contentContainerWithTabBar: {
    paddingBottom: 200,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 48,
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
  methodsList: {
    paddingHorizontal: 20,
    gap: 24,
  },
  methodCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  methodInfo: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  methodDetails: {
    flex: 1,
  },
  methodBrand: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  methodNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: 2,
  },
  methodExpiry: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  defaultBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.5,
  },
  methodActions: {
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  removeButton: {
    marginTop: 4,
  },
  removeText: {
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 40,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 40,
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
  howItWorksCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  stepsList: {
    gap: 20,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingTop: 4,
  },
});
