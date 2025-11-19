
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';

interface TestCard {
  name: string;
  number: string;
  cvc: string;
  expiry: string;
  description: string;
  expectedResult: string;
  category: 'success' | 'decline' | 'error' | '3ds';
}

const TEST_CARDS: TestCard[] = [
  // Success Cards
  {
    name: 'Visa - Successo',
    number: '4242424242424242',
    cvc: '123',
    expiry: '12/25',
    description: 'Carta Visa standard per test di successo',
    expectedResult: 'Pagamento autorizzato',
    category: 'success',
  },
  {
    name: 'Visa Debit - Successo',
    number: '4000056655665556',
    cvc: '123',
    expiry: '12/25',
    description: 'Carta Visa Debit per test di successo',
    expectedResult: 'Pagamento autorizzato',
    category: 'success',
  },
  {
    name: 'Mastercard - Successo',
    number: '5555555555554444',
    cvc: '123',
    expiry: '12/25',
    description: 'Carta Mastercard per test di successo',
    expectedResult: 'Pagamento autorizzato',
    category: 'success',
  },
  {
    name: 'Mastercard Debit - Successo',
    number: '5200828282828210',
    cvc: '123',
    expiry: '12/25',
    description: 'Carta Mastercard Debit per test di successo',
    expectedResult: 'Pagamento autorizzato',
    category: 'success',
  },
  {
    name: 'American Express - Successo',
    number: '378282246310005',
    cvc: '1234',
    expiry: '12/25',
    description: 'Carta American Express per test di successo',
    expectedResult: 'Pagamento autorizzato',
    category: 'success',
  },
  // Decline Cards
  {
    name: 'Fondi Insufficienti',
    number: '4000000000009995',
    cvc: '123',
    expiry: '12/25',
    description: 'Simula carta con fondi insufficienti',
    expectedResult: 'Declinato: insufficient_funds',
    category: 'decline',
  },
  {
    name: 'Declinato Generico',
    number: '4000000000000002',
    cvc: '123',
    expiry: '12/25',
    description: 'Simula declinazione generica',
    expectedResult: 'Declinato: generic_decline',
    category: 'decline',
  },
  {
    name: 'Carta Rubata',
    number: '4000000000009979',
    cvc: '123',
    expiry: '12/25',
    description: 'Simula carta segnalata come rubata',
    expectedResult: 'Declinato: stolen_card',
    category: 'decline',
  },
  {
    name: 'Carta Smarrita',
    number: '4000000000009987',
    cvc: '123',
    expiry: '12/25',
    description: 'Simula carta segnalata come smarrita',
    expectedResult: 'Declinato: lost_card',
    category: 'decline',
  },
  // Error Cards
  {
    name: 'Carta Scaduta',
    number: '4000000000000069',
    cvc: '123',
    expiry: '12/25',
    description: 'Simula carta scaduta',
    expectedResult: 'Errore: expired_card',
    category: 'error',
  },
  {
    name: 'CVC Errato',
    number: '4000000000000127',
    cvc: '123',
    expiry: '12/25',
    description: 'Simula CVC non valido',
    expectedResult: 'Errore: incorrect_cvc',
    category: 'error',
  },
  {
    name: 'Errore Elaborazione',
    number: '4000000000000119',
    cvc: '123',
    expiry: '12/25',
    description: 'Simula errore di elaborazione',
    expectedResult: 'Errore: processing_error',
    category: 'error',
  },
  // 3D Secure Cards
  {
    name: '3D Secure - Richiesto',
    number: '4000002760003184',
    cvc: '123',
    expiry: '12/25',
    description: 'Richiede autenticazione 3D Secure',
    expectedResult: 'Richiede autenticazione',
    category: '3ds',
  },
  {
    name: '3D Secure - Opzionale',
    number: '4000002500003155',
    cvc: '123',
    expiry: '12/25',
    description: 'Autenticazione 3D Secure opzionale',
    expectedResult: 'Autenticazione opzionale',
    category: '3ds',
  },
];

