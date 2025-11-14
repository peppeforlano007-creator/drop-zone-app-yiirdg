
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: { ios: string; android: string };
  color: string;
}

export default function ReportsScreen() {
  const [generating, setGenerating] = useState<string | null>(null);

  const reports: ReportType[] = [
    {
      id: 'users',
      title: 'Report Utenti',
      description: 'Esporta tutti gli utenti con dettagli completi',
      icon: { ios: 'person.3.fill', android: 'group' },
      color: colors.primary,
    },
    {
      id: 'suppliers',
      title: 'Report Fornitori',
      description: 'Esporta fornitori con statistiche vendite',
      icon: { ios: 'building.2.fill', android: 'store' },
      color: colors.secondary,
    },
    {
      id: 'products',
      title: 'Report Prodotti',
      description: 'Esporta catalogo prodotti completo',
      icon: { ios: 'cube.box.fill', android: 'inventory' },
      color: colors.info,
    },
    {
      id: 'drops',
      title: 'Report Drop',
      description: 'Esporta tutti i drop con performance',
      icon: { ios: 'bolt.circle.fill', android: 'flash_on' },
      color: colors.success,
    },
    {
      id: 'bookings',
      title: 'Report Prenotazioni',
      description: 'Esporta tutte le prenotazioni e pagamenti',
      icon: { ios: 'cart.fill', android: 'shopping_cart' },
      color: colors.warning,
    },
    {
      id: 'revenue',
      title: 'Report Fatturato',
      description: 'Esporta analisi fatturato e commissioni',
      icon: { ios: 'dollarsign.circle.fill', android: 'payments' },
      color: '#10B981',
    },
    {
      id: 'pickup_points',
      title: 'Report Punti di Ritiro',
      description: 'Esporta punti di ritiro con statistiche',
      icon: { ios: 'mappin.circle.fill', android: 'location_on' },
      color: '#8B5CF6',
    },
    {
      id: 'activity',
      title: 'Report Attività',
      description: 'Esporta log attività piattaforma',
      icon: { ios: 'chart.bar.fill', android: 'analytics' },
      color: '#F59E0B',
    },
  ];

  const handleGenerateReport = async (reportId: string, reportTitle: string) => {
    Alert.alert(
      'Genera Report',
      `Vuoi generare il report "${reportTitle}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Genera',
          style: 'default',
          onPress: async () => {
            try {
              setGenerating(reportId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // Simulate report generation
              await new Promise(resolve => setTimeout(resolve, 2000));

              // In a real app, you would generate and download the report here
              console.log('Generating report:', reportId);

              Alert.alert(
                'Report Generato',
                'Il report è stato generato con successo. In una versione completa, il file verrebbe scaricato automaticamente.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error generating report:', error);
              Alert.alert('Errore', 'Si è verificato un errore durante la generazione del report');
            } finally {
              setGenerating(null);
            }
          },
        },
      ]
    );
  };

  const handleExportAll = () => {
    Alert.alert(
      'Esporta Tutto',
      'Vuoi esportare tutti i dati della piattaforma? Questa operazione potrebbe richiedere alcuni minuti.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esporta',
          style: 'default',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Esportazione Avviata',
                'L\'esportazione completa è stata avviata. Riceverai una notifica quando sarà completata.'
              );
            } catch (error) {
              console.error('Error exporting all data:', error);
              Alert.alert('Errore', 'Si è verificato un errore durante l\'esportazione');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Report & Export',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Genera Report</Text>
            <Text style={styles.headerDescription}>
              Seleziona il tipo di report da generare ed esportare
            </Text>
          </View>

          <View style={styles.reportsGrid}>
            {reports.map((report) => (
              <Pressable
                key={report.id}
                style={({ pressed }) => [
                  styles.reportCard,
                  pressed && styles.reportCardPressed,
                  generating === report.id && styles.reportCardGenerating,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleGenerateReport(report.id, report.title);
                }}
                disabled={generating !== null}
              >
                <View style={[styles.reportIcon, { backgroundColor: report.color + '20' }]}>
                  {generating === report.id ? (
                    <ActivityIndicator color={report.color} />
                  ) : (
                    <IconSymbol
                      ios_icon_name={report.icon.ios}
                      android_material_icon_name={report.icon.android}
                      size={28}
                      color={report.color}
                    />
                  )}
                </View>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportDescription}>{report.description}</Text>
                {generating === report.id && (
                  <Text style={styles.generatingText}>Generazione in corso...</Text>
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.exportAllSection}>
            <Text style={styles.sectionTitle}>Esportazione Completa</Text>
            <Text style={styles.sectionDescription}>
              Esporta tutti i dati della piattaforma in un unico file
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.exportAllButton,
                pressed && styles.exportAllButtonPressed,
              ]}
              onPress={handleExportAll}
            >
              <IconSymbol
                ios_icon_name="arrow.down.doc.fill"
                android_material_icon_name="download"
                size={20}
                color="#fff"
              />
              <Text style={styles.exportAllButtonText}>Esporta Tutti i Dati</Text>
            </Pressable>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={24}
                color={colors.info}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Formato Export</Text>
                <Text style={styles.infoText}>
                  I report vengono esportati in formato CSV per una facile importazione in Excel o altri strumenti di analisi.
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <IconSymbol
                ios_icon_name="clock.fill"
                android_material_icon_name="schedule"
                size={24}
                color={colors.warning}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Report Programmati</Text>
                <Text style={styles.infoText}>
                  Puoi programmare l&apos;invio automatico di report via email su base giornaliera, settimanale o mensile.
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
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  reportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  reportCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  reportCardGenerating: {
    opacity: 0.6,
  },
  reportIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  reportDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  generatingText: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 8,
    fontWeight: '600',
  },
  exportAllSection: {
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
  },
  exportAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  exportAllButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  exportAllButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  infoSection: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
