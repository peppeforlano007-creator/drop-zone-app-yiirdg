
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
import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { Picker } from '@react-native-picker/picker';

interface PickupPoint {
  id: string;
  name: string;
  city: string;
}

export default function ConsumerRegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pickupPointId, setPickupPointId] = useState('');
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPickupPoints, setLoadingPickupPoints] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Legal consents
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);

  useEffect(() => {
    loadPickupPoints();
  }, []);

  const loadPickupPoints = async () => {
    try {
      setLoadingPickupPoints(true);
      console.log('Loading pickup points...');
      
      const { data, error } = await supabase
        .from('pickup_points')
        .select('id, name, city')
        .eq('status', 'active')
        .order('city', { ascending: true });

      if (error) {
        console.error('Error loading pickup points:', error);
        Alert.alert('Errore', 'Impossibile caricare i punti di ritiro. Riprova.');
        return;
      }

      console.log('Pickup points loaded:', data?.length);
      setPickupPoints(data || []);
    } catch (error) {
      console.error('Exception loading pickup points:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante il caricamento dei punti di ritiro.');
    } finally {
      setLoadingPickupPoints(false);
    }
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'La password deve contenere almeno 8 caratteri' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'La password deve contenere almeno una lettera maiuscola' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'La password deve contenere almeno una lettera minuscola' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'La password deve contenere almeno un numero' };
    }
    
    return { valid: true };
  };

  const handleRegister = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert('Errore', 'Inserisci il tuo nome completo');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Errore', 'Inserisci l\'email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Errore', 'Inserisci un indirizzo email valido');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Errore', 'Inserisci il numero di telefono');
      return;
    }

    if (!password) {
      Alert.alert('Errore', 'Inserisci la password');
      return;
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.valid) {
      Alert.alert('Password Non Valida', validation.message);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Errore', 'Le password non corrispondono');
      return;
    }

    if (!pickupPointId) {
      Alert.alert('Errore', 'Seleziona un punto di ritiro');
      return;
    }

    // Check legal consents
    if (!acceptedTerms) {
      Alert.alert(
        'Termini e Condizioni',
        'Devi accettare i Termini e Condizioni per registrarti'
      );
      return;
    }

    if (!acceptedPrivacy) {
      Alert.alert(
        'Privacy Policy',
        'Devi accettare la Privacy Policy per registrarti'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      console.log('Registering consumer:', email, 'pickup_point:', pickupPointId);
      
      // Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: 'dropzone://email-confirmed',
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: 'consumer',
            pickup_point_id: pickupPointId,
          }
        }
      });

      if (authError) {
        console.error('Registration error:', authError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        let errorMessage = authError.message;
        if (errorMessage.toLowerCase().includes('already registered')) {
          errorMessage = 'Questo indirizzo email è già registrato. Prova ad accedere o usa un\'altra email.';
        }
        
        Alert.alert('Errore di Registrazione', errorMessage);
        return;
      }

      if (!authData.user) {
        Alert.alert('Errore', 'Si è verificato un errore durante la registrazione. Riprova.');
        return;
      }

      console.log('User registered successfully:', authData.user.id);
      
      // Save user consents
      try {
        const { error: consentError } = await supabase
          .from('user_consents')
          .insert({
            user_id: authData.user.id,
            terms_accepted: acceptedTerms,
            privacy_accepted: acceptedPrivacy,
            marketing_accepted: acceptedMarketing,
            consent_date: new Date().toISOString(),
          });

        if (consentError) {
          console.error('Error saving consents:', consentError);
          // Non-blocking error - user is already registered
        }
      } catch (consentException) {
        console.error('Exception saving consents:', consentException);
        // Non-blocking error
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Show success message with email confirmation instructions
      Alert.alert(
        'Registrazione Completata! 🎉',
        `Abbiamo inviato un'email di conferma a:\n\n${email}\n\nControlla la tua casella di posta (anche nello spam) e clicca sul link per confermare il tuo account.\n\nDopo la conferma, potrai accedere all'app.`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/login');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Registration exception:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto durante la registrazione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Registrazione Utente',
          headerBackTitle: 'Indietro',
        }} 
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>Crea il tuo Account</Text>
              <Text style={styles.subtitle}>
                Registrati per iniziare a prenotare prodotti e partecipare ai drop
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Mario Rossi"
                placeholderTextColor={colors.textTertiary}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
                editable={!loading}
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
                autoComplete="email"
                editable={!loading}
              />

              <Text style={styles.inputLabel}>Telefono</Text>
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

              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Almeno 8 caratteri"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
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

              <Text style={styles.inputLabel}>Conferma Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Ripeti la password"
                  placeholderTextColor={colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!loading}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                  disabled={loading}
                >
                  <IconSymbol
                    ios_icon_name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'}
                    android_material_icon_name={showConfirmPassword ? 'visibility_off' : 'visibility'}
                    size={22}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <View style={styles.requirementsBox}>
                <Text style={styles.requirementsTitle}>Requisiti password:</Text>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={password.length >= 8 ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}
                    size={18}
                    color={password.length >= 8 ? colors.success : colors.textTertiary}
                  />
                  <Text style={[
                    styles.requirementText,
                    password.length >= 8 && styles.requirementTextMet
                  ]}>
                    Almeno 8 caratteri
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={/[A-Z]/.test(password) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[A-Z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                    size={18}
                    color={/[A-Z]/.test(password) ? colors.success : colors.textTertiary}
                  />
                  <Text style={[
                    styles.requirementText,
                    /[A-Z]/.test(password) && styles.requirementTextMet
                  ]}>
                    Una lettera maiuscola
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={/[a-z]/.test(password) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[a-z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                    size={18}
                    color={/[a-z]/.test(password) ? colors.success : colors.textTertiary}
                  />
                  <Text style={[
                    styles.requirementText,
                    /[a-z]/.test(password) && styles.requirementTextMet
                  ]}>
                    Una lettera minuscola
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={/[0-9]/.test(password) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[0-9]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                    size={18}
                    color={/[0-9]/.test(password) ? colors.success : colors.textTertiary}
                  />
                  <Text style={[
                    styles.requirementText,
                    /[0-9]/.test(password) && styles.requirementTextMet
                  ]}>
                    Un numero
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Punto di Ritiro</Text>
              {loadingPickupPoints ? (
                <View style={styles.loadingPickupPoints}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingText}>Caricamento punti di ritiro...</Text>
                </View>
              ) : pickupPoints.length === 0 ? (
                <View style={styles.noPickupPoints}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle.fill"
                    android_material_icon_name="warning"
                    size={24}
                    color={colors.warning}
                  />
                  <Text style={styles.noPickupPointsText}>
                    Nessun punto di ritiro disponibile al momento.
                  </Text>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={pickupPointId}
                    onValueChange={(itemValue) => setPickupPointId(itemValue)}
                    style={styles.picker}
                    enabled={!loading}
                  >
                    <Picker.Item label="Seleziona un punto di ritiro" value="" />
                    {pickupPoints.map((point) => (
                      <Picker.Item
                        key={point.id}
                        label={`${point.name} - ${point.city}`}
                        value={point.id}
                      />
                    ))}
                  </Picker>
                </View>
              )}

              {/* Legal Consents Section */}
              <View style={styles.legalSection}>
                <Text style={styles.legalSectionTitle}>Consensi Obbligatori</Text>
                
                <Pressable
                  style={styles.consentItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAcceptedTerms(!acceptedTerms);
                  }}
                  disabled={loading}
                >
                  <View style={styles.checkbox}>
                    {acceptedTerms && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </View>
                  <Text style={styles.consentText}>
                    Accetto i{' '}
                    <Text
                      style={styles.consentLink}
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push('/legal/terms-conditions');
                      }}
                    >
                      Termini e Condizioni
                    </Text>
                    {' '}*
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.consentItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAcceptedPrivacy(!acceptedPrivacy);
                  }}
                  disabled={loading}
                >
                  <View style={styles.checkbox}>
                    {acceptedPrivacy && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </View>
                  <Text style={styles.consentText}>
                    Accetto la{' '}
                    <Text
                      style={styles.consentLink}
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push('/legal/privacy-policy');
                      }}
                    >
                      Privacy Policy
                    </Text>
                    {' '}e il trattamento dei miei dati personali *
                  </Text>
                </Pressable>

                <Text style={styles.legalSectionTitle}>Consensi Facoltativi</Text>

                <Pressable
                  style={styles.consentItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAcceptedMarketing(!acceptedMarketing);
                  }}
                  disabled={loading}
                >
                  <View style={styles.checkbox}>
                    {acceptedMarketing && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </View>
                  <Text style={styles.consentText}>
                    Acconsento a ricevere comunicazioni promozionali e newsletter
                  </Text>
                </Pressable>

                <Text style={styles.requiredNote}>* Campi obbligatori</Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.registerButton,
                  (pressed || loading || loadingPickupPoints) && styles.registerButtonPressed,
                ]}
                onPress={handleRegister}
                disabled={loading || loadingPickupPoints}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="person.badge.plus.fill"
                      android_material_icon_name="person_add"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.registerButtonText}>
                      Registrati
                    </Text>
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
                Dopo la registrazione, riceverai un&apos;email di conferma. 
                Clicca sul link nell&apos;email per attivare il tuo account.
              </Text>
            </View>

            <Pressable
              style={styles.backButton}
              onPress={handleBackToLogin}
              disabled={loading}
            >
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="chevron_left"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.backButtonText}>
                Hai già un account? Accedi
              </Text>
            </Pressable>
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
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
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
    marginBottom: 16,
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
  requirementsBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  requirementText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  requirementTextMet: {
    color: colors.success,
    fontWeight: '500',
  },
  pickerContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text,
  },
  loadingPickupPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  noPickupPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '10',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    gap: 12,
  },
  noPickupPointsText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  legalSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  consentLink: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  requiredNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  registerButton: {
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
  registerButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  registerButtonText: {
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
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
