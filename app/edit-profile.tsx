
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import React, { useState } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateName = async () => {
    if (!name.trim()) {
      Alert.alert('Errore', 'Il nome non può essere vuoto');
      return;
    }

    if (name === user?.name) {
      Alert.alert('Info', 'Il nome non è cambiato');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating name:', error);
        Alert.alert('Errore', 'Impossibile aggiornare il nome');
        return;
      }

      Alert.alert('Successo', 'Nome aggiornato con successo');
      console.log('Name updated successfully');
    } catch (error) {
      console.error('Exception updating name:', error);
      Alert.alert('Errore', 'Errore imprevisto durante l\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Errore', 'L\'email non può essere vuota');
      return;
    }

    if (email === user?.email) {
      Alert.alert('Info', 'L\'email non è cambiata');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Errore', 'Inserisci un\'email valida');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEmailLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        email: email,
      });

      if (error) {
        console.error('Error updating email:', error);
        Alert.alert('Errore', error.message || 'Impossibile aggiornare l\'email');
        return;
      }

      console.log('Email update initiated:', data);
      Alert.alert(
        'Conferma Email',
        'Ti abbiamo inviato un\'email di conferma al nuovo indirizzo. Clicca sul link nell\'email per completare il cambio.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Exception updating email:', error);
      Alert.alert('Errore', 'Errore imprevisto durante l\'aggiornamento dell\'email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Errore', 'Compila tutti i campi della password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Errore', 'La nuova password deve essere di almeno 6 caratteri');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Errore', 'Le password non corrispondono');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPasswordLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Error updating password:', error);
        Alert.alert('Errore', error.message || 'Impossibile aggiornare la password');
        return;
      }

      console.log('Password updated successfully:', data);
      Alert.alert('Successo', 'Password aggiornata con successo');
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Exception updating password:', error);
      Alert.alert('Errore', 'Errore imprevisto durante l\'aggiornamento della password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Modifica Profilo',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Name Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nome</Text>
            <Text style={styles.sectionDescription}>
              Aggiorna il tuo nome visualizzato
            </Text>
            
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Il tuo nome"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
            />

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleUpdateName}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.buttonText}>Aggiorna Nome</Text>
              )}
            </Pressable>
          </View>

          {/* Email Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email</Text>
            <Text style={styles.sectionDescription}>
              Cambia il tuo indirizzo email. Riceverai un&apos;email di conferma al nuovo indirizzo.
            </Text>
            
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nuova@email.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              style={[styles.button, emailLoading && styles.buttonDisabled]}
              onPress={handleUpdateEmail}
              disabled={emailLoading}
            >
              {emailLoading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.buttonText}>Aggiorna Email</Text>
              )}
            </Pressable>
          </View>

          {/* Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Password</Text>
            <Text style={styles.sectionDescription}>
              Cambia la tua password di accesso
            </Text>

            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nuova password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Conferma nuova password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              style={[styles.button, passwordLoading && styles.buttonDisabled]}
              onPress={handleUpdatePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.buttonText}>Aggiorna Password</Text>
              )}
            </Pressable>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <IconSymbol 
                ios_icon_name="info.circle.fill" 
                android_material_icon_name="info" 
                size={24} 
                color={colors.text} 
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Informazioni Importanti</Text>
                <Text style={styles.infoText}>
                  - Il cambio email richiede conferma tramite link inviato alla nuova email{'\n'}
                  - La password deve essere di almeno 6 caratteri{'\n'}
                  - Dopo il cambio password, rimarrai connesso su questo dispositivo
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.text,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  infoSection: {
    padding: 24,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
