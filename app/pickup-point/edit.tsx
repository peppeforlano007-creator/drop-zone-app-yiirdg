
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';

export default function EditPickupPointScreen() {
  const [name, setName] = useState('DropMarket Roma Centro');
  const [address, setAddress] = useState('Via del Corso, 123');
  const [city, setCity] = useState('Roma');
  const [phone, setPhone] = useState('+39 06 1234567');
  const [email, setEmail] = useState('roma@dropmarket.it');
  const [openingHours, setOpeningHours] = useState('Lun-Ven: 9:00-19:00, Sab: 9:00-13:00');
  const [directionsForConsumers, setDirectionsForConsumers] = useState(
    'Siamo in Via del Corso, vicino alla fermata metro Spagna. Entrata principale con insegna DropMarket.'
  );
  const [shippingInstructions, setShippingInstructions] = useState(
    'Spedire a: DropMarket Roma Centro, Via del Corso 123, 00187 Roma. Citare sempre il codice ordine.'
  );
  const [contactPerson, setContactPerson] = useState('Mario Rossi');

  const handleSave = () => {
    if (!name || !address || !city || !phone || !email) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Successo',
      'Informazioni aggiornate con successo!',
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
    console.log('Pickup point updated:', {
      name,
      address,
      city,
      phone,
      email,
      openingHours,
      directionsForConsumers,
      shippingInstructions,
      contactPerson,
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Modifica Punto di Ritiro',
          presentation: 'modal',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Basic Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informazioni Base</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Punto di Ritiro *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="es. DropMarket Roma Centro"
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Indirizzo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Via del Corso, 123"
                  placeholderTextColor={colors.textTertiary}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Città *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Roma"
                  placeholderTextColor={colors.textTertiary}
                  value={city}
                  onChangeText={setCity}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefono *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+39 06 1234567"
                  placeholderTextColor={colors.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="roma@dropmarket.it"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Orari di Apertura</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Lun-Ven: 9:00-19:00"
                  placeholderTextColor={colors.textTertiary}
                  value={openingHours}
                  onChangeText={setOpeningHours}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Responsabile</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mario Rossi"
                  placeholderTextColor={colors.textTertiary}
                  value={contactPerson}
                  onChangeText={setContactPerson}
                />
              </View>
            </View>

            {/* Directions for Consumers */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Indicazioni per i Consumatori</Text>
              <Text style={styles.helperText}>
                Fornisci indicazioni chiare su come raggiungere il punto di ritiro
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descrivi come raggiungere il punto di ritiro..."
                placeholderTextColor={colors.textTertiary}
                value={directionsForConsumers}
                onChangeText={setDirectionsForConsumers}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Shipping Instructions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Istruzioni per i Fornitori</Text>
              <Text style={styles.helperText}>
                Fornisci istruzioni per la spedizione degli ordini
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descrivi come spedire gli ordini..."
                placeholderTextColor={colors.textTertiary}
                value={shippingInstructions}
                onChangeText={setShippingInstructions}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Save Button */}
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Salva Modifiche</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  saveButton: {
    backgroundColor: colors.text,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
});
