
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
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

export default function RegisterPickupPointScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pointName, setPointName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  const handleResendConfirmationEmail = async () => {
    if (!registeredEmail) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setResendingEmail(true);

    try {
      console.log('Resending confirmation email to:', registeredEmail);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed'
        }
      });

      if (error) {
        console.error('Error resending confirmation email:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Errore',
          'Impossibile inviare l\'email di conferma. Riprova più tardi.'
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Email Inviata!',
          'Abbiamo inviato nuovamente l\'email di conferma. Controlla la tua casella di posta (anche nello spam).',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Exception resending confirmation email:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto. Riprova.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleRegister = async () => {
    console.log('handleRegister called');
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Validation
    if (!fullName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome completo');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Errore', 'Inserisci l\'email');
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

    if (!pointName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome del punto di ritiro');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Errore', 'Inserisci l\'indirizzo');
      return;
    }

    if (!city.trim()) {
      Alert.alert('Errore', 'Inserisci la città');
      return;
    }

    if (!password) {
      Alert.alert('Errore', 'Inserisci la password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Errore', 'La password deve essere di almeno 6 caratteri');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Errore', 'Le password non coincidono');
      return;
    }

    setLoading(true);

    try {
      console.log('Creating pickup point with data:', {
        name: pointName.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        manager_name: fullName.trim(),
        status: 'pending_approval',
      });

      // First, create the pickup point with all required fields
      const { data: pickupPointData, error: pickupPointError } = await supabase
        .from('pickup_points')
        .insert({
          name: pointName.trim(),
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          manager_name: fullName.trim(),
          status: 'pending_approval',
        })
        .select()
        .single();

      if (pickupPointError) {
        console.error('Error creating pickup point:', pickupPointError);
        console.error('Error details:', {
          message: pickupPointError.message,
          details: pickupPointError.details,
          hint: pickupPointError.hint,
          code: pickupPointError.code
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        let errorMessage = 'Impossibile creare il punto di ritiro.';
        
        // Provide more helpful error messages
        if (pickupPointError.message.includes('permission denied') || 
            pickupPointError.message.includes('policy')) {
          errorMessage = 'Errore di permessi. Contatta il supporto.';
        } else if (pickupPointError.message.includes('duplicate') || 
                   pickupPointError.message.includes('unique')) {
          errorMessage = 'Esiste già un punto di ritiro con questi dati.';
        } else if (pickupPointError.message.includes('violates check constraint')) {
          errorMessage = 'I dati inseriti non sono validi. Controlla tutti i campi.';
        } else {
          errorMessage += '\n\nDettagli: ' + pickupPointError.message;
        }
        
        Alert.alert('Errore', errorMessage);
        setLoading(false);
        return;
      }

      console.log('Pickup point created successfully:', pickupPointData.id);

      // Then, register the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed',
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: 'pickup_point',
            pickup_point_id: pickupPointData.id,
          }
        }
      });

      if (authError) {
        console.error('Error registering user:', authError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        // Provide more helpful error messages
        let errorMessage = authError.message;
        
        if (errorMessage.toLowerCase().includes('user already registered') ||
            errorMessage.toLowerCase().includes('already registered')) {
          errorMessage = 'Questo indirizzo email è già registrato.\n\nSe hai dimenticato la password, contatta il supporto.';
        }
        
        Alert.alert('Errore di Registrazione', errorMessage);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Errore', 'Errore durante la registrazione');
        setLoading(false);
        return;
      }

      console.log('User registered successfully:', authData.user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRegisteredEmail(email.trim().toLowerCase());
      
      Alert.alert(
        '✅ Registrazione Completata!',
        'Ti abbiamo inviato un\'email di conferma.\n\n' +
        '📧 Controlla la tua casella di posta (anche nello spam) e clicca sul link per attivare il tuo account.\n\n' +
        '⚠️ Non potrai accedere finché non confermi la tua email.\n\n' +
        '⏳ Il tuo punto di ritiro è in attesa di approvazione da parte dell\'amministratore.\n\n' +
        'Non hai ricevuto l\'email?',
        [
          {
            text: 'Invia Nuovamente',
            onPress: () => {
              handleResendConfirmationEmail();
            },
          },
          {
            text: 'Vai al Login',
            style: 'cancel',
            onPress: () => {
              console.log('Navigating to login...');
              router.replace('/login');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Registration exception:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto: ' + (error instanceof Error ? error.message : 'Errore sconosciuto'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Registrazione Punto di Ritiro',
          headerBackTitle: 'Indietro',
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
                  ios_icon_name="mappin.circle.fill" 
                  android_material_icon_name="location_on"
                  size={48} 
                  color={colors.text} 
                />
              </View>
              <Text style={styles.title}>Diventa Punto di Ritiro</Text>
              <Text style={styles.subtitle}>
                Inserisci i tuoi dati per registrarti come punto di ritiro
              </Text>
            </View>

            {registeredEmail && (
              <View style={styles.emailConfirmationBanner}>
                <IconSymbol
                  ios_icon_name="envelope.badge.fill"
                  android_material_icon_name="mark_email_unread"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.emailConfirmationContent}>
                  <Text style={styles.emailConfirmationTitle}>
                    Email di Conferma Inviata
                  </Text>
                  <Text style={styles.emailConfirmationText}>
                    Controlla {registeredEmail}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.resendIconButton,
                    (pressed || resendingEmail) && styles.resendIconButtonPressed,
                  ]}
                  onPress={handleResendConfirmationEmail}
                  disabled={resendingEmail}
                >
                  {resendingEmail ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <IconSymbol
                      ios_icon_name="arrow.clockwise"
                      android_material_icon_name="refresh"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </Pressable>
              </View>
            )}

            <View style={styles.form}>
              <Text style={styles.sectionTitle}>Informazioni Personali</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nome Completo (Responsabile) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. Mario Rossi"
                  placeholderTextColor={colors.textTertiary}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!loading && !resendingEmail}
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
                  editable={!loading && !resendingEmail}
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
                  editable={!loading && !resendingEmail}
                />
              </View>

              <Text style={styles.sectionTitle}>Informazioni Punto di Ritiro</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nome Punto di Ritiro *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. Negozio Centro"
                  placeholderTextColor={colors.textTertiary}
                  value={pointName}
                  onChangeText={setPointName}
                  autoCapitalize="words"
                  editable={!loading && !resendingEmail}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Indirizzo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Via Roma, 123"
                  placeholderTextColor={colors.textTertiary}
                  value={address}
                  onChangeText={setAddress}
                  autoCapitalize="words"
                  editable={!loading && !resendingEmail}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Città *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Roma"
                  placeholderTextColor={colors.textTertiary}
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                  editable={!loading && !resendingEmail}
                />
              </View>

              <Text style={styles.sectionTitle}>Sicurezza</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Minimo 6 caratteri"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!loading && !resendingEmail}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Conferma Password *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ripeti la password"
                  placeholderTextColor={colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!loading && !resendingEmail}
                />
              </View>

              <Text style={styles.requiredNote}>* Campi obbligatori</Text>

              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.infoText}>
                  Il tuo punto di ritiro sarà sottoposto ad approvazione da parte dell&apos;amministratore prima di essere attivato.
                </Text>
              </View>

              <Pressable 
                style={({ pressed }) => [
                  styles.registerButton,
                  (pressed || loading || resendingEmail) && styles.registerButtonPressed
                ]} 
                onPress={handleRegister}
                disabled={loading || resendingEmail}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.registerButtonText}>Registrati</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.loginLink}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.back();
                }}
                disabled={loading || resendingEmail}
              >
                <Text style={styles.loginLinkText}>
                  Hai già un account? Accedi
                </Text>
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
    backgroundColor: colors.backgroundSecondary,
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
  emailConfirmationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  emailConfirmationContent: {
    flex: 1,
    marginLeft: 12,
  },
  emailConfirmationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  emailConfirmationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  resendIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  resendIconButtonPressed: {
    opacity: 0.7,
  },
  form: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    marginTop: 8,
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
  requiredNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginLeft: 12,
    lineHeight: 18,
  },
  registerButton: {
    backgroundColor: colors.text,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  registerButtonPressed: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
});
