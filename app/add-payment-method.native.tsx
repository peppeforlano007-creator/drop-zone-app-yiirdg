
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
import { CardField, useStripe } from '@stripe/stripe-react-native';

export default function AddPaymentMethodScreen() {
  const { refreshPaymentMethods } = usePayment();
  const stripe = useStripe();
  
  const [cardholderName, setCardholderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [showTestInfo, setShowTestInfo] = useState(false);

  const handleAddCard = async () => {
    if (!cardholderName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome del titolare della carta');
      return;
    }

    if (!cardDetails?.complete) {
      Alert.alert('Errore', 'Completa i dettagli della carta');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      console.log('Creating payment method with Stripe...');
      console.log('Card details from CardField:', JSON.stringify(cardDetails, null, 2));
      
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

      console.log('Payment method created successfully:', paymentMethod.id);
      console.log('Full payment method object:', JSON.stringify(paymentMethod, null, 2));

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Errore', 'Utente non autenticato');
        setIsLoading(false);
        return;
      }

      // Check if this exact payment method already exists (by stripe_payment_method_id)
      const { data: existingByStripeId, error: checkStripeError } = await supabase
        .from('payment_methods')
        .select('id, stripe_payment_method_id, card_last4, card_brand')
        .eq('user_id', user.id)
        .eq('stripe_payment_method_id', paymentMethod.id)
        .eq('status', 'active');

      if (checkStripeError) {
        console.error('Error checking existing methods by Stripe ID:', checkStripeError);
      }

      if (existingByStripeId && existingByStripeId.length > 0) {
        console.log('Payment method with this Stripe ID already exists:', existingByStripeId[0]);
        Alert.alert('Carta già aggiunta', 'Questa carta è già stata aggiunta al tuo account');
        setIsLoading(false);
        return;
      }

      // Extract card details from multiple possible sources
      // The Stripe SDK can return card details in different formats
      let last4 = '';
      let brand = 'card';
      let expMonth = 0;
      let expYear = 0;

      // Try to get from paymentMethod.Card (capital C)
      if (paymentMethod.Card) {
        console.log('Found Card object (capital C):', JSON.stringify(paymentMethod.Card, null, 2));
        last4 = paymentMethod.Card.last4 || '';
        brand = paymentMethod.Card.brand || 'card';
        expMonth = paymentMethod.Card.expMonth || 0;
        expYear = paymentMethod.Card.expYear || 0;
      }
      // Try to get from paymentMethod.card (lowercase c)
      else if (paymentMethod.card) {
        console.log('Found card object (lowercase c):', JSON.stringify(paymentMethod.card, null, 2));
        last4 = paymentMethod.card.last4 || '';
        brand = paymentMethod.card.brand || 'card';
        expMonth = paymentMethod.card.expMonth || 0;
        expYear = paymentMethod.card.expYear || 0;
      }
      // Fallback to cardDetails from CardField
      else if (cardDetails) {
        console.log('Using cardDetails from CardField as fallback');
        last4 = cardDetails.last4 || '';
        brand = cardDetails.brand || 'card';
        expMonth = cardDetails.expiryMonth || 0;
        expYear = cardDetails.expiryYear || 0;
      }

      console.log('Extracted card details:', { last4, brand, expMonth, expYear });

      // Validate that we have the essential card details
      if (!last4 || last4.length < 4) {
        console.error('Invalid or missing last4 digits. Full paymentMethod:', JSON.stringify(paymentMethod, null, 2));
        console.error('CardDetails:', JSON.stringify(cardDetails, null, 2));
        Alert.alert(
          'Errore',
          'Impossibile ottenere i dettagli della carta. Riprova.\n\nDettagli tecnici: last4 non valido o mancante'
        );
        setIsLoading(false);
        return;
      }

      // Ensure last4 is exactly 4 digits (trim if longer, pad if shorter)
      last4 = last4.slice(-4).padStart(4, '0');

      // Validate expiry data
      if (!expMonth || !expYear || expMonth < 1 || expMonth > 12) {
        console.error('Invalid expiry data:', { expMonth, expYear });
        Alert.alert(
          'Errore',
          'Impossibile ottenere la data di scadenza della carta. Riprova.'
        );
        setIsLoading(false);
        return;
      }

      // Additional check: see if a card with same last4 and brand already exists
      const { data: existingByCard, error: checkCardError } = await supabase
        .from('payment_methods')
        .select('id, card_last4, card_brand, stripe_payment_method_id')
        .eq('user_id', user.id)
        .eq('card_last4', last4)
        .eq('card_brand', brand)
        .eq('status', 'active');

      if (checkCardError) {
        console.error('Error checking existing methods by card details:', checkCardError);
      }

      if (existingByCard && existingByCard.length > 0) {
        console.log('Card with same last4 and brand already exists:', existingByCard);
        Alert.alert(
          'Carta simile già presente',
          `Una carta ${brand.toUpperCase()} che termina con ${last4} è già presente nel tuo account. Vuoi aggiungerla comunque?`,
          [
            { text: 'Annulla', style: 'cancel', onPress: () => setIsLoading(false) },
            { text: 'Aggiungi', onPress: () => proceedWithSave(user.id, paymentMethod.id, last4, brand, expMonth, expYear) },
          ]
        );
        return;
      }

      // Proceed with saving
      await proceedWithSave(user.id, paymentMethod.id, last4, brand, expMonth, expYear);
    } catch (error: any) {
      console.error('Error adding card:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Errore', error.message || 'Impossibile aggiungere la carta');
      setIsLoading(false);
    }
  };

  const proceedWithSave = async (
    userId: string,
    stripePaymentMethodId: string,
    last4: string,
    brand: string,
    expMonth: number,
    expYear: number
  ) => {
    try {
      console.log('Proceeding with save:', { userId, stripePaymentMethodId, last4, brand, expMonth, expYear });

      // Check if user has any payment methods to determine if this should be default
      const { data: userMethods, error: countError } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (countError) {
        console.error('Error counting user methods:', countError);
      }

      const isFirstMethod = !userMethods || userMethods.length === 0;
      console.log('Is first payment method:', isFirstMethod);

      // If this is the first method, unset any existing defaults (safety measure)
      if (isFirstMethod) {
        await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', userId);
      }

      // Save payment method to database with correct column names
      const { data: insertedMethod, error: dbError } = await supabase
        .from('payment_methods')
        .insert({
          user_id: userId,
          stripe_payment_method_id: stripePaymentMethodId,
          card_last4: last4,
          card_brand: brand,
          card_exp_month: expMonth,
          card_exp_year: expYear,
          is_default: isFirstMethod,
          status: 'active',
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        Alert.alert('Errore', 'Impossibile salvare il metodo di pagamento: ' + dbError.message);
        setIsLoading(false);
        return;
      }

      console.log('Payment method saved to database successfully:', insertedMethod);

      // Refresh payment methods from database
      await refreshPaymentMethods();
      
      setIsLoading(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Carta Aggiunta',
        `La tua carta ${brand.toUpperCase()} •••• ${last4} è stata aggiunta con successo!`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error in proceedWithSave:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Errore', error.message || 'Impossibile salvare la carta');
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
                    console.log('Card details changed:', JSON.stringify(details, null, 2));
                    setCardDetails(details);
                  }}
                />
              </View>

              <View style={styles.securityNote}>
                <IconSymbol ios_icon_name="lock.shield.fill" android_material_icon_name="security" size={20} color={colors.textSecondary} />
                <Text style={styles.securityText}>
                  I tuoi dati sono protetti con crittografia SSL. Utilizziamo Stripe per processare i pagamenti in modo sicuro.
                </Text>
              </View>

              <Pressable 
                style={styles.testModeNote}
                onPress={() => setShowTestInfo(!showTestInfo)}
              >
                <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color="#3b82f6" />
                <View style={styles.testModeTextContainer}>
                  <Text style={styles.testModeTitle}>
                    Modalità Test - Tocca per {showTestInfo ? 'nascondere' : 'vedere'} i dettagli
                  </Text>
                  {showTestInfo && (
                    <View style={styles.testCardDetails}>
                      <Text style={styles.testCardDetailTitle}>Carta di Test Completa:</Text>
                      <View style={styles.testCardDetailRow}>
                        <Text style={styles.testCardDetailLabel}>Numero Carta:</Text>
                        <Text style={styles.testCardDetailValue}>4242 4242 4242 4242</Text>
                      </View>
                      <View style={styles.testCardDetailRow}>
                        <Text style={styles.testCardDetailLabel}>Nome Titolare:</Text>
                        <Text style={styles.testCardDetailValue}>Qualsiasi nome (es. Mario Rossi)</Text>
                      </View>
                      <View style={styles.testCardDetailRow}>
                        <Text style={styles.testCardDetailLabel}>Data Scadenza:</Text>
                        <Text style={styles.testCardDetailValue}>Qualsiasi data futura (es. 12/25)</Text>
                      </View>
                      <View style={styles.testCardDetailRow}>
                        <Text style={styles.testCardDetailLabel}>CVC:</Text>
                        <Text style={styles.testCardDetailValue}>Qualsiasi 3 cifre (es. 123)</Text>
                      </View>
                      <Text style={styles.testCardNote}>
                        💡 Puoi usare qualsiasi nome, data futura e CVC. Solo il numero della carta deve essere esattamente 4242 4242 4242 4242
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
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
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.background} />
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
    paddingTop: 40,
    paddingBottom: 120,
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
    alignItems: 'flex-start',
    gap: 8,
    padding: 16,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  testModeTextContainer: {
    flex: 1,
  },
  testModeTitle: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '600',
    marginBottom: 4,
  },
  testCardDetails: {
    marginTop: 12,
    gap: 8,
  },
  testCardDetailTitle: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '700',
    marginBottom: 8,
  },
  testCardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  testCardDetailLabel: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  testCardDetailValue: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '400',
  },
  testCardNote: {
    fontSize: 11,
    color: '#1e40af',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
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
