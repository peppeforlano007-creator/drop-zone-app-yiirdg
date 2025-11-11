
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
              <IconSymbol name="person.circle.fill" size={80} color={colors.text} />
            </View>
            <Text style={styles.name}>{mockUser.name}</Text>
            <Text style={styles.email}>{mockUser.email}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
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
                  <View style={styles.radioOuter}>
                    {selectedPickupPoint === point && <View style={styles.radioInner} />}
                  </View>
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
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDescription: {
    fontSize: 13,
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
    borderRadius: 4,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickupPointButtonActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.background,
  },
  pickupPointText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  pickupPointTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
  },
  infoItemText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
});
