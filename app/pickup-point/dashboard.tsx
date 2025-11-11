
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

export default function PickupPointDashboard() {
  const { user, logout } = useAuth();
  const [pickupPoint] = useState({
    id: '1',
    name: 'DropMarket Roma Centro',
    address: 'Via del Corso, 123',
    city: 'Roma',
    phone: '+39 06 1234567',
    email: 'roma@dropmarket.it',
    openingHours: 'Lun-Ven: 9:00-19:00, Sab: 9:00-13:00',
    directionsForConsumers: 'Siamo in Via del Corso, vicino alla fermata metro Spagna. Entrata principale con insegna DropMarket.',
    shippingInstructions: 'Spedire a: DropMarket Roma Centro, Via del Corso 123, 00187 Roma. Citare sempre il codice ordine.',
    contactPerson: 'Mario Rossi',
  });

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

  const handleEditPoint = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/pickup-point/edit');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Punto di Ritiro',
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
            <Text style={styles.welcomeSubtext}>Gestisci il tuo punto di ritiro</Text>
          </View>

          {/* Edit Button */}
          <Pressable style={styles.editButton} onPress={handleEditPoint}>
            <IconSymbol name="pencil.circle.fill" size={24} color={colors.background} />
            <Text style={styles.editButtonText}>Modifica Informazioni</Text>
          </Pressable>

          {/* Point Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informazioni Punto di Ritiro</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <IconSymbol name="mappin.circle.fill" size={20} color={colors.text} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Nome</Text>
                  <Text style={styles.infoValue}>{pickupPoint.name}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <IconSymbol name="location.fill" size={20} color={colors.text} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Indirizzo</Text>
                  <Text style={styles.infoValue}>{pickupPoint.address}</Text>
                  <Text style={styles.infoValue}>{pickupPoint.city}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <IconSymbol name="phone.fill" size={20} color={colors.text} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Telefono</Text>
                  <Text style={styles.infoValue}>{pickupPoint.phone}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <IconSymbol name="envelope.fill" size={20} color={colors.text} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{pickupPoint.email}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <IconSymbol name="clock.fill" size={20} color={colors.text} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Orari</Text>
                  <Text style={styles.infoValue}>{pickupPoint.openingHours}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <IconSymbol name="person.fill" size={20} color={colors.text} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Responsabile</Text>
                  <Text style={styles.infoValue}>{pickupPoint.contactPerson}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Directions for Consumers */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="figure.walk" size={24} color={colors.text} />
              <Text style={styles.sectionTitle}>Indicazioni per i Consumatori</Text>
            </View>
            <View style={styles.textCard}>
              <Text style={styles.cardText}>{pickupPoint.directionsForConsumers}</Text>
            </View>
          </View>

          {/* Shipping Instructions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="shippingbox.fill" size={24} color={colors.text} />
              <Text style={styles.sectionTitle}>Istruzioni per i Fornitori</Text>
            </View>
            <View style={styles.textCard}>
              <Text style={styles.cardText}>{pickupPoint.shippingInstructions}</Text>
            </View>
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    margin: 24,
    padding: 18,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    padding: 24,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  textCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  cardText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
});
