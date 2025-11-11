
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const [lists] = useState([
    {
      id: '1',
      name: 'Lista Fashion Primavera 2024',
      minDiscount: 30,
      maxDiscount: 80,
      minOrderValue: 5000,
      maxOrderValue: 30000,
      totalListValue: 45000,
      interestedValue: 18000,
      orderedValue: 12000,
      shippedValue: 8000,
      createdAt: new Date('2024-01-15'),
      status: 'active' as const,
    },
    {
      id: '2',
      name: 'Lista Electronics Estate 2024',
      minDiscount: 25,
      maxDiscount: 70,
      minOrderValue: 4000,
      maxOrderValue: 25000,
      totalListValue: 38000,
      interestedValue: 15000,
      orderedValue: 9500,
      shippedValue: 6200,
      createdAt: new Date('2024-02-01'),
      status: 'active' as const,
    },
    {
      id: '3',
      name: 'Lista Home & Living Autunno 2024',
      minDiscount: 35,
      maxDiscount: 75,
      minOrderValue: 3000,
      maxOrderValue: 20000,
      totalListValue: 28000,
      interestedValue: 12000,
      orderedValue: 7500,
      shippedValue: 4800,
      createdAt: new Date('2024-03-10'),
      status: 'completed' as const,
    },
  ]);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleImportList = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/supplier/import-list');
  };

  const handleViewList = (listId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('View list:', listId);
    Alert.alert('Lista', `Visualizza dettagli lista ${listId}`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Dashboard Fornitore',
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 8 }}>
              <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Benvenuto, Fornitore</Text>
            <Text style={styles.welcomeSubtext}>Gestisci le tue liste e analizza i risultati</Text>
          </View>

          {/* Import Button */}
          <Pressable style={styles.importButton} onPress={handleImportList}>
            <IconSymbol name="plus.circle.fill" size={24} color={colors.background} />
            <Text style={styles.importButtonText}>Importa Nuova Lista</Text>
          </Pressable>

          {/* Lists Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Le Tue Liste</Text>
            
            {lists.map((list) => (
              <Pressable
                key={list.id}
                style={styles.listCard}
                onPress={() => handleViewList(list.id)}
              >
                <View style={styles.listHeader}>
                  <Text style={styles.listName}>{list.name}</Text>
                  <View style={[
                    styles.statusBadge,
                    {
                      backgroundColor: list.status === 'active'
                        ? colors.backgroundSecondary
                        : '#4CAF50'
                    }
                  ]}>
                    <Text style={styles.statusText}>
                      {list.status === 'active' ? 'ATTIVA' : 'COMPLETATA'}
                    </Text>
                  </View>
                </View>

                {/* Discount Range */}
                <View style={styles.listRow}>
                  <IconSymbol name="percent" size={16} color={colors.textSecondary} />
                  <Text style={styles.listLabel}>Sconto:</Text>
                  <Text style={styles.listValue}>
                    {list.minDiscount}% - {list.maxDiscount}%
                  </Text>
                </View>

                {/* Order Value Range */}
                <View style={styles.listRow}>
                  <IconSymbol name="eurosign.circle" size={16} color={colors.textSecondary} />
                  <Text style={styles.listLabel}>Valore ordine:</Text>
                  <Text style={styles.listValue}>
                    €{list.minOrderValue.toLocaleString()} - €{list.maxOrderValue.toLocaleString()}
                  </Text>
                </View>

                {/* Analytics - 4 Values */}
                <View style={styles.analyticsSection}>
                  <Text style={styles.analyticsSectionTitle}>Analisi</Text>
                  
                  <View style={styles.analyticsGrid}>
                    {/* Valore Lista */}
                    <View style={styles.analyticCard}>
                      <View style={styles.analyticIconContainer}>
                        <IconSymbol name="list.bullet.clipboard" size={20} color={colors.text} />
                      </View>
                      <Text style={styles.analyticCardLabel}>Valore Lista</Text>
                      <Text style={styles.analyticCardValue}>
                        €{list.totalListValue.toLocaleString()}
                      </Text>
                    </View>

                    {/* Valore Interessato */}
                    <View style={styles.analyticCard}>
                      <View style={styles.analyticIconContainer}>
                        <IconSymbol name="hand.raised" size={20} color="#FF9800" />
                      </View>
                      <Text style={styles.analyticCardLabel}>Valore Interessato</Text>
                      <Text style={[styles.analyticCardValue, { color: '#FF9800' }]}>
                        €{list.interestedValue.toLocaleString()}
                      </Text>
                      <Text style={styles.analyticCardSubtext}>
                        {Math.round((list.interestedValue / list.totalListValue) * 100)}% del totale
                      </Text>
                    </View>

                    {/* Valore Ordinato */}
                    <View style={styles.analyticCard}>
                      <View style={styles.analyticIconContainer}>
                        <IconSymbol name="creditcard" size={20} color="#2196F3" />
                      </View>
                      <Text style={styles.analyticCardLabel}>Valore Ordinato</Text>
                      <Text style={[styles.analyticCardValue, { color: '#2196F3' }]}>
                        €{list.orderedValue.toLocaleString()}
                      </Text>
                      <Text style={styles.analyticCardSubtext}>
                        {Math.round((list.orderedValue / list.totalListValue) * 100)}% del totale
                      </Text>
                    </View>

                    {/* Valore Spedito */}
                    <View style={styles.analyticCard}>
                      <View style={styles.analyticIconContainer}>
                        <IconSymbol name="shippingbox" size={20} color="#4CAF50" />
                      </View>
                      <Text style={styles.analyticCardLabel}>Valore Spedito</Text>
                      <Text style={[styles.analyticCardValue, { color: '#4CAF50' }]}>
                        €{list.shippedValue.toLocaleString()}
                      </Text>
                      <Text style={styles.analyticCardSubtext}>
                        {Math.round((list.shippedValue / list.totalListValue) * 100)}% del totale
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Progress Visualization */}
                <View style={styles.progressVisualization}>
                  <Text style={styles.progressTitle}>Progressione</Text>
                  
                  {/* Interested Progress */}
                  <View style={styles.progressItem}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>Interessato</Text>
                      <Text style={styles.progressPercentage}>
                        {Math.round((list.interestedValue / list.totalListValue) * 100)}%
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${(list.interestedValue / list.totalListValue) * 100}%`,
                            backgroundColor: '#FF9800',
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Ordered Progress */}
                  <View style={styles.progressItem}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>Ordinato</Text>
                      <Text style={styles.progressPercentage}>
                        {Math.round((list.orderedValue / list.totalListValue) * 100)}%
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${(list.orderedValue / list.totalListValue) * 100}%`,
                            backgroundColor: '#2196F3',
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Shipped Progress */}
                  <View style={styles.progressItem}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>Spedito</Text>
                      <Text style={styles.progressPercentage}>
                        {Math.round((list.shippedValue / list.totalListValue) * 100)}%
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${(list.shippedValue / list.totalListValue) * 100}%`,
                            backgroundColor: '#4CAF50',
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <Text style={styles.listDate}>
                  Creata il {list.createdAt.toLocaleDateString('it-IT')}
                </Text>
              </Pressable>
            ))}
          </View>
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
  scrollView: {
    flex: 1,
  },
  welcomeSection: {
    padding: 24,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    margin: 24,
    padding: 18,
    borderRadius: 8,
    gap: 8,
  },
  importButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  listCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  listName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  listLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  analyticsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  analyticsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analyticIconContainer: {
    marginBottom: 8,
  },
  analyticCardLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  analyticCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  analyticCardSubtext: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  progressVisualization: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  progressItem: {
    marginBottom: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  listDate: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 16,
  },
});
