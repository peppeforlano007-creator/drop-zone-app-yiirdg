
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
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Errore', 'Inserisci il tuo indirizzo email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Errore', 'Inserisci un indirizzo email valido');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      console.log('Sending password reset email to:', email);
      
      // Use the Supabase project URL as the redirect
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: 'https://sippdylyuzejudmzbwdn.supabase.co/auth/v1/verify?redirect_to=dropzone://update-password',
        }
      );

      if (error) {
        console.error('Error sending password reset email:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        // Show user-friendly error message
        let errorMessage = 'Si è verificato un errore durante l\'invio dell\'email di recupero password.';
        
        if (error.message.toLowerCase().includes('rate limit')) {
          errorMessage = 'Hai richiesto troppi reset password. Attendi qualche minuto e riprova.';
        } else if (error.message.toLowerCase().includes('user not found')) {
          // For security reasons, we don't want to reveal if an email exists or not
          // So we'll show success message anyway
          setEmailSent(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
        
        Alert.alert('Errore', errorMessage);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEmailSent(true);
        console.log('Password reset email sent successfully');
      }
    } catch (error) {
      console.error('Exception sending password reset email:', error);
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
          title: 'Recupera Password',
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
            {!emailSent ? (
              <>
                <View style={styles.iconContainer}>
                  <View style={styles.iconCircle}>
                    <IconSymbol
                      ios_icon_name="lock.fill"
                      android_material_icon_name="lock"
                      size={40}
                      color={colors.primary}
                    />
                  </View>
                </View>

                <View style={styles.header}>
                  <Text style={styles.title}>Recupera Password</Text>
                  <Text style={styles.subtitle}>
                    Inserisci il tuo indirizzo email e ti invieremo un link per reimpostare la tua password.
                  </Text>
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
                    autoFocus
                    editable={!loading}
                  />

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
                          ios_icon_name="paperplane.fill"
                          android_material_icon_name="send"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.resetButtonText}>
                          Invia Link di Recupero
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
                    Riceverai un&apos;email con le istruzioni per reimpostare la tua password. 
                    Controlla anche la cartella spam se non la trovi nella posta in arrivo.
                    {'\n\n'}
                    <Text style={styles.infoTextBold}>Importante:</Text> Il link scadrà dopo 1 ora. 
                    Clicca sul link nell&apos;email il prima possibile.
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
              </>
            ) : (
              <>
                <View style={styles.iconContainer}>
                  <View style={[styles.iconCircle, styles.successIconCircle]}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check_circle"
                      size={48}
                      color={colors.success}
                    />
                  </View>
                </View>

                <View style={styles.header}>
                  <Text style={styles.title}>Email Inviata!</Text>
                  <Text style={styles.subtitle}>
                    Abbiamo inviato un link per il recupero della password all&apos;indirizzo:
                  </Text>
                  <Text style={styles.emailText}>{email}</Text>
                </View>

                <View style={styles.successBox}>
                  <IconSymbol
                    ios_icon_name="envelope.fill"
                    android_material_icon_name="email"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.successText}>
                    Controlla la tua casella di posta e clicca sul link per reimpostare la password.
                  </Text>
                </View>

                <View style={styles.warningBox}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle.fill"
                    android_material_icon_name="warning"
                    size={20}
                    color={colors.warning}
                  />
                  <Text style={styles.warningText}>
                    <Text style={styles.warningTextBold}>Attenzione:</Text> Il link scadrà dopo 1 ora. 
                    Clicca sul link nell&apos;email il prima possibile per reimpostare la password.
                  </Text>
                </View>

                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionsTitle}>Cosa fare ora:</Text>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionNumber}>1.</Text>
                    <Text style={styles.instructionText}>
                      Apri la tua casella email
                    </Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionNumber}>2.</Text>
                    <Text style={styles.instructionText}>
                      Cerca l&apos;email di recupero password (controlla anche lo spam)
                    </Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionNumber}>3.</Text>
                    <Text style={styles.instructionText}>
                      Clicca sul link <Text style={styles.instructionTextBold}>entro 1 ora</Text>
                    </Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.instructionNumber}>4.</Text>
                    <Text style={styles.instructionText}>
                      L&apos;app si aprirà automaticamente per reimpostare la password
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.doneButton,
                    pressed && styles.doneButtonPressed,
                  ]}
                  onPress={handleBackToLogin}
                >
                  <Text style={styles.doneButtonText}>
                    Torna al Login
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.resendLinkButton}
                  onPress={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                >
                  <Text style={styles.resendLinkText}>
                    Non hai ricevuto l&apos;email? Riprova
                  </Text>
                </Pressable>
              </>
            )}
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
  successIconCircle: {
    backgroundColor: colors.success + '15',
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
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
    textAlign: 'center',
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: 16,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    gap: 12,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  warningTextBold: {
    fontWeight: '700',
    color: colors.warning,
  },
  instructionsBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  instructionNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    width: 24,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  instructionTextBold: {
    fontWeight: '700',
    color: colors.warning,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  doneButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resendLinkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
