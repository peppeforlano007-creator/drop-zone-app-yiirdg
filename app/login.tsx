
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

  const handleRegister = () => {
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

              <Pressable
                style={({ pressed }) => [
                  styles.registerButton,
                  pressed && styles.registerButtonPressed,
                ]}
                onPress={handleRegister}
                disabled={loading}
              >
                <Text style={styles.registerButtonText}>
                  Non hai un account? Registrati
                </Text>
              </Pressable>
            </View>

            <View style={styles.roleInfo}>
              <Text style={styles.roleInfoTitle}>Tipi di Account</Text>
              <View style={styles.roleInfoItem}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.roleInfoText}>
                  <Text style={styles.roleInfoBold}>Consumatore:</Text> Prenota prodotti e partecipa ai drop
                </Text>
              </View>
              <View style={styles.roleInfoItem}>
                <IconSymbol
                  ios_icon_name="building.2.fill"
                  android_material_icon_name="store"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.roleInfoText}>
                  <Text style={styles.roleInfoBold}>Fornitore:</Text> Carica prodotti e gestisci ordini
                </Text>
              </View>
              <View style={styles.roleInfoItem}>
                <IconSymbol
                  ios_icon_name="mappin.circle.fill"
                  android_material_icon_name="location_on"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.roleInfoText}>
                  <Text style={styles.roleInfoBold}>Punto di Ritiro:</Text> Gestisci ritiri e guadagna commissioni
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
    marginBottom: 32,
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
    marginBottom: 12,
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
  registerButton: {
    padding: 12,
    alignItems: 'center',
  },
  registerButtonPressed: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 14,
    color: colors.primary,
  },
  roleInfo: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  roleInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  roleInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  roleInfoBold: {
    fontWeight: '600',
    color: colors.text,
  },
});
