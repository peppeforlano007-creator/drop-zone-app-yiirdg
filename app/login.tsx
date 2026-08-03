
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
  Linking,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { validateAndFormatPhone, parsePhoneNumber, formatPhoneForDisplay } from '@/utils/phoneValidation';
import CountryCodePicker from '@/components/CountryCodePicker';

export default function LoginScreen() {
  const { user, loading: authLoading } = useAuth();
  const [countryCode, setCountryCode] = useState('39'); // Default to Italy
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);
  const [showPhoneHint, setShowPhoneHint] = useState(false);

  useEffect(() => {
    loadWhatsAppNumber();
  }, []);

  useEffect(() => {
    // Redirect if already logged in
    if (user && !authLoading) {
      console.log('User already logged in, redirecting...', user.role);
      if (user.role === 'consumer') {
        router.replace('/(tabs)/drops');
      } else if (user.role === 'supplier') {
        // Suppliers no longer have access to the app
        Alert.alert(
          'Accesso Negato',
          'I fornitori non hanno più accesso diretto all\'app. Contatta l\'amministratore per assistenza.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await supabase.auth.signOut();
              }
            }
          ]
        );
      } else if (user.role === 'pickup_point') {
        router.replace('/pickup-point/dashboard');
      } else if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      }
    }
  }, [user, authLoading]);

  const loadWhatsAppNumber = async () => {
    try {
      setLoadingWhatsapp(true);
      console.log('Loading WhatsApp number from database...');
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_support_number')
        .maybeSingle();

      if (error) {
        console.error('Error loading WhatsApp number:', error);
        return;
      }

      if (data?.setting_value) {
        console.log('WhatsApp number loaded successfully:', data.setting_value);
        setWhatsappNumber(data.setting_value);
      } else {
        console.log('No WhatsApp number found in database');
      }
    } catch (error) {
      console.error('Exception loading WhatsApp number:', error);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const handleSupport = async () => {
    console.log('Support button pressed. WhatsApp number:', whatsappNumber);
    
    if (!whatsappNumber || whatsappNumber.trim() === '') {
      console.log('WhatsApp number not configured');
      Alert.alert(
        'Contatta il Supporto Clienti',
        'Il numero di supporto WhatsApp non è stato ancora configurato. Contatta l\'amministratore per assistenza.',
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const sanitizedNumber = whatsappNumber.replace(/\D/g, '');
    const message = encodeURIComponent('Ciao, ho bisogno di supporto.');
    const whatsappUrl = `whatsapp://send?phone=${sanitizedNumber}&text=${message}`;
    const whatsappWebUrl = `https://wa.me/${sanitizedNumber}?text=${message}`;
    
    console.log('Opening WhatsApp with sanitized number:', sanitizedNumber);
    
    try {
      console.log('Trying WhatsApp app URL...');
      await Linking.openURL(whatsappUrl);
      console.log('WhatsApp app opened successfully');
    } catch (appError) {
      console.log('WhatsApp app URL failed, falling back to wa.me:', appError);
      try {
        await Linking.openURL(whatsappWebUrl);
        console.log('WhatsApp web fallback opened successfully');
      } catch (webError) {
        console.error('Both WhatsApp URLs failed:', webError);
        Alert.alert(
          'Errore',
          'Impossibile aprire WhatsApp. Assicurati di avere WhatsApp installato sul tuo dispositivo.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleLogin = async () => {
    if (!phone.trim()) {
      Alert.alert('Errore', 'Inserisci il numero di cellulare');
      return;
    }

    // Validate and format phone number
    const phoneValidation = validateAndFormatPhone(phone, countryCode);
    if (!phoneValidation.valid) {
      Alert.alert('Numero Non Valido', phoneValidation.message || 'Inserisci un numero di cellulare valido');
      return;
    }

    const formattedPhone = phoneValidation.formatted!;
    const displayPhone = phoneValidation.display!;
    console.log('Phone validated and formatted:', formattedPhone, 'Display:', displayPhone);

    if (!password.trim()) {
      Alert.alert('Errore', 'Inserisci la password');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      console.log('Logging in with phone:', formattedPhone);
      
      // Try to find user by phone number in profiles table first
      // Check multiple formats for backward compatibility
      const possibleFormats = [
        formattedPhone, // e.g., "393201234567"
        `+${formattedPhone}`, // e.g., "+393201234567"
        formattedPhone.substring(countryCode.length), // e.g., "3201234567" (without country code)
      ];
      
      console.log('Checking phone formats:', possibleFormats);
      
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email, phone, user_id, full_name, pickup_point_id, role')
        .or(possibleFormats.map(format => `phone.eq.${format}`).join(','))
        .maybeSingle();

      if (userError) {
        console.error('Error finding user by phone:', userError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Errore di Accesso',
          'Si è verificato un errore durante la ricerca dell\'utente. Riprova.'
        );
        setLoading(false);
        return;
      }

      if (!userData) {
        console.log('No user found with phone formats:', possibleFormats);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Errore di Accesso',
          `Numero di cellulare non trovato.\n\nHai provato con: ${displayPhone}\n\nVerifica di aver inserito il numero corretto o registrati.`
        );
        setLoading(false);
        return;
      }

      console.log('User found in profiles:', {
        user_id: userData.user_id,
        phone: userData.phone,
        full_name: userData.full_name,
        role: userData.role,
      });

      // Check if this is an email-based account (admin, pickup_point, or old consumer)
      if (userData.email && userData.role !== 'consumer') {
        console.log('User has email-based account, role:', userData.role);
        Alert.alert(
          'Account Email',
          `Questo account utilizza l'email per l'accesso.\n\nEmail: ${userData.email}\n\nSe sei un amministratore o un punto di ritiro, usa l'email per accedere. Se hai dimenticato la password, contatta il supporto.`,
          [
            {
              text: 'Contatta Supporto',
              onPress: handleSupport,
            },
            {
              text: 'OK',
              style: 'cancel',
            }
          ]
        );
        setLoading(false);
        return;
      }

      // Check if profile has required data for consumers
      if (userData.role === 'consumer' && (!userData.full_name || !userData.pickup_point_id)) {
        console.warn('Consumer profile is incomplete:', userData);
        Alert.alert(
          'Profilo Incompleto',
          'Il tuo profilo non è completo. Contatta il supporto per assistenza.',
          [
            {
              text: 'Contatta Supporto',
              onPress: handleSupport,
            },
            {
              text: 'Annulla',
              style: 'cancel',
            }
          ]
        );
        setLoading(false);
        return;
      }

      // Now authenticate with Supabase Auth
      // Use the exact phone format from the database
      const authPhone = userData.phone;
      console.log('Authenticating with phone from database:', authPhone);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        phone: authPhone,
        password: password.trim(),
      });

      if (authError) {
        console.error('Error logging in:', authError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        let errorMessage = authError.message;
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('credentials')) {
          errorMessage = 'Password non corretta. Riprova o reimposta la password.';
        } else if (errorMessage.toLowerCase().includes('email not confirmed')) {
          errorMessage = 'Verifica il tuo numero di cellulare prima di accedere.';
        }
        
        Alert.alert('Errore di Accesso', errorMessage);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('Login successful');
        // Navigation will be handled by useEffect when user state updates
      }
    } catch (error) {
      console.error('Exception during login:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore durante l\'accesso. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/forgot-password');
  };

  const handleRegisterConsumer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/register/consumer');
  };

  const handleAdminLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/admin-login');
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
              <Text style={styles.subtitle}>
                Accedi con il tuo numero di cellulare e password
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Numero di Cellulare</Text>
              <View style={styles.phoneInputRow}>
                <CountryCodePicker
                  selectedCode={countryCode}
                  onCodeChange={setCountryCode}
                  disabled={loading}
                />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="320 123 4567"
                  placeholderTextColor={colors.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoComplete="tel"
                  editable={!loading}
                />
                <Pressable
                  style={styles.phoneInfoButton}
                  onPress={() => {
                    console.log('[Login] Phone hint toggled:', !showPhoneHint);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowPhoneHint(v => !v);
                  }}
                  hitSlop={8}
                >
                  <IconSymbol
                    ios_icon_name={showPhoneHint ? 'info.circle.fill' : 'info.circle'}
                    android_material_icon_name="info"
                    size={18}
                    color={showPhoneHint ? colors.primary : colors.textTertiary}
                  />
                </Pressable>
              </View>
              {showPhoneHint && (
                <View style={styles.phoneHintInline}>
                  <Text style={styles.phoneHint}>
                    Tocca il prefisso per cambiare paese. Inserisci il numero senza il prefisso.
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Inserisci la tua password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
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

              <Pressable
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>
                  Password dimenticata?
                </Text>
              </Pressable>

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
                  <>
                    <IconSymbol
                      ios_icon_name="arrow.right.circle.fill"
                      android_material_icon_name="login"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.loginButtonText}>Accedi</Text>
                  </>
                )}
              </Pressable>

              {/* Support Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.supportButton,
                  pressed && styles.supportButtonPressed,
                  loadingWhatsapp && styles.supportButtonDisabled,
                ]}
                onPress={handleSupport}
                disabled={loadingWhatsapp}
              >
                {loadingWhatsapp ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="questionmark.circle.fill"
                      android_material_icon_name="help"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.supportButtonText}>
                      Hai bisogno di aiuto?
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Non hai un account?</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.registerSection}>
              <Text style={styles.registerTitle}>Registrati</Text>
              
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
                  <Text style={styles.registerCardTitle}>Utente</Text>
                  <Text style={styles.registerCardDescription}>
                    Prenota prodotti e partecipa ai drop
                  </Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>


            </View>

            {/* Admin/Pickup Point Login Link - More visible but still discreet */}
            <Pressable
              style={({ pressed }) => [
                styles.adminLinkContainer,
                pressed && styles.adminLinkPressed,
              ]}
              onPress={handleAdminLogin}
              disabled={loading}
            >
              <IconSymbol
                ios_icon_name="lock.shield"
                android_material_icon_name="admin-panel-settings"
                size={14}
                color={colors.textTertiary}
              />
              <Text style={styles.adminLinkText}>Accesso Amministratori</Text>
            </Pressable>

            {/* Legal Footer */}
            <View style={styles.legalFooter}>
              <Text style={styles.legalFooterText}>Continuando accetti i nostri </Text>
              <Pressable onPress={() => {
                console.log('[Login] Navigating to Terms and Conditions');
                router.push('/legal/terms-conditions');
              }}>
                <Text style={styles.legalFooterLink}>Termini e Condizioni</Text>
              </Pressable>
              <Text style={styles.legalFooterText}> e la nostra </Text>
              <Pressable onPress={() => {
                console.log('[Login] Navigating to Privacy Policy');
                router.push('/legal/privacy-policy');
              }}>
                <Text style={styles.legalFooterLink}>Privacy Policy</Text>
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
  phoneInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    height: 56,
  },
  phoneInfoButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  phoneHintInline: {
    backgroundColor: colors.primary + '10',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: -4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  phoneHint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  loginButton: {
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
  loginButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primary + '20',
    gap: 8,
    minHeight: 52,
  },
  supportButtonPressed: {
    opacity: 0.7,
  },
  supportButtonDisabled: {
    opacity: 0.5,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
    marginBottom: 16,
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
  adminLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    gap: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  adminLinkPressed: {
    opacity: 0.6,
  },
  adminLinkText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  legalFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  legalFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  legalFooterLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
