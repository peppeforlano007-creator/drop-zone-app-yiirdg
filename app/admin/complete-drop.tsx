
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

export default function CompleteDropScreen() {
  const { dropId, dropName } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  const handleCompleteDrop = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Completa Drop',
      `Sei sicuro di voler completare il drop "${dropName}"?\n\nQuesto:\n- Calcolerà lo sconto finale raggiunto\n- Applicherà lo sconto finale a TUTTE le prenotazioni\n- Notificherà gli utenti dell'importo esatto da pagare\n- Creerà gli ordini per i fornitori\n- Chiuderà il drop definitivamente`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Completa Drop',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              console.log('🎯 Starting drop completion process for:', dropId);

              // Call the Edge Function to complete drop and create orders
              const { data, error } = await supabase.functions.invoke('capture-drop-payments', {
                body: { dropId: dropId as string },
              });

              console.log('📥 Edge function response:', { data, error });

              if (error) {
                console.error('❌ Error calling edge function:', error);
                Alert.alert(
                  'Errore',
                  `Non è stato possibile completare il drop.\n\nErrore: ${error.message}\n\nVerifica che la funzione Edge sia deployata correttamente.`
                );
                return;
              }

              // Check if the response indicates success
              if (data?.success === false) {
                console.error('❌ Edge function returned error:', data.error);
                Alert.alert(
                  'Errore',
                  `Non è stato possibile completare il drop.\n\n${data.error || 'Errore sconosciuto'}`
                );
                return;
              }

              // Success!
              if (data?.success === true) {
                const summary = data.summary || {};
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
                Alert.alert(
                  'Drop Completato! ✅',
                  `Il drop è stato completato con successo!\n\n` +
                  `📊 Riepilogo:\n` +
                  `• Prenotazioni confermate: ${summary.confirmedCount || 0}/${summary.totalBookings || 0}\n` +
                  `• Sconto finale applicato: ${summary.finalDiscount || '0%'}\n` +
                  `• Totale da pagare: €${summary.totalAmount || '0'}\n` +
                  `• Risparmio totale: €${summary.totalSavings || '0'}\n` +
                  `• Ordini creati: ${summary.ordersCreated || 0}\n` +
                  `• Notifiche inviate: ${summary.notificationsSent || 0}\n\n` +
                  `⚠️ IMPORTANTE: Lo sconto finale è stato applicato uniformemente a TUTTE le prenotazioni, anche quelle effettuate con sconti diversi durante il drop.\n\n` +
                  `Gli utenti sono stati notificati dell'importo esatto da pagare alla consegna.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => router.back(),
                    },
                  ]
                );
              } else {
                // Unexpected response format
                console.warn('⚠️ Unexpected response format:', data);
                Alert.alert(
                  'Attenzione',
                  'Il drop potrebbe essere stato completato, ma la risposta non è nel formato atteso. Verifica lo stato del drop.'
                );
              }
            } catch (error: any) {
              console.error('❌ Exception in handleCompleteDrop:', error);
              Alert.alert(
                'Errore',
                `Si è verificato un errore imprevisto: ${error.message || 'Errore sconosciuto'}`
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Completa Drop',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol 
              ios_icon_name="checkmark.circle.fill" 
              android_material_icon_name="check-circle" 
              size={80} 
              color="#4CAF50" 
            />
          </View>

          <Text style={styles.title}>Completa Drop</Text>
          <Text style={styles.dropName}>{dropName}</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Cosa succederà:</Text>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={16} 
                  color="#4CAF50" 
                />
                <Text style={styles.infoText}>
                  Verrà calcolato lo sconto finale raggiunto in base al valore totale prenotato
                </Text>
              </View>
              <View style={styles.infoItem}>
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={16} 
                  color="#4CAF50" 
                />
                <Text style={styles.infoText}>
                  Lo sconto finale sarà applicato uniformemente a TUTTE le prenotazioni
                </Text>
              </View>
              <View style={styles.infoItem}>
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={16} 
                  color="#4CAF50" 
                />
                <Text style={styles.infoText}>
                  Anche le prenotazioni fatte con sconti diversi beneficeranno dello sconto finale
                </Text>
              </View>
              <View style={styles.infoItem}>
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={16} 
                  color="#4CAF50" 
                />
                <Text style={styles.infoText}>
                  Gli utenti riceveranno una notifica con l&apos;importo esatto da pagare
                </Text>
              </View>
              <View style={styles.infoItem}>
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={16} 
                  color="#4CAF50" 
                />
                <Text style={styles.infoText}>
                  Verranno creati gli ordini per i fornitori e i punti di ritiro
                </Text>
              </View>
              <View style={styles.infoItem}>
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={16} 
                  color="#4CAF50" 
                />
                <Text style={styles.infoText}>
                  Il drop verrà chiuso definitivamente
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.highlightCard}>
            <IconSymbol 
              ios_icon_name="star.fill" 
              android_material_icon_name="star" 
              size={20} 
              color="#FFD700" 
            />
            <Text style={styles.highlightText}>
              <Text style={styles.highlightBold}>Equità garantita:</Text> Tutti gli utenti che hanno prenotato durante il drop riceveranno lo stesso sconto finale, indipendentemente da quando hanno effettuato la prenotazione.
            </Text>
          </View>

          <View style={styles.warningCard}>
            <IconSymbol 
              ios_icon_name="info.circle.fill" 
              android_material_icon_name="info" 
              size={20} 
              color="#2196F3" 
            />
            <Text style={styles.warningText}>
              Gli utenti pagheranno in contanti al momento del ritiro dell&apos;ordine presso il punto di ritiro.
            </Text>
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCompleteDrop}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <IconSymbol 
                  ios_icon_name="checkmark.circle.fill" 
                  android_material_icon_name="check-circle" 
                  size={20} 
                  color="#FFF" 
                />
                <Text style={styles.buttonText}>Completa Drop</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Annulla</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  dropName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  highlightCard: {
    flexDirection: 'row',
    backgroundColor: '#FFD70020',
    borderWidth: 1,
    borderColor: '#FFD70040',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  highlightText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  highlightBold: {
    fontWeight: '700',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#2196F320',
    borderWidth: 1,
    borderColor: '#2196F340',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
