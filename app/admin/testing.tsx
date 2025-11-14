
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
import { useAuth } from '@/contexts/AuthContext';

export default function TestingScreen() {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const runTest = async (testName: string, testFn: () => Promise<TestResult>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTesting(true);
    setSelectedTest(testName);

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
      setTesting(false);
      setSelectedTest(null);
    }
  };

  const runAllTestsSuite = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTesting(true);
    setTestResults([]);

    try {
      const results = await runAllTests(undefined, undefined, user?.id);
      
      // Add supplier tests
      results.push(await testSupplierListValidation());
      results.push(await testExcelParsing());
      
      // Add drop tests
      results.push(await testDropStatusTransitions());
      
      // Add payment tests
      results.push(await testPaymentMethodValidation());
      results.push(await testPaymentSecurity());
      
      setTestResults(results);
      
      const passed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      Alert.alert(
        'Test Completati',
        `✅ Passati: ${passed}\n❌ Falliti: ${failed}\n\nL'app è ${failed === 0 ? 'PRONTA' : 'NON PRONTA'} per il deployment!`,
        [{ text: 'OK' }]
      );
      
      if (failed === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.error('Test suite error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore durante i test');
    } finally {
      setTesting(false);
    }
  };

  const showDeviceInfo = () => {
    const info = getDeviceInfo();
    Alert.alert(
      'Informazioni Dispositivo',
      `Platform: ${info.platform} ${info.platformVersion}\n` +
      `Screen: ${info.screenWidth}x${info.screenHeight}\n` +
      `Window: ${info.windowWidth}x${info.windowHeight}\n` +
      `Pixel Ratio: ${info.pixelRatio}\n` +
      `Font Scale: ${info.fontScale}\n` +
      `Type: ${info.isTablet ? 'Tablet' : 'Phone'}\n` +
      `Orientation: ${info.orientation}`,
      [{ text: 'OK' }]
    );
  };

  const showPerformanceMetrics = () => {
    const metrics = performanceMonitor.getMetrics();
    
    if (metrics.length === 0) {
      Alert.alert('Metriche Performance', 'Nessuna metrica disponibile');
      return;
    }

    const summary = metrics
      .filter(m => m.duration !== undefined)
      .map(m => `${m.name}: ${m.duration}ms`)
      .join('\n');

    Alert.alert('Metriche Performance', summary, [{ text: 'OK' }]);
  };

  const shareTestReport = async () => {
    if (testResults.length === 0) {
      Alert.alert('Nessun Risultato', 'Esegui prima alcuni test');
      return;
    }

    try {
      const report = generateTestReport(testResults);
      const passed = testResults.filter(r => r.success).length;
      const failed = testResults.filter(r => !r.success).length;
      const readyForDeployment = failed === 0;
      
      const deploymentStatus = readyForDeployment
        ? '✅ APP PRONTA PER DEPLOYMENT'
        : '⚠️ APP NON PRONTA - Risolvere i problemi evidenziati';
      
      await Share.share({
        message: `${deploymentStatus}\n\n${report}`,
        title: 'Drop Zone - Test Report',
      });
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Errore', 'Impossibile condividere il report');
    }
  };

  const clearResults = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTestResults([]);
    performanceMonitor.clear();
  };

  const getDeploymentReadiness = () => {
    if (testResults.length === 0) return null;
    
    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;
    const percentage = (passed / testResults.length) * 100;
    
    return {
      passed,
      failed,
      percentage,
      ready: failed === 0,
    };
  };

  const readiness = getDeploymentReadiness();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Testing & Deployment',
          headerBackTitle: 'Dashboard',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Deployment Readiness Banner */}
          {readiness && (
            <View style={[
              styles.readinessBanner,
              readiness.ready ? styles.readyBanner : styles.notReadyBanner
            ]}>
              <IconSymbol
                ios_icon_name={readiness.ready ? "checkmark.seal.fill" : "exclamationmark.triangle.fill"}
                android_material_icon_name={readiness.ready ? "verified" : "warning"}
                size={32}
                color="#fff"
              />
              <View style={styles.readinessContent}>
                <Text style={styles.readinessTitle}>
                  {readiness.ready ? 'APP PRONTA PER DEPLOYMENT' : 'APP NON PRONTA'}
                </Text>
                <Text style={styles.readinessSubtitle}>
                  {readiness.passed} test passati, {readiness.failed} falliti ({readiness.percentage.toFixed(0)}%)
                </Text>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Azioni Rapide</Text>
            
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={runAllTestsSuite}
              disabled={testing}
            >
              {testing && !selectedTest ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="play.circle.fill"
                    android_material_icon_name="play_circle"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.primaryButtonText}>Esegui Test Completi</Text>
                </>
              )}
            </Pressable>

            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.secondaryButton,
                  styles.halfButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={showDeviceInfo}
              >
                <IconSymbol
                  ios_icon_name="info.circle"
                  android_material_icon_name="info"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>Info Dispositivo</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.secondaryButton,
                  styles.halfButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={showPerformanceMetrics}
              >
                <IconSymbol
                  ios_icon_name="speedometer"
                  android_material_icon_name="speed"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>Performance</Text>
              </Pressable>
            </View>

            {testResults.length > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={shareTestReport}
              >
                <IconSymbol
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="share"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>Condividi Report Deployment</Text>
              </Pressable>
            )}
          </View>

          {/* Core Tests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Core</Text>

            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => runTest('Database Performance', testDatabasePerformance)}
              disabled={testing}
            >
              <View style={styles.testButtonContent}>
                <IconSymbol
                  ios_icon_name="cylinder.fill"
                  android_material_icon_name="storage"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.testButtonText}>Performance Database</Text>
              </View>
              {testing && selectedTest === 'Database Performance' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => runTest('Product Browsing', testProductBrowsing)}
              disabled={testing}
            >
              <View style={styles.testButtonContent}>
                <IconSymbol
                  ios_icon_name="square.grid.2x2.fill"
                  android_material_icon_name="grid_view"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.testButtonText}>Navigazione Prodotti</Text>
              </View>
              {testing && selectedTest === 'Product Browsing' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => runTest('Drop Functionality', testDropFunctionality)}
              disabled={testing}
            >
              <View style={styles.testButtonContent}>
                <IconSymbol
                  ios_icon_name="flame.fill"
                  android_material_icon_name="local_fire_department"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.testButtonText}>Funzionalità Drop</Text>
              </View>
              {testing && selectedTest === 'Drop Functionality' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => runTest('RLS Policies', () => testRLSPolicies('profiles'))}
              disabled={testing}
            >
              <View style={styles.testButtonContent}>
                <IconSymbol
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="security"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.testButtonText}>Sicurezza RLS</Text>
              </View>
              {testing && selectedTest === 'RLS Policies' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => runTest('Real-time Subscriptions', testRealtimeSubscriptions)}
              disabled={testing}
            >
              <View style={styles.testButtonContent}>
                <IconSymbol
                  ios_icon_name="antenna.radiowaves.left.and.right"
                  android_material_icon_name="wifi"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.testButtonText}>Aggiornamenti Real-time</Text>
              </View>
              {testing && selectedTest === 'Real-time Subscriptions' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => runTest('Image Loading', testImageLoading)}
              disabled={testing}
            >
              <View style={styles.testButtonContent}>
                <IconSymbol
                  ios_icon_name="photo.fill"
                  android_material_icon_name="image"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.testButtonText}>Caricamento Immagini</Text>
              </View>
              {testing && selectedTest === 'Image Loading' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>
          </View>

          {/* Supplier Tests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Fornitori</Text>

            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => runTest('Supplier List Validation', testSupplierListValidation)}
              disabled={testing}
            >
              <View style={styles.testButtonContent}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.testButtonText}>Validazione Liste</Text>
              </View>
              {testing && selectedTest === 'Supplier List Validation' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => runTest('Excel Parsing', testExcelParsing)}
              disabled={testing}
            >
              <View style={styles.testButtonContent}>
                <IconSymbol
                  ios_icon_name="doc.text.fill"
                  android_material_icon_name="description"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.testButtonText}>Parsing Excel</Text>
              </View>
              {testing && selectedTest === 'Excel Parsing' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>
          </View>

          {/* Drop Management Tests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Gestione Drop</Text>

            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => runTest('Drop Status Transitions', testDropStatusTransitions)}
              disabled={testing}
            >
              <View style={styles.testButtonContent}>
                <IconSymbol
                  ios_icon_name="arrow.triangle.2.circlepath"
                  android_material_icon_name="sync"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.testButtonText}>Transizioni Stato Drop</Text>
              </View>
              {testing && selectedTest === 'Drop Status Transitions' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>
          </View>

          {/* Payment Tests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Pagamenti</Text>

            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => runTest('Payment Method Validation', testPaymentMethodValidation)}
              disabled={testing}
            >
              <View style={styles.testButtonContent}>
                <IconSymbol
                  ios_icon_name="creditcard.fill"
                  android_material_icon_name="credit_card"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.testButtonText}>Validazione Metodi Pagamento</Text>
              </View>
              {testing && selectedTest === 'Payment Method Validation' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => runTest('Payment Security', testPaymentSecurity)}
              disabled={testing}
            >
              <View style={styles.testButtonContent}>
                <IconSymbol
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="verified_user"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.testButtonText}>Sicurezza Pagamenti</Text>
              </View>
              {testing && selectedTest === 'Payment Security' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>

            {user && (
              <Pressable
                style={({ pressed }) => [
                  styles.testButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => runTest('Payment Methods', () => testPaymentMethods(user.id))}
                disabled={testing}
              >
                <View style={styles.testButtonContent}>
                  <IconSymbol
                    ios_icon_name="creditcard.and.123"
                    android_material_icon_name="payment"
                    size={20}
                    color={colors.text}
                  />
                  <Text style={styles.testButtonText}>Metodi Pagamento Utente</Text>
                </View>
                {testing && selectedTest === 'Payment Methods' && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </Pressable>
            )}
          </View>

          {/* User Tests */}
          {user && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test Utente</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.testButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => runTest('User Interests', () => testUserInterests(user.id))}
                disabled={testing}
              >
                <View style={styles.testButtonContent}>
                  <IconSymbol
                    ios_icon_name="heart.fill"
                    android_material_icon_name="favorite"
                    size={20}
                    color={colors.text}
                  />
                  <Text style={styles.testButtonText}>Interessi Utente</Text>
                </View>
                {testing && selectedTest === 'User Interests' && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </Pressable>
            </View>
          )}

          {/* Test Results */}
          {testResults.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Risultati Test</Text>
                <Pressable onPress={clearResults}>
                  <Text style={styles.clearButton}>Pulisci</Text>
                </Pressable>
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
                    <View style={styles.resultMessageContainer}>
                      <Text style={styles.resultMessage}>{result.message}</Text>
                      {result.duration && (
                        <Text style={styles.resultDuration}>{result.duration}ms</Text>
                      )}
                    </View>
                  </View>
                  {result.details && (
                    <Text style={styles.resultDetails}>
                      {JSON.stringify(result.details, null, 2)}
                    </Text>
                  )}
                  <Text style={styles.resultTimestamp}>
                    {result.timestamp.toLocaleTimeString('it-IT')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Summary */}
          {testResults.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Riepilogo Deployment</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Test Eseguiti:</Text>
                <Text style={styles.summaryValue}>{testResults.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#34C759' }]}>Passati:</Text>
                <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                  {testResults.filter(r => r.success).length}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#FF3B30' }]}>Falliti:</Text>
                <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>
                  {testResults.filter(r => !r.success).length}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Durata Totale:</Text>
                <Text style={styles.summaryValue}>
                  {testResults.reduce((sum, r) => sum + (r.duration || 0), 0)}ms
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Successo:</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: testResults.filter(r => r.success).length === testResults.length ? '#34C759' : '#FFB800' }
                ]}>
                  {((testResults.filter(r => r.success).length / testResults.length) * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={[styles.summaryRow, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Text style={[styles.summaryLabel, { fontSize: 16, fontWeight: '700' }]}>
                  Stato Deployment:
                </Text>
                <Text style={[
                  styles.summaryValue,
                  { 
                    fontSize: 16,
                    fontWeight: '700',
                    color: testResults.filter(r => !r.success).length === 0 ? '#34C759' : '#FF3B30'
                  }
                ]}>
                  {testResults.filter(r => !r.success).length === 0 ? '✅ PRONTA' : '⚠️ NON PRONTA'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  readinessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    gap: 16,
  },
  readyBanner: {
    backgroundColor: '#34C759',
  },
  notReadyBanner: {
    backgroundColor: '#FF9500',
  },
  readinessContent: {
    flex: 1,
  },
  readinessTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  readinessSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  testButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  resultSuccess: {
    borderColor: '#34C759',
  },
  resultFailure: {
    borderColor: '#FF3B30',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  resultMessageContainer: {
    flex: 1,
  },
  resultMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  resultDuration: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  resultDetails: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    backgroundColor: colors.backgroundSecondary,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  resultTimestamp: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
