
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockUser, PICKUP_POINTS } from '@/data/mockData';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const [selectedPickupPoint, setSelectedPickupPoint] = useState(mockUser.pickupPoint);

  const handlePickupPointChange = (point: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPickupPoint(point);
    Alert.alert('Punto di ritiro aggiornato', `Nuovo punto di ritiro: ${point}`);
    console.log('Pickup point changed to:', point);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profilo',
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
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <IconSymbol name="person.circle.fill" size={80} color={colors.primary} />
            </View>
            <Text style={styles.name}>{mockUser.name}</Text>
            <Text style={styles.email}>{mockUser.email}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="location.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Punto di Ritiro</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Seleziona il punto di ritiro più vicino a te. I drop si attiveranno quando
              abbastanza utenti dello stesso punto mostreranno interesse.
            </Text>
            <View style={styles.pickupPointsContainer}>
              {PICKUP_POINTS.map(point => (
                <Pressable
                  key={point}
                  style={[
                    styles.pickupPointButton,
                    selectedPickupPoint === point && styles.pickupPointButtonActive,
                  ]}
                  onPress={() => handlePickupPointChange(point)}
                >
                  <IconSymbol
                    name={selectedPickupPoint === point ? 'checkmark.circle.fill' : 'circle'}
                    size={20}
                    color={selectedPickupPoint === point ? colors.card : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.pickupPointText,
                      selectedPickupPoint === point && styles.pickupPointTextActive,
                    ]}
                  >
                    {point}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="bag.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Le Mie Prenotazioni</Text>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Interessato</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Prenotati</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Completati</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="info.circle.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Come Funziona</Text>
            </View>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <View style={styles.infoNumber}>
                  <Text style={styles.infoNumberText}>1</Text>
                </View>
                <Text style={styles.infoItemText}>
                  Scorri il feed e premi "Vorrò partecipare al drop" sui prodotti che ti interessano
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoNumber}>
                  <Text style={styles.infoNumberText}>2</Text>
                </View>
                <Text style={styles.infoItemText}>
                  Quando abbastanza utenti del tuo punto di ritiro mostrano interesse, si attiva un drop
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoNumber}>
                  <Text style={styles.infoNumberText}>3</Text>
                </View>
                <Text style={styles.infoItemText}>
                  Prenota con carta durante il drop. Più persone prenotano, più lo sconto aumenta!
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoNumber}>
                  <Text style={styles.infoNumberText}>4</Text>
                </View>
                <Text style={styles.infoItemText}>
                  Alla fine del drop, paghi il prezzo finale e ritiri il prodotto al tuo punto
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
    paddingVertical: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  pickupPointsContainer: {
    gap: 8,
  },
  pickupPointButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
  },
  pickupPointButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickupPointText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  pickupPointTextActive: {
    color: colors.card,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoList: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 12,
  },
  infoNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.card,
  },
  infoItemText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
