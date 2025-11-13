
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
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { UserRole } from '@/types/User';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState } from 'react';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const handleRoleSelect = (role: UserRole) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRole(role);
  };

  const handleLogin = () => {
    if (!selectedRole) {
      Alert.alert('Errore', 'Seleziona un ruolo');
      return;
    }

    if (selectedRole === 'consumer' && !phone) {
      Alert.alert('Errore', 'Inserisci il numero di telefono');
      return;
    }

    if ((selectedRole === 'supplier' || selectedRole === 'pickup-point' || selectedRole === 'admin') && (!username || !email)) {
      Alert.alert('Errore', 'Inserisci username e email');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    login(selectedRole, phone, username, email);

    if (selectedRole === 'consumer') {
      router.replace('/(tabs)/(home)');
    } else if (selectedRole === 'supplier') {
      router.replace('/supplier/dashboard');
    } else if (selectedRole === 'pickup-point') {
      router.replace('/pickup-point/dashboard');
    } else if (selectedRole === 'admin') {
      router.replace('/admin/dashboard');
    }
  };

  const handleRegister = () => {
    if (!selectedRole) {
      Alert.alert('Errore', 'Seleziona un ruolo');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedRole === 'consumer') {
      router.push('/register/consumer');
    } else if (selectedRole === 'supplier') {
      router.push('/register/supplier');
    } else if (selectedRole === 'pickup-point') {
      router.push('/pickup-point/register');
    } else if (selectedRole === 'admin') {
      Alert.alert('Info', 'Gli account admin vengono creati dal sistema');
    }
  };

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

            <View style={styles.roleSection}>
              <Text style={styles.sectionTitle}>Seleziona il tuo ruolo</Text>
              <View style={styles.roleGrid}>
                <Pressable
                  style={({ pressed }) => [
                    styles.roleCard,
                    selectedRole === 'consumer' && styles.roleCardSelected,
                    pressed && styles.roleCardPressed,
                  ]}
                  onPress={() => handleRoleSelect('consumer')}
                >
                  <IconSymbol
                    ios_icon_name="person.fill"
                    android_material_icon_name="person"
                    size={32}
                    color={selectedRole === 'consumer' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleTitle,
                      selectedRole === 'consumer' && styles.roleTitleSelected,
                    ]}
                  >
                    Consumatore
                  </Text>
                  <Text style={styles.roleDescription}>
                    Prenota prodotti e partecipa ai drop
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.roleCard,
                    selectedRole === 'supplier' && styles.roleCardSelected,
                    pressed && styles.roleCardPressed,
                  ]}
                  onPress={() => handleRoleSelect('supplier')}
                >
                  <IconSymbol
                    ios_icon_name="building.2.fill"
                    android_material_icon_name="store"
                    size={32}
                    color={selectedRole === 'supplier' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleTitle,
                      selectedRole === 'supplier' && styles.roleTitleSelected,
                    ]}
                  >
                    Fornitore
                  </Text>
                  <Text style={styles.roleDescription}>
                    Carica prodotti e gestisci ordini
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.roleCard,
                    selectedRole === 'pickup-point' && styles.roleCardSelected,
                    pressed && styles.roleCardPressed,
                  ]}
                  onPress={() => handleRoleSelect('pickup-point')}
                >
                  <IconSymbol
                    ios_icon_name="mappin.circle.fill"
                    android_material_icon_name="location_on"
                    size={32}
                    color={selectedRole === 'pickup-point' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleTitle,
                      selectedRole === 'pickup-point' && styles.roleTitleSelected,
                    ]}
                  >
                    Punto di Ritiro
                  </Text>
                  <Text style={styles.roleDescription}>
                    Gestisci ritiri e guadagna commissioni
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.roleCard,
                    selectedRole === 'admin' && styles.roleCardSelected,
                    pressed && styles.roleCardPressed,
                  ]}
                  onPress={() => handleRoleSelect('admin')}
                >
                  <IconSymbol
                    ios_icon_name="shield.fill"
                    android_material_icon_name="admin_panel_settings"
                    size={32}
                    color={selectedRole === 'admin' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleTitle,
                      selectedRole === 'admin' && styles.roleTitleSelected,
                    ]}
                  >
                    Amministratore
                  </Text>
                  <Text style={styles.roleDescription}>
                    Gestisci drop e utenti
                  </Text>
                </Pressable>
              </View>
            </View>

            {selectedRole && (
              <View style={styles.formSection}>
                {selectedRole === 'consumer' ? (
                  <>
                    <Text style={styles.inputLabel}>Numero di Telefono</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+39 123 456 7890"
                      placeholderTextColor={colors.textTertiary}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Username</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Il tuo username"
                      placeholderTextColor={colors.textTertiary}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />

                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="email@esempio.com"
                      placeholderTextColor={colors.textTertiary}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.loginButton,
                    pressed && styles.loginButtonPressed,
                  ]}
                  onPress={handleLogin}
                >
                  <Text style={styles.loginButtonText}>Accedi</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.registerButton,
                    pressed && styles.registerButtonPressed,
                  ]}
                  onPress={handleRegister}
                >
                  <Text style={styles.registerButtonText}>
                    Non hai un account? Registrati
                  </Text>
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
  roleSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  roleCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  roleTitleSelected: {
    color: colors.primary,
  },
  roleDescription: {
    fontSize: 11,
    color: colors.textSecondary,
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
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
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
});
