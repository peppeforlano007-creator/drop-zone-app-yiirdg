
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { usePayment } from '@/contexts/PaymentContext';
import * as Haptics from 'expo-haptics';

export default function AddPaymentMethodScreen() {
  const { addPaymentMethod } = usePayment();
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const getCardBrand = (number: string): string => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5')) return 'Mastercard';
    if (cleaned.startsWith('3')) return 'Amex';
    return 'Card';
  };

  const validateCard = (): boolean => {
    const cleanedNumber = cardNumber.replace(/\s/g, '');
    
    if (cleanedNumber.length < 13 || cleanedNumber.length > 19) {
      Alert.alert('Errore', 'Numero carta non valido');
      return false;
    }

    if (!expiryDate.match(/^\d{2}\/\d{2}$/)) {
      Alert.alert('Errore', 'Data di scadenza non valida (MM/AA)');
      return false;
    }

    const [month, year] = expiryDate.split('/').map(Number);
    if (month < 1 || month > 12) {
      Alert.alert('Errore', 'Mese non valido');
      return false;
    }

    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      Alert.alert('Errore', 'Carta scaduta');
      return false;
    }

    if (cvv.length < 3 || cvv.length > 4) {
      Alert.alert('Errore', 'CVV non valido');
      return false;
    }

    if (cardholderName.trim().length < 3) {
      Alert.alert('Errore', 'Nome titolare non valido');
      return false;
    }

    return true;
  };

  const handleAddCard = async () => {
    if (!validateCard()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    // Simulate API call to Stripe
    // In production, you would use Stripe's createPaymentMethod API
    setTimeout(() => {
      const cleanedNumber = cardNumber.replace(/\s/g, '');
      const [month, year] = expiryDate.split('/').map(Number);
      
      const paymentMethod = {
        id: `pm_${Date.now()}`,
        type: 'card' as const,
        last4: cleanedNumber.slice(-4),
        brand: getCardBrand(cardNumber),
        expiryMonth: month,
        expiryYear: 2000 + year,
        isDefault: false,
        stripePaymentMethodId: `pm_stripe_${Date.now()}`,
      };

      addPaymentMethod(paymentMethod);
      setIsLoading(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Carta Aggiunta',
        'La tua carta è stata aggiunta con successo!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }, 1500);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Aggiungi Carta',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.cardPreview}>
              <View style={styles.cardPreviewInner}>
                <IconSymbol name="creditcard.fill" size={40} color={colors.text} />
                <Text style={styles.cardPreviewNumber}>
                  {cardNumber || '•••• •••• •••• ••••'}
                </Text>
                <View style={styles.cardPreviewFooter}>
                  <Text style={styles.cardPreviewName}>
                    {cardholderName.toUpperCase() || 'NOME TITOLARE'}
                  </Text>
                  <Text style={styles.cardPreviewExpiry}>
                    {expiryDate || 'MM/AA'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Numero Carta</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={colors.textTertiary}
                  value={cardNumber}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, '');
                    if (cleaned.length <= 19) {
                      setCardNumber(formatCardNumber(cleaned));
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={23}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Titolare</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mario Rossi"
                  placeholderTextColor={colors.textTertiary}
                  value={cardholderName}
                  onChangeText={setCardholderName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Scadenza</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/AA"
                    placeholderTextColor={colors.textTertiary}
                    value={expiryDate}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/\D/g, '');
                      if (cleaned.length <= 4) {
                        setExpiryDate(formatExpiryDate(cleaned));
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    placeholderTextColor={colors.textTertiary}
                    value={cvv}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/\D/g, '');
                      if (cleaned.length <= 4) {
                        setCvv(cleaned);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.securityNote}>
                <IconSymbol name="lock.shield.fill" size={20} color={colors.textSecondary} />
                <Text style={styles.securityText}>
                  I tuoi dati sono protetti con crittografia SSL
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.addButton, isLoading && styles.addButtonDisabled]}
              onPress={handleAddCard}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.background} />
                  <Text style={styles.addButtonText}>Aggiungi Carta</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  cardPreview: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 4,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPreviewInner: {
    backgroundColor: colors.text,
    borderRadius: 12,
    padding: 24,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  cardPreviewNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.background,
    letterSpacing: 2,
    marginTop: 32,
  },
  cardPreviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 24,
  },
  cardPreviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
    letterSpacing: 1,
  },
  cardPreviewExpiry: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
    letterSpacing: 1,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.text,
    borderRadius: 8,
    padding: 18,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
});
