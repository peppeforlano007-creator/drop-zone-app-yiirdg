
import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';

export default function EditPickupPointScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [directionsForConsumers, setDirectionsForConsumers] = useState('');
  const [shippingInstructions, setShippingInstructions] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  useEffect(() => {
    loadPickupPointData();
  }, []);

  const loadPickupPointData = async () => {
    if (!user?.pickupPointId) {
      Alert.alert('Errore', 'Punto di ritiro non trovato');
      router.back();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pickup_points')
        .select('*')
        .eq('id', user.pickupPointId)
        .single();

      if (error) {
        console.error('Error loading pickup point:', error);
        Alert.alert('Errore', 'Impossibile caricare i dati del punto di ritiro');
        return;
      }

      if (data) {
        setName(data.name || '');
        setAddress(data.address || '');
        setCity(data.city || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setOpeningHours(data.consumer_info || '');
        setContactPerson(data.manager_name || '');
      }
    } catch (error) {
      console.error('Exception loading pickup point:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Errore', 'Inserisci il nome del punto di ritiro');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Errore', 'Inserisci l\'indirizzo');
      return;
    }

    if (!city.trim()) {
      Alert.alert('Errore', 'Inserisci la città');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Errore', 'Inserisci il numero di telefono');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Errore', 'Inserisci l\'email');
      return;
    }

    if (!user?.pickupPointId) {
      Alert.alert('Errore', 'Punto di ritiro non trovato');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase
        .from('pickup_points')
        .update({
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim(),
          email: email.trim(),
          consumer_info: openingHours.trim() || null,
          manager_name: contactPerson.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.pickupPointId);

      if (error) {
        console.error('Error updating pickup point:', error);
        Alert.alert('Errore', 'Impossibile aggiornare le informazioni');
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
    } catch (error) {
      console.error('Exception updating pickup point:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

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
            keyboardShouldPersistTaps="handled"
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
                  editable={!saving}
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
                  editable={!saving}
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
                  editable={!saving}
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
                  editable={!saving}
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
                  editable={!saving}
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
                  editable={!saving}
                />
              </View>
            </View>

            {/* Consumer Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informazioni per i Consumatori</Text>
              <Text style={styles.helperText}>
                Orari di apertura, istruzioni per il ritiro, ecc.
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Orari di apertura:&#10;Lun-Ven: 9:00-19:00&#10;Sab: 9:00-13:00&#10;Dom: Chiuso&#10;&#10;Istruzioni per il ritiro:&#10;Presentarsi con documento d'identità e codice ordine."
                placeholderTextColor={colors.textTertiary}
                value={openingHours}
                onChangeText={setOpeningHours}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>

            {/* Save Button */}
            <Pressable 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>Salva Modifiche</Text>
              )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
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
    minHeight: 180,
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
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
});
