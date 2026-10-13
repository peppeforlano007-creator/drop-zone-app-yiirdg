
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
  Platform,
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
  invite_link: string;
  min_users_for_drop_suggestion: number;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<PlatformSettings>({
    drop_duration_days: 5,
    min_drop_value: 5000,
    max_drop_value: 30000,
    platform_commission_rate: 10,
    auto_approve_drops: false,
    auto_complete_drops: false,
    enable_notifications: true,
    maintenance_mode: false,
    whatsapp_support_number: '',
    invite_link: '',
    min_users_for_drop_suggestion: 5,
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
      
      // Load all settings from database
      const { data: allSettings, error: settingsError } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value');

      if (settingsError) {
        console.error('Error loading settings:', settingsError);
        Alert.alert(
          'Attenzione',
          'Impossibile caricare le impostazioni dal database. Verranno utilizzati i valori predefiniti.'
        );
      } else if (allSettings) {
        const settingsMap = new Map(allSettings.map(s => [s.setting_key, s.setting_value]));
        
        setSettings(prev => ({
          ...prev,
          whatsapp_support_number: settingsMap.get('whatsapp_support_number') || prev.whatsapp_support_number,
          invite_link: settingsMap.get('invite_link') || prev.invite_link,
          drop_duration_days: parseInt(settingsMap.get('drop_duration_days') || String(prev.drop_duration_days)),
          min_drop_value: parseInt(settingsMap.get('min_drop_value') || String(prev.min_drop_value)),
          max_drop_value: parseInt(settingsMap.get('max_drop_value') || String(prev.max_drop_value)),
          platform_commission_rate: parseInt(settingsMap.get('platform_commission_rate') || String(prev.platform_commission_rate)),
          min_users_for_drop_suggestion: parseInt(settingsMap.get('min_users_for_drop_suggestion') || String(prev.min_users_for_drop_suggestion)),
          auto_approve_drops: settingsMap.has('auto_approve_drops') ? settingsMap.get('auto_approve_drops') === 'true' : prev.auto_approve_drops,
          auto_complete_drops: settingsMap.has('auto_complete_drops') ? settingsMap.get('auto_complete_drops') === 'true' : prev.auto_complete_drops,
          enable_notifications: settingsMap.has('enable_notifications') ? settingsMap.get('enable_notifications') === 'true' : prev.enable_notifications,
          maintenance_mode: settingsMap.has('maintenance_mode') ? settingsMap.get('maintenance_mode') === 'true' : prev.maintenance_mode,
        }));
        
        console.log('Settings loaded from database:', {
          whatsapp: settingsMap.get('whatsapp_support_number'),
          drop_duration: settingsMap.get('drop_duration_days'),
          min_value: settingsMap.get('min_drop_value'),
          max_value: settingsMap.get('max_drop_value'),
        });
      }
    } catch (error) {
      console.error('Exception loading settings:', error);
      Alert.alert('Errore', 'Impossibile caricare le impostazioni');
    } finally {
      setLoading(false);
    }
  };

  const executeSave = async () => {
    try {
      setSaving(true);
      console.log('Saving settings:', settings);

      // Define all settings to save
      const settingsToSave = [
        {
          key: 'whatsapp_support_number',
          value: settings.whatsapp_support_number,
          description: 'Numero WhatsApp per il supporto clienti (formato: codice paese + numero senza + o spazi)',
        },
        {
          key: 'invite_link',
          value: settings.invite_link,
          description: 'Link di invito app mostrato nel messaggio Invita amici e parenti nella sezione Gruppi',
        },
        {
          key: 'drop_duration_days',
          value: String(settings.drop_duration_days),
          description: 'Durata predefinita di un drop in giorni',
        },
        {
          key: 'min_drop_value',
          value: String(settings.min_drop_value),
          description: 'Valore minimo per attivare un drop (in euro)',
        },
        {
          key: 'max_drop_value',
          value: String(settings.max_drop_value),
          description: 'Valore massimo per un drop (in euro)',
        },
        {
          key: 'platform_commission_rate',
          value: String(settings.platform_commission_rate),
          description: 'Percentuale di commissione della piattaforma',
        },
        {
          key: 'min_users_for_drop_suggestion',
          value: String(settings.min_users_for_drop_suggestion),
          description: 'Numero minimo di utenti interessati per suggerire un drop',
        },
        {
          key: 'auto_approve_drops',
          value: settings.auto_approve_drops ? 'true' : 'false',
          description: 'Approvazione automatica dei nuovi drop',
        },
        {
          key: 'auto_complete_drops',
          value: settings.auto_complete_drops ? 'true' : 'false',
          description: 'Completamento automatico dei drop scaduti',
        },
        {
          key: 'enable_notifications',
          value: settings.enable_notifications ? 'true' : 'false',
          description: 'Abilita invio di notifiche push agli utenti',
        },
        {
          key: 'maintenance_mode',
          value: settings.maintenance_mode ? 'true' : 'false',
          description: 'Modalità manutenzione — disabilita accesso alla piattaforma',
        },
      ];

      // Save each setting
      for (const setting of settingsToSave) {
        // Check if the setting exists
        const { data: existingData, error: checkError } = await supabase
          .from('app_settings')
          .select('id')
          .eq('setting_key', setting.key)
          .maybeSingle();

        if (checkError) {
          console.error(`Error checking existing setting ${setting.key}:`, checkError);
          throw new Error(`Errore durante la verifica delle impostazioni: ${checkError.message}`);
        }

        if (existingData) {
          // Update existing setting
          console.log(`Updating setting ${setting.key}:`, setting.value);
          const { error } = await supabase
            .from('app_settings')
            .update({ 
              setting_value: setting.value,
              updated_at: new Date().toISOString()
            })
            .eq('setting_key', setting.key);
          
          if (error) {
            console.error(`Error updating setting ${setting.key}:`, error);
            throw new Error(`Errore durante l'aggiornamento di ${setting.key}: ${error.message}`);
          }
        } else {
          // Insert new setting
          console.log(`Inserting new setting ${setting.key}:`, setting.value);
          const { error } = await supabase
            .from('app_settings')
            .insert({
              setting_key: setting.key,
              setting_value: setting.value,
              description: setting.description,
            });
          
          if (error) {
            console.error(`Error inserting setting ${setting.key}:`, error);
            throw new Error(`Errore durante l'inserimento di ${setting.key}: ${error.message}`);
          }
        }
      }

      console.log('All settings saved successfully');
      
      // Log activity (non-blocking - don't fail if this fails)
      try {
        await logActivity({
          action: 'update_settings',
          description: 'Impostazioni piattaforma aggiornate',
          metadata: {
            whatsapp_support_number: settings.whatsapp_support_number,
            drop_duration_days: settings.drop_duration_days,
            min_drop_value: settings.min_drop_value,
            max_drop_value: settings.max_drop_value,
            platform_commission_rate: settings.platform_commission_rate,
          }
        });
      } catch (logError) {
        console.error('Failed to log activity (non-critical):', logError);
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
  };

  const handleSaveSettings = async () => {
    // Validate WhatsApp number format
    const phoneRegex = /^[0-9]{10,15}$/;
    if (settings.whatsapp_support_number && !phoneRegex.test(settings.whatsapp_support_number)) {
      Alert.alert(
        'Errore di Validazione',
        'Il numero WhatsApp deve contenere solo cifre (10-15 caratteri) senza spazi o simboli.\n\nEsempio: 393123456789'
      );
      return;
    }

    // Validate drop settings
    if (settings.drop_duration_days < 1 || settings.drop_duration_days > 30) {
      Alert.alert(
        'Errore di Validazione',
        'La durata del drop deve essere tra 1 e 30 giorni'
      );
      return;
    }

    if (settings.min_drop_value < 0 || settings.max_drop_value < 0) {
      Alert.alert(
        'Errore di Validazione',
        'I valori minimi e massimi del drop devono essere positivi'
      );
      return;
    }

    if (settings.min_drop_value >= settings.max_drop_value) {
      Alert.alert(
        'Errore di Validazione',
        'Il valore minimo del drop deve essere inferiore al valore massimo'
      );
      return;
    }

    console.log('handleSaveSettings: prompting user for confirmation');

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Sei sicuro di voler salvare le modifiche?');
      if (confirmed) await executeSave();
    } else {
      Alert.alert(
        'Salva Impostazioni',
        'Sei sicuro di voler salvare le modifiche?',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Salva', style: 'default', onPress: executeSave },
        ]
      );
    }
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

          {/* WhatsApp Support Section - Highlighted at the top */}
          <View style={styles.highlightedSection}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="bubble.left.and.bubble.right.fill"
                android_material_icon_name="support-agent"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.highlightedSectionTitle}>Supporto Clienti WhatsApp</Text>
            </View>
            
            <View style={styles.highlightedCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Numero WhatsApp Assistenza</Text>
                <Text style={styles.settingDescription}>
                  Questo numero verrà utilizzato nel pulsante &quot;Hai bisogno di aiuto?&quot; nella schermata di accesso
                </Text>
                <Text style={styles.settingExample}>
                  Formato: codice paese + numero (senza + o spazi)
                </Text>
                <Text style={styles.settingExample}>
                  Esempio: 393123456789 per +39 312 345 6789
                </Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={settings.whatsapp_support_number}
                onChangeText={(text) => updateSetting('whatsapp_support_number', text.replace(/[^0-9]/g, ''))}
                placeholder="393123456789"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                maxLength={15}
              />
              {settings.whatsapp_support_number && (
                <View style={styles.previewBox}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={16}
                    color={colors.success}
                  />
                  <Text style={styles.previewText}>
                    Numero configurato: +{settings.whatsapp_support_number}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Invite Link Section */}
          <View style={styles.highlightedSection}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="link"
                android_material_icon_name="link"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.highlightedSectionTitle}>Link Invito App</Text>
            </View>

            <View style={styles.highlightedCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Link di invito</Text>
                <Text style={styles.settingDescription}>
                  Questo link viene condiviso quando un utente invita amici nella sezione Gruppi
                </Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={settings.invite_link}
                onChangeText={(text) => updateSetting('invite_link', text)}
                placeholder="https://..."
                placeholderTextColor={colors.textTertiary}
                keyboardType="url"
                autoCapitalize="none"
              />
              {settings.invite_link ? (
                <View style={styles.previewBox}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={16}
                    color={colors.success}
                  />
                  <Text style={styles.previewText}>
                    Link configurato: {settings.invite_link}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configurazione Drop</Text>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ Queste impostazioni vengono utilizzate quando:
                {'\n'}• Un drop viene creato manualmente dall&apos;admin
                {'\n'}• Un drop viene attivato automaticamente quando gli utenti mostrano interesse
                {'\n'}• Un fornitore importa una nuova lista di prodotti
              </Text>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Durata Drop (giorni)</Text>
                <Text style={styles.settingDescription}>
                  Durata predefinita di un drop attivo dalla data di attivazione
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
                  Valore minimo di prenotazioni necessario per attivare automaticamente un drop
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
                  Valore massimo di prenotazioni per un drop (target per sconto massimo)
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
            <Text style={styles.sectionTitle}>Suggerimenti Drop</Text>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Il sistema suggerisce automaticamente di creare un drop quando un numero sufficiente di utenti della stessa città mostra interesse per una lista fornitore.
              </Text>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Soglia Minima Utenti Interessati</Text>
                <Text style={styles.settingDescription}>
                  Numero minimo di utenti della stessa città che devono mostrare interesse per una lista prima che venga suggerito un drop
                </Text>
                <Text style={styles.settingExample}>
                  Esempio: Con soglia 5, il sistema suggerirà un drop quando almeno 5 utenti di Roma mostrano interesse per la stessa lista
                </Text>
              </View>
              <TextInput
                style={styles.numberInput}
                value={settings.min_users_for_drop_suggestion.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text) || 1;
                  if (value < 1) {
                    Alert.alert('Valore Non Valido', 'Il valore minimo deve essere almeno 1');
                    return;
                  }
                  if (value > 100) {
                    Alert.alert('Valore Troppo Alto', 'Il valore massimo consigliato è 100');
                    return;
                  }
                  updateSetting('min_users_for_drop_suggestion', value);
                }}
                keyboardType="number-pad"
                maxLength={3}
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conformità Legale</Text>
            
            <Pressable
              style={({ pressed }) => [
                styles.legalManagementButton,
                pressed && styles.legalManagementButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/legal-documents');
              }}
            >
              <View style={styles.legalManagementContent}>
                <IconSymbol
                  ios_icon_name="doc.text.fill"
                  android_material_icon_name="description"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.legalManagementText}>
                  <Text style={styles.legalManagementTitle}>Gestisci Documenti Legali</Text>
                  <Text style={styles.legalManagementDescription}>
                    Privacy Policy, Termini e Condizioni, Cookie Policy
                  </Text>
                </View>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
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

          <TouchableOpacity
            style={[
              styles.saveButton,
              saving && styles.saveButtonDisabled,
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
                  android_material_icon_name="check-circle"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.saveButtonText}>Salva Impostazioni</Text>
              </>
            )}
          </TouchableOpacity>
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
  highlightedSection: {
    marginBottom: 24,
    backgroundColor: colors.primary + '08',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  highlightedSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  highlightedCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  infoBox: {
    backgroundColor: colors.info + '15',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
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
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
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
  legalManagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legalManagementButtonPressed: {
    opacity: 0.7,
  },
  legalManagementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  legalManagementText: {
    flex: 1,
  },
  legalManagementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  legalManagementDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