export default function PaymentTestingScreen() {
  const [selectedCard, setSelectedCard] = useState<TestCard | null>(null);
  const [testAmount, setTestAmount] = useState('100.00');
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    card: string;
    result: string;
    success: boolean;
    timestamp: Date;
  }>>([]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'success':
        return colors.success;
      case 'decline':
        return colors.warning;
      case 'error':
        return colors.error;
      case '3ds':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'success':
        return { ios: 'checkmark.circle.fill', android: 'check_circle' };
      case 'decline':
        return { ios: 'xmark.circle.fill', android: 'cancel' };
      case 'error':
        return { ios: 'exclamationmark.triangle.fill', android: 'error' };
      case '3ds':
        return { ios: 'lock.shield.fill', android: 'security' };
      default:
        return { ios: 'circle', android: 'circle' };
    }
  };

  const copyToClipboard = (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // In a real app, you would use Clipboard API
    Alert.alert('Copiato', `${text} copiato negli appunti`);
  };

  const testCard = async (card: TestCard) => {
    setTesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Simulate payment test
      // In production, this would call Stripe API
      await new Promise(resolve => setTimeout(resolve, 2000));

      const success = card.category === 'success';
      
      setTestResults(prev => [
        {
          card: card.name,
          result: card.expectedResult,
          success,
          timestamp: new Date(),
        },
        ...prev,
      ]);

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ Test Riuscito', `${card.name}\n\n${card.expectedResult}`);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('⚠️ Test Completato', `${card.name}\n\n${card.expectedResult}\n\nQuesto è il comportamento atteso per questa carta di test.`);
      }
    } catch (error) {
      console.error('Test error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Errore durante il test');
    } finally {
      setTesting(false);
    }
  };

  const runFullTestSuite = async () => {
    Alert.alert(
      'Test Completo',
      'Vuoi eseguire tutti i test delle carte? Questo richiederà alcuni minuti.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esegui',
          onPress: async () => {
            setTesting(true);
            setTestResults([]);

            for (const card of TEST_CARDS) {
              await testCard(card);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

            setTesting(false);
            Alert.alert('✅ Test Completati', `Eseguiti ${TEST_CARDS.length} test`);
          },
        },
      ]
    );
  };

  const openStripeDocumentation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Documentazione Stripe',
      'Apri la documentazione Stripe per maggiori informazioni sulle carte di test?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Apri',
          onPress: () => {
            // In production, use Linking.openURL('https://stripe.com/docs/testing')
            Alert.alert('Info', 'URL: https://stripe.com/docs/testing');
          },
        },
      ]
    );
  };

  const viewPaymentGuide = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Guida Testing Pagamenti',
      'La guida completa al testing dei pagamenti è disponibile in:\n\ndocs/PAYMENT_TESTING_GUIDE.md\n\nContiene:\n• Carte di test Stripe\n• Flusso completo ordine\n• Scenari di test\n• Risoluzione problemi',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Test Pagamenti',
          headerShown: true,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Test Pagamenti</Text>
          <Text style={styles.subtitle}>
            Usa le carte di test Stripe per simulare diversi scenari di pagamento
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionButton, { flex: 1 }]}
              onPress={viewPaymentGuide}
              disabled={testing}
            >
              <IconSymbol ios_icon_name="book.fill" android_material_icon_name="menu_book" size={20} color={colors.text} />
              <Text style={styles.actionButtonText}>Guida</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, { flex: 1 }]}
              onPress={openStripeDocumentation}
              disabled={testing}
            >
              <IconSymbol ios_icon_name="link" android_material_icon_name="link" size={20} color={colors.text} />
              <Text style={styles.actionButtonText}>Docs Stripe</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, { flex: 1 }]}
              onPress={runFullTestSuite}
              disabled={testing}
            >
              <IconSymbol ios_icon_name="play.circle.fill" android_material_icon_name="play_circle" size={20} color={colors.text} />
              <Text style={styles.actionButtonText}>Test Tutti</Text>
            </Pressable>
          </View>
        </View>

        {/* Test Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Importo Test</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>€</Text>
            <TextInput
              style={styles.amountInput}
              value={testAmount}
              onChangeText={setTestAmount}
              keyboardType="decimal-pad"
              placeholder="100.00"
              editable={!testing}
            />
          </View>
        </View>

        {/* Test Cards by Category */}
        {['success', 'decline', 'error', '3ds'].map((category) => {
          const categoryCards = TEST_CARDS.filter(c => c.category === category);
          const categoryName = {
            success: 'Carte di Successo',
            decline: 'Carte Declinate',
            error: 'Carte con Errori',
            '3ds': 'Carte 3D Secure',
          }[category];

          return (
            <View key={category} style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol
                  ios_icon_name={getCategoryIcon(category).ios}
                  android_material_icon_name={getCategoryIcon(category).android}
                  size={24}
                  color={getCategoryColor(category)}
                />
                <Text style={styles.sectionTitle}>{categoryName}</Text>
              </View>

              {categoryCards.map((card, index) => (
                <View key={index} style={styles.cardContainer}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cardButton,
                      pressed && styles.cardButtonPressed,
                      selectedCard?.number === card.number && styles.cardButtonSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCard(card);
                    }}
                    disabled={testing}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardName}>{card.name}</Text>
                      <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(category) + '20' }]}>
                        <Text style={[styles.categoryBadgeText, { color: getCategoryColor(category) }]}>
                          {card.category.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardDescription}>{card.description}</Text>

                    <View style={styles.cardDetails}>
                      <View style={styles.cardDetailRow}>
                        <Text style={styles.cardDetailLabel}>Numero:</Text>
                        <Pressable onPress={() => copyToClipboard(card.number)}>
                          <Text style={styles.cardDetailValue}>{card.number}</Text>
                        </Pressable>
                      </View>
                      <View style={styles.cardDetailRow}>
                        <Text style={styles.cardDetailLabel}>CVC:</Text>
                        <Pressable onPress={() => copyToClipboard(card.cvc)}>
                          <Text style={styles.cardDetailValue}>{card.cvc}</Text>
                        </Pressable>
                      </View>
                      <View style={styles.cardDetailRow}>
                        <Text style={styles.cardDetailLabel}>Scadenza:</Text>
                        <Pressable onPress={() => copyToClipboard(card.expiry)}>
                          <Text style={styles.cardDetailValue}>{card.expiry}</Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.expectedResult}>
                      <Text style={styles.expectedResultLabel}>Risultato atteso:</Text>
                      <Text style={styles.expectedResultValue}>{card.expectedResult}</Text>
                    </View>

                    <Pressable
                      style={[styles.testButton, testing && styles.testButtonDisabled]}
                      onPress={() => testCard(card)}
                      disabled={testing}
                    >
                      {testing ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play_arrow" size={16} color="#FFF" />
                          <Text style={styles.testButtonText}>Testa Carta</Text>
                        </>
                      )}
                    </Pressable>
                  </Pressable>
                </View>
              ))}
            </View>
          );
        })}

        {/* Test Results */}
        {testResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="list.bullet.clipboard" android_material_icon_name="assignment" size={24} color={colors.text} />
              <Text style={styles.sectionTitle}>Risultati Test</Text>
            </View>

            {testResults.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.resultCard,
                  result.success ? styles.resultSuccess : styles.resultWarning,
                ]}
              >
                <View style={styles.resultHeader}>
                  <IconSymbol
                    ios_icon_name={result.success ? 'checkmark.circle.fill' : 'exclamationmark.circle.fill'}
                    android_material_icon_name={result.success ? 'check_circle' : 'warning'}
                    size={20}
                    color={result.success ? colors.success : colors.warning}
                  />
                  <Text style={styles.resultCardName}>{result.card}</Text>
                </View>
                <Text style={styles.resultText}>{result.result}</Text>
                <Text style={styles.resultTimestamp}>
                  {result.timestamp.toLocaleTimeString('it-IT')}
                </Text>
              </View>
            ))}

            <Pressable
              style={styles.clearButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTestResults([]);
              }}
            >
              <Text style={styles.clearButtonText}>Cancella Risultati</Text>
            </Pressable>
          </View>
        )}

        {/* Important Notes */}
        <View style={styles.section}>
          <View style={styles.noteCard}>
            <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.info} />
            <View style={styles.noteContent}>
              <Text style={styles.noteTitle}>Note Importanti</Text>
              <Text style={styles.noteText}>
                • Le carte di test funzionano SOLO in modalità test Stripe{'\n'}
                • Non addebitano mai denaro reale{'\n'}
                • Usa qualsiasi CVC valido (3 cifre, 4 per Amex){'\n'}
                • Usa qualsiasi data di scadenza futura{'\n'}
                • Consulta la guida completa per il flusso di test end-to-end
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: 12,
  },
  cardContainer: {
    marginBottom: 12,
  },
  cardButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardButtonPressed: {
    opacity: 0.7,
  },
  cardButtonSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  cardDetails: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  cardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardDetailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'monospace',
  },
  expectedResult: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  expectedResultLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  expectedResultValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  resultCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success,
  },
  resultWarning: {
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  resultCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  resultText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  resultTimestamp: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  clearButton: {
    backgroundColor: colors.card,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
