
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

    if (selectedRole === 'consumer' && !phoneNumber) {
      Alert.alert('Errore', 'Inserisci il numero di telefono');
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

            {/* Register Pickup Point Link */}
            <Pressable
              style={styles.registerLink}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/pickup-point/register');
              }}
            >
              <IconSymbol name="plus.circle.fill" size={20} color={colors.text} />
              <Text style={styles.registerLinkText}>
                Vuoi diventare un punto di ritiro? Registrati qui
              </Text>
            </Pressable>

            {/* Phone Input for Consumer */}
            {selectedRole === 'consumer' && (
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
            )}

            {/* Login Button */}
            {selectedRole && (
              <Pressable
                style={styles.loginButton}
                onPress={handleLogin}
              >
                <Text style={styles.loginButtonText}>Accedi</Text>
              </Pressable>
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
  inputContainer: {
    marginBottom: 32,
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
    marginTop: 'auto',
  },
  loginButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  registerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
});
