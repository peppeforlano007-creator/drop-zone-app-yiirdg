
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

interface PickupPoint {
  id: string;
  name: string;
  city: string;
}

export default function RegisterConsumerScreen() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<string | null>(null);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPickupPoints, setLoadingPickupPoints] = useState(true);

  React.useEffect(() => {
    loadPickupPoints();
  }, []);

  const loadPickupPoints = async () => {
    try {
      console.log('Loading pickup points...');
      const { data, error } = await supabase
        .from('pickup_points')
        .select('id, name, city')
        .eq('status', 'active')
        .order('city');

      if (error) {
        console.error('Error loading pickup points:', error);
        Alert.alert('Errore', 'Impossibile caricare i punti di ritiro');
        return;
      }

      console.log('Pickup points loaded:', data?.length);
      setPickupPoints(data || []);
    } catch (error) {
      console.error('Exception loading pickup points:', error);
    } finally {
      setLoadingPickupPoints(false);
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

    if (!selectedPickupPoint) {
      Alert.alert('Errore', 'Seleziona un punto di ritiro');
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
      const result = await register(
        email.trim().toLowerCase(),
        password,
        fullName.trim(),
        phone.trim(),
        'consumer',
        selectedPickupPoint
      );

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Registrazione Completata!',
          result.message || 'Controlla la tua email per verificare l\'account.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('Navigating to login...');
                router.replace('/login');
              },
            },
          ]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Errore di Registrazione', result.message || 'Si è verificato un errore');
      }
    } catch (error) {
      console.error('Registration exception:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Registrazione Consumatore',
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
                  ios_icon_name="person.fill" 
                  android_material_icon_name="person"
                  size={48} 
                  color={colors.text} 
                />
              </View>
              <Text style={styles.title}>Crea Account Consumatore</Text>
              <Text style={styles.subtitle}>
                Inserisci i tuoi dati per registrarti come consumatore
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
                <Text style={styles.inputLabel}>Punto di Ritiro *</Text>
                {loadingPickupPoints ? (
                  <View style={styles.loadingPickupPoints}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Caricamento punti di ritiro...</Text>
                  </View>
                ) : (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.pickupPointsScroll}
                  >
                    {pickupPoints.map((point) => (
                      <Pressable
                        key={point.id}
                        style={({ pressed }) => [
                          styles.pickupPointCard,
                          selectedPickupPoint === point.id && styles.pickupPointCardSelected,
                          pressed && styles.pickupPointCardPressed,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedPickupPoint(point.id);
                        }}
                        disabled={loading}
                      >
                        <IconSymbol
                          ios_icon_name="mappin.circle.fill"
                          android_material_icon_name="location_on"
                          size={24}
                          color={selectedPickupPoint === point.id ? colors.primary : colors.textSecondary}
                        />
                        <Text style={[
                          styles.pickupPointCity,
                          selectedPickupPoint === point.id && styles.pickupPointCitySelected
                        ]}>
                          {point.city}
                        </Text>
                        <Text style={styles.pickupPointName}>{point.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>

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
                  editable={!loading}
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
                  editable={!loading}
                />
              </View>

              <Text style={styles.requiredNote}>* Campi obbligatori</Text>

              <Pressable 
                style={({ pressed }) => [
                  styles.registerButton,
                  (pressed || loading) && styles.registerButtonPressed
                ]} 
                onPress={handleRegister}
                disabled={loading}
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
                disabled={loading}
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
  loadingPickupPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  pickupPointsScroll: {
    marginHorizontal: -4,
  },
  pickupPointCard: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    minWidth: 120,
    alignItems: 'center',
  },
  pickupPointCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  pickupPointCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  pickupPointCity: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
  },
  pickupPointCitySelected: {
    color: colors.primary,
  },
  pickupPointName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  requiredNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 24,
    fontStyle: 'italic',
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
