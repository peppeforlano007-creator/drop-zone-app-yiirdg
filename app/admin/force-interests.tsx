
import { supabase } from '@/app/integrations/supabase/client';
import React, { useState, useEffect } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

interface SupplierList {
  id: string;
  name: string;
  supplier_name: string;
  min_discount: number;
  max_discount: number;
  product_count: number;
}

interface PickupPoint {
  id: string;
  name: string;
  city: string;
}

export default function ForceInterestsScreen() {
  const [lists, setLists] = useState<SupplierList[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [selectedPickupPointId, setSelectedPickupPointId] = useState<string>('');
  const [numberOfInterests, setNumberOfInterests] = useState<string>('5');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading supplier lists and pickup points...');
      setLoading(true);

      // Load active supplier lists with product counts
      const { data: listsData, error: listsError } = await supabase
        .from('supplier_lists')
        .select(`
          id,
          name,
          min_discount,
          max_discount,
          supplier_id
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (listsError) {
        console.error('Error loading lists:', listsError);
        throw listsError;
      }

      // Get supplier names
      const supplierIds = Array.from(new Set(listsData?.map(l => l.supplier_id) || []));
      const { data: suppliers } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', supplierIds);

      const supplierMap = new Map(suppliers?.map(s => [s.user_id, s.full_name]) || []);

      // Get product counts
      const listIds = listsData?.map(l => l.id) || [];
      const { data: products } = await supabase
        .from('products')
        .select('supplier_list_id')
        .in('supplier_list_id', listIds)
        .eq('status', 'active')
        .gt('stock', 0);

      const productCountMap = new Map<string, number>();
      products?.forEach(p => {
        const count = productCountMap.get(p.supplier_list_id) || 0;
        productCountMap.set(p.supplier_list_id, count + 1);
      });

      const formattedLists: SupplierList[] = listsData?.map(list => ({
        id: list.id,
        name: list.name,
        supplier_name: supplierMap.get(list.supplier_id) || 'Sconosciuto',
        min_discount: list.min_discount,
        max_discount: list.max_discount,
        product_count: productCountMap.get(list.id) || 0,
      })) || [];

      setLists(formattedLists);

      // Load active pickup points
      const { data: pointsData, error: pointsError } = await supabase
        .from('pickup_points')
        .select('id, name, city')
        .eq('status', 'active')
        .order('city', { ascending: true });

      if (pointsError) {
        console.error('Error loading pickup points:', pointsError);
        throw pointsError;
      }

      setPickupPoints(pointsData || []);

      console.log(`Loaded ${formattedLists.length} lists and ${pointsData?.length || 0} pickup points`);

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

    const count = parseInt(numberOfInterests);
    if (isNaN(count) || count < 1 || count > 100) {
      Alert.alert('Errore', 'Inserisci un numero valido tra 1 e 100');
      return;
    }

    const selectedList = lists.find(l => l.id === selectedListId);
    const selectedPoint = pickupPoints.find(p => p.id === selectedPickupPointId);

    if (!selectedList || !selectedPoint) {
      Alert.alert('Errore', 'Selezione non valida');
      return;
    }

    Alert.alert(
      'Conferma Creazione Interessi',
      `Vuoi creare ${count} interessi fittizi per:\n\n` +
      `📦 Lista: ${selectedList.name}\n` +
      `🏪 Fornitore: ${selectedList.supplier_name}\n` +
      `📍 Città: ${selectedPoint.city}\n\n` +
      `Questo creerà ${count} utenti fittizi con interesse per questa lista.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Crea Interessi',
          style: 'default',
          onPress: () => createFakeInterests(count, selectedList, selectedPoint),
        },
      ]
    );
  };

  const createFakeInterests = async (
    count: number,
    list: SupplierList,
    point: PickupPoint
  ) => {
    try {
      console.log(`Creating ${count} fake interests for list ${list.id} in ${point.city}...`);
      setProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Get a random product from the list for the interest
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('supplier_list_id', list.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!products) {
        Alert.alert('Errore', 'Nessun prodotto trovato nella lista');
        return;
      }

      // Create fake users and interests
      const createdUsers: string[] = [];
      
      for (let i = 0; i < count; i++) {
        // Create a fake user
        const fakeEmail = `test_user_${Date.now()}_${i}@fake.test`;
        const fakePassword = `TestPassword123!${i}`;
        
        console.log(`Creating fake user ${i + 1}/${count}...`);
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: fakeEmail,
          password: fakePassword,
          options: {
            data: {
              full_name: `Test User ${i + 1}`,
              role: 'consumer',
              pickup_point_id: point.id,
            },
          },
        });

        if (authError) {
          console.error(`Error creating fake user ${i + 1}:`, authError);
          continue;
        }

        if (!authData.user) {
          console.error(`No user returned for fake user ${i + 1}`);
          continue;
        }

        createdUsers.push(authData.user.id);

        // Create interest for this user
        const { error: interestError } = await supabase
          .from('user_interests')
          .insert({
            user_id: authData.user.id,
            product_id: products.id,
            supplier_list_id: list.id,
            pickup_point_id: point.id,
          });

        if (interestError) {
          console.error(`Error creating interest for user ${i + 1}:`, interestError);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Successfully created ${createdUsers.length} fake users with interests`);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Interessi Creati!',
        `Sono stati creati ${createdUsers.length} utenti fittizi con interesse per "${list.name}" a ${point.city}.\n\n` +
        `Vai ai Suggerimenti Drop per vedere il risultato!`,
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

    } catch (error) {
      console.error('Exception creating fake interests:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante la creazione degli interessi');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Forza Interessi',
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

  const selectedList = lists.find(l => l.id === selectedListId);
  const selectedPoint = pickupPoints.find(p => p.id === selectedPickupPointId);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Forza Interessi',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.warningCard}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={32}
              color="#FF9800"
            />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Strumento di Test</Text>
              <Text style={styles.warningText}>
                Questo strumento crea utenti fittizi con interessi per testare il sistema di suggerimenti drop.
                {'\n\n'}
                Gli utenti creati sono reali nel database ma hanno email fake (test_user_*@fake.test).
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Seleziona Lista Fornitore</Text>
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
                {lists.map((list) => (
                  <Picker.Item
                    key={list.id}
                    label={`${list.name} - ${list.supplier_name} (${list.product_count} prodotti)`}
                    value={list.id}
                  />
                ))}
              </Picker>
            </View>

            {selectedList && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Lista Selezionata:</Text>
                <Text style={styles.infoValue}>{selectedList.name}</Text>
                <Text style={styles.infoSecondary}>
                  Fornitore: {selectedList.supplier_name}
                </Text>
                <Text style={styles.infoSecondary}>
                  Sconto: {selectedList.min_discount}% - {selectedList.max_discount}%
                </Text>
                <Text style={styles.infoSecondary}>
                  Prodotti: {selectedList.product_count}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Seleziona Punto di Ritiro (Città)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedPickupPointId}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPickupPointId(value);
                }}
                style={styles.picker}
              >
                <Picker.Item label="Seleziona una città..." value="" />
                {pickupPoints.map((point) => (
                  <Picker.Item
                    key={point.id}
                    label={`${point.city} - ${point.name}`}
                    value={point.id}
                  />
                ))}
              </Picker>
            </View>

            {selectedPoint && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Punto di Ritiro Selezionato:</Text>
                <Text style={styles.infoValue}>{selectedPoint.city}</Text>
                <Text style={styles.infoSecondary}>{selectedPoint.name}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Numero di Interessi da Creare</Text>
            <TextInput
              style={styles.numberInput}
              value={numberOfInterests}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '');
                setNumberOfInterests(cleaned);
              }}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={colors.textTertiary}
              maxLength={3}
            />
            <Text style={styles.helperText}>
              Inserisci un numero tra 1 e 100. Ogni interesse rappresenta un utente fittizio.
            </Text>
          </View>

          {selectedList && selectedPoint && numberOfInterests && (
            <View style={styles.previewCard}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={24}
                color={colors.primary}
              />
              <View style={styles.previewContent}>
                <Text style={styles.previewTitle}>Anteprima</Text>
                <Text style={styles.previewText}>
                  Verranno creati <Text style={styles.previewBold}>{numberOfInterests} utenti fittizi</Text> con interesse per:
                  {'\n\n'}
                  📦 <Text style={styles.previewBold}>{selectedList.name}</Text>
                  {'\n'}🏪 {selectedList.supplier_name}
                  {'\n'}📍 <Text style={styles.previewBold}>{selectedPoint.city}</Text>
                  {'\n\n'}
                  Dopo la creazione, controlla i Suggerimenti Drop per vedere se appare un suggerimento!
                </Text>
              </View>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              (!selectedListId || !selectedPickupPointId || !numberOfInterests || processing) && styles.createButtonDisabled,
              pressed && styles.createButtonPressed,
            ]}
            onPress={handleForceInterests}
            disabled={!selectedListId || !selectedPickupPointId || !numberOfInterests || processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="bolt.fill"
                  android_material_icon_name="flash_on"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.createButtonText}>Crea Interessi Fittizi</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.viewSuggestionsButton,
              pressed && styles.viewSuggestionsButtonPressed,
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
            <Text style={styles.viewSuggestionsButtonText}>Vedi Suggerimenti Drop</Text>
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
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF9800',
    gap: 16,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoSecondary: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  numberInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '08',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    gap: 16,
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  previewBold: {
    fontWeight: '700',
    color: colors.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  viewSuggestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  viewSuggestionsButtonPressed: {
    opacity: 0.7,
  },
  viewSuggestionsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
});
