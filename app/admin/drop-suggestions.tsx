
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DropSuggestion {
  supplier_list_id: string;
  supplier_list_name: string;
  supplier_name: string;
  pickup_point_id: string;
  pickup_point_name: string;
  pickup_point_city: string;
  interest_count: number;
  unique_users: number;
  min_discount: number;
  max_discount: number;
  product_count: number;
}

export default function DropSuggestionsScreen() {
  const [suggestions, setSuggestions] = useState<DropSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [minInterests, setMinInterests] = useState(5); // Minimum number of interests to suggest a drop

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      console.log('Loading drop suggestions based on user interests...');
      setLoading(true);

      // Load the minimum users threshold from settings
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'min_users_for_drop_suggestion')
        .maybeSingle();

      const minUsersThreshold = settingsData?.setting_value 
        ? parseInt(settingsData.setting_value) 
        : 5; // Default to 5 if not set

      setMinInterests(minUsersThreshold);
      console.log(`Using minimum users threshold: ${minUsersThreshold}`);

      // Query to get suggestions based on user interests grouped by supplier list and pickup point
      const { data: interestData, error: interestError } = await supabase
        .from('user_interests')
        .select(`
          supplier_list_id,
          pickup_point_id,
          user_id,
          supplier_lists!inner (
            id,
            name,
            min_discount,
            max_discount,
            supplier_id,
            status
          ),
          pickup_points!inner (
            id,
            name,
            city,
            status
          )
        `)
        .eq('supplier_lists.status', 'active')
        .eq('pickup_points.status', 'active');

      if (interestError) {
        console.error('Error loading user interests:', interestError);
        throw interestError;
      }

      console.log(`Loaded ${interestData?.length || 0} user interests`);

      // Group by supplier_list_id and pickup_point_id
      const groupedInterests = new Map<string, {
        supplier_list_id: string;
        supplier_list_name: string;
        pickup_point_id: string;
        pickup_point_name: string;
        pickup_point_city: string;
        min_discount: number;
        max_discount: number;
        supplier_id: string;
        users: Set<string>;
      }>();

      interestData?.forEach((interest: any) => {
        const key = `${interest.supplier_list_id}_${interest.pickup_point_id}`;
        
        if (!groupedInterests.has(key)) {
          groupedInterests.set(key, {
            supplier_list_id: interest.supplier_list_id,
            supplier_list_name: interest.supplier_lists?.name || 'Lista Sconosciuta',
            pickup_point_id: interest.pickup_point_id,
            pickup_point_name: interest.pickup_points?.name || 'Punto Sconosciuto',
            pickup_point_city: interest.pickup_points?.city || 'Città Sconosciuta',
            min_discount: interest.supplier_lists?.min_discount || 0,
            max_discount: interest.supplier_lists?.max_discount || 0,
            supplier_id: interest.supplier_lists?.supplier_id || '',
            users: new Set(),
          });
        }

        groupedInterests.get(key)!.users.add(interest.user_id);
      });

      console.log(`Grouped into ${groupedInterests.size} unique list-city combinations`);

      // Check for existing active/pending drops to avoid duplicates
      const { data: existingDrops } = await supabase
        .from('drops')
        .select('supplier_list_id, pickup_point_id')
        .in('status', ['pending_approval', 'approved', 'active']);

      const existingDropKeys = new Set(
        existingDrops?.map(d => `${d.supplier_list_id}_${d.pickup_point_id}`) || []
      );

      console.log(`Found ${existingDropKeys.size} existing active/pending drops`);

      // Get supplier names
      const supplierIds = Array.from(new Set(
        Array.from(groupedInterests.values()).map(g => g.supplier_id)
      ));

      const { data: suppliers } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', supplierIds);

      const supplierMap = new Map(
        suppliers?.map(s => [s.user_id, s.full_name]) || []
      );

      // Get product counts for each list
      const listIds = Array.from(new Set(
        Array.from(groupedInterests.values()).map(g => g.supplier_list_id)
      ));

      const { data: productCounts } = await supabase
        .from('products')
        .select('supplier_list_id')
        .in('supplier_list_id', listIds)
        .eq('status', 'active')
        .gt('stock', 0);

      const productCountMap = new Map<string, number>();
      productCounts?.forEach(p => {
        const count = productCountMap.get(p.supplier_list_id) || 0;
        productCountMap.set(p.supplier_list_id, count + 1);
      });

      // Convert to suggestions array and filter
      const suggestionsArray: DropSuggestion[] = [];

      groupedInterests.forEach((group, key) => {
        const uniqueUsers = group.users.size;
        
        // Only suggest if:
        // 1. Meets minimum interest threshold
        // 2. No existing drop for this combination
        if (uniqueUsers >= minInterests && !existingDropKeys.has(key)) {
          suggestionsArray.push({
            supplier_list_id: group.supplier_list_id,
            supplier_list_name: group.supplier_list_name,
            supplier_name: supplierMap.get(group.supplier_id) || 'Fornitore Sconosciuto',
            pickup_point_id: group.pickup_point_id,
            pickup_point_name: group.pickup_point_name,
            pickup_point_city: group.pickup_point_city,
            interest_count: uniqueUsers,
            unique_users: uniqueUsers,
            min_discount: group.min_discount,
            max_discount: group.max_discount,
            product_count: productCountMap.get(group.supplier_list_id) || 0,
          });
        }
      });

      // Sort by interest count (descending)
      suggestionsArray.sort((a, b) => b.interest_count - a.interest_count);

      console.log(`Generated ${suggestionsArray.length} drop suggestions`);
      setSuggestions(suggestionsArray);

    } catch (error) {
      console.error('Error loading suggestions:', error);
      Alert.alert('Errore', 'Impossibile caricare i suggerimenti');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSuggestions();
  };

  const handleCreateDrop = async (suggestion: DropSuggestion) => {
    console.log('Admin creating drop from suggestion:', suggestion);
    
    Alert.alert(
      'Crea Drop',
      `Vuoi creare un drop per "${suggestion.supplier_list_name}" a ${suggestion.pickup_point_city}?\n\n${suggestion.unique_users} utenti hanno mostrato interesse.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Crea Drop',
          style: 'default',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              // Get platform settings for drop duration
              const { data: settings } = await supabase
                .from('app_settings')
                .select('setting_key, setting_value')
                .in('setting_key', ['drop_duration_days', 'min_drop_value', 'max_drop_value']);

              const settingsMap = new Map(
                settings?.map(s => [s.setting_key, s.setting_value]) || []
              );

              const dropDurationDays = parseInt(settingsMap.get('drop_duration_days') || '5');
              const maxDropValue = parseInt(settingsMap.get('max_drop_value') || '30000');

              // Calculate end time
              const endTime = new Date();
              endTime.setDate(endTime.getDate() + dropDurationDays);

              // Create the drop
              const { data: newDrop, error: dropError } = await supabase
                .from('drops')
                .insert({
                  supplier_list_id: suggestion.supplier_list_id,
                  pickup_point_id: suggestion.pickup_point_id,
                  name: `${suggestion.supplier_list_name} - ${suggestion.pickup_point_city}`,
                  current_discount: suggestion.min_discount,
                  current_value: 0,
                  target_value: maxDropValue,
                  status: 'pending_approval',
                  start_time: new Date().toISOString(),
                  end_time: endTime.toISOString(),
                })
                .select()
                .single();

              if (dropError) {
                console.error('Error creating drop:', dropError);
                Alert.alert('Errore', 'Impossibile creare il drop');
                return;
              }

              console.log('Drop created successfully:', newDrop.id);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Drop Creato!',
                `Il drop "${newDrop.name}" è stato creato con successo e è in attesa di approvazione.`,
                [
                  {
                    text: 'Visualizza',
                    onPress: () => {
                      router.push({
                        pathname: '/admin/drop-analytics',
                        params: { dropId: newDrop.id },
                      });
                    },
                  },
                  {
                    text: 'OK',
                    style: 'cancel',
                    onPress: () => {
                      // Reload suggestions to remove this one
                      loadSuggestions();
                    },
                  },
                ]
              );

            } catch (error) {
              console.error('Exception creating drop:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const renderSuggestion = (suggestion: DropSuggestion) => {
    return (
      <View key={`${suggestion.supplier_list_id}_${suggestion.pickup_point_id}`} style={styles.suggestionCard}>
        <View style={styles.suggestionHeader}>
          <View style={styles.interestBadge}>
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={20}
              color="#FF3B30"
            />
            <Text style={styles.interestCount}>{suggestion.unique_users}</Text>
          </View>
          <View style={styles.suggestionInfo}>
            <Text style={styles.suggestionTitle}>{suggestion.supplier_list_name}</Text>
            <Text style={styles.suggestionSupplier}>di {suggestion.supplier_name}</Text>
          </View>
        </View>

        <View style={styles.suggestionDetails}>
          <View style={styles.detailRow}>
            <IconSymbol
              ios_icon_name="location.fill"
              android_material_icon_name="location_on"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.detailText}>
              {suggestion.pickup_point_city} - {suggestion.pickup_point_name}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <IconSymbol
              ios_icon_name="person.2.fill"
              android_material_icon_name="group"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.detailText}>
              {suggestion.unique_users} utenti interessati
            </Text>
          </View>

          <View style={styles.detailRow}>
            <IconSymbol
              ios_icon_name="tag.fill"
              android_material_icon_name="local_offer"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.detailText}>
              Sconto: {suggestion.min_discount}% - {suggestion.max_discount}%
            </Text>
          </View>

          <View style={styles.detailRow}>
            <IconSymbol
              ios_icon_name="cube.box.fill"
              android_material_icon_name="inventory"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.detailText}>
              {suggestion.product_count} prodotti disponibili
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.createButtonPressed,
          ]}
          onPress={() => handleCreateDrop(suggestion)}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add_circle"
            size={20}
            color="#fff"
          />
          <Text style={styles.createButtonText}>Crea Drop</Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Suggerimenti Drop',
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Caricamento suggerimenti...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Suggerimenti Drop',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="lightbulb.fill"
              android_material_icon_name="lightbulb"
              size={32}
              color="#FF9800"
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Sistema di Suggerimenti Basato su Interessi</Text>
              <Text style={styles.infoText}>
                I drop vengono suggeriti in base al numero di utenti che hanno mostrato interesse per una lista in una specifica città.
                {'\n\n'}
                <Text style={styles.infoBold}>Soglia minima attuale:</Text> {minInterests} utenti interessati
                {'\n'}
                <Text style={styles.infoSecondary}>(Modificabile in Impostazioni → Suggerimenti Drop)</Text>
                {'\n\n'}
                <Text style={styles.infoBold}>Come funziona:</Text>
                {'\n'}• Gli utenti mostrano interesse per le liste tramite il pulsante "Mi Interessa"
                {'\n'}• Il sistema conta quanti utenti della stessa città sono interessati
                {'\n'}• Quando si raggiunge la soglia minima, appare un suggerimento qui
                {'\n'}• Puoi creare il drop con un click!
              </Text>
            </View>
          </View>

          {suggestions.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={24}
                  color="#FFD700"
                />
                <Text style={styles.sectionTitle}>
                  {suggestions.length} Suggeriment{suggestions.length === 1 ? 'o' : 'i'} Disponibil{suggestions.length === 1 ? 'e' : 'i'}
                </Text>
              </View>

              {suggestions.map(renderSuggestion)}
            </>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="tray"
                android_material_icon_name="inbox"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessun Suggerimento</Text>
              <Text style={styles.emptyText}>
                Al momento non ci sono liste con abbastanza utenti interessati per suggerire un drop.
                {'\n\n'}
                Incoraggia gli utenti a esplorare le liste e mostrare interesse!
              </Text>
            </View>
          )}
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
  infoSecondary: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  suggestionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  interestBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  interestCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF3B30',
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  suggestionSupplier: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  suggestionDetails: {
    gap: 12,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});
