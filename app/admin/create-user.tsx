
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface PickupPoint {
  id: string;
  name: string;
  city: string;
  address: string;
}

export default function CreateUserScreen() {
  const [loading, setLoading] = useState(false);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [loadingPickupPoints, setLoadingPickupPoints] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'consumer' | 'supplier' | 'pickup_point' | 'admin'>('consumer');
  const [selectedPickupPointId, setSelectedPickupPointId] = useState<string>('');

  useEffect(() => {
    loadPickupPoints();
  }, []);

  const loadPickupPoints = async () => {
    try {
      setLoadingPickupPoints(true);
      const { data, error } = await supabase
        .from('pickup_points')
        .select('id, name, city, address')
        .eq('status', 'active')
        .order('city', { ascending: true });

      if (error) {
        console.error('Error loading pickup points:', error);
        return;
      }

      setPickupPoints(data || []);
    } catch (error) {
      console.error('Error loading pickup points:', error);
    } finally {
      setLoadingPickupPoints(false);
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Errore', 'Inserisci un indirizzo email');
      return false;
    }

    if (!email.includes('@')) {
      Alert.alert('Errore', 'Inserisci un indirizzo email valido');
      return false;
    }

    if (!password) {
      Alert.alert('Errore', 'Inserisci una password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Errore', 'La password deve essere di almeno 6 caratteri');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Errore', 'Le password non corrispondono');
      return false;
    }

    if (!fullName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome completo');
      return false;
    }

    if (role === 'consumer' && !selectedPickupPointId) {
      Alert.alert('Errore', 'Seleziona un punto di ritiro per i consumatori');
      return false;
    }

    return true;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      console.log('Creating user with role:', role);

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Errore', 'Sessione non valida. Effettua nuovamente il login.');
        return;
      }

      // Call the Edge Function to create the user
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: email.trim(),
          password: password,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          role: role,
          pickup_point_id: role === 'consumer' ? selectedPickupPointId : null,
        },
      });

      if (error) {
        console.error('Error creating user:', error);
        Alert.alert('Errore', `Impossibile creare l'utente: ${error.message}`);
        return;
      }

      if (!data?.success) {
        Alert.alert('Errore', data?.error || 'Errore durante la creazione dell\'utente');
        return;
      }

      console.log('User created successfully:', data.user);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Successo',
        `Utente "${fullName}" creato con successo!\n\nEmail: ${email}\nRuolo: ${getRoleLabel(role)}`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante la creazione dell\'utente');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (roleValue: string) => {
    switch (roleValue) {
      case 'admin':
        return colors.error;
      case 'supplier':
        return colors.warning;
      case 'pickup_point':
        return colors.info;
      case 'consumer':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getRoleLabel = (roleValue: string) => {
    switch (roleValue) {
      case 'admin':
        return 'Amministratore';
      case 'supplier':
        return 'Fornitore';
      case 'pickup_point':
        return 'Punto di Ritiro';
      case 'consumer':
        return 'Consumatore';
      default:
        return roleValue;
    }
  };

  const getRoleIcon = (roleValue: string) => {
    switch (roleValue) {
      case 'admin':
        return { ios: 'shield.fill', android: 'admin_panel_settings' };
      case 'supplier':
        return { ios: 'building.2.fill', android: 'store' };
      case 'pickup_point':
        return { ios: 'mappin.circle.fill', android: 'location_on' };
      case 'consumer':
        return { ios: 'person.fill', android: 'person' };
      default:
        return { ios: 'person', android: 'person' };
    }
  };

  const roles: Array<'consumer' | 'supplier' | 'pickup_point' | 'admin'> = [
    'consumer',
    'supplier',
    'pickup_point',
    'admin',
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Crea Nuovo Utente',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informazioni Account</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="email@esempio.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimo 6 caratteri"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Conferma Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ripeti la password"
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informazioni Personali</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Mario Rossi"
                placeholderTextColor={colors.textTertiary}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefono</Text>
              <TextInput
                style={styles.input}
                placeholder="+39 123 456 7890"
                placeholderTextColor={colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ruolo *</Text>
            <Text style={styles.sectionDescription}>
              Seleziona il ruolo dell&apos;utente nel sistema
            </Text>
            
            <View style={styles.rolesGrid}>
              {roles.map((roleOption) => {
                const roleIcon = getRoleIcon(roleOption);
                const isSelected = role === roleOption;
                
                return (
                  <Pressable
                    key={roleOption}
                    style={({ pressed }) => [
                      styles.roleCard,
                      isSelected && styles.roleCardSelected,
                      pressed && styles.roleCardPressed,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRole(roleOption);
                      // Reset pickup point selection when changing role
                      if (roleOption !== 'consumer') {
                        setSelectedPickupPointId('');
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.roleIconContainer,
                        { backgroundColor: getRoleColor(roleOption) + '20' },
                      ]}
                    >
                      <IconSymbol
                        ios_icon_name={roleIcon.ios}
                        android_material_icon_name={roleIcon.android}
                        size={24}
                        color={getRoleColor(roleOption)}
                      />
                    </View>
                    <Text
                      style={[
                        styles.roleLabel,
                        isSelected && styles.roleLabelSelected,
                      ]}
                    >
                      {getRoleLabel(roleOption)}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {role === 'consumer' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Punto di Ritiro *</Text>
              <Text style={styles.sectionDescription}>
                Seleziona il punto di ritiro per questo consumatore
              </Text>
              
              {loadingPickupPoints ? (
                <View style={styles.loadingPickupPoints}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Caricamento punti di ritiro...</Text>
                </View>
              ) : pickupPoints.length > 0 ? (
                <View style={styles.pickupPointsList}>
                  {pickupPoints.map((point) => (
                    <Pressable
                      key={point.id}
                      style={({ pressed }) => [
                        styles.pickupPointCard,
                        selectedPickupPointId === point.id && styles.pickupPointCardSelected,
                        pressed && styles.pickupPointCardPressed,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedPickupPointId(point.id);
                      }}
                    >
                      <View style={styles.pickupPointInfo}>
                        <Text style={styles.pickupPointName}>{point.name}</Text>
                        <Text style={styles.pickupPointCity}>📍 {point.city}</Text>
                        <Text style={styles.pickupPointAddress}>{point.address}</Text>
                      </View>
                      {selectedPickupPointId === point.id && (
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={24}
                          color={colors.primary}
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyPickupPoints}>
                  <IconSymbol
                    ios_icon_name="mappin.slash"
                    android_material_icon_name="location_off"
                    size={48}
                    color={colors.textTertiary}
                  />
                  <Text style={styles.emptyText}>
                    Nessun punto di ritiro disponibile
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.info}
            />
            <Text style={styles.infoText}>
              L&apos;utente riceverà un&apos;email di conferma e potrà accedere immediatamente con le credenziali fornite.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              loading && styles.createButtonDisabled,
              pressed && !loading && styles.createButtonPressed,
            ]}
            onPress={handleCreateUser}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="person.badge.plus"
                  android_material_icon_name="person_add"
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.createButtonText}>Crea Utente</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
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
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  roleCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  roleLabelSelected: {
    color: colors.primary,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  pickupPointsList: {
    gap: 12,
  },
  pickupPointCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: colors.border,
  },
  pickupPointCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  pickupPointCardPressed: {
    opacity: 0.7,
  },
  pickupPointInfo: {
    flex: 1,
    marginRight: 12,
  },
  pickupPointName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  pickupPointCity: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  pickupPointAddress: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  loadingPickupPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyPickupPoints: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
