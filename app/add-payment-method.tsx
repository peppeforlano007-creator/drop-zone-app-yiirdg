
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
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

// Conditionally import Stripe components only on native platforms
// Using dynamic import to avoid require() style import
let CardField: any = null;
let useStripeHook: (() => any) | null = null;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stripeModule = require('@stripe/stripe-react-native');
    CardField = stripeModule.CardField;
    useStripeHook = stripeModule.useStripe;
  } catch (error) {
    console.error('Error loading Stripe module:', error);
  }
}

// Create a wrapper hook that can be called unconditionally
function useStripeWrapper() {
  if (Platform.OS !== 'web' && useStripeHook) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useStripeHook();
  }
  return null;
}

export default function AddPaymentMethodScreen() {
  const { addPaymentMethod } = usePayment();
  
  // Always call the hook at the top level
  const stripe = useStripeWrapper();
  
  const [cardholderName, setCardholderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);

  const handleAddCard = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Non Disponibile', 'L\'aggiunta di carte di pagamento non è disponibile su web. Usa l\'app mobile.');
      return;
    }

    if (!cardholderName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome del titolare della carta');
      return;
    }

    if (!cardDetails?.complete) {
      Alert.alert('Errore', 'Completa i dettagli della carta');
      return;
    }

    if (!stripe) {
      Alert.alert('Errore', 'Stripe non è disponibile');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      console.log('Creating payment method with Stripe...');
      
      // Create payment method with Stripe
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        paymentMethodType: 'Card',
        billingDetails: {
          name: cardholderName,
        },
      });

      if (error) {
        console.error('Stripe error:', error);
        Alert.alert('Errore', error.message || 'Impossibile aggiungere la carta');
        setIsLoading(false);
        return;
      }

      if (!paymentMethod) {
        Alert.alert('Errore', 'Impossibile creare il metodo di pagamento');
        setIsLoading(false);
        return;
      }

      console.log('Payment method created:', paymentMethod.id);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Errore', 'Utente non autenticato');
        setIsLoading(false);
        return;
      }

      // Save payment method to database
      const { error: dbError } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          stripe_payment_method_id: paymentMethod.id,
          type: 'card',
          last4: paymentMethod.card?.last4 || '',
          brand: paymentMethod.card?.brand || 'card',
          exp_month: paymentMethod.card?.expMonth || 0,
          exp_year: paymentMethod.card?.expYear || 0,
          is_default: false,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        Alert.alert('Errore', 'Impossibile salvare il metodo di pagamento');
        setIsLoading(false);
        return;
      }

      // Add to local context
      const newPaymentMethod = {
        id: paymentMethod.id,
        type: 'card' as const,
        last4: paymentMethod.card?.last4 || '',
        brand: paymentMethod.card?.brand || 'card',
        expiryMonth: paymentMethod.card?.expMonth || 0,
        expiryYear: paymentMethod.card?.expYear || 0,
        isDefault: false,
        stripePaymentMethodId: paymentMethod.id,
      };

      addPaymentMethod(newPaymentMethod);
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
    } catch (error: any) {
      console.error('Error adding card:', error);
      Alert.alert('Errore', error.message || 'Impossibile aggiungere la carta');
      setIsLoading(false);
    }
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
            {Platform.OS === 'web' ? (
              <View style={styles.webNotice}>
                <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={48} color="#f59e0b" />
                <Text style={styles.webNoticeTitle}>Non Disponibile su Web</Text>
                <Text style={styles.webNoticeText}>
                  L&apos;aggiunta di carte di pagamento è disponibile solo sull&apos;app mobile. 
                  Scarica l&apos;app per iOS o Android per aggiungere metodi di pagamento.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.cardPreview}>
                  <View style={styles.cardPreviewInner}>
                    <IconSymbol ios_icon_name="creditcard.fill" android_material_icon_name="credit_card" size={40} color={colors.text} />
                    <Text style={styles.cardPreviewNumber}>
                      {cardDetails?.last4 ? `•••• •••• •••• ${cardDetails.last4}` : '•••• •••• •••• ••••'}
                    </Text>
                    <View style={styles.cardPreviewFooter}>
                      <Text style={styles.cardPreviewName}>
                        {cardholderName.toUpperCase() || 'NOME TITOLARE'}
                      </Text>
                      <Text style={styles.cardPreviewExpiry}>
                        {cardDetails?.expiryMonth && cardDetails?.expiryYear
                          ? `${cardDetails.expiryMonth.toString().padStart(2, '0')}/${cardDetails.expiryYear.toString().slice(-2)}`
                          : 'MM/AA'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.form}>
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

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Dettagli Carta</Text>
                    {CardField && (
                      <CardField
                        postalCodeEnabled={false}
                        placeholders={{
                          number: '4242 4242 4242 4242',
                        }}
                        cardStyle={{
                          backgroundColor: colors.card,
                          textColor: colors.text,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: 8,
                        }}
                        style={styles.cardField}
                        onCardChange={(details) => {
                          console.log('Card details changed:', details);
                          setCardDetails(details);
                        }}
                      />
                    )}
                  </View>

                  <View style={styles.securityNote}>
                    <IconSymbol ios_icon_name="lock.shield.fill" android_material_icon_name="security" size={20} color={colors.textSecondary} />
                    <Text style={styles.securityText}>
                      I tuoi dati sono protetti con crittografia SSL. Utilizziamo Stripe per processare i pagamenti in modo sicuro.
                    </Text>
                  </View>

                  <View style={styles.testModeNote}>
                    <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color="#3b82f6" />
                    <Text style={styles.testModeText}>
                      Modalità Test: Usa la carta 4242 4242 4242 4242 per testare i pagamenti
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {Platform.OS !== 'web' && (
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
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.background} />
                    <Text style={styles.addButtonText}>Aggiungi Carta</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
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
    paddingTop: 40,
    paddingBottom: 120,
  },
  webNotice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 20,
  },
  webNoticeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  webNoticeText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
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
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 8,
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
  testModeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  testModeText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
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
