
import React, { useState, useEffect } from 'react';
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
import { supabase, testSupabaseConnection } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import * as Network from 'expo-network';

export default function AddPaymentMethodScreen() {
  const { refreshPaymentMethods } = usePayment();
  const stripe = useStripe();
  
  const [cardholderName, setCardholderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [showTestInfo, setShowTestInfo] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Check network and Supabase connection on mount
  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      console.log('=== CHECKING CONNECTIONS ===');
      
      // Check network connectivity
      const networkState = await Network.getNetworkStateAsync();
      console.log('Network state:', networkState);
      
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        console.error('No internet connection');
        setConnectionStatus('disconnected');
        Alert.alert(
          'Nessuna Connessione',
          'Verifica la tua connessione internet e riprova.'
        );
        return;
      }

      // Test Supabase connection
      const connectionTest = await testSupabaseConnection();
      console.log('Supabase connection test result:', connectionTest);
      
      if (!connectionTest.success) {
        console.error('Supabase connection failed:', connectionTest.error);
        setConnectionStatus('disconnected');
        
        // Check if it's a schema error
        if (connectionTest.error?.code === 'PGRST204') {
          Alert.alert(
            'Errore Database',
            'Il database non è configurato correttamente. Contatta il supporto.\n\nCodice: PGRST204 - Schema cache error',
            [
              {
                text: 'Dettagli',
                onPress: () => {
                  Alert.alert(
                    'Dettagli Tecnici',
                    'La tabella payment_methods non ha tutte le colonne necessarie.\n\n' +
                    'Colonne richieste:\n' +
                    '- card_brand\n' +
                    '- card_last4\n' +
                    '- card_exp_month\n' +
                    '- card_exp_year\n' +
                    '- stripe_payment_method_id\n\n' +
                    'Contatta l\'amministratore per applicare la migrazione del database.'
                  );
                }
              },
              { text: 'OK' }
            ]
          );
        } else {
          Alert.alert(
            'Errore Connessione',
            'Impossibile connettersi al server. Verifica la tua connessione e riprova.\n\n' +
            `Dettagli: ${connectionTest.error?.message || 'Unknown error'}`
          );
        }
        return;
      }

      console.log('All connections OK');
      setConnectionStatus('connected');
    } catch (error: any) {
      console.error('Error checking connections:', error);
      setConnectionStatus('disconnected');
      Alert.alert(
        'Errore',
        'Impossibile verificare la connessione.\n\n' +
        `Dettagli: ${error.message || 'Unknown error'}`
      );
    }
  };

  const handleAddCard = async () => {
    // Check connection status first
    if (connectionStatus !== 'connected') {
      Alert.alert(
        'Nessuna Connessione',
        'Verifica la tua connessione internet prima di continuare.',
        [
          {
            text: 'Riprova',
            onPress: () => checkConnections()
          },
          { text: 'Annulla', style: 'cancel' }
        ]
      );
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      console.log('=== STARTING PAYMENT METHOD CREATION ===');
      console.log('Card details from CardField:', JSON.stringify(cardDetails, null, 2));
      
      // Check network again before proceeding
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        throw new Error('Connessione internet persa. Verifica la tua connessione e riprova.');
      }

      // Create payment method with Stripe
      console.log('Creating payment method with Stripe...');
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        paymentMethodType: 'Card',
        billingDetails: {
          name: cardholderName,
        },
      });

      if (error) {
        console.error('Stripe error:', error);
        Alert.alert(
          'Errore Stripe', 
          error.message || 'Impossibile aggiungere la carta.\n\nVerifica i dati inseriti e riprova.'
        );
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Errore di autenticazione. Effettua nuovamente il login.');
      }

      if (!user) {
        Alert.alert('Errore', 'Utente non autenticato. Effettua il login.');
        setIsLoading(false);
        return;
      }

      console.log('Current user ID:', user.id);

      // Check if this exact payment method already exists (by stripe_payment_method_id)
      console.log('Checking for existing payment methods...');
      const { data: existingByStripeId, error: checkStripeError } = await supabase
        .from('payment_methods')
        .select('id, stripe_payment_method_id, card_last4, card_brand')
        .eq('user_id', user.id)
        .eq('stripe_payment_method_id', paymentMethod.id)
        .eq('status', 'active');

      if (checkStripeError) {
        console.error('Error checking existing methods by Stripe ID:', checkStripeError);
        
        // If it's a schema error, show detailed message
        if (checkStripeError.code === 'PGRST204') {
          Alert.alert(
            'Errore Database',
            'Il database non è configurato correttamente.\n\n' +
            'Codice: PGRST204\n' +
            'Messaggio: ' + checkStripeError.message + '\n\n' +
            'La tabella payment_methods non ha tutte le colonne necessarie. ' +
            'Contatta l\'amministratore per applicare la migrazione del database.',
            [
              {
                text: 'Copia Errore',
                onPress: () => {
                  // In a real app, you'd copy to clipboard
                  console.log('Error details:', JSON.stringify(checkStripeError, null, 2));
                }
              },
              { text: 'OK' }
            ]
          );
          setIsLoading(false);
          return;
        }
        
        throw checkStripeError;
      }

      if (existingByStripeId && existingByStripeId.length > 0) {
        console.log('Payment method with this Stripe ID already exists:', existingByStripeId[0]);
        Alert.alert('Carta già aggiunta', 'Questa carta è già stata aggiunta al tuo account');
        setIsLoading(false);
        return;
      }

      // Extract card details from multiple possible sources
      let last4 = '';
      let brand = 'card';
      let expMonth = 0;
      let expYear = 0;

      console.log('=== EXTRACTING CARD DETAILS ===');

      // Try different paths to get card details
      if (paymentMethod.Card) {
        console.log('Found Card object (capital C):', JSON.stringify(paymentMethod.Card, null, 2));
        last4 = paymentMethod.Card.last4 || '';
        brand = paymentMethod.Card.brand || 'card';
        expMonth = paymentMethod.Card.expMonth || paymentMethod.Card.exp_month || 0;
        expYear = paymentMethod.Card.expYear || paymentMethod.Card.exp_year || 0;
      } else if (paymentMethod.card) {
        console.log('Found card object (lowercase c):', JSON.stringify(paymentMethod.card, null, 2));
        last4 = paymentMethod.card.last4 || '';
        brand = paymentMethod.card.brand || 'card';
        expMonth = paymentMethod.card.expMonth || paymentMethod.card.exp_month || 0;
        expYear = paymentMethod.card.expYear || paymentMethod.card.exp_year || 0;
      }

      // Fallback to cardDetails from CardField
      if (!last4 && cardDetails) {
        console.log('Using cardDetails from CardField as fallback');
        last4 = cardDetails.last4 || '';
        brand = cardDetails.brand || 'card';
        expMonth = cardDetails.expiryMonth || 0;
        expYear = cardDetails.expiryYear || 0;
      }

      console.log('Extracted card details:', { last4, brand, expMonth, expYear });

      // Validate last4
      if (!last4 || last4.length < 4) {
        console.error('=== VALIDATION ERROR: Invalid last4 ===');
        console.error('last4 value:', last4);
        console.error('Full paymentMethod:', JSON.stringify(paymentMethod, null, 2));
        console.error('CardDetails:', JSON.stringify(cardDetails, null, 2));
        Alert.alert(
          'Errore',
          'Impossibile ottenere i dettagli della carta. Riprova.\n\nDettagli tecnici: last4 non valido o mancante dalla risposta di Stripe'
        );
        setIsLoading(false);
        return;
      }

      // Normalize last4 to exactly 4 digits
      last4 = last4.slice(-4).padStart(4, '0');
      console.log('Normalized last4:', last4);

      // Validate expiry data
      if (!expMonth || !expYear || expMonth < 1 || expMonth > 12) {
        console.error('=== VALIDATION ERROR: Invalid expiry data ===');
        console.error('expMonth:', expMonth, 'expYear:', expYear);
        Alert.alert(
          'Errore',
          'Impossibile ottenere la data di scadenza della carta. Riprova.'
        );
        setIsLoading(false);
        return;
      }

      console.log('Validated expiry:', { expMonth, expYear });

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
        
        // If it's a schema error, show detailed message
        if (checkCardError.code === 'PGRST204') {
          Alert.alert(
            'Errore Database',
            'Il database non è configurato correttamente.\n\n' +
            'Codice: PGRST204\n' +
            'Messaggio: ' + checkCardError.message + '\n\n' +
            'Contatta l\'amministratore.'
          );
          setIsLoading(false);
          return;
        }
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
      console.error('=== ERROR IN handleAddCard ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Impossibile aggiungere la carta';
      
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Errore di rete. Verifica la tua connessione internet e riprova.';
      } else if (error.code === 'PGRST204') {
        errorMessage = 'Errore database (PGRST204). Contatta il supporto.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Errore', errorMessage);
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
      console.log('=== PROCEEDING WITH SAVE ===');
      console.log('Data to save:', { 
        userId, 
        stripePaymentMethodId, 
        last4, 
        brand, 
        expMonth, 
        expYear 
      });

      // Check network before saving
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        throw new Error('Connessione internet persa. Verifica la tua connessione e riprova.');
      }

      // Check if user has any payment methods to determine if this should be default
      const { data: userMethods, error: countError } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (countError) {
        console.error('Error counting user methods:', countError);
        
        if (countError.code === 'PGRST204') {
          throw new Error('Database non configurato correttamente (PGRST204). Contatta il supporto.');
        }
      }

      const isFirstMethod = !userMethods || userMethods.length === 0;
      console.log('Is first payment method:', isFirstMethod);

      // If this is the first method, unset any existing defaults (safety measure)
      if (isFirstMethod) {
        console.log('Unsetting existing defaults...');
        const { error: unsetError } = await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', userId);
        
        if (unsetError) {
          console.error('Error unsetting defaults:', unsetError);
        }
      }

      // Prepare the data object for insertion
      const insertData = {
        user_id: userId,
        stripe_payment_method_id: stripePaymentMethodId,
        card_last4: last4,
        card_brand: brand,
        card_exp_month: expMonth,
        card_exp_year: expYear,
        is_default: isFirstMethod,
        status: 'active',
      };

      console.log('=== INSERTING INTO DATABASE ===');
      console.log('Insert data:', JSON.stringify(insertData, null, 2));

      // Save payment method to database
      const { data: insertedMethod, error: dbError } = await supabase
        .from('payment_methods')
        .insert(insertData)
        .select()
        .single();

      if (dbError) {
        console.error('=== DATABASE ERROR ===');
        console.error('Error code:', dbError.code);
        console.error('Error message:', dbError.message);
        console.error('Error details:', dbError.details);
        console.error('Error hint:', dbError.hint);
        console.error('Full error object:', JSON.stringify(dbError, null, 2));
        
        let errorMessage = 'Impossibile salvare il metodo di pagamento.';
        
        if (dbError.code === 'PGRST204') {
          errorMessage = 'Database non configurato correttamente.\n\n' +
            'Codice: PGRST204\n' +
            'Messaggio: ' + dbError.message + '\n\n' +
            'La tabella payment_methods non ha tutte le colonne necessarie. ' +
            'Contatta l\'amministratore per applicare la migrazione del database.';
        } else if (dbError.message) {
          errorMessage += '\n\n' + dbError.message;
        }
        
        Alert.alert('Errore Database', errorMessage);
        setIsLoading(false);
        return;
      }

      console.log('=== PAYMENT METHOD SAVED SUCCESSFULLY ===');
      console.log('Inserted method:', JSON.stringify(insertedMethod, null, 2));

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
      console.error('=== ERROR IN proceedWithSave ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Impossibile salvare la carta';
      
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Errore di rete. Verifica la tua connessione internet e riprova.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Errore', errorMessage);
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
            {connectionStatus === 'disconnected' && (
              <View style={styles.connectionWarning}>
                <IconSymbol ios_icon_name="wifi.slash" android_material_icon_name="wifi_off" size={24} color="#dc2626" />
                <View style={styles.connectionWarningTextContainer}>
                  <Text style={styles.connectionWarningTitle}>Nessuna Connessione</Text>
                  <Text style={styles.connectionWarningText}>
                    Verifica la tua connessione internet
                  </Text>
                </View>
                <Pressable 
                  style={styles.retryButton}
                  onPress={checkConnections}
                >
                  <Text style={styles.retryButtonText}>Riprova</Text>
                </Pressable>
              </View>
            )}

            {connectionStatus === 'checking' && (
              <View style={styles.connectionChecking}>
                <ActivityIndicator color={colors.text} />
                <Text style={styles.connectionCheckingText}>Verifica connessione...</Text>
              </View>
            )}

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
                  editable={connectionStatus === 'connected'}
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
                  disabled={connectionStatus !== 'connected'}
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
              style={[
                styles.addButton, 
                (isLoading || connectionStatus !== 'connected') && styles.addButtonDisabled
              ]}
              onPress={handleAddCard}
              disabled={isLoading || connectionStatus !== 'connected'}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.background} />
                  <Text style={styles.addButtonText}>
                    {connectionStatus === 'connected' ? 'Aggiungi Carta' : 'Connessione in corso...'}
                  </Text>
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
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
    marginBottom: 20,
  },
  connectionWarningTextContainer: {
    flex: 1,
  },
  connectionWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2,
  },
  connectionWarningText: {
    fontSize: 12,
    color: '#991b1b',
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  connectionChecking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  connectionCheckingText: {
    fontSize: 14,
    color: colors.textSecondary,
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
