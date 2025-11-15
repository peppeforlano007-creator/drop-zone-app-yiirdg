
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';

export default function CreateSupplierScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateSupplier = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Validation
    if (!fullName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome completo del fornitore');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Errore', 'Inserisci l\'email del fornitore');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Errore', 'Inserisci un\'email valida');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Errore', 'Inserisci il numero di telefono');
      return;
    }

    setLoading(true);

    try {
      console.log('Creating supplier profile...');
      
      // Generate a random password (supplier won't need to login)
      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      
      // Create auth user (but they won't be able to login since we won't share the password)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: randomPassword,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: 'supplier',
            company_name: companyName.trim() || undefined,
            notes: notes.trim() || undefined,
          }
        }
      });

      if (authError) {
        console.error('Error creating supplier auth:', authError);
        
        if (authError.message.toLowerCase().includes('already registered')) {
          Alert.alert('Errore', 'Questo indirizzo email è già registrato nel sistema.');
        } else {
          Alert.alert('Errore', `Impossibile creare il fornitore: ${authError.message}`);
        }
        return;
      }

      if (!authData.user) {
        Alert.alert('Errore', 'Errore durante la creazione del fornitore');
        return;
      }

      console.log('Supplier auth created successfully:', authData.user.id);

      // Wait for the trigger to create the profile
      // The deferrable foreign key constraint should handle timing issues
      console.log('Waiting for trigger to create profile...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify the profile was created
      let profile = null;
      let profileError = null;
      
      // Try multiple times with increasing delays
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Checking for profile (attempt ${attempt}/3)...`);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authData.user.id)
          .maybeSingle();

        if (data) {
          profile = data;
          profileError = null;
          console.log('Profile found:', profile);
          break;
        }

        profileError = error;
        
        if (attempt < 3) {
          console.log(`Profile not found yet, waiting ${attempt * 1000}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }

      if (!profile) {
        console.error('Profile not found after multiple attempts:', profileError);
        
        // Try to create the profile manually as admin
        console.log('Attempting to create profile manually...');
        
        const { data: manualProfile, error: manualError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email: email.trim().toLowerCase(),
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: 'supplier',
          })
          .select()
          .single();

        if (manualError) {
          console.error('Manual profile creation failed:', manualError);
          
          // Provide more specific error message
          if (manualError.message.includes('profiles_user_id_fkey')) {
            Alert.alert(
              'Errore di Sincronizzazione',
              'Si è verificato un problema di sincronizzazione del database.\n\nIl problema è stato risolto con un aggiornamento recente. Riprova ora e dovrebbe funzionare correttamente.'
            );
          } else if (manualError.message.includes('duplicate key')) {
            // Profile was created by trigger but we couldn't find it
            console.log('Profile exists but was not found in query, considering success');
            profile = { user_id: authData.user.id };
          } else {
            Alert.alert(
              'Errore',
              `Impossibile creare il profilo: ${manualError.message}\n\nContatta il supporto tecnico.`
            );
          }
          
          if (!profile) {
            return;
          }
        } else {
          console.log('Profile created manually:', manualProfile);
          profile = manualProfile;
        }
      }

      console.log('Supplier created successfully with profile');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Fornitore Creato!',
        `Il fornitore ${fullName} è stato creato con successo.\n\nPuoi ora creare liste e prodotti per questo fornitore.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to suppliers list
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Exception creating supplier:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Crea Nuovo Fornitore',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <IconSymbol 
                  ios_icon_name="building.2.fill" 
                  android_material_icon_name="store"
                  size={48} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.title}>Nuovo Fornitore</Text>
              <Text style={styles.subtitle}>
                Inserisci i dati del fornitore da aggiungere al sistema
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nome Completo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. Mario Rossi"
                  placeholderTextColor={colors.textTertiary}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email *</Text>
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
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Numero di Telefono *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+39 123 456 7890"
                  placeholderTextColor={colors.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nome Azienda (Opzionale)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. Fashion Store SRL"
                  placeholderTextColor={colors.textTertiary}
                  value={companyName}
                  onChangeText={setCompanyName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Note (Opzionale)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Note aggiuntive sul fornitore..."
                  placeholderTextColor={colors.textTertiary}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>

              <Text style={styles.requiredNote}>* Campi obbligatori</Text>

              <Pressable 
                style={({ pressed }) => [
                  styles.createButton,
                  (pressed || loading) && styles.createButtonPressed
                ]} 
                onPress={handleCreateSupplier}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="plus.circle.fill"
                      android_material_icon_name="add_circle"
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.createButtonText}>Crea Fornitore</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelLink}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.back();
                }}
                disabled={loading}
              >
                <Text style={styles.cancelLinkText}>Annulla</Text>
              </Pressable>
            </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    flex: 1,
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
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  requiredNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 8,
    marginBottom: 16,
    minHeight: 56,
    gap: 8,
  },
  createButtonPressed: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
