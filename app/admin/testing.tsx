
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
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
import {
  testSupplierListValidation,
  testExcelParsing,
} from '@/utils/supplierTestHelpers';
import {
  testDropDiscountCalculation,
  testDropStatusTransitions,
} from '@/utils/dropTestHelpers';
import {
  testPaymentMethodValidation,
  testPaymentSecurity,
} from '@/utils/paymentTestHelpers';
import { getDeviceInfo } from '@/utils/uiTestHelpers';
import { performanceMonitor } from '@/utils/performanceMonitor';
import {
  createCompleteTestData,
  deleteAllTestData,
  TestDataResult,
} from '@/utils/testDataHelpers';

export default function TestingScreen() {
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [testDataLoading, setTestDataLoading] = useState(false);

  const runTest = async (testName: string, testFn: () => Promise<TestResult>) => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const result = await testFn();
      setResults(prev => [...prev, result]);
      
      if (result.passed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error(`Error running test ${testName}:`, error);
      setResults(prev => [...prev, {
        testName,
        passed: false,
        message: 'Test failed with exception',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const runAllTestsSuite = async () => {
    setLoading(true);
    setResults([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const allResults = await runAllTests();
      setResults(allResults);
      
      const allPassed = allResults.every(r => r.passed);
      if (allPassed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Successo', 'Tutti i test sono passati!');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const failedCount = allResults.filter(r => !r.passed).length;
        Alert.alert('Test Falliti', `${failedCount} test su ${allResults.length} sono falliti`);
      }
    } catch (error) {
      console.error('Error running all tests:', error);
      Alert.alert('Errore', 'Errore durante l\'esecuzione dei test');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const showDeviceInfo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const info = await getDeviceInfo();
    Alert.alert(
      'Informazioni Dispositivo',
      `Piattaforma: ${info.platform}\nVersione OS: ${info.osVersion}\nModello: ${info.deviceModel}\nDimensioni: ${info.screenWidth}x${info.screenHeight}`,
      [{ text: 'OK' }]
    );
  };

  const showPerformanceMetrics = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const metrics = performanceMonitor.getMetrics();
    const report = performanceMonitor.generateReport();
    Alert.alert('Metriche Performance', report, [{ text: 'OK' }]);
  };

  const shareTestReport = async () => {
    if (results.length === 0) {
      Alert.alert('Nessun Risultato', 'Esegui prima alcuni test');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const report = generateTestReport(results);
    
    try {
      await Share.share({
        message: report,
        title: 'Report Test App',
      });
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const clearResults = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResults([]);
  };

  const handleCreateTestData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Crea Dati di Test',
      'Questo creerà un fornitore di test con una lista di 5 prodotti. Vuoi continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Crea',
          onPress: async () => {
            setTestDataLoading(true);
            try {
              const result = await createCompleteTestData();
              
              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Successo', result.message);
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Errore', result.message);
              }
            } catch (error) {
              console.error('Error creating test data:', error);
              Alert.alert('Errore', 'Errore imprevisto durante la creazione dei dati');
            } finally {
              setTestDataLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteTestData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Elimina Dati di Test',
      'Questo eliminerà TUTTI i prodotti, liste fornitori e interessi utente dal database. Sei sicuro?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            setTestDataLoading(true);
            try {
              const result = await deleteAllTestData();
              
              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Successo', result.message);
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Errore', result.message);
              }
            } catch (error) {
              console.error('Error deleting test data:', error);
              Alert.alert('Errore', 'Errore imprevisto durante l\'eliminazione dei dati');
            } finally {
              setTestDataLoading(false);
            }
          },
        },
      ]
    );
  };

  const getDeploymentReadiness = () => {
    if (results.length === 0) return 0;
    const passedTests = results.filter(r => r.passed).length;
    return Math.round((passedTests / results.length) * 100);
  };

  const readiness = getDeploymentReadiness();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Testing Dashboard',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Deployment Readiness */}
        {results.length > 0 && (
          <View style={styles.readinessCard}>
            <Text style={styles.readinessTitle}>Pronto per il Deploy</Text>
            <View style={styles.readinessBar}>
              <View style={[styles.readinessFill, { width: `${readiness}%` }]} />
            </View>
            <Text style={styles.readinessText}>{readiness}% Test Passati</Text>
          </View>
        )}

        {/* Test Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestione Dati di Test</Text>
          <Text style={styles.sectionDescription}>
            Crea o elimina dati di test per sviluppo e testing
          </Text>
          
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.testButton, styles.createButton]}
              onPress={handleCreateTestData}
              disabled={testDataLoading}
            >
              {testDataLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color="#FFF" />
                  <Text style={styles.testButtonText}>Crea Dati Test</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.testButton, styles.deleteButton]}
              onPress={handleDeleteTestData}
              disabled={testDataLoading}
            >
              {testDataLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color="#FFF" />
                  <Text style={styles.testButtonText}>Elimina Tutto</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          
          <Pressable
            style={[styles.actionButton, loading && styles.actionButtonDisabled]}
            onPress={runAllTestsSuite}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <IconSymbol ios_icon_name="play.circle.fill" android_material_icon_name="play_circle" size={24} color={colors.text} />
                <Text style={styles.actionButtonText}>Esegui Tutti i Test</Text>
              </>
            )}
          </Pressable>

          <Pressable style={styles.actionButton} onPress={showDeviceInfo}>
            <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={24} color={colors.text} />
            <Text style={styles.actionButtonText}>Info Dispositivo</Text>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={showPerformanceMetrics}>
            <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={24} color={colors.text} />
            <Text style={styles.actionButtonText}>Metriche Performance</Text>
          </Pressable>

          {results.length > 0 && (
            <>
              <Pressable style={styles.actionButton} onPress={shareTestReport}>
                <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={24} color={colors.text} />
                <Text style={styles.actionButtonText}>Condividi Report</Text>
              </Pressable>

              <Pressable style={styles.actionButton} onPress={clearResults}>
                <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={24} color={colors.text} />
                <Text style={styles.actionButtonText}>Cancella Risultati</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Individual Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Individuali</Text>
          
          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Product Browsing', testProductBrowsing)}
            disabled={loading}
          >
            <IconSymbol ios_icon_name="square.grid.2x2" android_material_icon_name="grid_view" size={20} color="#FFF" />
            <Text style={styles.testButtonText}>Test Navigazione Prodotti</Text>
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Drop Functionality', testDropFunctionality)}
            disabled={loading}
          >
            <IconSymbol ios_icon_name="bolt.fill" android_material_icon_name="flash_on" size={20} color="#FFF" />
            <Text style={styles.testButtonText}>Test Funzionalità Drop</Text>
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Database Performance', testDatabasePerformance)}
            disabled={loading}
          >
            <IconSymbol ios_icon_name="speedometer" android_material_icon_name="speed" size={20} color="#FFF" />
            <Text style={styles.testButtonText}>Test Performance Database</Text>
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('RLS Policies', () => testRLSPolicies('products'))}
            disabled={loading}
          >
            <IconSymbol ios_icon_name="lock.shield" android_material_icon_name="security" size={20} color="#FFF" />
            <Text style={styles.testButtonText}>Test Politiche RLS</Text>
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Realtime Subscriptions', testRealtimeSubscriptions)}
            disabled={loading}
          >
            <IconSymbol ios_icon_name="antenna.radiowaves.left.and.right" android_material_icon_name="wifi" size={20} color="#FFF" />
            <Text style={styles.testButtonText}>Test Realtime</Text>
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => runTest('Image Loading', testImageLoading)}
            disabled={loading}
          >
            <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={20} color="#FFF" />
            <Text style={styles.testButtonText}>Test Caricamento Immagini</Text>
          </Pressable>
        </View>

        {/* Test Results */}
        {results.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Risultati Test</Text>
            
            {results.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.resultCard,
                  result.passed ? styles.resultCardSuccess : styles.resultCardError,
                ]}
              >
                <View style={styles.resultHeader}>
                  <IconSymbol
                    ios_icon_name={result.passed ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                    android_material_icon_name={result.passed ? 'check_circle' : 'cancel'}
                    size={24}
                    color={result.passed ? '#34C759' : '#FF3B30'}
                  />
                  <Text style={styles.resultTitle}>{result.testName}</Text>
                </View>
                <Text style={styles.resultMessage}>{result.message}</Text>
                {result.error && (
                  <Text style={styles.resultError}>Errore: {result.error}</Text>
                )}
                {result.duration && (
                  <Text style={styles.resultDuration}>Durata: {result.duration}ms</Text>
                )}
              </View>
            ))}
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
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  readinessCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readinessTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  readinessBar: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  readinessFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  readinessText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    flex: 1,
  },
  createButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  resultCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  resultCardSuccess: {
    backgroundColor: '#F0FFF4',
    borderColor: '#34C759',
  },
  resultCardError: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF3B30',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  resultMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  resultError: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  resultDuration: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
});
