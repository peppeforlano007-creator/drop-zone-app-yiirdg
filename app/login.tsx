
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
import { validateAndFormatPhone } from '@/utils/phoneValidation';

export default function LoginScreen() {
  const { user, loading: authLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);

  useEffect(() => {
    loadWhatsAppNumber();
  }, []);

  useEffect(() => {
    // Redirect if already logged in
    if (user && !authLoading) {
      console.log('User already logged in, redirecting...', user.role);
      if (user.role === 'consumer') {
        router.replace('/(tabs)/(home)');
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
    
    const message = encodeURIComponent('Ciao, ho bisogno di supporto.');
    const whatsappUrl = `whatsapp://send?phone=${whatsappNumber}&text=${message}`;
    const whatsappWebUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    
    console.log('Opening WhatsApp with number:', whatsappNumber);
    
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      console.log('Can open WhatsApp app:', canOpen);
      
      if (canOpen) {
        console.log('Opening WhatsApp app...');
        await Linking.openURL(whatsappUrl);
      } else {
        console.log('WhatsApp app not available, opening WhatsApp Web...');
        await Linking.openURL(whatsappWebUrl);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Errore',
        'Impossibile aprire WhatsApp. Assicurati di avere WhatsApp installato sul tuo dispositivo.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleLogin = async () => {
    if (!phone.trim()) {
      Alert.alert('Errore', 'Inserisci il numero di cellulare');
      return;
    }

    // Validate and format phone number
    const phoneValidation = validateAndFormatPhone(phone);
    if (!phoneValidation.valid) {
      Alert.alert('Numero Non Valido', phoneValidation.message || 'Inserisci un numero di cellulare valido');
      return;
    }

    const formattedPhone = phoneValidation.formatted!;
    console.log('Phone validated and formatted:', formattedPhone);

    if (!password.trim()) {
      Alert.alert('Errore', 'Inserisci la password');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      console.log('Logging in with phone:', formattedPhone);
      
      // Try to find user by phone number in profiles table
      // We need to check both with and without the + prefix since Supabase stores it without +
      const phoneWithoutPlus = formattedPhone.replace('+', '');
      console.log('Searching for phone with and without +:', formattedPhone, phoneWithoutPlus);
      
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email, phone, user_id')
        .or(`phone.eq.${formattedPhone},phone.eq.${phoneWithoutPlus}`)
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
        console.log('No user found with phone:', formattedPhone, 'or', phoneWithoutPlus);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Errore di Accesso',
          'Numero di cellulare non trovato. Verifica di aver inserito il numero corretto o registrati.'
        );
        setLoading(false);
        return;
      }

      console.log('User found:', userData);

      // For phone-only users, we need to use signInWithPassword with the phone
      // Supabase stores phone without + prefix in auth.users
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        phone: phoneWithoutPlus,
        password: password.trim(),
      });

      if (authError) {
        console.error('Error logging in:', authError);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        let errorMessage = authError.message;
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('credentials')) {
          errorMessage = 'Password non corretta. Riprova o reimposta la password.';
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
              <TextInput
                style={styles.input}
                placeholder="+39 320 123 4567"
                placeholderTextColor={colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoComplete="tel"
                editable={!loading}
              />
              <Text style={styles.inputHint}>
                Inserisci il tuo numero con il prefisso internazionale (es. +39 per l&apos;Italia)
              </Text>

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

            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={18}
                color={colors.info}
              />
              <Text style={styles.infoText}>
                <Text style={styles.infoTextBold}>Formato Numero:</Text> Assicurati di inserire il numero con il prefisso internazionale. 
                Per l&apos;Italia usa +39 seguito da 10 cifre (es. +39 320 123 4567).
              </Text>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Non hai un account?</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.registerSection}>
              <Text style={styles.registerTitle}>Registrati come:</Text>
              
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
                  android_material_icon_name="chevron_right"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>

              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={18}
                  color={colors.info}
                />
                <Text style={styles.infoText}>
                  Sei un punto di ritiro? Le credenziali di accesso ti verranno fornite dall&apos;amministratore.
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
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    fontStyle: 'italic',
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
  infoTextBold: {
    fontWeight: '700',
    color: colors.text,
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
});
