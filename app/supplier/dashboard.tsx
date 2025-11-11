
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
      totalOrderedValue: 12000,
      totalShippedValue: 8000,
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
      totalOrderedValue: 9500,
      totalShippedValue: 6200,
      createdAt: new Date('2024-02-01'),
      status: 'active' as const,
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
            <Text style={styles.welcomeText}>Benvenuto, {user?.name}</Text>
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
                  <View style={[styles.statusBadge, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={styles.statusText}>{list.status}</Text>
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

                {/* Analytics */}
                <View style={styles.analyticsContainer}>
                  <View style={styles.analyticItem}>
                    <Text style={styles.analyticLabel}>Valore Lista</Text>
                    <Text style={styles.analyticValue}>€{list.totalListValue.toLocaleString()}</Text>
                  </View>
                  <View style={styles.analyticItem}>
                    <Text style={styles.analyticLabel}>Ordinato</Text>
                    <Text style={styles.analyticValue}>€{list.totalOrderedValue.toLocaleString()}</Text>
                  </View>
                  <View style={styles.analyticItem}>
                    <Text style={styles.analyticLabel}>Spedito</Text>
                    <Text style={styles.analyticValue}>€{list.totalShippedValue.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${(list.totalOrderedValue / list.totalListValue) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round((list.totalOrderedValue / list.totalListValue) * 100)}% ordinato
                  </Text>
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
  analyticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  analyticItem: {
    flex: 1,
    alignItems: 'center',
  },
  analyticLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  analyticValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.text,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listDate: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 12,
  },
});
