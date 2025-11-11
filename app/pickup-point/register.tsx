
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';

export default function RegisterPickupPointScreen() {
  // Basic Information
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  
  // Address Information
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('');
  const [region, setRegion] = useState('');
  
  // Contact Information
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [alternativePhone, setAlternativePhone] = useState('');
  
  // Operational Information
  const [openingHours, setOpeningHours] = useState('');
  const [storageCapacity, setStorageCapacity] = useState('');
  const [directionsForConsumers, setDirectionsForConsumers] = useState('');
  const [shippingInstructions, setShippingInstructions] = useState('');
  const [parkingAvailable, setParkingAvailable] = useState(false);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  
  // Bank Information for Commission Payments
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  
  // Agreement
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleRegister = () => {
    // Validation
    if (!name || !address || !city || !phone || !email || !contactPerson) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori contrassegnati con *');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Errore', 'Devi accettare i termini e le condizioni per continuare');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Errore', 'Inserisci un indirizzo email valido');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    console.log('Pickup point registration:', {
      name,
      businessName,
      vatNumber,
      address,
      city,
      postalCode,
      province,
      region,
      phone,
      email,
      contactPerson,
      alternativePhone,
      openingHours,
      storageCapacity,
      directionsForConsumers,
      shippingInstructions,
      parkingAvailable,
      wheelchairAccessible,
      iban,
      bankName,
      accountHolder,
    });

    Alert.alert(
      'Registrazione Completata!',
      'La tua richiesta è stata inviata. Ti contatteremo entro 24-48 ore per completare l\'attivazione del tuo punto di ritiro.\n\nCommissione: €2.50 per ordine consegnato',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/login'),
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Registra Punto di Ritiro',
          presentation: 'modal',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <IconSymbol name="mappin.circle.fill" size={48} color={colors.text} />
              <Text style={styles.headerTitle}>Diventa un Punto di Ritiro</Text>
              <Text style={styles.headerSubtitle}>
                Guadagna €2.50 per ogni ordine consegnato nel tuo locale
              </Text>
            </View>

            {/* Commission Info Card */}
            <View style={styles.commissionCard}>
              <View style={styles.commissionHeader}>
                <IconSymbol name="eurosign.circle.fill" size={24} color={colors.text} />
                <Text style={styles.commissionTitle}>Struttura Commissioni</Text>
              </View>
              <Text style={styles.commissionText}>
                • €2.50 per ordine consegnato{'\n'}
                • Pagamento mensile tramite bonifico{'\n'}
                • Nessun costo di attivazione{'\n'}
                • Nessun canone mensile
              </Text>
            </View>

            {/* Basic Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="building.2.fill" size={24} color={colors.text} />
                <Text style={styles.sectionTitle}>Informazioni Base</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Punto di Ritiro *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="es. Bar Centrale, Tabaccheria Roma"
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ragione Sociale</Text>
                <TextInput
                  style={styles.input}
                  placeholder="es. Bar Centrale S.r.l."
                  placeholderTextColor={colors.textTertiary}
                  value={businessName}
                  onChangeText={setBusinessName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Partita IVA</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12345678901"
                  placeholderTextColor={colors.textTertiary}
                  value={vatNumber}
                  onChangeText={setVatNumber}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Address Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="location.fill" size={24} color={colors.text} />
                <Text style={styles.sectionTitle}>Indirizzo</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Via e Numero Civico *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Via del Corso, 123"
                  placeholderTextColor={colors.textTertiary}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Città *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Roma"
                    placeholderTextColor={colors.textTertiary}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>CAP</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="00100"
                    placeholderTextColor={colors.textTertiary}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Provincia</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="RM"
                    placeholderTextColor={colors.textTertiary}
                    value={province}
                    onChangeText={setProvince}
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Regione</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Lazio"
                    placeholderTextColor={colors.textTertiary}
                    value={region}
                    onChangeText={setRegion}
                  />
                </View>
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="phone.fill" size={24} color={colors.text} />
                <Text style={styles.sectionTitle}>Contatti</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefono *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+39 06 1234567"
                  placeholderTextColor={colors.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefono Alternativo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+39 333 1234567"
                  placeholderTextColor={colors.textTertiary}
                  value={alternativePhone}
                  onChangeText={setAlternativePhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="info@esempio.it"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Persona di Riferimento *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mario Rossi"
                  placeholderTextColor={colors.textTertiary}
                  value={contactPerson}
                  onChangeText={setContactPerson}
                />
              </View>
            </View>

            {/* Operational Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="clock.fill" size={24} color={colors.text} />
                <Text style={styles.sectionTitle}>Informazioni Operative</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Orari di Apertura</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Lun-Ven: 9:00-19:00, Sab: 9:00-13:00"
                  placeholderTextColor={colors.textTertiary}
                  value={openingHours}
                  onChangeText={setOpeningHours}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Capacità di Stoccaggio</Text>
                <TextInput
                  style={styles.input}
                  placeholder="es. 50 pacchi al giorno"
                  placeholderTextColor={colors.textTertiary}
                  value={storageCapacity}
                  onChangeText={setStorageCapacity}
                />
              </View>

              <View style={styles.checkboxGroup}>
                <Pressable
                  style={styles.checkbox}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setParkingAvailable(!parkingAvailable);
                  }}
                >
                  <View style={[styles.checkboxBox, parkingAvailable && styles.checkboxBoxChecked]}>
                    {parkingAvailable && (
                      <IconSymbol name="checkmark" size={16} color={colors.background} />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Parcheggio disponibile</Text>
                </Pressable>

                <Pressable
                  style={styles.checkbox}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setWheelchairAccessible(!wheelchairAccessible);
                  }}
                >
                  <View style={[styles.checkboxBox, wheelchairAccessible && styles.checkboxBoxChecked]}>
                    {wheelchairAccessible && (
                      <IconSymbol name="checkmark" size={16} color={colors.background} />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Accessibile ai disabili</Text>
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Indicazioni per i Consumatori</Text>
                <Text style={styles.helperText}>
                  Come raggiungere il punto di ritiro
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Descrivi come raggiungere il punto di ritiro..."
                  placeholderTextColor={colors.textTertiary}
                  value={directionsForConsumers}
                  onChangeText={setDirectionsForConsumers}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Istruzioni per i Fornitori</Text>
                <Text style={styles.helperText}>
                  Come spedire gli ordini al tuo punto di ritiro
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Descrivi come spedire gli ordini..."
                  placeholderTextColor={colors.textTertiary}
                  value={shippingInstructions}
                  onChangeText={setShippingInstructions}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Bank Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="creditcard.fill" size={24} color={colors.text} />
                <Text style={styles.sectionTitle}>Dati Bancari per Commissioni</Text>
              </View>
              <Text style={styles.helperText}>
                Le commissioni verranno pagate mensilmente su questo conto
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>IBAN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="IT60 X054 2811 1010 0000 0123 456"
                  placeholderTextColor={colors.textTertiary}
                  value={iban}
                  onChangeText={setIban}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Banca</Text>
                <TextInput
                  style={styles.input}
                  placeholder="es. Intesa Sanpaolo"
                  placeholderTextColor={colors.textTertiary}
                  value={bankName}
                  onChangeText={setBankName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Intestatario Conto</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome e Cognome o Ragione Sociale"
                  placeholderTextColor={colors.textTertiary}
                  value={accountHolder}
                  onChangeText={setAccountHolder}
                />
              </View>
            </View>

            {/* Terms and Conditions */}
            <View style={styles.section}>
              <View style={styles.termsCard}>
                <Text style={styles.termsTitle}>Termini e Condizioni</Text>
                <Text style={styles.termsText}>
                  • Commissione di €2.50 per ogni ordine consegnato{'\n'}
                  • Pagamento mensile entro il 15 del mese successivo{'\n'}
                  • Obbligo di conservare i pacchi per almeno 7 giorni{'\n'}
                  • Responsabilità per la custodia dei pacchi{'\n'}
                  • Possibilità di recedere con preavviso di 30 giorni
                </Text>

                <Pressable
                  style={styles.checkbox}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAcceptedTerms(!acceptedTerms);
                  }}
                >
                  <View style={[styles.checkboxBox, acceptedTerms && styles.checkboxBoxChecked]}>
                    {acceptedTerms && (
                      <IconSymbol name="checkmark" size={16} color={colors.background} />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Accetto i termini e le condizioni *
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Register Button */}
            <Pressable
              style={[styles.registerButton, !acceptedTerms && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={!acceptedTerms}
            >
              <Text style={styles.registerButtonText}>Invia Richiesta</Text>
            </Pressable>

            <Text style={styles.footerText}>
              * Campi obbligatori
            </Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  commissionCard: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  commissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  commissionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  checkboxGroup: {
    marginTop: 8,
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  checkboxLabel: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  termsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  termsText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: colors.text,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
});
