
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
import { deleteAllTestData } from '@/utils/testDataHelpers';

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
  const [showGuide, setShowGuide] = useState(false);
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
    Alert.alert('Copiato', `${text} copiato negli appunti`);
  };

  const testCard = async (card: TestCard) => {
    setTesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Simulate payment test
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
            Alert.alert('Info', 'URL: https://stripe.com/docs/testing');
          },
        },
      ]
    );
  };

  const toggleGuide = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowGuide(!showGuide);
  };

  const handleReturnToProduction = async () => {
    Alert.alert(
      '⚠️ ATTENZIONE: Ritorno a Produzione',
      'Questa azione eliminerà TUTTI i dati di test e rimuoverà la sezione Test Pagamenti.\n\n' +
      'L\'app verrà ricollegata al database di produzione con dati reali.\n\n' +
      'Verranno eliminati:\n' +
      '• Tutte le prenotazioni di test\n' +
      '• Tutti gli interessi utente di test\n' +
      '• Tutti i drop di test\n' +
      '• Tutti i prodotti di test\n' +
      '• Tutte le liste fornitori di test\n\n' +
      'QUESTA AZIONE È IRREVERSIBILE!\n\n' +
      'Sei assolutamente sicuro di voler procedere?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma Eliminazione',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '🔴 ULTIMA CONFERMA',
              'Stai per eliminare TUTTI i dati di test e tornare alla modalità produzione.\n\n' +
              'Confermi di voler procedere?',
              [
                { text: 'Annulla', style: 'cancel' },
                {
                  text: 'SÌ, ELIMINA TUTTO',
                  style: 'destructive',
                  onPress: executeReturnToProduction,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const executeReturnToProduction = async () => {
    setTesting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      console.log('🔄 Inizio eliminazione dati di test...');

      // Delete all test data
      const result = await deleteAllTestData();

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          '✅ Ritorno a Produzione Completato',
          'Tutti i dati di test sono stati eliminati con successo.\n\n' +
          'L\'app è ora collegata al database di produzione.\n\n' +
          'Verrai reindirizzato alla dashboard admin.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/admin/dashboard');
              },
            },
          ]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          '❌ Errore',
          `Errore durante l'eliminazione dei dati:\n\n${result.message}\n\n` +
          'Alcuni dati potrebbero non essere stati eliminati. Controlla manualmente il database.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error returning to production:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Errore',
        'Errore imprevisto durante il ritorno a produzione. Controlla i log.',
        [{ text: 'OK' }]
      );
    } finally {
      setTesting(false);
    }
  };

  if (showGuide) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Guida Testing Pagamenti',
            headerShown: true,
          }}
        />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Pressable style={styles.backButton} onPress={toggleGuide}>
            <IconSymbol ios_icon_name="arrow.left" android_material_icon_name="arrow_back" size={20} color={colors.primary} />
            <Text style={styles.backButtonText}>Torna ai Test</Text>
          </Pressable>

          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>Guida al Testing dei Pagamenti</Text>
            <Text style={styles.guideSubtitle}>
              Questa guida fornisce istruzioni complete per testare l&apos;intero flusso di ordini (cliente, fornitore, punto di ritiro) utilizzando carte di credito virtuali di test.
            </Text>
          </View>

          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>📋 Configurazione Ambiente di Test</Text>
            
            <Text style={styles.guideSubsectionTitle}>1. Modalità Test Stripe</Text>
            <Text style={styles.guideText}>
              L&apos;app è configurata per utilizzare le chiavi di test Stripe. Verifica che nel tuo progetto Supabase siano configurate le seguenti variabili d&apos;ambiente:
            </Text>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>STRIPE_PUBLISHABLE_KEY=pk_test_...</Text>
              <Text style={styles.codeText}>STRIPE_SECRET_KEY=sk_test_...</Text>
            </View>

            <Text style={styles.guideSubsectionTitle}>2. Accesso Admin</Text>
            <Text style={styles.guideText}>
              Per testare l&apos;intero flusso, avrai bisogno di accedere con diversi ruoli:
            </Text>
            <Text style={styles.guideListItem}>- Admin: Per approvare drop e gestire ordini</Text>
            <Text style={styles.guideListItem}>- Consumer: Per prenotare prodotti</Text>
            <Text style={styles.guideListItem}>- Supplier: Per visualizzare ordini ricevuti</Text>
            <Text style={styles.guideListItem}>- Pickup Point: Per gestire ritiri</Text>

            <Text style={styles.guideSubsectionTitle}>3. Dati di Test</Text>
            <Text style={styles.guideText}>
              Usa la funzione &quot;Crea Dati Test&quot; nella sezione Testing & Diagnostica per generare:
            </Text>
            <Text style={styles.guideListItem}>- Un fornitore di test</Text>
            <Text style={styles.guideListItem}>- 5 prodotti di esempio</Text>
            <Text style={styles.guideListItem}>- Una lista fornitore configurata</Text>
          </View>

          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>💳 Carte di Credito Virtuali Test</Text>
            <Text style={styles.guideText}>
              Stripe fornisce carte di test che simulano diversi scenari di pagamento. IMPORTANTE: Queste carte funzionano SOLO in modalità test e non addebitano mai denaro reale.
            </Text>

            <Text style={styles.guideSubsectionTitle}>Carte di Successo</Text>
            
            <View style={styles.cardInfoBlock}>
              <Text style={styles.cardInfoTitle}>Visa - Pagamento Riuscito</Text>
              <Text style={styles.cardInfoText}>Numero: 4242 4242 4242 4242</Text>
              <Text style={styles.cardInfoText}>CVC: Qualsiasi 3 cifre</Text>
              <Text style={styles.cardInfoText}>Data: Qualsiasi data futura</Text>
            </View>

            <View style={styles.cardInfoBlock}>
              <Text style={styles.cardInfoTitle}>Mastercard - Pagamento Riuscito</Text>
              <Text style={styles.cardInfoText}>Numero: 5555 5555 5555 4444</Text>
              <Text style={styles.cardInfoText}>CVC: Qualsiasi 3 cifre</Text>
              <Text style={styles.cardInfoText}>Data: Qualsiasi data futura</Text>
            </View>

            <View style={styles.cardInfoBlock}>
              <Text style={styles.cardInfoTitle}>American Express - Pagamento Riuscito</Text>
              <Text style={styles.cardInfoText}>Numero: 3782 822463 10005</Text>
              <Text style={styles.cardInfoText}>CVC: Qualsiasi 4 cifre</Text>
              <Text style={styles.cardInfoText}>Data: Qualsiasi data futura</Text>
            </View>

            <Text style={styles.guideSubsectionTitle}>Carte per Testare Errori</Text>

            <View style={styles.cardInfoBlock}>
              <Text style={styles.cardInfoTitle}>Carta Declinata - Fondi Insufficienti</Text>
              <Text style={styles.cardInfoText}>Numero: 4000 0000 0000 9995</Text>
              <Text style={styles.cardInfoText}>Risultato: Pagamento declinato (insufficient_funds)</Text>
            </View>

            <View style={styles.cardInfoBlock}>
              <Text style={styles.cardInfoTitle}>Carta Declinata - Generica</Text>
              <Text style={styles.cardInfoText}>Numero: 4000 0000 0000 0002</Text>
              <Text style={styles.cardInfoText}>Risultato: Pagamento declinato (generic_decline)</Text>
            </View>

            <View style={styles.cardInfoBlock}>
              <Text style={styles.cardInfoTitle}>Carta Scaduta</Text>
              <Text style={styles.cardInfoText}>Numero: 4000 0000 0000 0069</Text>
              <Text style={styles.cardInfoText}>Risultato: Carta scaduta (expired_card)</Text>
            </View>

            <View style={styles.cardInfoBlock}>
              <Text style={styles.cardInfoTitle}>CVC Errato</Text>
              <Text style={styles.cardInfoText}>Numero: 4000 0000 0000 0127</Text>
              <Text style={styles.cardInfoText}>Risultato: CVC non valido (incorrect_cvc)</Text>
            </View>
          </View>

          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>🔄 Flusso Completo di Test</Text>

            <Text style={styles.guideSubsectionTitle}>Fase 1: Preparazione (Admin)</Text>
            <Text style={styles.guideListItem}>1. Accedi come Admin</Text>
            <Text style={styles.guideListItem}>2. Vai su &quot;Testing & Diagnostica&quot;</Text>
            <Text style={styles.guideListItem}>3. Clicca &quot;Crea Dati Test&quot;</Text>
            <Text style={styles.guideListItem}>4. Verifica che vengano creati fornitore, lista e prodotti</Text>

            <Text style={styles.guideSubsectionTitle}>Fase 2: Registrazione Interesse (Consumer)</Text>
            <Text style={styles.guideListItem}>1. Crea Account Consumer e seleziona punto di ritiro</Text>
            <Text style={styles.guideListItem}>2. Aggiungi Metodo di Pagamento (usa Visa: 4242 4242 4242 4242)</Text>
            <Text style={styles.guideListItem}>3. Esprimi Interesse sui Prodotti (almeno 3 prodotti)</Text>
            <Text style={styles.guideListItem}>4. Ripeti con 2-3 account consumer aggiuntivi</Text>
            <Text style={styles.guideListItem}>5. Obiettivo: Raggiungere €5.000 di valore totale</Text>

            <Text style={styles.guideSubsectionTitle}>Fase 3: Attivazione Drop (Admin)</Text>
            <Text style={styles.guideListItem}>1. Il drop si crea automaticamente a €5.000</Text>
            <Text style={styles.guideListItem}>2. Vai su &quot;Gestione Drop&quot;</Text>
            <Text style={styles.guideListItem}>3. Trova il drop in &quot;Pending Approval&quot;</Text>
            <Text style={styles.guideListItem}>4. Clicca &quot;Approva&quot; e poi &quot;Attiva&quot;</Text>
            <Text style={styles.guideListItem}>5. Verifica timer di 5 giorni e sconto al 30%</Text>

            <Text style={styles.guideSubsectionTitle}>Fase 4: Prenotazione con Carta (Consumer)</Text>
            <Text style={styles.guideListItem}>1. Vai alla tab &quot;Drops&quot; e seleziona il drop attivo</Text>
            <Text style={styles.guideListItem}>2. Seleziona un prodotto e clicca &quot;Prenota con Carta&quot;</Text>
            <Text style={styles.guideListItem}>3. Verifica il riepilogo e conferma</Text>
            <Text style={styles.guideListItem}>4. Vai su &quot;Le Mie Prenotazioni&quot; e verifica stato &quot;Autorizzato&quot;</Text>
            <Text style={styles.guideListItem}>5. Ripeti con altri consumer per far crescere lo sconto</Text>

            <Text style={styles.guideSubsectionTitle}>Fase 5: Chiusura Drop (Admin)</Text>
            <Text style={styles.guideListItem}>1. Vai su &quot;Gestione Drop&quot;</Text>
            <Text style={styles.guideListItem}>2. Seleziona il drop attivo</Text>
            <Text style={styles.guideListItem}>3. Clicca &quot;Completa Drop&quot;</Text>
            <Text style={styles.guideListItem}>4. Verifica calcolo sconto finale e creazione ordine</Text>

            <Text style={styles.guideSubsectionTitle}>Fase 6: Cattura Pagamenti (Automatica)</Text>
            <Text style={styles.guideListItem}>1. I pagamenti vengono catturati automaticamente</Text>
            <Text style={styles.guideListItem}>2. Verifica stato &quot;Addebitato&quot; in &quot;Le Mie Prenotazioni&quot;</Text>
            <Text style={styles.guideListItem}>3. Controlla ordine fornitore con importi corretti</Text>

            <Text style={styles.guideSubsectionTitle}>Fase 7: Gestione Ordine (Supplier)</Text>
            <Text style={styles.guideListItem}>1. Accedi come Fornitore</Text>
            <Text style={styles.guideListItem}>2. Visualizza l&apos;ordine ricevuto</Text>
            <Text style={styles.guideListItem}>3. Segna come &quot;Confermato&quot;, poi &quot;In Transito&quot;, poi &quot;Spedito&quot;</Text>

            <Text style={styles.guideSubsectionTitle}>Fase 8: Gestione Ritiro (Pickup Point)</Text>
            <Text style={styles.guideListItem}>1. Accedi come Punto di Ritiro</Text>
            <Text style={styles.guideListItem}>2. Quando l&apos;ordine arriva, clicca &quot;Segna come Arrivato&quot;</Text>
            <Text style={styles.guideListItem}>3. Quando cliente ritira, segna come &quot;Ritirato&quot;</Text>

            <Text style={styles.guideSubsectionTitle}>Fase 9: Completamento (Consumer)</Text>
            <Text style={styles.guideListItem}>1. Ricevi notifica ordine pronto</Text>
            <Text style={styles.guideListItem}>2. Vai al punto di ritiro e ritira il prodotto</Text>
            <Text style={styles.guideListItem}>3. Verifica stato &quot;Completato&quot; e risparmio ottenuto</Text>
          </View>

          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>🧪 Scenari di Test</Text>

            <Text style={styles.guideSubsectionTitle}>Scenario 1: Pagamento Riuscito (Happy Path)</Text>
            <Text style={styles.guideText}>Carta: 4242 4242 4242 4242 (Visa)</Text>
            <Text style={styles.guideText}>Obiettivo: Testare il flusso completo senza errori</Text>

            <Text style={styles.guideSubsectionTitle}>Scenario 2: Carta Declinata - Fondi Insufficienti</Text>
            <Text style={styles.guideText}>Carta: 4000 0000 0000 9995</Text>
            <Text style={styles.guideText}>Obiettivo: Testare gestione errore fondi insufficienti</Text>

            <Text style={styles.guideSubsectionTitle}>Scenario 3: Drop Sotto-Finanziato</Text>
            <Text style={styles.guideText}>Obiettivo: Testare comportamento quando il drop non raggiunge il minimo</Text>
            <Text style={styles.guideListItem}>- Crea drop con poche prenotazioni</Text>
            <Text style={styles.guideListItem}>- Lascia scadere il timer</Text>
            <Text style={styles.guideListItem}>- Verifica rilascio fondi e notifiche</Text>

            <Text style={styles.guideSubsectionTitle}>Scenario 4: Cancellazione Prenotazione</Text>
            <Text style={styles.guideText}>Obiettivo: Testare cancellazione prenotazione da parte dell&apos;utente</Text>
            <Text style={styles.guideListItem}>- Crea prenotazione</Text>
            <Text style={styles.guideListItem}>- Vai su &quot;Le Mie Prenotazioni&quot;</Text>
            <Text style={styles.guideListItem}>- Clicca &quot;Annulla Prenotazione&quot;</Text>
            <Text style={styles.guideListItem}>- Verifica rilascio fondi</Text>
          </View>

          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>🔧 Risoluzione Problemi</Text>

            <Text style={styles.guideSubsectionTitle}>Problema: Carta Non Accettata</Text>
            <Text style={styles.guideListItem}>- Verifica modalità test Stripe</Text>
            <Text style={styles.guideListItem}>- Controlla numero carta corretto</Text>
            <Text style={styles.guideListItem}>- Usa data di scadenza futura</Text>
            <Text style={styles.guideListItem}>- Verifica CVC (3 cifre, 4 per Amex)</Text>

            <Text style={styles.guideSubsectionTitle}>Problema: Autorizzazione Non Creata</Text>
            <Text style={styles.guideListItem}>- Verifica metodo di pagamento presente</Text>
            <Text style={styles.guideListItem}>- Controlla drop in stato &quot;Active&quot;</Text>
            <Text style={styles.guideListItem}>- Verifica prodotto disponibile</Text>
            <Text style={styles.guideListItem}>- Controlla policy RLS su Supabase</Text>

            <Text style={styles.guideSubsectionTitle}>Problema: Pagamento Non Catturato</Text>
            <Text style={styles.guideListItem}>- Verifica Edge Function deployata</Text>
            <Text style={styles.guideListItem}>- Controlla log Edge Function</Text>
            <Text style={styles.guideListItem}>- Verifica drop in stato &quot;Completed&quot;</Text>
            <Text style={styles.guideListItem}>- Controlla chiavi Stripe configurate</Text>

            <Text style={styles.guideSubsectionTitle}>Problema: Drop Non Si Crea</Text>
            <Text style={styles.guideListItem}>- Verifica trigger database attivo</Text>
            <Text style={styles.guideListItem}>- Controlla interessi stesso punto di ritiro</Text>
            <Text style={styles.guideListItem}>- Verifica lista fornitore &quot;Active&quot;</Text>
            <Text style={styles.guideListItem}>- Crea manualmente da admin se necessario</Text>
          </View>

          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>⚠️ Note Importanti</Text>
            <Text style={styles.guideListItem}>- Le carte di test funzionano SOLO in modalità test Stripe</Text>
            <Text style={styles.guideListItem}>- Non addebitano mai denaro reale</Text>
            <Text style={styles.guideListItem}>- Usa qualsiasi CVC valido (3 cifre, 4 per Amex)</Text>
            <Text style={styles.guideListItem}>- Usa qualsiasi data di scadenza futura</Text>
            <Text style={styles.guideListItem}>- Elimina periodicamente i dati di test</Text>
            <Text style={styles.guideListItem}>- Testa sempre su dispositivi reali</Text>
          </View>

          <View style={styles.guideSection}>
            <Text style={styles.guideSectionTitle}>📚 Risorse Aggiuntive</Text>
            <Text style={styles.guideListItem}>- Documentazione Stripe: https://stripe.com/docs/testing</Text>
            <Text style={styles.guideListItem}>- Dashboard Stripe Test: https://dashboard.stripe.com/test/payments</Text>
            <Text style={styles.guideListItem}>- Supabase Dashboard: https://supabase.com/dashboard</Text>
          </View>

          <Pressable style={styles.backToTestButton} onPress={toggleGuide}>
            <IconSymbol ios_icon_name="arrow.left" android_material_icon_name="arrow_back" size={20} color="#FFF" />
            <Text style={styles.backToTestButtonText}>Torna ai Test Interattivi</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

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

        {/* Return to Production Button */}
        <View style={styles.section}>
          <View style={styles.productionWarningCard}>
            <View style={styles.productionWarningHeader}>
              <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={28} color="#FF3B30" />
              <Text style={styles.productionWarningTitle}>Modalità Test Attiva</Text>
            </View>
            <Text style={styles.productionWarningText}>
              Stai utilizzando la modalità test con carte virtuali. Quando hai finito i test, clicca il pulsante qui sotto per eliminare tutti i dati di test e tornare alla modalità produzione con dati reali.
            </Text>
            <Pressable
              style={[styles.productionButton, testing && styles.productionButtonDisabled]}
              onPress={handleReturnToProduction}
              disabled={testing}
            >
              <IconSymbol ios_icon_name="arrow.uturn.backward.circle.fill" android_material_icon_name="restore" size={24} color="#FFF" />
              <Text style={styles.productionButtonText}>Elimina Test e Torna a Produzione</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionButton, { flex: 1 }]}
              onPress={toggleGuide}
              disabled={testing}
            >
              <IconSymbol ios_icon_name="book.fill" android_material_icon_name="menu_book" size={20} color={colors.text} />
              <Text style={styles.actionButtonText}>Guida Completa</Text>
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
                - Le carte di test funzionano SOLO in modalità test Stripe{'\n'}
                - Non addebitano mai denaro reale{'\n'}
                - Usa qualsiasi CVC valido (3 cifre, 4 per Amex){'\n'}
                - Usa qualsiasi data di scadenza futura{'\n'}
                - Consulta la guida completa per il flusso di test end-to-end
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
  productionWarningCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  productionWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  productionWarningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF3B30',
  },
  productionWarningText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginBottom: 16,
  },
  productionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 10,
  },
  productionButtonDisabled: {
    opacity: 0.5,
  },
  productionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  guideSection: {
    marginBottom: 32,
  },
  guideTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  guideSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  guideSectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  guideSubsectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  guideText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  guideListItem: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 4,
  },
  codeBlock: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: colors.text,
    lineHeight: 20,
  },
  cardInfoBlock: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  cardInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  backToTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
  },
  backToTestButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
