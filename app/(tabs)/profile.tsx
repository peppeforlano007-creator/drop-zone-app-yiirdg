
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import React, { useState } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, router } from 'expo-router';
import { mockUser, PICKUP_POINTS } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [selectedPickupPoint, setSelectedPickupPoint] = useState(mockUser.pickupPoint);

  const handlePickupPointChange = (point: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPickupPoint(point);
    console.log('Pickup point changed to:', point);
  };

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

  const handleViewBookings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/my-bookings');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Profilo',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 8 }}>
              <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS !== 'ios' && styles.scrollContentWithTabBar,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* User Info */}
          <View style={styles.section}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <IconSymbol name="person.fill" size={48} color={colors.text} />
              </View>
              <Text style={styles.userName}>{user?.name || mockUser.name}</Text>
              <Text style={styles.userEmail}>{mockUser.email}</Text>
            </View>
          </View>

          {/* Pickup Point Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Punto di Ritiro</Text>
            <Text style={styles.sectionDescription}>
              Seleziona il punto di ritiro più vicino a te
            </Text>
            
            <View style={styles.pickupPointsContainer}>
              {PICKUP_POINTS.map((point) => (
                <Pressable
                  key={point}
                  style={[
                    styles.pickupPointCard,
                    selectedPickupPoint === point && styles.pickupPointCardSelected,
                  ]}
                  onPress={() => handlePickupPointChange(point)}
                >
                  <View style={styles.pickupPointContent}>
                    <IconSymbol
                      name="mappin.circle.fill"
                      size={24}
                      color={selectedPickupPoint === point ? colors.background : colors.text}
                    />
                    <Text
                      style={[
                        styles.pickupPointText,
                        selectedPickupPoint === point && styles.pickupPointTextSelected,
                      ]}
                    >
                      {point}
                    </Text>
                  </View>
                  {selectedPickupPoint === point && (
                    <IconSymbol name="checkmark.circle.fill" size={24} color={colors.background} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Le Tue Statistiche</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <IconSymbol name="heart.fill" size={32} color={colors.text} />
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Prodotti Interessati</Text>
              </View>
              
              <View style={styles.statCard}>
                <IconSymbol name="cart.fill" size={32} color={colors.text} />
                <Text style={styles.statValue}>5</Text>
                <Text style={styles.statLabel}>Ordini Completati</Text>
              </View>
            </View>
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Impostazioni</Text>
            
            <Pressable style={styles.settingItem} onPress={handleViewBookings}>
              <View style={styles.settingContent}>
                <IconSymbol name="cart.fill" size={20} color={colors.text} />
                <Text style={styles.settingText}>Le Mie Prenotazioni</Text>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable style={styles.settingItem}>
              <View style={styles.settingContent}>
                <IconSymbol name="bell.fill" size={20} color={colors.text} />
                <Text style={styles.settingText}>Notifiche</Text>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable style={styles.settingItem}>
              <View style={styles.settingContent}>
                <IconSymbol name="questionmark.circle.fill" size={20} color={colors.text} />
                <Text style={styles.settingText}>Aiuto e Supporto</Text>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </Pressable>
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
  scrollContent: {
    paddingBottom: 40,
  },
  scrollContentWithTabBar: {
    paddingBottom: 120,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 20,
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
  pickupPointsContainer: {
    gap: 12,
  },
  pickupPointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  pickupPointCardSelected: {
    borderColor: colors.text,
    backgroundColor: colors.text,
  },
  pickupPointContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickupPointText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pickupPointTextSelected: {
    color: colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
  },
});
