
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import React, { useState, useEffect, useCallback } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'consumer' | 'supplier' | 'pickup_point' | 'admin';
  pickup_point_id?: string;
}

export default function AdminEditUserScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error loading user profile:', profileError);
        Alert.alert('Errore', 'Impossibile caricare il profilo utente');
        router.back();
        return;
      }

      setUser(profile);
      setName(profile.full_name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
    } catch (error) {
      console.error('Exception loading user data:', error);
      Alert.alert('Errore', 'Errore imprevisto durante il caricamento');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleUpdateName = async () => {
    if (!name.trim()) {
      Alert.alert('Errore', 'Il nome non può essere vuoto');
      return;
    }

    if (name === user?.full_name) {
      Alert.alert('Info', 'Il nome non è cambiato');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNameLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating name:', error);
        Alert.alert('Errore', 'Impossibile aggiornare il nome');
        return;
      }

      Alert.alert('Successo', 'Nome aggiornato con successo');
      console.log('Name updated successfully');
      
      // Reload user data
      await loadUserData();
    } catch (error) {
      console.error('Exception updating name:', error);
      Alert.alert('Errore', 'Errore imprevisto durante l\'aggiornamento');
    } finally {
      setNameLoading(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (!phone.trim()) {
      Alert.alert('Errore', 'Il telefono non può essere vuoto');
      return;
    }

    if (phone === user?.phone) {
      Alert.alert('Info', 'Il telefono non è cambiato');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhoneLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating phone:', error);
        Alert.alert('Errore', 'Impossibile aggiornare il telefono');
        return;
      }

      Alert.alert('Successo', 'Telefono aggiornato con successo');
      console.log('Phone updated successfully');
      
      // Reload user data
      await loadUserData();
    } catch (error) {
      console.error('Exception updating phone:', error);
      Alert.alert('Errore', 'Errore imprevisto durante l\'aggiornamento');
    } finally {
      setPhoneLoading(false);
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
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Errore', 'Sessione non valida. Effettua nuovamente il login.');
        return;
      }

      // Call the Edge Function to update email
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/admin-update-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: userId,
            email: email,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('Error updating email:', result.error);
        Alert.alert('Errore', result.error || 'Impossibile aggiornare l\'email');
        return;
      }

      console.log('Email updated successfully:', result);
      Alert.alert('Successo', 'Email aggiornata con successo');
      
      // Reload user data
      await loadUserData();
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
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Errore', 'Sessione non valida. Effettua nuovamente il login.');
        return;
      }

      // Call the Edge Function to update password
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/admin-update-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: userId,
            password: newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('Error updating password:', result.error);
        Alert.alert('Errore', result.error || 'Impossibile aggiornare la password');
        return;
      }

      console.log('Password updated successfully:', result);
      Alert.alert('Successo', 'Password aggiornata con successo');
      
      // Clear password fields
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Exception updating password:', error);
      Alert.alert('Errore', 'Errore imprevisto durante l\'aggiornamento della password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Modifica Utente',
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={64}
            color="#FF3B30"
          />
          <Text style={styles.errorText}>Utente non trovato</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Torna Indietro</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Modifica Utente',
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
          {/* User Info Header */}
          <View style={styles.headerSection}>
            <View style={styles.headerIconContainer}>
              <IconSymbol
                ios_icon_name="person.circle.fill"
                android_material_icon_name="account_circle"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text style={styles.headerTitle}>{user.full_name || 'Utente'}</Text>
            <Text style={styles.headerSubtitle}>{user.email}</Text>
          </View>

          {/* Name Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nome Completo</Text>
            <Text style={styles.sectionDescription}>
              Aggiorna il nome visualizzato dell&apos;utente
            </Text>
            
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nome completo"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
            />

            <Pressable
              style={[styles.button, nameLoading && styles.buttonDisabled]}
              onPress={handleUpdateName}
              disabled={nameLoading}
            >
              {nameLoading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.buttonText}>Aggiorna Nome</Text>
              )}
            </Pressable>
          </View>

          {/* Phone Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Telefono</Text>
            <Text style={styles.sectionDescription}>
              Aggiorna il numero di telefono dell&apos;utente
            </Text>
            
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Numero di telefono"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />

            <Pressable
              style={[styles.button, phoneLoading && styles.buttonDisabled]}
              onPress={handleUpdatePhone}
              disabled={phoneLoading}
            >
              {phoneLoading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.buttonText}>Aggiorna Telefono</Text>
              )}
            </Pressable>
          </View>

          {/* Email Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email</Text>
            <Text style={styles.sectionDescription}>
              Cambia l&apos;indirizzo email dell&apos;utente
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
              Cambia la password di accesso dell&apos;utente
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
                <Text style={styles.infoTitle}>Informazioni Amministratore</Text>
                <Text style={styles.infoText}>
                  - Come amministratore puoi modificare tutti i dati dell&apos;utente{'\n'}
                  - Le modifiche all&apos;email sono immediate{'\n'}
                  - La password deve essere di almeno 6 caratteri{'\n'}
                  - L&apos;utente potrà accedere immediatamente con i nuovi dati
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  headerSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIconContainer: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
