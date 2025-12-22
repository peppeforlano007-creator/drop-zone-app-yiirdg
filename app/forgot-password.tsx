
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
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import React, { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'La password deve contenere almeno 8 caratteri' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'La password deve contenere almeno una lettera maiuscola' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'La password deve contenere almeno una lettera minuscola' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'La password deve contenere almeno un numero' };
    }
    
    return { valid: true };
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
      console.log('Sending password reset OTP to phone:', phone);
      
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
        console.log('Password reset OTP sent successfully');
        Alert.alert(
          'Codice Inviato!',
          'Abbiamo inviato un codice di 6 cifre al tuo numero di cellulare. Inseriscilo qui sotto per reimpostare la password.',
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

  const handleResetPassword = async () => {
    if (!otp.trim()) {
      Alert.alert('Errore', 'Inserisci il codice ricevuto via SMS');
      return;
    }

    if (otp.trim().length !== 6) {
      Alert.alert('Errore', 'Il codice deve essere di 6 cifre');
      return;
    }

    if (!newPassword) {
      Alert.alert('Errore', 'Inserisci la nuova password');
      return;
    }

    // Validate password strength
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      Alert.alert('Password Non Valida', validation.message);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Errore', 'Le password non corrispondono');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      console.log('Verifying OTP and resetting password for phone:', phone);
      
      // Verify OTP
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: otp.trim(),
        type: 'sms',
      });

      if (authError) {
        console.error('OTP verification error:', authError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        let errorMessage = authError.message;
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('expired')) {
          errorMessage = 'Codice non valido o scaduto. Richiedi un nuovo codice.';
        }
        
        Alert.alert('Errore di Verifica', errorMessage);
        return;
      }

      if (!authData.user) {
        Alert.alert('Errore', 'Si è verificato un errore durante la verifica. Riprova.');
        return;
      }

      console.log('OTP verified, updating password for user:', authData.user.id);

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('Error updating password:', updateError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Errore', 'Impossibile aggiornare la password. Riprova.');
        return;
      }

      console.log('Password updated successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Sign out the user so they can log in with the new password
      await supabase.auth.signOut();
      
      Alert.alert(
        'Password Reimpostata! ✅',
        'La tua password è stata reimpostata con successo. Puoi ora accedere con la nuova password.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/login');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Password reset exception:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Reimposta Password',
          headerBackTitle: 'Indietro',
        }} 
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <IconSymbol
                ios_icon_name="lock.rotation"
                android_material_icon_name="lock_reset"
                size={48}
                color={colors.primary}
              />
              <Text style={styles.title}>Reimposta Password</Text>
              <Text style={styles.subtitle}>
                {otpSent 
                  ? 'Inserisci il codice ricevuto e la nuova password'
                  : 'Inserisci il tuo numero di cellulare per ricevere un codice di verifica'
                }
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
                    Inserisci il numero di cellulare associato al tuo account
                  </Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.sendButton,
                      (pressed || loading) && styles.sendButtonPressed,
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
                        <Text style={styles.sendButtonText}>Invia Codice</Text>
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
                        setNewPassword('');
                        setConfirmPassword('');
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

                  <Text style={styles.inputLabel}>Nuova Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Almeno 8 caratteri"
                      placeholderTextColor={colors.textTertiary}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      editable={!loading}
                    />
                    <Pressable
                      style={styles.eyeButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowNewPassword(!showNewPassword);
                      }}
                      disabled={loading}
                    >
                      <IconSymbol
                        ios_icon_name={showNewPassword ? 'eye.slash.fill' : 'eye.fill'}
                        android_material_icon_name={showNewPassword ? 'visibility_off' : 'visibility'}
                        size={22}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>

                  <Text style={styles.inputLabel}>Conferma Nuova Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Ripeti la password"
                      placeholderTextColor={colors.textTertiary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      editable={!loading}
                    />
                    <Pressable
                      style={styles.eyeButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowConfirmPassword(!showConfirmPassword);
                      }}
                      disabled={loading}
                    >
                      <IconSymbol
                        ios_icon_name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'}
                        android_material_icon_name={showConfirmPassword ? 'visibility_off' : 'visibility'}
                        size={22}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.requirementsBox}>
                    <Text style={styles.requirementsTitle}>Requisiti password:</Text>
                    <View style={styles.requirementItem}>
                      <IconSymbol
                        ios_icon_name={newPassword.length >= 8 ? 'checkmark.circle.fill' : 'circle'}
                        android_material_icon_name={newPassword.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}
                        size={18}
                        color={newPassword.length >= 8 ? colors.success : colors.textTertiary}
                      />
                      <Text style={[
                        styles.requirementText,
                        newPassword.length >= 8 && styles.requirementTextMet
                      ]}>
                        Almeno 8 caratteri
                      </Text>
                    </View>
                    <View style={styles.requirementItem}>
                      <IconSymbol
                        ios_icon_name={/[A-Z]/.test(newPassword) ? 'checkmark.circle.fill' : 'circle'}
                        android_material_icon_name={/[A-Z]/.test(newPassword) ? 'check_circle' : 'radio_button_unchecked'}
                        size={18}
                        color={/[A-Z]/.test(newPassword) ? colors.success : colors.textTertiary}
                      />
                      <Text style={[
                        styles.requirementText,
                        /[A-Z]/.test(newPassword) && styles.requirementTextMet
                      ]}>
                        Una lettera maiuscola
                      </Text>
                    </View>
                    <View style={styles.requirementItem}>
                      <IconSymbol
                        ios_icon_name={/[a-z]/.test(newPassword) ? 'checkmark.circle.fill' : 'circle'}
                        android_material_icon_name={/[a-z]/.test(newPassword) ? 'check_circle' : 'radio_button_unchecked'}
                        size={18}
                        color={/[a-z]/.test(newPassword) ? colors.success : colors.textTertiary}
                      />
                      <Text style={[
                        styles.requirementText,
                        /[a-z]/.test(newPassword) && styles.requirementTextMet
                      ]}>
                        Una lettera minuscola
                      </Text>
                    </View>
                    <View style={styles.requirementItem}>
                      <IconSymbol
                        ios_icon_name={/[0-9]/.test(newPassword) ? 'checkmark.circle.fill' : 'circle'}
                        android_material_icon_name={/[0-9]/.test(newPassword) ? 'check_circle' : 'radio_button_unchecked'}
                        size={18}
                        color={/[0-9]/.test(newPassword) ? colors.success : colors.textTertiary}
                      />
                      <Text style={[
                        styles.requirementText,
                        /[0-9]/.test(newPassword) && styles.requirementTextMet
                      ]}>
                        Un numero
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.resetButton,
                      (pressed || loading) && styles.resetButtonPressed,
                    ]}
                    onPress={handleResetPassword}
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
                        <Text style={styles.resetButtonText}>
                          Reimposta Password
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.resendButton}
                    onPress={() => {
                      setOtp('');
                      setOtpSent(false);
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.resendButtonText}>
                      Non hai ricevuto il codice? Invia nuovamente
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={18}
                color={colors.info}
              />
              <Text style={styles.infoText}>
                Per motivi di sicurezza, riceverai un codice di verifica via SMS per confermare 
                la tua identità prima di reimpostare la password.
              </Text>
            </View>

            <Pressable
              style={styles.backButton}
              onPress={handleBackToLogin}
              disabled={loading}
            >
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="chevron_left"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.backButtonText}>
                Torna al Login
              </Text>
            </Pressable>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
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
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  eyeButton: {
    padding: 16,
  },
  requirementsBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  requirementText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  requirementTextMet: {
    color: colors.success,
    fontWeight: '500',
  },
  sendButton: {
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
  sendButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resetButton: {
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
  resetButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  resetButtonText: {
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
