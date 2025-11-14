
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

export default function LoginScreen() {
  const { login, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect if already logged in
    if (user && !authLoading) {
      console.log('User already logged in, redirecting...', user.role);
      if (user.role === 'consumer') {
        router.replace('/(tabs)/(home)');
      } else if (user.role === 'supplier') {
        router.replace('/supplier/dashboard');
      } else if (user.role === 'pickup_point') {
        router.replace('/pickup-point/dashboard');
      } else if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      }
    }
  }, [user, authLoading]);

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
        
        if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Email non confermata. Controlla la tua casella di posta e clicca sul link di conferma.';
        } else if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Email o password non corretti. Riprova.';
        } else if (errorMessage.includes('Email not found')) {
          errorMessage = 'Account non trovato. Registrati per creare un nuovo account.';
        }
        
        Alert.alert('Errore di Login', errorMessage);
      }
    } catch (error) {
      console.error('Login: Exception:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore durante il login. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterConsumer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/register/consumer');
  };

  const handleRegisterSupplier = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/register/supplier');
  };

  const handleRegisterPickupPoint = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/pickup-point/register');
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
                editable={!loading}
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
                editable={!loading}
              />

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

              <Pressable
                style={({ pressed }) => [
                  styles.registerCard,
                  pressed && styles.registerCardPressed,
                ]}
                onPress={handleRegisterSupplier}
                disabled={loading}
              >
                <View style={styles.registerCardIcon}>
                  <IconSymbol
                    ios_icon_name="building.2.fill"
                    android_material_icon_name="store"
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.registerCardContent}>
                  <Text style={styles.registerCardTitle}>Fornitore</Text>
                  <Text style={styles.registerCardDescription}>
                    Carica prodotti e gestisci ordini
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
                  styles.registerCard,
                  pressed && styles.registerCardPressed,
                ]}
                onPress={handleRegisterPickupPoint}
                disabled={loading}
              >
                <View style={styles.registerCardIcon}>
                  <IconSymbol
                    ios_icon_name="mappin.circle.fill"
                    android_material_icon_name="location_on"
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.registerCardContent}>
                  <Text style={styles.registerCardTitle}>Punto di Ritiro</Text>
                  <Text style={styles.registerCardDescription}>
                    Gestisci ritiri e guadagna commissioni
                  </Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron_right"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
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
    marginBottom: 12,
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
