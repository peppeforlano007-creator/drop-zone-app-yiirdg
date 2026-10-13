
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

export default function AdminLoginScreen() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Redirect if already logged in
    if (user && !authLoading) {
      console.log('User already logged in, redirecting...', user.role);
      if (user.role === 'consumer') {
        router.replace('/(tabs)/drops');
      } else if (user.role === 'pickup_point') {
        router.replace('/pickup-point/dashboard');
      } else if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      }
    }
  }, [user, authLoading]);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Errore', 'Inserisci l\'indirizzo email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Email Non Valida', 'Inserisci un indirizzo email valido');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Errore', 'Inserisci la password');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      console.log('Admin login attempt with email:', email);
      
      // First check if this email belongs to an admin or pickup_point user
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email, role, full_name, user_id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (userError) {
        console.error('Error finding user by email:', userError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Errore di Accesso',
          'Si è verificato un errore durante la ricerca dell\'utente. Riprova.'
        );
        setLoading(false);
        return;
      }

      if (!userData) {
        console.log('No user found with email:', email);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Errore di Accesso',
          'Email non trovata. Verifica di aver inserito l\'email corretta.'
        );
        setLoading(false);
        return;
      }

      // Check if user is admin or pickup_point
      if (userData.role !== 'admin' && userData.role !== 'pickup_point') {
        console.log('User is not admin or pickup_point, role:', userData.role);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Accesso Negato',
          'Questo account non ha i permessi per accedere a questa sezione. Gli utenti consumer devono utilizzare il login principale con numero di cellulare.'
        );
        setLoading(false);
        return;
      }

      console.log('User found in profiles:', {
        user_id: userData.user_id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
      });

      // Now authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (authError) {
        console.error('Error logging in:', authError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        let errorMessage = authError.message;
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('credentials')) {
          errorMessage = 'Email o password non corretti. Riprova.';
        } else if (errorMessage.toLowerCase().includes('email not confirmed')) {
          errorMessage = 'Verifica la tua email prima di accedere. Controlla la tua casella di posta.';
        }
        
        Alert.alert('Errore di Accesso', errorMessage);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('Login successful, role:', userData.role);
        // Navigation will be handled by useEffect when user state updates
      }
    } catch (error) {
      console.error('Exception during login:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore durante l\'accesso. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToUserLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
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
            {/* Back button */}
            <Pressable
              style={styles.backButtonTop}
              onPress={handleBackToUserLogin}
              disabled={loading}
            >
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="chevron-left"
                size={24}
                color={colors.text}
              />
            </Pressable>

            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <IconSymbol
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="admin-panel-settings"
                  size={48}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.title}>Accesso Amministratori</Text>
              <Text style={styles.subtitle}>
                Area riservata per amministratori e punti di ritiro
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@example.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />

              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Inserisci la tua password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
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

              <Pressable
                style={({ pressed }) => [
                  styles.loginButton,
                  (pressed || loading) && styles.loginButtonPressed,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="arrow.right.circle.fill"
                      android_material_icon_name="login"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.loginButtonText}>Accedi</Text>
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
                <Text style={styles.infoTextBold}>Nota:</Text> Questa sezione è riservata esclusivamente agli amministratori e ai punti di ritiro. 
                Se sei un utente consumer, torna alla pagina di login principale e accedi con il tuo numero di cellulare.
              </Text>
            </View>

            <View style={styles.warningBox}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={18}
                color={colors.warning}
              />
              <Text style={styles.warningText}>
                Le credenziali di accesso per amministratori e punti di ritiro vengono fornite dall&apos;amministratore del sistema. 
                Se non hai ricevuto le tue credenziali, contatta il supporto.
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
  backButtonTop: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  header: {
    marginBottom: 32,
    marginTop: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.info + '30',
    gap: 12,
    marginBottom: 16,
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
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
});
