
import React, { useState, useEffect, useCallback } from 'react';
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
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';

export default function EditListScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [listName, setListName] = useState('');
  const [minDiscount, setMinDiscount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minReservationValue, setMinReservationValue] = useState('');
  const [maxReservationValue, setMaxReservationValue] = useState('');
  const [deliveryMinDays, setDeliveryMinDays] = useState('');
  const [deliveryMaxDays, setDeliveryMaxDays] = useState('');

  const fetchList = useCallback(async () => {
    console.log('[EditList] Fetching list data for listId:', listId);
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('supplier_lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (error) {
        console.error('[EditList] Error fetching list:', error);
        Alert.alert('Errore', 'Impossibile caricare i dati della lista');
        router.back();
        return;
      }

      console.log('[EditList] List data loaded:', data);
      setListName(data.name ?? '');
      setMinDiscount(data.min_discount != null ? String(data.min_discount) : '');
      setMaxDiscount(data.max_discount != null ? String(data.max_discount) : '');
      setMinReservationValue(data.min_reservation_value != null ? String(data.min_reservation_value) : '');
      setMaxReservationValue(data.max_reservation_value != null ? String(data.max_reservation_value) : '');
      setDeliveryMinDays(data.delivery_min_days != null ? String(data.delivery_min_days) : '');
      setDeliveryMaxDays(data.delivery_max_days != null ? String(data.delivery_max_days) : '');
    } catch (error) {
      console.error('[EditList] Exception fetching list:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
      router.back();
    } finally {
      setLoadingData(false);
    }
  }, [listId]);

  useEffect(() => {
    if (listId) {
      fetchList();
    }
  }, [listId, fetchList]);

  const handleSave = async () => {
    console.log('[EditList] Save button pressed for listId:', listId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!listName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome della lista');
      return;
    }

    if (!minDiscount) {
      Alert.alert('Errore', 'Inserisci lo sconto minimo');
      return;
    }

    if (!maxDiscount) {
      Alert.alert('Errore', 'Inserisci lo sconto massimo');
      return;
    }

    const minDiscountNum = parseFloat(minDiscount);
    const maxDiscountNum = parseFloat(maxDiscount);
    const minValueNum = parseFloat(minReservationValue);
    const maxValueNum = parseFloat(maxReservationValue);

    if (isNaN(minDiscountNum) || minDiscountNum < 0 || minDiscountNum > 100) {
      Alert.alert('Errore', 'Lo sconto minimo deve essere tra 0 e 100');
      return;
    }

    if (isNaN(maxDiscountNum) || maxDiscountNum < 0 || maxDiscountNum > 100) {
      Alert.alert('Errore', 'Lo sconto massimo deve essere tra 0 e 100');
      return;
    }

    if (minDiscountNum >= maxDiscountNum) {
      Alert.alert('Errore', 'Lo sconto minimo deve essere inferiore allo sconto massimo');
      return;
    }

    setSaving(true);
    try {
      console.log('[EditList] Updating list with data:', {
        name: listName.trim(),
        min_discount: minDiscountNum,
        max_discount: maxDiscountNum,
        min_reservation_value: minValueNum,
        max_reservation_value: maxValueNum,
        delivery_min_days: deliveryMinDays ? parseInt(deliveryMinDays) : null,
        delivery_max_days: deliveryMaxDays ? parseInt(deliveryMaxDays) : null,
      });

      const { error } = await supabase
        .from('supplier_lists')
        .update({
          name: listName.trim(),
          min_discount: minDiscountNum,
          max_discount: maxDiscountNum,
          min_reservation_value: isNaN(minValueNum) ? null : minValueNum,
          max_reservation_value: isNaN(maxValueNum) ? null : maxValueNum,
          delivery_min_days: deliveryMinDays ? parseInt(deliveryMinDays) : null,
          delivery_max_days: deliveryMaxDays ? parseInt(deliveryMaxDays) : null,
        })
        .eq('id', listId);

      if (error) {
        console.error('[EditList] Error updating list:', error);
        Alert.alert('Errore', `Impossibile aggiornare la lista: ${error.message}`);
        return;
      }

      console.log('[EditList] List updated successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('[EditList] Exception updating list:', error);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto');
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <>
        <Stack.Screen options={{ title: 'Modifica Lista' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento dati...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Modifica Lista' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <IconSymbol
                  ios_icon_name="pencil.circle.fill"
                  android_material_icon_name="edit"
                  size={48}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.title}>Modifica Lista</Text>
              <Text style={styles.subtitle}>
                Aggiorna i dettagli della lista prodotti
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nome Lista *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. Fashion Primavera 2024"
                  placeholderTextColor={colors.textTertiary}
                  value={listName}
                  onChangeText={setListName}
                  autoCapitalize="words"
                  editable={!saving}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Sconto Min (%) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30"
                    placeholderTextColor={colors.textTertiary}
                    value={minDiscount}
                    onChangeText={setMinDiscount}
                    keyboardType="numeric"
                    editable={!saving}
                  />
                </View>

                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Sconto Max (%) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="80"
                    placeholderTextColor={colors.textTertiary}
                    value={maxDiscount}
                    onChangeText={setMaxDiscount}
                    keyboardType="numeric"
                    editable={!saving}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Valore Min Prenotazione (€)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="5000"
                    placeholderTextColor={colors.textTertiary}
                    value={minReservationValue}
                    onChangeText={setMinReservationValue}
                    keyboardType="numeric"
                    editable={!saving}
                  />
                </View>

                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Valore Max Prenotazione (€)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30000"
                    placeholderTextColor={colors.textTertiary}
                    value={maxReservationValue}
                    onChangeText={setMaxReservationValue}
                    keyboardType="numeric"
                    editable={!saving}
                  />
                </View>
              </View>

              <Text style={styles.sectionLabel}>Tempi di consegna (giorni)</Text>
              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Da</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Es. 3"
                    placeholderTextColor={colors.textTertiary}
                    value={deliveryMinDays}
                    onChangeText={(v) => {
                      console.log('[EditList] deliveryMinDays changed:', v);
                      setDeliveryMinDays(v);
                    }}
                    keyboardType="numeric"
                    editable={!saving}
                  />
                </View>

                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>A</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Es. 5"
                    placeholderTextColor={colors.textTertiary}
                    value={deliveryMaxDays}
                    onChangeText={(v) => {
                      console.log('[EditList] deliveryMaxDays changed:', v);
                      setDeliveryMaxDays(v);
                    }}
                    keyboardType="numeric"
                    editable={!saving}
                  />
                </View>
              </View>

              <Text style={styles.requiredNote}>* Campi obbligatori</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  (pressed || saving) && styles.saveButtonPressed,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check_circle"
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.saveButtonText}>Salva Modifiche</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelLink}
                onPress={() => {
                  console.log('[EditList] Cancel pressed');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.back();
                }}
                disabled={saving}
              >
                <Text style={styles.cancelLinkText}>Annulla</Text>
              </Pressable>
            </View>
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
  scrollContent: {
    flexGrow: 1,
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  requiredNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 8,
    marginBottom: 16,
    minHeight: 56,
    gap: 8,
  },
  saveButtonPressed: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
