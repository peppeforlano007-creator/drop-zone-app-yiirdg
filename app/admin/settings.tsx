
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
import { logActivity } from '@/utils/activityLogger';

interface PlatformSettings {
  drop_duration_days: number;
  min_drop_value: number;
  max_drop_value: number;
  platform_commission_rate: number;
  auto_approve_drops: boolean;
  auto_complete_drops: boolean;
  enable_notifications: boolean;
  maintenance_mode: boolean;
  whatsapp_support_number: string;
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
    whatsapp_support_number: '393123456789',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load WhatsApp support number from database
      const { data: whatsappData, error: whatsappError } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_support_number')
        .maybeSingle();

      if (whatsappError) {
        console.error('Error loading WhatsApp number:', whatsappError);
        Alert.alert(
          'Attenzione',
          'Impossibile caricare il numero WhatsApp dal database. Verrà utilizzato il valore predefinito.'
        );
      } else if (whatsappData) {
        setSettings(prev => ({
          ...prev,
          whatsapp_support_number: whatsappData.setting_value,
        }));
        console.log('WhatsApp number loaded:', whatsappData.setting_value);
      }
    } catch (error) {
      console.error('Exception loading settings:', error);
      Alert.alert('Errore', 'Impossibile caricare le impostazioni');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    // Validate WhatsApp number format
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(settings.whatsapp_support_number)) {
      Alert.alert(
        'Errore di Validazione',
        'Il numero WhatsApp deve contenere solo cifre (10-15 caratteri) senza spazi o simboli.\n\nEsempio: 393123456789'
      );
      return;
    }

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
              console.log('Saving WhatsApp number:', settings.whatsapp_support_number);

              // Check if the setting exists
              const { data: existingData, error: checkError } = await supabase
                .from('app_settings')
                .select('id')
                .eq('setting_key', 'whatsapp_support_number')
                .maybeSingle();

              if (checkError) {
                console.error('Error checking existing setting:', checkError);
                throw new Error(`Errore durante la verifica delle impostazioni esistenti: ${checkError.message}`);
              }

              let saveError;

              if (existingData) {
                // Update existing setting
                console.log('Updating existing setting with id:', existingData.id);
                const { error } = await supabase
                  .from('app_settings')
                  .update({ 
                    setting_value: settings.whatsapp_support_number,
                    updated_at: new Date().toISOString()
                  })
                  .eq('setting_key', 'whatsapp_support_number');
                
                saveError = error;
              } else {
                // Insert new setting
                console.log('Inserting new setting...');
                const { error } = await supabase
                  .from('app_settings')
                  .insert({
                    setting_key: 'whatsapp_support_number',
                    setting_value: settings.whatsapp_support_number,
                    description: 'Numero WhatsApp per il supporto clienti (formato: codice paese + numero senza + o spazi)',
                  });
                
                saveError = error;
              }

              if (saveError) {
                console.error('Error saving WhatsApp number:', saveError);
                throw new Error(`Errore durante il salvataggio: ${saveError.message}`);
              }

              // Verify the save was successful
              const { data: verifyData, error: verifyError } = await supabase
                .from('app_settings')
                .select('setting_value')
                .eq('setting_key', 'whatsapp_support_number')
                .single();

              if (verifyError) {
                console.error('Error verifying save:', verifyError);
                throw new Error('Impossibile verificare il salvataggio');
              }

              if (verifyData.setting_value !== settings.whatsapp_support_number) {
                console.error('Verification mismatch:', {
                  saved: verifyData.setting_value,
                  expected: settings.whatsapp_support_number
                });
                throw new Error('Il valore salvato non corrisponde al valore inserito');
              }

              console.log('Save verified successfully:', verifyData.setting_value);
              
              // Log activity (non-blocking - don't fail if this fails)
              try {
                await logActivity({
                  action: 'update_settings',
                  description: 'Impostazioni aggiornate',
                  metadata: {
                    whatsapp_support_number: settings.whatsapp_support_number,
                  }
                });
              } catch (logError) {
                console.error('Failed to log activity (non-critical):', logError);
                // Don't throw - activity logging failure shouldn't prevent success message
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setHasChanges(false);
              Alert.alert('Successo', 'Impostazioni salvate con successo!');
            } catch (error) {
              console.error('Exception saving settings:', error);
              Alert.alert(
                'Errore',
                error instanceof Error ? error.message : 'Si è verificato un errore imprevisto durante il salvataggio'
              );
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
    setHasChanges(true);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Impostazioni',
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={styles.loadingText}>Caricamento impostazioni...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Impostazioni',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {hasChanges && (
            <View style={styles.changesIndicator}>
              <IconSymbol
                ios_icon_name="exclamationmark.circle.fill"
                android_material_icon_name="info"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.changesText}>
                Hai modifiche non salvate
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supporto Clienti</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Numero WhatsApp Assistenza</Text>
                <Text style={styles.settingDescription}>
                  Numero WhatsApp per il supporto clienti (formato: codice paese + numero senza + o spazi)
                </Text>
                <Text style={styles.settingExample}>
                  Esempio: 393123456789 per +39 312 345 6789
                </Text>
              </View>
            </View>
            <TextInput
              style={styles.textInput}
              value={settings.whatsapp_support_number}
              onChangeText={(text) => updateSetting('whatsapp_support_number', text.replace(/[^0-9]/g, ''))}
              placeholder="393123456789"
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  changesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  changesText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
    lineHeight: 18,
  },
  settingExample: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
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
  textInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
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
