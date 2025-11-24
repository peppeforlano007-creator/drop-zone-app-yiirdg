
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
      `Sei sicuro di voler completare il drop "${dropName}"?\n\nQuesto:\n- Catturerà tutti i pagamenti autorizzati su Stripe\n- Addebiterà l'importo finale con lo sconto raggiunto\n- Creerà gli ordini per i fornitori\n- Chiuderà il drop definitivamente\n- Confermerà tutte le prenotazioni`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Completa Drop',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              console.log('🎯 Starting drop completion process for:', dropId);

              // Call the Edge Function to capture payments and create orders
              const { data, error } = await supabase.functions.invoke('capture-drop-payments', {
                body: { dropId: dropId as string },
              });

              if (error) {
                console.error('❌ Error calling capture-drop-payments:', error);
                Alert.alert(
                  'Errore',
                  `Non è stato possibile completare il drop: ${error.message}\n\nVerifica che la funzione Edge sia deployata correttamente.`
                );
                return;
              }

              console.log('✅ Drop completion response:', data);

              if (data?.success) {
                const summary = data.summary;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
                Alert.alert(
                  'Drop Completato! ✅',
                  `Il drop è stato completato con successo!\n\n` +
                  `📊 Riepilogo:\n` +
                  `• Prenotazioni catturate: ${summary.capturedCount}/${summary.totalBookings}\n` +
                  `• Pagamenti Stripe: ${summary.stripeCapturedCount}\n` +
                  `• Totale addebitato: €${summary.totalCharged}\n` +
                  `• Risparmio totale: €${summary.totalSavings} (${summary.averageSavingsPercentage})\n` +
                  `• Ordini creati: ${summary.ordersCreated || 0}\n\n` +
                  `${data.stripeEnabled ? '✅ Pagamenti reali su Stripe' : '⚠️ Modalità simulazione (Stripe non configurato)'}`,
                  [
                    {
                      text: 'OK',
                      onPress: () => router.back(),
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Attenzione',
                  data?.message || 'Il drop è stato completato ma potrebbero esserci stati problemi.'
                );
              }
            } catch (error: any) {
              console.error('❌ Error in handleCompleteDrop:', error);
              Alert.alert(
                'Errore',
                `Si è verificato un errore imprevisto: ${error.message}`
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
              android_material_icon_name="check_circle" 
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
                  Tutti i pagamenti autorizzati verranno catturati su Stripe
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
                  Gli utenti pagheranno solo il prezzo finale con lo sconto raggiunto
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
                  Tutte le prenotazioni attive verranno confermate
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
              <View style={styles.infoItem}>
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={16} 
                  color="#4CAF50" 
                />
                <Text style={styles.infoText}>
                  Gli ordini saranno visibili nei punti di ritiro
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.warningCard}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle.fill" 
              android_material_icon_name="warning" 
              size={20} 
              color="#FF9800" 
            />
            <Text style={styles.warningText}>
              Assicurati di aver configurato STRIPE_SECRET_KEY in Supabase per catturare i pagamenti reali.
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
                  android_material_icon_name="check_circle" 
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
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FF980020',
    borderWidth: 1,
    borderColor: '#FF980040',
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
