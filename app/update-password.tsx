
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
import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';

export default function UpdatePasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error('No valid session for password reset:', error);
        Alert.alert(
          'Sessione Scaduta',
          'Il link per il recupero password è scaduto o non è valido. Richiedi un nuovo link.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/forgot-password'),
            },
          ]
        );
        setIsValidSession(false);
      } else {
        console.log('Valid session found for password reset');
        setIsValidSession(true);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      Alert.alert(
        'Errore',
        'Si è verificato un errore. Riprova.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]
      );
      setIsValidSession(false);
    } finally {
      setCheckingSession(false);
    }
  };

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

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Errore', 'Inserisci la nuova password');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Errore', 'Conferma la nuova password');
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
      console.log('Updating password...');
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Error updating password:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        let errorMessage = 'Si è verificato un errore durante l\'aggiornamento della password.';
        
        if (error.message.toLowerCase().includes('same as the old password')) {
          errorMessage = 'La nuova password deve essere diversa da quella precedente.';
        } else if (error.message.toLowerCase().includes('session')) {
          errorMessage = 'La sessione è scaduta. Richiedi un nuovo link per il recupero password.';
        }
        
        Alert.alert('Errore', errorMessage);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('Password updated successfully');
        
        Alert.alert(
          'Password Aggiornata!',
          'La tua password è stata aggiornata con successo. Ora puoi accedere con la nuova password.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Sign out to force re-login with new password
                supabase.auth.signOut().then(() => {
                  router.replace('/login');
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Exception updating password:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Verifica in corso...</Text>
      </View>
    );
  }

  if (!isValidSession) {
    return null;
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Nuova Password',
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
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <IconSymbol
                  ios_icon_name="key.fill"
                  android_material_icon_name="vpn_key"
                  size={40}
                  color={colors.primary}
                />
              </View>
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Imposta Nuova Password</Text>
              <Text style={styles.subtitle}>
                Scegli una password sicura per il tuo account
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Nuova Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Almeno 8 caratteri"
                  placeholderTextColor={colors.textTertiary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  autoFocus
                  editable={!loading}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowPassword(!showPassword);
                  }}
                  disabled={loading}
                >
                  <IconSymbol
                    ios_icon_name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                    android_material_icon_name={showPassword ? 'visibility_off' : 'visibility'}
                    size={22}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Conferma Password</Text>
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
                  styles.updateButton,
                  (pressed || loading) && styles.updateButtonPressed,
                ]}
                onPress={handleUpdatePassword}
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
                    <Text style={styles.updateButtonText}>
                      Aggiorna Password
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
                Dopo aver aggiornato la password, dovrai effettuare nuovamente l&apos;accesso con le nuove credenziali.
              </Text>
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
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
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
  updateButton: {
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
  updateButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
});
