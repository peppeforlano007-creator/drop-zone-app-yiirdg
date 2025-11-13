
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import DropCard from '@/components/DropCard';
import { mockDrops } from '@/data/mockData';
import { IconSymbol } from '@/components/IconSymbol';

export default function DropsScreen() {
  // Only show drops that are active (approved and running)
  const activeDrops = mockDrops.filter(drop => drop.status === 'active');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Drop Attivi',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            Platform.OS !== 'ios' && styles.contentContainerWithTabBar,
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Drop Attivi</Text>
            <Text style={styles.headerSubtitle}>
              Prenota ora e ottieni sconti incredibili
            </Text>
          </View>

          {activeDrops.length > 0 ? (
            activeDrops.map(drop => <DropCard key={drop.id} drop={drop} />)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="tray"
                android_material_icon_name="inbox"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessun drop attivo</Text>
              <Text style={styles.emptyText}>
                I drop si attiveranno quando abbastanza utenti del tuo punto di ritiro
                mostreranno interesse per gli stessi prodotti
              </Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Come funzionano i Drop?</Text>
            <View style={styles.infoList}>
              <Text style={styles.infoText}>
                • Quando abbastanza utenti del tuo punto di ritiro prenotano prodotti della stessa lista, si crea un drop in attesa di approvazione
              </Text>
              <Text style={styles.infoText}>
                • Una volta approvato e attivato, il drop parte con lo sconto minimo e dura 5 giorni
              </Text>
              <Text style={styles.infoText}>
                • Più persone prenotano, più lo sconto aumenta
              </Text>
              <Text style={styles.infoText}>
                • Alla fine del drop, paghi solo il prezzo finale con lo sconto raggiunto
              </Text>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  contentContainerWithTabBar: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
