
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function MyDataScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleExportData = async () => {
    Alert.alert(
      'Esporta i Tuoi Dati',
      'I tuoi dati personali verranno esportati in formato JSON. Riceverai una copia via email e potrai anche salvarla sul tuo dispositivo, come previsto dal GDPR.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Richiedi Esportazione',
          onPress: async () => {
            try {
              setLoading(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              // Get the current session
              const { data: { session } } = await supabase.auth.getSession();
              
              if (!session) {
                throw new Error('Sessione non valida');
              }

              console.log('📤 Calling export-user-data Edge Function...');

              // Call the Edge Function to export data
              const { data, error } = await supabase.functions.invoke('export-user-data', {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              });

              if (error) {
                console.error('Error calling export function:', error);
                throw new Error(error.message || 'Impossibile esportare i dati');
              }

              console.log('✅ Export response received');
              console.log('📧 Email sent:', data?.email_sent);

              if (!data || !data.success) {
                throw new Error(data?.error || 'Errore durante l\'esportazione');
              }

              // Create a formatted JSON string
              const jsonData = JSON.stringify(data.data, null, 2);
              const fileName = `dati_personali_${new Date().toISOString().split('T')[0]}.json`;

              if (Platform.OS === 'web') {
                // For web, create a download link
                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
                if (data.email_sent) {
                  Alert.alert(
                    'Esportazione Completata! ✅',
                    `I tuoi dati sono stati esportati con successo.\n\n📧 Ti abbiamo inviato una copia via email a ${user?.email}\n\n💾 Il file "${fileName}" è stato anche scaricato sul tuo dispositivo.`,
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'Esportazione Completata! ✅',
                    `I tuoi dati sono stati esportati con successo.\n\n💾 Il file "${fileName}" è stato scaricato sul tuo dispositivo.\n\n⚠️ NOTA: ${data.email_error || 'L\'invio via email non è disponibile al momento. Contatta l\'amministratore per maggiori informazioni.'}`,
                    [{ text: 'OK' }]
                  );
                }
              } else {
                // For mobile, save to file system and share
                const fileUri = `${FileSystem.documentDirectory}${fileName}`;
                await FileSystem.writeAsStringAsync(fileUri, jsonData, {
                  encoding: FileSystem.EncodingType.UTF8,
                });

                console.log('📁 File saved to:', fileUri);

                // Check if sharing is available
                const isAvailable = await Sharing.isAvailableAsync();
                
                if (isAvailable) {
                  await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/json',
                    dialogTitle: 'Salva i Tuoi Dati',
                    UTI: 'public.json',
                  });
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
                if (data.email_sent) {
                  Alert.alert(
                    'Esportazione Completata! ✅',
                    `I tuoi dati sono stati esportati con successo.\n\n📧 Ti abbiamo inviato una copia via email a ${user?.email}\n\n💾 Il file "${fileName}" è stato anche salvato sul tuo dispositivo e puoi condividerlo o salvarlo dove preferisci.`,
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'Esportazione Completata! ✅',
                    `I tuoi dati sono stati esportati con successo.\n\n💾 Il file "${fileName}" è stato salvato sul tuo dispositivo e puoi condividerlo o salvarlo dove preferisci.\n\n⚠️ NOTA: ${data.email_error || 'L\'invio via email non è disponibile al momento. Contatta l\'amministratore per maggiori informazioni.'}`,
                    [{ text: 'OK' }]
                  );
                }
              }
            } catch (error) {
              console.error('Exception exporting data:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(
                'Errore',
                error instanceof Error ? error.message : 'Si è verificato un errore durante l\'esportazione dei dati'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Elimina Account',
      '⚠️ ATTENZIONE: Questa azione è irreversibile!\n\nEliminando il tuo account:\n\n- Tutti i tuoi dati personali verranno cancellati\n- Le tue prenotazioni attive verranno annullate\n- Non potrai più accedere all\'app\n\nSei assolutamente sicuro?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Conferma Eliminazione',
              'Questa è l\'ultima conferma. Vuoi davvero eliminare il tuo account?',
              [
                { text: 'No, Annulla', style: 'cancel' },
                {
                  text: 'Sì, Elimina',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setLoading(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                      // Create deletion request
                      const { error: requestError } = await supabase
                        .from('data_requests')
                        .insert({
                          user_id: user?.id,
                          request_type: 'deletion',
                          status: 'pending',
                          requested_at: new Date().toISOString(),
                        });

                      if (requestError) {
                        console.error('Error creating deletion request:', requestError);
                        throw new Error('Impossibile creare la richiesta di cancellazione');
                      }

                      // Mark user for deletion
                      const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ 
                          deletion_requested: true,
                          deletion_requested_at: new Date().toISOString(),
                        })
                        .eq('user_id', user?.id);

                      if (updateError) {
                        console.error('Error marking user for deletion:', updateError);
                        throw new Error('Impossibile completare la richiesta');
                      }

                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      
                      Alert.alert(
                        'Richiesta Registrata',
                        'La tua richiesta di cancellazione è stata registrata. Il tuo account verrà eliminato entro 30 giorni. Riceverai una conferma via email.',
                        [
                          {
                            text: 'OK',
                            onPress: async () => {
                              await supabase.auth.signOut();
                              router.replace('/login');
                            },
                          },
                        ]
                      );
                    } catch (error) {
                      console.error('Exception deleting account:', error);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      Alert.alert(
                        'Errore',
                        error instanceof Error ? error.message : 'Si è verificato un errore'
                      );
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'I Miei Dati',
          headerBackTitle: 'Indietro',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <IconSymbol
              ios_icon_name="shield.fill"
              android_material_icon_name="shield"
              size={48}
              color={colors.primary}
            />
            <Text style={styles.headerTitle}>Gestione Dati Personali</Text>
            <Text style={styles.headerSubtitle}>
              In conformità con il GDPR, hai il diritto di accedere, modificare ed eliminare i tuoi dati personali.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>I Tuoi Diritti GDPR</Text>
            
            <View style={styles.rightCard}>
              <IconSymbol
                ios_icon_name="eye.fill"
                android_material_icon_name="visibility"
                size={24}
                color={colors.primary}
              />
              <View style={styles.rightContent}>
                <Text style={styles.rightTitle}>Diritto di Accesso</Text>
                <Text style={styles.rightDescription}>
                  Puoi richiedere una copia di tutti i dati personali che abbiamo su di te
                </Text>
              </View>
            </View>

            <View style={styles.rightCard}>
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={24}
                color={colors.primary}
              />
              <View style={styles.rightContent}>
                <Text style={styles.rightTitle}>Diritto di Rettifica</Text>
                <Text style={styles.rightDescription}>
                  Puoi modificare i tuoi dati personali in qualsiasi momento
                </Text>
              </View>
            </View>

            <View style={styles.rightCard}>
              <IconSymbol
                ios_icon_name="trash.fill"
                android_material_icon_name="delete"
                size={24}
                color={colors.primary}
              />
              <View style={styles.rightContent}>
                <Text style={styles.rightTitle}>Diritto alla Cancellazione</Text>
                <Text style={styles.rightDescription}>
                  Puoi richiedere la cancellazione completa del tuo account e dei tuoi dati
                </Text>
              </View>
            </View>

            <View style={styles.rightCard}>
              <IconSymbol
                ios_icon_name="arrow.down.doc.fill"
                android_material_icon_name="download"
                size={24}
                color={colors.primary}
              />
              <View style={styles.rightContent}>
                <Text style={styles.rightTitle}>Diritto alla Portabilità</Text>
                <Text style={styles.rightDescription}>
                  Puoi esportare i tuoi dati in un formato leggibile
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Azioni</Text>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.viewDataButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/edit-profile');
              }}
              disabled={loading}
            >
              <IconSymbol
                ios_icon_name="person.circle.fill"
                android_material_icon_name="account_circle"
                size={24}
                color={colors.primary}
              />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Visualizza e Modifica Dati</Text>
                <Text style={styles.actionDescription}>
                  Accedi al tuo profilo per visualizzare e modificare i tuoi dati personali
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.exportButton,
                pressed && styles.actionButtonPressed,
                loading && styles.actionButtonDisabled,
              ]}
              onPress={handleExportData}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="square.and.arrow.down.fill"
                    android_material_icon_name="download"
                    size={24}
                    color={colors.primary}
                  />
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Esporta i Tuoi Dati</Text>
                    <Text style={styles.actionDescription}>
                      Ricevi i tuoi dati via email e salvali sul dispositivo
                    </Text>
                  </View>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron_right"
                    size={20}
                    color={colors.textSecondary}
                  />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documenti Legali</Text>

            <Pressable
              style={({ pressed }) => [
                styles.legalButton,
                pressed && styles.legalButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/legal/privacy-policy');
              }}
            >
              <IconSymbol
                ios_icon_name="shield.fill"
                android_material_icon_name="shield"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.legalButtonText}>Privacy Policy</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.legalButton,
                pressed && styles.legalButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/legal/terms-conditions');
              }}
            >
              <IconSymbol
                ios_icon_name="doc.text.fill"
                android_material_icon_name="description"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.legalButtonText}>Termini e Condizioni</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.legalButton,
                pressed && styles.legalButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/legal/cookie-policy');
              }}
            >
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="cookie"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.legalButtonText}>Cookie Policy</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>Zona Pericolosa</Text>
            <Text style={styles.dangerZoneDescription}>
              Queste azioni sono irreversibili. Procedi con cautela.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
              ]}
              onPress={handleDeleteAccount}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="trash.fill"
                    android_material_icon_name="delete_forever"
                    size={24}
                    color={colors.error}
                  />
                  <View style={styles.actionContent}>
                    <Text style={styles.deleteTitle}>Elimina Account</Text>
                    <Text style={styles.deleteDescription}>
                      Elimina permanentemente il tuo account e tutti i tuoi dati
                    </Text>
                  </View>
                </>
              )}
            </Pressable>
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
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  rightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  rightContent: {
    flex: 1,
  },
  rightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  rightDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  viewDataButton: {
    borderColor: colors.primary + '30',
  },
  exportButton: {
    borderColor: colors.primary + '30',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  legalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  legalButtonPressed: {
    opacity: 0.7,
  },
  legalButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  dangerZone: {
    backgroundColor: colors.error + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 8,
  },
  dangerZoneDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.error,
    gap: 12,
  },
  deleteButtonPressed: {
    opacity: 0.7,
  },
  deleteTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 4,
  },
  deleteDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
