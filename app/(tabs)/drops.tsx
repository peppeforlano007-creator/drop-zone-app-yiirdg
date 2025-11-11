
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import DropCard from '@/components/DropCard';
import { mockDrops } from '@/data/mockData';
import { IconSymbol } from '@/components/IconSymbol';

export default function DropsScreen() {
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
            <IconSymbol name="flame.fill" size={32} color={colors.accent} />
            <Text style={commonStyles.title}>Drop Attivi</Text>
            <Text style={commonStyles.textSecondary}>
              Prenota ora e ottieni sconti incredibili!
            </Text>
          </View>

          {activeDrops.length > 0 ? (
            activeDrops.map(drop => <DropCard key={drop.id} drop={drop} />)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="tray" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Nessun drop attivo</Text>
              <Text style={styles.emptyText}>
                I drop si attiveranno quando abbastanza utenti del tuo punto di ritiro
                mostreranno interesse per gli stessi prodotti!
              </Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <IconSymbol name="info.circle.fill" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Come funzionano i Drop?</Text>
              <Text style={styles.infoText}>
                - Quando abbastanza utenti del tuo punto di ritiro prenotano prodotti della stessa lista, si attiva un drop{'\n'}
                - Il drop parte con lo sconto minimo e dura 5 giorni{'\n'}
                - Più persone prenotano, più lo sconto aumenta{'\n'}
                - Alla fine del drop, paghi solo il prezzo finale con lo sconto raggiunto
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
    paddingVertical: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
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
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
