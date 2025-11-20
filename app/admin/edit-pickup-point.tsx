
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { logPickupPointActivity } from '@/utils/activityLogger';

interface PickupPointData {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  manager_name: string;
  commission_rate: number;
  status: string;
  consumer_info?: string;
}

export default function EditPickupPointScreen() {
  const { pickupPointId } = useLocalSearchParams<{ pickupPointId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickupPoint, setPickupPoint] = useState<PickupPointData | null>(null);
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [managerName, setManagerName] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [status, setStatus] = useState('active');
  const [consumerInfo, setConsumerInfo] = useState('');

  useEffect(() => {
    loadPickupPoint();
  }, [pickupPointId]);

  const loadPickupPoint = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('pickup_points')
        .select('*')
        .eq('id', pickupPointId)
        .single();

      if (error) {
        console.error('Error loading pickup point:', error);
        Alert.alert('Errore', 'Impossibile caricare il punto di ritiro');
        return;
      }

      setPickupPoint(data);
      setName(data.name || '');
      setAddress(data.address || '');
      setCity(data.city || '');
      setPostalCode(data.postal_code || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setManagerName(data.manager_name || '');
      setCommissionRate(data.commission_rate?.toString() || '5');
      setStatus(data.status || 'active');
      setConsumerInfo(data.consumer_info || '');
    } catch (error) {
      console.error('Error loading pickup point:', error);
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

    if (!managerName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome del responsabile');
      return;
    }

    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('Errore', 'Inserisci una percentuale di commissione valida (0-100)');
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { error } = await supabase
        .from('pickup_points')
        .update({
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          postal_code: postalCode.trim() || null,
          phone: phone.trim(),
          email: email.trim(),
          manager_name: managerName.trim(),
          commission_rate: rate,
          status,
          consumer_info: consumerInfo.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pickupPointId);

      if (error) {
        console.error('Error updating pickup point:', error);
        Alert.alert('Errore', 'Impossibile aggiornare il punto di ritiro');
        return;
      }

      // Update all consumer profiles associated with this pickup point
      // This ensures consumers see updated pickup point information
      console.log('Updating consumer profiles for pickup point:', pickupPointId);
      const { error: profilesError } = await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('pickup_point_id', pickupPointId);

      if (profilesError) {
        console.warn('Warning: Could not update consumer profiles:', profilesError);
        // Don't fail the whole operation if this fails
      } else {
        console.log('Consumer profiles updated successfully');
      }

      // Log activity
      await logPickupPointActivity.updated(name, pickupPointId);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Successo', 'Punto di ritiro aggiornato con successo', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating pickup point:', error);
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

  if (!pickupPoint) {
    return (
      <>
        <Stack.Screen options={{ title: 'Modifica Punto di Ritiro' }} />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={64}
            color="#FF3B30"
          />
          <Text style={styles.errorText}>Punto di ritiro non trovato</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Torna Indietro</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Modifica Punto di Ritiro' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Punto di Ritiro *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Es. Store Roma Centro"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Indirizzo *</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Via Roma 123"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Città *</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Roma"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>CAP</Text>
              <TextInput
                style={styles.input}
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="00100"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefono *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+39 123 456 7890"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="store@example.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Responsabile *</Text>
            <TextInput
              style={styles.input}
              value={managerName}
              onChangeText={setManagerName}
              placeholder="Mario Rossi"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Commissione (%) *</Text>
            <TextInput
              style={styles.input}
              value={commissionRate}
              onChangeText={setCommissionRate}
              placeholder="5"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Informazioni per i Consumatori</Text>
            <Text style={styles.helperText}>
              Orari di apertura, istruzioni per il ritiro, ecc.
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={consumerInfo}
              onChangeText={setConsumerInfo}
              placeholder="Orari di apertura:&#10;Lun-Ven: 9:00-19:00&#10;Sab: 9:00-13:00&#10;Dom: Chiuso&#10;&#10;Istruzioni per il ritiro:&#10;Presentarsi con documento d'identità e codice ordine."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stato *</Text>
            <View style={styles.radioGroup}>
              {[
                { key: 'active', label: 'Attivo' },
                { key: 'inactive', label: 'Inattivo' },
                { key: 'pending_approval', label: 'In Attesa' },
              ].map((stat) => (
                <Pressable
                  key={stat.key}
                  style={[styles.radioButton, status === stat.key && styles.radioButtonActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setStatus(stat.key);
                  }}
                >
                  <Text style={[styles.radioText, status === stat.key && styles.radioTextActive]}>
                    {stat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              saving && styles.saveButtonDisabled,
              pressed && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.saveButtonText}>Salva Modifiche</Text>
              </>
            )}
          </Pressable>
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
    padding: 16,
    paddingBottom: 40,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radioButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  radioTextActive: {
    color: '#FFF',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
