
import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { UserRole } from '@/types/User';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleRoleSelect = (role: UserRole) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRole(role);
    console.log('Selected role:', role);
  };

  const handleLogin = () => {
    if (!selectedRole) {
      Alert.alert('Errore', 'Seleziona un tipo di accesso');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Errore', 'Inserisci il numero di telefono');
      return;
    }

    if (!password) {
      Alert.alert('Errore', 'Inserisci la password');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    login(selectedRole, phoneNumber);
    
    console.log('Login successful, redirecting...');
    
    // Redirect based on role
    if (selectedRole === 'consumer') {
      router.replace('/(tabs)/(home)');
    } else if (selectedRole === 'supplier') {
      router.replace('/supplier/dashboard');
    } else if (selectedRole === 'pickup-point') {
      router.replace('/pickup-point/dashboard');
    }
  };

  const handleRegister = () => {
    if (!selectedRole) {
      Alert.alert('Errore', 'Seleziona prima un tipo di accesso');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedRole === 'supplier') {
      router.push('/register/supplier');
    } else if (selectedRole === 'consumer') {
      router.push('/register/consumer');
    } else if (selectedRole === 'pickup-point') {
      router.push('/pickup-point/register');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>DROPMARKET</Text>
              <Text style={styles.tagline}>Il marketplace dei drop</Text>
            </View>

            {/* Role Selection */}
            <View style={styles.rolesContainer}>
              <Text style={styles.sectionTitle}>Seleziona il tipo di accesso</Text>

              {/* Supplier */}
              <Pressable
                style={[
                  styles.roleCard,
                  selectedRole === 'supplier' && styles.roleCardSelected,
                ]}
                onPress={() => handleRoleSelect('supplier')}
              >
                <View style={styles.roleIcon}>
                  <IconSymbol name="briefcase.fill" size={32} color={colors.text} />
                </View>
                <View style={styles.roleContent}>
                  <Text style={styles.roleTitle}>Fornitore</Text>
                  <Text style={styles.roleDescription}>
                    Importa liste prodotti e gestisci i tuoi drop
                  </Text>
                </View>
                {selectedRole === 'supplier' && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.text} />
                )}
              </Pressable>

              {/* Consumer */}
              <Pressable
                style={[
                  styles.roleCard,
                  selectedRole === 'consumer' && styles.roleCardSelected,
                ]}
                onPress={() => handleRoleSelect('consumer')}
              >
                <View style={styles.roleIcon}>
                  <IconSymbol name="person.fill" size={32} color={colors.text} />
                </View>
                <View style={styles.roleContent}>
                  <Text style={styles.roleTitle}>Consumatore</Text>
                  <Text style={styles.roleDescription}>
                    Scopri prodotti e partecipa ai drop
                  </Text>
                </View>
                {selectedRole === 'consumer' && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.text} />
                )}
              </Pressable>

              {/* Pickup Point */}
              <Pressable
                style={[
                  styles.roleCard,
                  selectedRole === 'pickup-point' && styles.roleCardSelected,
                ]}
                onPress={() => handleRoleSelect('pickup-point')}
              >
                <View style={styles.roleIcon}>
                  <IconSymbol name="mappin.circle.fill" size={32} color={colors.text} />
                </View>
                <View style={styles.roleContent}>
                  <Text style={styles.roleTitle}>Punto di Ritiro</Text>
                  <Text style={styles.roleDescription}>
                    Gestisci il tuo punto di ritiro
                  </Text>
                </View>
                {selectedRole === 'pickup-point' && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.text} />
                )}
              </Pressable>
            </View>

            {/* Login Form */}
            {selectedRole && (
              <View style={styles.loginForm}>
                {/* Phone Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Numero di telefono</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+39 123 456 7890"
                    placeholderTextColor={colors.textTertiary}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Inserisci la password"
                    placeholderTextColor={colors.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                  />
                </View>

                {/* Login Button */}
                <Pressable style={styles.loginButton} onPress={handleLogin}>
                  <Text style={styles.loginButtonText}>Accedi</Text>
                </Pressable>

                {/* Register Button */}
                <Pressable style={styles.registerButton} onPress={handleRegister}>
                  <IconSymbol name="person.badge.plus" size={20} color={colors.text} />
                  <Text style={styles.registerButtonText}>Crea un nuovo account</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 2,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  rolesContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  roleCardSelected: {
    borderColor: colors.text,
    backgroundColor: colors.backgroundSecondary,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loginForm: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  loginButton: {
    backgroundColor: colors.text,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  registerButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
