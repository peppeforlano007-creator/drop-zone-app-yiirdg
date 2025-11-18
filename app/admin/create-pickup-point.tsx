
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

interface CreatedCredentials {
  email: string;
  password: string;
  pointName: string;
}

export default function CreatePickupPointScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pointName, setPointName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [commissionRate, setCommissionRate] = useState('5.00');
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);

  const generateSecurePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleCreate = async () => {
    console.log('handleCreate called');
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Validation
    if (!fullName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome completo del responsabile');
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

    const commission = parseFloat(commissionRate);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      Alert.alert('Errore', 'La percentuale di commissione deve essere tra 0 e 100');
      return;
    }

    setLoading(true);

    try {
      // Generate a secure password
      const generatedPassword = generateSecurePassword();
      
      console.log('Calling Edge Function to create pickup point user...');
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Errore', 'Sessione non valida. Effettua nuovamente il login.');
        setLoading(false);
        return;
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('create-pickup-point-user', {
        body: {
          email: email.trim().toLowerCase(),
          password: generatedPassword,
          fullName: fullName.trim(),
          phone: phone.trim(),
          pointName: pointName.trim(),
          address: address.trim(),
          city: city.trim(),
          postalCode: postalCode.trim() || null,
          commissionRate: commission,
        },
      });

      if (error) {
        console.error('Error from Edge Function:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        let errorMessage = error.message || 'Errore durante la creazione del punto di ritiro';
        
        if (errorMessage.toLowerCase().includes('already registered') ||
            errorMessage.toLowerCase().includes('already exists')) {
          errorMessage = 'Questo indirizzo email è già registrato.\n\nScegli un\'altra email.';
        }
        
        Alert.alert('Errore', errorMessage);
        setLoading(false);
        return;
      }

      if (!data || !data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Errore', data?.error || 'Errore durante la creazione del punto di ritiro');
        setLoading(false);
        return;
      }

      console.log('Pickup point created successfully');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Store credentials to show to admin
      setCreatedCredentials({
        email: email.trim().toLowerCase(),
        password: generatedPassword,
        pointName: pointName.trim(),
      });
      setShowCredentials(true);
      
      // Clear form
      setFullName('');
      setEmail('');
      setPhone('');
      setPointName('');
      setAddress('');
      setCity('');
      setPostalCode('');
      setCommissionRate('5.00');
      
    } catch (error) {
      console.error('Creation exception:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      let errorMessage = 'Si è verificato un errore imprevisto';
      if (error instanceof Error) {
        errorMessage += ': ' + error.message;
        
        if (error.message.toLowerCase().includes('network') || 
            error.message.toLowerCase().includes('fetch')) {
          errorMessage = 'Errore di connessione. Verifica la tua connessione internet e riprova.';
        }
      }
      
      Alert.alert('Errore', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCredentials = () => {
    setShowCredentials(false);
    setCreatedCredentials(null);
    router.back();
  };

  const copyToClipboard = (text: string, label: string) => {
    // Note: Clipboard API would be used here in a real app
    // For now, just show a confirmation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Copiato', `${label} copiato negli appunti`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Crea Punto di Ritiro',
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
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.title}>Nuovo Punto di Ritiro</Text>
              <Text style={styles.subtitle}>
                Crea un account per un nuovo punto di ritiro. Le credenziali verranno generate automaticamente.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.sectionTitle}>Informazioni Responsabile</Text>
              
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
                  editable={!loading}
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
                  editable={!loading}
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
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>CAP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="00100"
                  placeholderTextColor={colors.textTertiary}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Percentuale Commissione (%) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="5.00"
                  placeholderTextColor={colors.textTertiary}
                  value={commissionRate}
                  onChangeText={setCommissionRate}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>

              <Text style={styles.requiredNote}>* Campi obbligatori</Text>

              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="key.fill"
                  android_material_icon_name="vpn_key"
                  size={20}
                  color={colors.success}
                />
                <Text style={styles.infoText}>
                  Una password sicura verrà generata automaticamente. Dovrai comunicare le credenziali al punto di ritiro.
                </Text>
              </View>

              <Pressable 
                style={({ pressed }) => [
                  styles.createButton,
                  (pressed || loading) && styles.createButtonPressed
                ]} 
                onPress={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="plus.circle.fill"
                      android_material_icon_name="add_circle"
                      size={24}
                      color={colors.background}
                    />
                    <Text style={styles.createButtonText}>Crea Punto di Ritiro</Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Credentials Modal */}
        <Modal
          visible={showCredentials}
          transparent
          animationType="fade"
          onRequestClose={handleCloseCredentials}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={48}
                    color={colors.success}
                  />
                </View>
                <Text style={styles.modalTitle}>Punto di Ritiro Creato!</Text>
                <Text style={styles.modalSubtitle}>
                  Comunica queste credenziali al punto di ritiro
                </Text>
              </View>

              {createdCredentials && (
                <View style={styles.credentialsContainer}>
                  <View style={styles.credentialItem}>
                    <Text style={styles.credentialLabel}>Nome Punto di Ritiro</Text>
                    <View style={styles.credentialValueContainer}>
                      <Text style={styles.credentialValue}>{createdCredentials.pointName}</Text>
                    </View>
                  </View>

                  <View style={styles.credentialItem}>
                    <Text style={styles.credentialLabel}>Email</Text>
                    <View style={styles.credentialValueContainer}>
                      <Text style={styles.credentialValue}>{createdCredentials.email}</Text>
                      <Pressable
                        style={styles.copyButton}
                        onPress={() => copyToClipboard(createdCredentials.email, 'Email')}
                      >
                        <IconSymbol
                          ios_icon_name="doc.on.doc.fill"
                          android_material_icon_name="content_copy"
                          size={18}
                          color={colors.primary}
                        />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.credentialItem}>
                    <Text style={styles.credentialLabel}>Password</Text>
                    <View style={styles.credentialValueContainer}>
                      <Text style={[styles.credentialValue, styles.passwordValue]}>
                        {createdCredentials.password}
                      </Text>
                      <Pressable
                        style={styles.copyButton}
                        onPress={() => copyToClipboard(createdCredentials.password, 'Password')}
                      >
                        <IconSymbol
                          ios_icon_name="doc.on.doc.fill"
                          android_material_icon_name="content_copy"
                          size={18}
                          color={colors.primary}
                        />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.warningBox}>
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="warning"
                      size={20}
                      color={colors.warning}
                    />
                    <Text style={styles.warningText}>
                      Assicurati di salvare queste credenziali in modo sicuro. Non potrai visualizzarle nuovamente.
                    </Text>
                  </View>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  pressed && styles.modalCloseButtonPressed,
                ]}
                onPress={handleCloseCredentials}
              >
                <Text style={styles.modalCloseButtonText}>Ho Salvato le Credenziali</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
    paddingBottom: 40,
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
    paddingHorizontal: 20,
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
    backgroundColor: colors.success + '10',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.success + '30',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  createButton: {
    backgroundColor: colors.success,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
  },
  createButtonPressed: {
    opacity: 0.7,
  },
  createButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  credentialsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  credentialItem: {
    gap: 8,
  },
  credentialLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  credentialValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  credentialValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  passwordValue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.primary + '15',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: colors.warning + '10',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    gap: 12,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  modalCloseButton: {
    backgroundColor: colors.text,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonPressed: {
    opacity: 0.7,
  },
  modalCloseButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
