
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import React, { useState, useEffect } from 'react';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
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
import { Stack, router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

interface SupplierList {
  id: string;
  name: string;
  supplier_name: string;
  product_count: number;
  status: string;
}

interface PickupPoint {
  id: string;
  name: string;
  city: string;
  status: string;
}

interface User {
  user_id: string;
  full_name: string;
  email: string;
  pickup_point_id: string;
}

export default function ForceInterestsScreen() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [supplierLists, setSupplierLists] = useState<SupplierList[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [selectedPickupPointId, setSelectedPickupPointId] = useState<string>('');
  const [numberOfInterests, setNumberOfInterests] = useState<string>('5');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading data for force interests tool...');

      // Load supplier lists
      const { data: listsData, error: listsError } = await supabase
        .from('supplier_lists')
        .select(`
          id,
          name,
          status,
          profiles!supplier_lists_supplier_id_fkey (
            full_name
          )
        `)
        .eq('status', 'active')
        .order('name');

      if (listsError) {
        console.error('Error loading supplier lists:', listsError);
        throw listsError;
      }

      // Get product counts for each list
      const listIds = listsData?.map(l => l.id) || [];
      const { data: productsData } = await supabase
        .from('products')
        .select('supplier_list_id')
        .in('supplier_list_id', listIds)
        .eq('status', 'active');

      const productCounts = new Map<string, number>();
      productsData?.forEach(p => {
        const count = productCounts.get(p.supplier_list_id) || 0;
        productCounts.set(p.supplier_list_id, count + 1);
      });

      const formattedLists: SupplierList[] = listsData?.map(list => ({
        id: list.id,
        name: list.name,
        supplier_name: (list.profiles as any)?.full_name || 'Sconosciuto',
        product_count: productCounts.get(list.id) || 0,
        status: list.status,
      })) || [];

      setSupplierLists(formattedLists);
      console.log(`Loaded ${formattedLists.length} supplier lists`);

      // Load pickup points
      const { data: pointsData, error: pointsError } = await supabase
        .from('pickup_points')
        .select('id, name, city, status')
        .eq('status', 'active')
        .order('city');

      if (pointsError) {
        console.error('Error loading pickup points:', pointsError);
        throw pointsError;
      }

      setPickupPoints(pointsData || []);
      console.log(`Loaded ${pointsData?.length || 0} pickup points`);

      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, pickup_point_id')
        .eq('role', 'consumer')
        .not('pickup_point_id', 'is', null);

      if (usersError) {
        console.error('Error loading users:', usersError);
        throw usersError;
      }

      setUsers(usersData || []);
      console.log(`Loaded ${usersData?.length || 0} users`);

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati');
    } finally {
      setLoading(false);
    }
  };

  const handleForceInterests = async () => {
    if (!selectedListId) {
      Alert.alert('Errore', 'Seleziona una lista fornitore');
      return;
    }

    if (!selectedPickupPointId) {
      Alert.alert('Errore', 'Seleziona un punto di ritiro');
      return;
    }

    const numInterests = parseInt(numberOfInterests);
    if (isNaN(numInterests) || numInterests < 1 || numInterests > 100) {
      Alert.alert('Errore', 'Inserisci un numero valido tra 1 e 100');
      return;
    }

    // Get users from the selected pickup point
    const usersFromPoint = users.filter(u => u.pickup_point_id === selectedPickupPointId);

    if (usersFromPoint.length === 0) {
      Alert.alert(
        'Nessun Utente',
        'Non ci sono utenti registrati in questo punto di ritiro. Crea prima degli utenti consumer.'
      );
      return;
    }

    if (usersFromPoint.length < numInterests) {
      Alert.alert(
        'Utenti Insufficienti',
        `Ci sono solo ${usersFromPoint.length} utenti in questo punto di ritiro. Vuoi creare interessi per tutti loro?`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Continua',
            onPress: () => createInterests(usersFromPoint.slice(0, numInterests)),
          },
        ]
      );
      return;
    }

    const selectedList = supplierLists.find(l => l.id === selectedListId);
    const selectedPoint = pickupPoints.find(p => p.id === selectedPickupPointId);

    Alert.alert(
      'Conferma Creazione Interessi',
      `Vuoi creare ${numInterests} interessi per:\n\n` +
      `📦 Lista: ${selectedList?.name}\n` +
      `🏪 Fornitore: ${selectedList?.supplier_name}\n` +
      `📍 Punto di Ritiro: ${selectedPoint?.city}\n\n` +
      `Questo simulerà ${numInterests} utenti che mostrano interesse per questa lista.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Crea Interessi',
          style: 'default',
          onPress: () => createInterests(usersFromPoint.slice(0, numInterests)),
        },
      ]
    );
  };

  const createInterests = async (selectedUsers: User[]) => {
    try {
      setProcessing(true);
      console.log(`Creating ${selectedUsers.length} interests...`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Check for existing interests
      const { data: existingInterests } = await supabase
        .from('user_interests')
        .select('user_id')
        .eq('supplier_list_id', selectedListId)
        .in('user_id', selectedUsers.map(u => u.user_id));

      const existingUserIds = new Set(existingInterests?.map(i => i.user_id) || []);
      const usersToAdd = selectedUsers.filter(u => !existingUserIds.has(u.user_id));

      if (usersToAdd.length === 0) {
        Alert.alert(
          'Interessi Già Esistenti',
          'Tutti gli utenti selezionati hanno già mostrato interesse per questa lista.'
        );
        return;
      }

      console.log(`Adding ${usersToAdd.length} new interests (${existingUserIds.size} already exist)`);

      // Create interests
      const interestsToInsert = usersToAdd.map(user => ({
        user_id: user.user_id,
        supplier_list_id: selectedListId,
        pickup_point_id: selectedPickupPointId,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('user_interests')
        .insert(interestsToInsert);

      if (insertError) {
        console.error('Error inserting interests:', insertError);
        throw insertError;
      }

      console.log('Interests created successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        '✅ Interessi Creati!',
        `${usersToAdd.length} interessi sono stati creati con successo.\n\n` +
        `Vai alla schermata "Suggerimenti Drop" per vedere se questa combinazione ora appare come suggerimento.`,
        [
          {
            text: 'Vedi Suggerimenti',
            onPress: () => {
              router.push('/admin/drop-suggestions');
            },
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );

      // Reset form
      setSelectedListId('');
      setSelectedPickupPointId('');
      setNumberOfInterests('5');

    } catch (error) {
      console.error('Error creating interests:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Impossibile creare gli interessi');
    } finally {
      setProcessing(false);
    }
  };

  const handleClearInterests = async () => {
    if (!selectedListId || !selectedPickupPointId) {
      Alert.alert('Errore', 'Seleziona una lista e un punto di ritiro');
      return;
    }

    const selectedList = supplierLists.find(l => l.id === selectedListId);
    const selectedPoint = pickupPoints.find(p => p.id === selectedPickupPointId);

    Alert.alert(
      '⚠️ Elimina Interessi',
      `Vuoi eliminare TUTTI gli interessi per:\n\n` +
      `📦 Lista: ${selectedList?.name}\n` +
      `📍 Punto di Ritiro: ${selectedPoint?.city}\n\n` +
      `Questa azione è irreversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              const { error } = await supabase
                .from('user_interests')
                .delete()
                .eq('supplier_list_id', selectedListId)
                .eq('pickup_point_id', selectedPickupPointId);

              if (error) {
                console.error('Error deleting interests:', error);
                throw error;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('✅ Successo', 'Interessi eliminati con successo');

            } catch (error) {
              console.error('Error clearing interests:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Errore', 'Impossibile eliminare gli interessi');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const getAvailableUsersCount = () => {
    if (!selectedPickupPointId) return 0;
    return users.filter(u => u.pickup_point_id === selectedPickupPointId).length;
  };

  const selectedList = supplierLists.find(l => l.id === selectedListId);
  const selectedPoint = pickupPoints.find(p => p.id === selectedPickupPointId);
  const availableUsers = getAvailableUsersCount();

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Forza Interessi (Test)',
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Forza Interessi (Test)',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="wrench.and.screwdriver.fill"
              android_material_icon_name="build"
              size={32}
              color="#FF9800"
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Strumento di Test per Interessi</Text>
              <Text style={styles.infoText}>
                Questo strumento ti permette di simulare utenti che mostrano interesse per una lista fornitore in un punto di ritiro specifico.
                {'\n\n'}
                <Text style={styles.infoBold}>Utilità:</Text>
                {'\n'}• Testare il sistema di suggerimenti drop
                {'\n'}• Verificare la soglia minima di interessi
                {'\n'}• Simulare scenari reali senza utenti veri
                {'\n\n'}
                <Text style={styles.infoWarning}>⚠️ Solo per testing - non usare in produzione!</Text>
              </Text>
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configurazione</Text>

            {/* Supplier List Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Lista Fornitore</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedListId}
                  onValueChange={(value) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedListId(value);
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Seleziona una lista..." value="" />
                  {supplierLists.map(list => (
                    <Picker.Item
                      key={list.id}
                      label={`${list.name} - ${list.supplier_name} (${list.product_count} prodotti)`}
                      value={list.id}
                    />
                  ))}
                </Picker>
              </View>
              {selectedList && (
                <View style={styles.selectionInfo}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={16}
                    color={colors.success}
                  />
                  <Text style={styles.selectionInfoText}>
                    {selectedList.name} - {selectedList.product_count} prodotti
                  </Text>
                </View>
              )}
            </View>

            {/* Pickup Point Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Punto di Ritiro</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedPickupPointId}
                  onValueChange={(value) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPickupPointId(value);
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Seleziona un punto di ritiro..." value="" />
                  {pickupPoints.map(point => (
                    <Picker.Item
                      key={point.id}
                      label={`${point.city} - ${point.name}`}
                      value={point.id}
                    />
                  ))}
                </Picker>
              </View>
              {selectedPoint && (
                <View style={styles.selectionInfo}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={16}
                    color={colors.success}
                  />
                  <Text style={styles.selectionInfoText}>
                    {selectedPoint.city} - {availableUsers} utenti disponibili
                  </Text>
                </View>
              )}
            </View>

            {/* Number of Interests Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Numero di Interessi da Creare</Text>
              <TextInput
                style={styles.numberInput}
                value={numberOfInterests}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setNumberOfInterests(cleaned);
                }}
                placeholder="5"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={styles.inputHint}>
                Inserisci un numero tra 1 e 100
              </Text>
            </View>
          </View>

          {/* Preview Section */}
          {selectedListId && selectedPickupPointId && numberOfInterests && (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <IconSymbol
                  ios_icon_name="eye.fill"
                  android_material_icon_name="visibility"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.previewTitle}>Anteprima</Text>
              </View>
              
              <View style={styles.previewContent}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Lista:</Text>
                  <Text style={styles.previewValue}>{selectedList?.name}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Fornitore:</Text>
                  <Text style={styles.previewValue}>{selectedList?.supplier_name}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Città:</Text>
                  <Text style={styles.previewValue}>{selectedPoint?.city}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Interessi:</Text>
                  <Text style={styles.previewValue}>{numberOfInterests}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Utenti disponibili:</Text>
                  <Text style={styles.previewValue}>{availableUsers}</Text>
                </View>
              </View>

              {availableUsers < parseInt(numberOfInterests) && (
                <View style={styles.warningBox}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle.fill"
                    android_material_icon_name="warning"
                    size={20}
                    color="#FF9800"
                  />
                  <Text style={styles.warningText}>
                    Ci sono solo {availableUsers} utenti disponibili. Verranno creati {Math.min(availableUsers, parseInt(numberOfInterests))} interessi.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.primaryButton,
                (processing || !selectedListId || !selectedPickupPointId || !numberOfInterests) && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleForceInterests}
              disabled={processing || !selectedListId || !selectedPickupPointId || !numberOfInterests}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="plus.circle.fill"
                    android_material_icon_name="add_circle"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.primaryButtonText}>Crea Interessi</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.dangerButton,
                (processing || !selectedListId || !selectedPickupPointId) && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleClearInterests}
              disabled={processing || !selectedListId || !selectedPickupPointId}
            >
              <IconSymbol
                ios_icon_name="trash.fill"
                android_material_icon_name="delete"
                size={20}
                color="#fff"
              />
              <Text style={styles.dangerButtonText}>Elimina Interessi</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/drop-suggestions');
              }}
            >
              <IconSymbol
                ios_icon_name="lightbulb.fill"
                android_material_icon_name="lightbulb"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.secondaryButtonText}>Vedi Suggerimenti Drop</Text>
            </Pressable>
          </View>

          {/* Help Section */}
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>💡 Come Usare Questo Strumento</Text>
            <Text style={styles.helpText}>
              1. Seleziona una lista fornitore attiva
              {'\n'}2. Seleziona un punto di ritiro
              {'\n'}3. Inserisci il numero di interessi da simulare
              {'\n'}4. Clicca "Crea Interessi"
              {'\n'}5. Vai su "Suggerimenti Drop" per vedere se appare un suggerimento
              {'\n\n'}
              <Text style={styles.helpBold}>Nota:</Text> Il sistema suggerirà un drop solo se il numero di interessi raggiunge la soglia minima configurata nelle impostazioni (attualmente visibile nella schermata Suggerimenti Drop).
            </Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  infoBold: {
    fontWeight: '700',
    color: colors.text,
  },
  infoWarning: {
    fontWeight: '700',
    color: '#FF9800',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: colors.text,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: colors.success + '15',
    padding: 10,
    borderRadius: 8,
  },
  selectionInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
    flex: 1,
  },
  numberInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  inputHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  previewContent: {
    gap: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  actionsSection: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  helpCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  helpText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  helpBold: {
    fontWeight: '700',
    color: colors.text,
  },
});
