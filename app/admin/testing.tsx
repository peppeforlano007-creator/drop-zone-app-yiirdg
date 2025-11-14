
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import {
  testPaymentMethodValidation,
  testPaymentSecurity,
} from '@/utils/paymentTestHelpers';
import {
  createCompleteTestData,
  deleteAllTestData,
  TestDataResult,
} from '@/utils/testDataHelpers';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import {
  testDropDiscountCalculation,
  testDropStatusTransitions,
} from '@/utils/dropTestHelpers';
import { getDeviceInfo } from '@/utils/uiTestHelpers';
import {
  runAllTests,
  testAuthentication,
  testDatabasePerformance,
  testProductBrowsing,
  testDropFunctionality,
  testRLSPolicies,
  testPaymentMethods,
  testUserInterests,
  testRealtimeSubscriptions,
  testImageLoading,
  TestResult,
  generateTestReport,
} from '@/utils/testHelpers';
import { Stack, router } from 'expo-router';
import {
  testSupplierListValidation,
  testExcelParsing,
} from '@/utils/supplierTestHelpers';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';
import { performanceMonitor } from '@/utils/performanceMonitor';

export default function TestingScreen() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const runTest = async (testName: string, testFn: () => Promise<TestResult>) => {
    setCurrentTest(testName);
    setIsRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await testFn();
      setTestResults(prev => [...prev, result]);
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Test error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const runAllTestsSuite = async () => {
    setTestResults([]);
    setIsRunning(true);
    setCurrentTest('Running all tests...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const results = await runAllTests();
      setTestResults(results);
      
      const allPassed = results.every(r => r.success);
      if (allPassed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ Tutti i Test Superati', 'Tutti i test sono stati completati con successo!');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const failedCount = results.filter(r => !r.success).length;
        Alert.alert('⚠️ Alcuni Test Falliti', `${failedCount} test su ${results.length} sono falliti.`);
      }
    } catch (error) {
      console.error('Test suite error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Errore durante l\'esecuzione dei test');
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const showDeviceInfo = async () => {
    const info = await getDeviceInfo();
    Alert.alert(
      'Device Info',
      `Platform: ${info.platform}\nOS: ${info.osVersion}\nDevice: ${info.deviceName}\nApp Version: ${info.appVersion}`,
      [{ text: 'OK' }]
    );
  };

  const showPerformanceMetrics = () => {
    const metrics = performanceMonitor.getMetrics();
    const metricsText = Object.entries(metrics)
      .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
      .join('\n\n');
    
    Alert.alert('Performance Metrics', metricsText, [{ text: 'OK' }]);
  };

  const shareTestReport = async () => {
    if (testResults.length === 0) {
      Alert.alert('Nessun Test', 'Esegui prima alcuni test per generare un report');
      return;
    }

    const report = generateTestReport(testResults);
    
    try {
      await Share.share({
        message: report,
        title: 'Test Report',
      });
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Errore', 'Impossibile condividere il report');
    }
  };

  const clearResults = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTestResults([]);
  };

  const handleCreateTestData = async () => {
    Alert.alert(
      'Crea Dati di Test',
      'Questo creerà un fornitore di test con 5 prodotti. Vuoi continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Crea',
          onPress: async () => {
            setIsRunning(true);
            setCurrentTest('Creazione dati di test...');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              const result = await createCompleteTestData();
              
              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('✅ Successo', result.message);
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('❌ Errore', result.message);
              }
            } catch (error) {
              console.error('Error creating test data:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Errore', 'Errore imprevisto durante la creazione dei dati');
            } finally {
              setIsRunning(false);
              setCurrentTest('');
            }
          },
        },
      ]
    );
  };

  const handleDeleteTestData = async () => {
    Alert.alert(
      '⚠️ Elimina Tutti i Dati',
      'ATTENZIONE: Questo eliminerà TUTTI i prodotti, liste fornitori e interessi utente dal database. Questa azione è irreversibile!\n\nSei assolutamente sicuro?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina Tutto',
          style: 'destructive',
          onPress: async () => {
            setIsRunning(true);
            setCurrentTest('Eliminazione dati...');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

            try {
              const result = await deleteAllTestData();
              
              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('✅ Successo', result.message);
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('❌ Errore', result.message);
              }
            } catch (error) {
              console.error('Error deleting test data:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Errore', 'Errore imprevisto durante l\'eliminazione dei dati');
            } finally {
              setIsRunning(false);
              setCurrentTest('');
            }
          },
        },
      ]
    );
  };

  const getDeploymentReadiness = () => {
    if (testResults.length === 0) {
      return { ready: false, percentage: 0, message: 'Nessun test eseguito' };
    }

    const passedTests = testResults.filter(r => r.success).length;
    const percentage = Math.round((passedTests / testResults.length) * 100);
    
    let message = '';
    let ready = false;

    if (percentage === 100) {
      message = '✅ Pronto per il deployment';
      ready = true;
    } else if (percentage >= 80) {
      message = '⚠️ Quasi pronto - alcuni test falliti';
      ready = false;
    } else if (percentage >= 60) {
      message = '⚠️ Necessita miglioramenti';
      ready = false;
    } else {
      message = '❌ Non pronto per il deployment';
      ready = false;
    }

    return { ready, percentage, message };
  };

  const readiness = getDeploymentReadiness();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Testing & Diagnostics',
          headerShown: true,
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Testing & Diagnostics</Text>
          <Text style={styles.subtitle}>
            Esegui test per verificare la funzionalità dell&apos;app
          </Text>
        </View>

        {/* Test Data Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol ios_icon_name="cylinder.fill" android_material_icon_name="storage" size={24} color={colors.text} />
            <Text style={styles.sectionTitle}>Gestione Dati di Test</Text>
          </View>
          
          <View style={styles.dataManagementCard}>
            <Text style={styles.dataManagementTitle}>Dati di Test</Text>
            <Text style={styles.dataManagementDescription}>
              Crea o elimina dati di test per sviluppo e testing
            </Text>
            
            <View style={styles.dataManagementButtons}>
              <Pressable
                style={[styles.dataButton, styles.createButton]}
                onPress={handleCreateTestData}
                disabled={isRunning}
              >
                <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color="#FFF" />
                <Text style={styles.dataButtonText}>Crea Dati Test</Text>
              </Pressable>
              
              <Pressable
                style={[styles.dataButton, styles.deleteButton]}
                onPress={handleDeleteTestData}
                disabled={isRunning}
              >
                <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color="#FFF" />
                <Text style={styles.dataButtonText}>Elimina Tutti</Text>
              </Pressable>
            </View>
            
            <View style={styles.dataManagementNote}>
              <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={16} color={colors.textSecondary} />
              <Text style={styles.dataManagementNoteText}>
                I dati di test includono un fornitore con 5 prodotti di esempio
              </Text>
            </View>
          </View>
        </View>

        {/* Deployment Readiness */}
        {testResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.readinessCard}>
              <Text style={styles.readinessTitle}>Deployment Readiness</Text>
              <View style={styles.readinessProgress}>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${readiness.percentage}%`,
                        backgroundColor: readiness.ready ? '#34C759' : readiness.percentage >= 60 ? '#FF9500' : '#FF3B30'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.readinessPercentage}>{readiness.percentage}%</Text>
              </View>
              <Text style={styles.readinessMessage}>{readiness.message}</Text>
              <Text style={styles.readinessStats}>
                {testResults.filter(r => r.success).length} / {testResults.length} test superati
              </Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol ios_icon_name="bolt.fill" android_material_icon_name="flash_on" size={24} color={colors.text} />
            <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          </View>
          
          <Pressable
            style={[styles.actionButton, styles.primaryButton]}
            onPress={runAllTestsSuite}
            disabled={isRunning}
          >
            <IconSymbol ios_icon_name="play.circle.fill" android_material_icon_name="play_circle" size={24} color="#FFF" />
            <Text style={styles.actionButtonText}>Esegui Tutti i Test</Text>
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionButton, styles.secondaryButton, { flex: 1 }]}
              onPress={showDeviceInfo}
              disabled={isRunning}
            >
              <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={20} color={colors.text} />
              <Text style={styles.secondaryButtonText}>Device Info</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.secondaryButton, { flex: 1 }]}
              onPress={showPerformanceMetrics}
              disabled={isRunning}
            >
              <IconSymbol ios_icon_name="chart.bar" android_material_icon_name="bar_chart" size={20} color={colors.text} />
              <Text style={styles.secondaryButtonText}>Performance</Text>
            </Pressable>
          </View>

          {testResults.length > 0 && (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton, { flex: 1 }]}
                onPress={shareTestReport}
                disabled={isRunning}
              >
                <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={20} color={colors.text} />
                <Text style={styles.secondaryButtonText}>Condividi Report</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.secondaryButton, { flex: 1 }]}
                onPress={clearResults}
                disabled={isRunning}
              >
                <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={20} color={colors.text} />
                <Text style={styles.secondaryButtonText}>Cancella</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Individual Tests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol ios_icon_name="list.bullet" android_material_icon_name="list" size={24} color={colors.text} />
            <Text style={styles.sectionTitle}>Test Individuali</Text>
          </View>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Authentication', () => testAuthentication('test@example.com', 'password123'))}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Autenticazione</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Product Browsing', testProductBrowsing)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Navigazione Prodotti</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Drop Functionality', testDropFunctionality)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Funzionalità Drop</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('RLS Policies', () => testRLSPolicies('products'))}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test RLS Policies</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Database Performance', testDatabasePerformance)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Performance Database</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Realtime Subscriptions', testRealtimeSubscriptions)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Realtime</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Image Loading', testImageLoading)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Caricamento Immagini</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Drop Discount Calculation', testDropDiscountCalculation)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Calcolo Sconti Drop</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Drop Status Transitions', testDropStatusTransitions)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Transizioni Stato Drop</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Supplier List Validation', testSupplierListValidation)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Validazione Liste Fornitori</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Excel Parsing', testExcelParsing)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Parsing Excel</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Payment Method Validation', testPaymentMethodValidation)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Validazione Metodi Pagamento</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Payment Security', testPaymentSecurity)}
            disabled={isRunning}
          >
            <Text style={styles.testButtonText}>Test Sicurezza Pagamenti</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Test Results */}
        {testResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check_circle" size={24} color={colors.text} />
              <Text style={styles.sectionTitle}>Risultati Test</Text>
            </View>

            {testResults.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.resultCard,
                  result.success ? styles.resultSuccess : styles.resultFailure,
                ]}
              >
                <View style={styles.resultHeader}>
                  <IconSymbol
                    ios_icon_name={result.success ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                    android_material_icon_name={result.success ? 'check_circle' : 'cancel'}
                    size={24}
                    color={result.success ? '#34C759' : '#FF3B30'}
                  />
                  <Text style={styles.resultName}>{result.name}</Text>
                </View>
                <Text style={styles.resultMessage}>{result.message}</Text>
                {result.duration && (
                  <Text style={styles.resultDuration}>Durata: {result.duration}ms</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Running Indicator */}
        {isRunning && (
          <View style={styles.runningIndicator}>
            <ActivityIndicator size="small" color={colors.text} />
            <Text style={styles.runningText}>{currentTest}</Text>
          </View>
        )}
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
  dataManagementCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dataManagementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  dataManagementDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  dataManagementButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dataButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  createButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  dataButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  dataManagementNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.backgroundSecondary,
    padding: 10,
    borderRadius: 6,
  },
  dataManagementNoteText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  readinessCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readinessTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  readinessProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  readinessPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    minWidth: 50,
    textAlign: 'right',
  },
  readinessMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  readinessStats: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: colors.text,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  resultCard: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: '#F0FFF4',
    borderColor: '#34C759',
  },
  resultFailure: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF3B30',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  resultMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  resultDuration: {
    fontSize: 11,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  runningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  runningText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
