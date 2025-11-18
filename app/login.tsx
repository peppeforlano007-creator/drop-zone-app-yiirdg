
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
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';

export default function LoginScreen() {
  const { login, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

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

  const handleResendConfirmationEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Errore', 'Inserisci l\'email per ricevere nuovamente l\'email di conferma');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setResendingEmail(true);

    try {
      console.log('Resending confirmation email to:', email);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed'
        }
      });

      if (error) {
        console.error('Error resending confirmation email:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Errore',
          'Impossibile inviare l\'email di conferma. Verifica che l\'indirizzo email sia corretto.'
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Email Inviata!',
          'Abbiamo inviato nuovamente l\'email di conferma. Controlla la tua casella di posta (anche nello spam).',
          [{ text: 'OK' }]
        );
        setShowResendEmail(false);
      }
    } catch (error) {
      console.error('Exception resending confirmation email:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto. Riprova.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Errore', 'Inserisci l\'email');
      return;
    }

    if (!password) {
      Alert.alert('Errore', 'Inserisci la password');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setShowResendEmail(false);

    try {
      console.log('Login: Attempting login for:', email);
      const result = await login(email.trim().toLowerCase(), password);
      
      console.log('Login: Result:', result);
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('Login: Success, waiting for profile to load...');
        // Navigation will be handled by useEffect when user state updates
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.error('Login: Failed:', result.message);
        
        // Show more user-friendly error messages
        let errorMessage = result.message || 'Credenziali non valide';
        let showResend = false;
        
        // Check for email not confirmed error
        if (errorMessage.toLowerCase().includes('email not confirmed') || 
            errorMessage.toLowerCase().includes('email confirmation')) {
          errorMessage = 'La tua email non è stata ancora confermata.\n\nControlla la tua casella di posta e clicca sul link di conferma che ti abbiamo inviato.\n\nNon hai ricevuto l\'email?';
          showResend = true;
        } else if (errorMessage.toLowerCase().includes('invalid login credentials') ||
                   errorMessage.toLowerCase().includes('invalid credentials')) {
          errorMessage = 'Email o password non corretti.\n\nVerifica i tuoi dati e riprova.';
        } else if (errorMessage.toLowerCase().includes('email not found') ||
                   errorMessage.toLowerCase().includes('user not found')) {
          errorMessage = 'Account non trovato.\n\nRegistrati per creare un nuovo account.';
        }
        
        if (showResend) {
          Alert.alert(
            'Email Non Confermata',
            errorMessage,
            [
              {
                text: 'Annulla',
                style: 'cancel',
              },
              {
                text: 'Invia Nuovamente',
                onPress: () => {
                  setShowResendEmail(true);
                  handleResendConfirmationEmail();
                },
              },
            ]
          );
        } else {
          Alert.alert('Errore di Login', errorMessage);
        }
      }
    } catch (error) {
      console.error('Login: Exception:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore durante il login. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/forgot-password');
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
              <Text style={styles.subtitle}>Accedi per continuare</Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="email@esempio.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading && !resendingEmail}
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="La tua password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading && !resendingEmail}
              />

              <Pressable
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
                disabled={loading || resendingEmail}
              >
                <Text style={styles.forgotPasswordText}>
                  Hai dimenticato la password?
                </Text>
              </Pressable>

              {showResendEmail && (
                <Pressable
                  style={({ pressed }) => [
                    styles.resendButton,
                    (pressed || resendingEmail) && styles.resendButtonPressed,
                  ]}
                  onPress={handleResendConfirmationEmail}
                  disabled={resendingEmail}
                >
                  {resendingEmail ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <>
                      <IconSymbol
                        ios_icon_name="envelope.fill"
                        android_material_icon_name="email"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.resendButtonText}>
                        Invia Nuovamente Email di Conferma
                      </Text>
                    </>
                  )}
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.loginButton,
                  (pressed || loading || resendingEmail) && styles.loginButtonPressed,
                ]}
                onPress={handleLogin}
                disabled={loading || resendingEmail}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Accedi</Text>
                )}
              </Pressable>
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
                disabled={loading || resendingEmail}
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
                  <Text style={styles.registerCardTitle}>Consumatore</Text>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    minHeight: 52,
  },
  resendButtonPressed: {
    opacity: 0.7,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 56,
    justifyContent: 'center',
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
    lineHeight: 18,
  },
});
