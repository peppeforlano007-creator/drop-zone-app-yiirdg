
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface PlatformSettings {
  drop_duration_days: number;
  min_drop_value: number;
  max_drop_value: number;
  platform_commission_rate: number;
  auto_approve_drops: boolean;
  auto_complete_drops: boolean;
  enable_notifications: boolean;
  maintenance_mode: boolean;
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<PlatformSettings>({
    drop_duration_days: 5,
    min_drop_value: 5000,
    max_drop_value: 30000,
    platform_commission_rate: 10,
    auto_approve_drops: false,
    auto_complete_drops: false,
    enable_notifications: true,
    maintenance_mode: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async () => {
    Alert.alert(
      'Salva Impostazioni',
      'Sei sicuro di voler salvare le modifiche?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Salva',
          style: 'default',
          onPress: async () => {
            try {
              setSaving(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // In a real app, you would save these settings to the database
              console.log('Saving settings:', settings);

              Alert.alert('Successo', 'Impostazioni salvate con successo');
            } catch (error) {
              console.error('Error saving settings:', error);
              Alert.alert('Errore', 'Si è verificato un errore durante il salvataggio');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const updateSetting = <K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Impostazioni',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configurazione Drop</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Durata Drop (giorni)</Text>
                <Text style={styles.settingDescription}>
                  Durata predefinita di un drop attivo
                </Text>
              </View>
              <TextInput
                style={styles.numberInput}
                value={settings.drop_duration_days.toString()}
                onChangeText={(text) => updateSetting('drop_duration_days', parseInt(text) || 0)}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Valore Minimo Drop (€)</Text>
                <Text style={styles.settingDescription}>
                  Valore minimo per attivare un drop
                </Text>
              </View>
              <TextInput
                style={styles.numberInput}
                value={settings.min_drop_value.toString()}
                onChangeText={(text) => updateSetting('min_drop_value', parseInt(text) || 0)}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Valore Massimo Drop (€)</Text>
                <Text style={styles.settingDescription}>
                  Valore massimo per un drop
                </Text>
              </View>
              <TextInput
                style={styles.numberInput}
                value={settings.max_drop_value.toString()}
                onChangeText={(text) => updateSetting('max_drop_value', parseInt(text) || 0)}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Commissioni</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Commissione Piattaforma (%)</Text>
                <Text style={styles.settingDescription}>
                  Percentuale di commissione su ogni transazione
                </Text>
              </View>
              <TextInput
                style={styles.numberInput}
                value={settings.platform_commission_rate.toString()}
                onChangeText={(text) => updateSetting('platform_commission_rate', parseInt(text) || 0)}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Automazione</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Approvazione Automatica Drop</Text>
                <Text style={styles.settingDescription}>
                  Approva automaticamente i nuovi drop
                </Text>
              </View>
              <Switch
                value={settings.auto_approve_drops}
                onValueChange={(value) => updateSetting('auto_approve_drops', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Completamento Automatico Drop</Text>
                <Text style={styles.settingDescription}>
                  Completa automaticamente i drop scaduti
                </Text>
              </View>
              <Switch
                value={settings.auto_complete_drops}
                onValueChange={(value) => updateSetting('auto_complete_drops', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifiche</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Abilita Notifiche</Text>
                <Text style={styles.settingDescription}>
                  Permetti l&apos;invio di notifiche push agli utenti
                </Text>
              </View>
              <Switch
                value={settings.enable_notifications}
                onValueChange={(value) => updateSetting('enable_notifications', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manutenzione</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Modalità Manutenzione</Text>
                <Text style={styles.settingDescription}>
                  Disabilita l&apos;accesso alla piattaforma per manutenzione
                </Text>
              </View>
              <Switch
                value={settings.maintenance_mode}
                onValueChange={(value) => {
                  Alert.alert(
                    'Modalità Manutenzione',
                    value
                      ? 'Attivare la modalità manutenzione? Gli utenti non potranno accedere alla piattaforma.'
                      : 'Disattivare la modalità manutenzione?',
                    [
                      { text: 'Annulla', style: 'cancel' },
                      {
                        text: value ? 'Attiva' : 'Disattiva',
                        style: value ? 'destructive' : 'default',
                        onPress: () => updateSetting('maintenance_mode', value),
                      },
                    ]
                  );
                }}
                trackColor={{ false: colors.border, true: colors.error }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>Zona Pericolosa</Text>
            
            <Pressable
              style={({ pressed }) => [
                styles.dangerButton,
                pressed && styles.dangerButtonPressed,
              ]}
              onPress={() => {
                Alert.alert(
                  'Cancella Cache',
                  'Sei sicuro di voler cancellare la cache della piattaforma?',
                  [
                    { text: 'Annulla', style: 'cancel' },
                    {
                      text: 'Cancella',
                      style: 'destructive',
                      onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('Successo', 'Cache cancellata con successo');
                      },
                    },
                  ]
                );
              }}
            >
              <IconSymbol
                ios_icon_name="trash.fill"
                android_material_icon_name="delete"
                size={20}
                color={colors.error}
              />
              <Text style={styles.dangerButtonText}>Cancella Cache</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.dangerButton,
                pressed && styles.dangerButtonPressed,
              ]}
              onPress={() => {
                Alert.alert(
                  'Reset Database',
                  'ATTENZIONE: Questa azione cancellerà tutti i dati. Sei assolutamente sicuro?',
                  [
                    { text: 'Annulla', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert('Errore', 'Operazione non permessa in produzione');
                      },
                    },
                  ]
                );
              }}
            >
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={20}
                color={colors.error}
              />
              <Text style={styles.dangerButtonText}>Reset Database</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              saving && styles.saveButtonDisabled,
              pressed && styles.saveButtonPressed,
            ]}
            onPress={handleSaveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.saveButtonText}>Salva Impostazioni</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  numberInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerZone: {
    marginTop: 24,
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.error + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.error,
    gap: 8,
  },
  dangerButtonPressed: {
    opacity: 0.7,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
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
    color: '#fff',
  },
});
