
import { Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';

export default function LoginScreen() {
  const { user, loading: authLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);

  useEffect(() => {
    loadWhatsAppNumber();
  }, []);

  useEffect(() => {
    // Redirect if already logged in
    if (user && !authLoading) {
      console.log('User already logged in, redirecting...', user.role);
      if (user.role === 'consumer') {
        router.replace('/(tabs)/(home)');
      } else if (user.role === 'supplier') {
        // Suppliers no longer have access to the app
        Alert.alert(
          'Accesso Negato',
          'I fornitori non hanno più accesso diretto all\'app. Contatta l\'amministratore per assistenza.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await supabase.auth.signOut();
              }
            }
          ]
        );
      } else if (user.role === 'pickup_point') {
        router.replace('/pickup-point/dashboard');
      } else if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      }
    }
  }, [user, authLoading]);

  const loadWhatsAppNumber = async () => {
    try {
      setLoadingWhatsapp(true);
      console.log('Loading WhatsApp number from database...');
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_support_number')
        .maybeSingle();

      if (error) {
        console.error('Error loading WhatsApp number:', error);
        return;
      }

      if (data?.setting_value) {
        console.log('WhatsApp number loaded successfully:', data.setting_value);
        setWhatsappNumber(data.setting_value);
      } else {
        console.log('No WhatsApp number found in database');
      }
    } catch (error) {
      console.error('Exception loading WhatsApp number:', error);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const handleSupport = async () => {
    console.log('Support button pressed. WhatsApp number:', whatsappNumber);
    
    if (!whatsappNumber || whatsappNumber.trim() === '') {
      console.log('WhatsApp number not configured');
      Alert.alert(
        'Contatta il Supporto Clienti',
        'Il numero di supporto WhatsApp non è stato ancora configurato. Contatta l\'amministratore per assistenza.',
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const message = encodeURIComponent('Ciao, ho bisogno di supporto.');
    const whatsappUrl = `whatsapp://send?phone=${whatsappNumber}&text=${message}`;
    const whatsappWebUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    
    console.log('Opening WhatsApp with number:', whatsappNumber);
    
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      console.log('Can open WhatsApp app:', canOpen);
      
      if (canOpen) {
        console.log('Opening WhatsApp app...');
        await Linking.openURL(whatsappUrl);
      } else {
        console.log('WhatsApp app not available, opening WhatsApp Web...');
        await Linking.openURL(whatsappWebUrl);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Errore',
        'Impossibile aprire WhatsApp. Assicurati di avere WhatsApp installato sul tuo dispositivo.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('Errore', 'Inserisci il numero di cellulare');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^\+?[0-9\s\-()]+$/;
    if (!phoneRegex.test(phone.trim())) {
      Alert.alert('Errore', 'Inserisci un numero di cellulare valido (es. +39 123 456 7890)');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      console.log('Sending OTP to phone:', phone);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
        options: {
          channel: 'sms',
        }
      });

      if (error) {
        console.error('Error sending OTP:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        let errorMessage = error.message;
        if (errorMessage.toLowerCase().includes('rate limit')) {
          errorMessage = 'Hai richiesto troppi codici. Attendi qualche minuto e riprova.';
        }
        
        Alert.alert('Errore', errorMessage);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setOtpSent(true);
        console.log('OTP sent successfully');
        Alert.alert(
          'Codice Inviato!',
          'Abbiamo inviato un codice di 6 cifre al tuo numero di cellulare. Inseriscilo qui sotto per accedere.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Exception sending OTP:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore durante l\'invio del codice. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Errore', 'Inserisci il codice ricevuto via SMS');
      return;
    }

    if (otp.trim().length !== 6) {
      Alert.alert('Errore', 'Il codice deve essere di 6 cifre');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      console.log('Verifying OTP for phone:', phone);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: otp.trim(),
        type: 'sms',
      });

      if (error) {
        console.error('Error verifying OTP:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        let errorMessage = error.message;
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('expired')) {
          errorMessage = 'Codice non valido o scaduto. Richiedi un nuovo codice.';
        }
        
        Alert.alert('Errore', errorMessage);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('OTP verified successfully, user logged in');
        // Navigation will be handled by useEffect when user state updates
      }
    } catch (error) {
      console.error('Exception verifying OTP:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore durante la verifica del codice. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    setOtp('');
    setOtpSent(false);
  };

  const handleRegisterConsumer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/register/consumer');
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>Benvenuto</Text>
              <Text style={styles.subtitle}>
                {otpSent ? 'Inserisci il codice ricevuto via SMS' : 'Accedi con il tuo numero di cellulare'}
              </Text>
            </View>

            <View style={styles.formSection}>
              {!otpSent ? (
                <>
                  <Text style={styles.inputLabel}>Numero di Cellulare</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+39 123 456 7890"
                    placeholderTextColor={colors.textTertiary}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoComplete="tel"
                    editable={!loading}
                  />
                  <Text style={styles.inputHint}>
                    Inserisci il tuo numero di cellulare con il prefisso internazionale (es. +39 per l&apos;Italia)
                  </Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.loginButton,
                      (pressed || loading) && styles.loginButtonPressed,
                    ]}
                    onPress={handleSendOTP}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <IconSymbol
                          ios_icon_name="paperplane.fill"
                          android_material_icon_name="send"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.loginButtonText}>Invia Codice</Text>
                      </>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.phoneDisplayContainer}>
                    <Text style={styles.phoneDisplayLabel}>Numero di cellulare:</Text>
                    <Text style={styles.phoneDisplayValue}>{phone}</Text>
                    <Pressable
                      style={styles.changePhoneButton}
                      onPress={() => {
                        setOtpSent(false);
                        setOtp('');
                      }}
                      disabled={loading}
                    >
                      <Text style={styles.changePhoneText}>Cambia numero</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.inputLabel}>Codice di Verifica</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    placeholderTextColor={colors.textTertiary}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    editable={!loading}
                    autoFocus
                  />
                  <Text style={styles.inputHint}>
                    Inserisci il codice di 6 cifre che hai ricevuto via SMS
                  </Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.loginButton,
                      (pressed || loading) && styles.loginButtonPressed,
                    ]}
                    onPress={handleVerifyOTP}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.loginButtonText}>Verifica e Accedi</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.resendButton}
                    onPress={handleResendOTP}
                    disabled={loading}
                  >
                    <Text style={styles.resendButtonText}>
                      Non hai ricevuto il codice? Invia nuovamente
                    </Text>
                  </Pressable>
                </>
              )}

              {/* Support Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.supportButton,
                  pressed && styles.supportButtonPressed,
                  loadingWhatsapp && styles.supportButtonDisabled,
                ]}
                onPress={handleSupport}
                disabled={loadingWhatsapp}
              >
                {loadingWhatsapp ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="questionmark.circle.fill"
                      android_material_icon_name="help"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.supportButtonText}>
                      Hai bisogno di aiuto?
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={18}
                color={colors.info}
              />
              <Text style={styles.infoText}>
                <Text style={styles.infoTextBold}>Accesso Sicuro:</Text> Riceverai un codice di verifica via SMS ogni volta che accedi. 
                Il codice è valido per 60 secondi.
              </Text>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Non hai un account?</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.registerSection}>
              <Text style={styles.registerTitle}>Registrati come:</Text>
              
              <Pressable
                style={({ pressed }) => [
                  styles.registerCard,
                  pressed && styles.registerCardPressed,
                ]}
                onPress={handleRegisterConsumer}
                disabled={loading}
              >
                <View style={styles.registerCardIcon}>
                  <IconSymbol
                    ios_icon_name="person.fill"
                    android_material_icon_name="person"
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.registerCardContent}>
                  <Text style={styles.registerCardTitle}>Utente</Text>
                  <Text style={styles.registerCardDescription}>
                    Prenota prodotti e partecipa ai drop
                  </Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron_right"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>

              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={18}
                  color={colors.info}
                />
                <Text style={styles.infoText}>
                  Sei un punto di ritiro? Le credenziali di accesso ti verranno fornite dall&apos;amministratore.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  formSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  phoneDisplayContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phoneDisplayLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  phoneDisplayValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  changePhoneButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  changePhoneText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 56,
    gap: 8,
  },
  loginButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  resendButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primary + '20',
    gap: 8,
    minHeight: 52,
  },
  supportButtonPressed: {
    opacity: 0.7,
  },
  supportButtonDisabled: {
    opacity: 0.5,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.info + '30',
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: '700',
    color: colors.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  registerSection: {
    marginBottom: 32,
  },
  registerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  registerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  registerCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  registerCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  registerCardContent: {
    flex: 1,
  },
  registerCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  registerCardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
