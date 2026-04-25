
import { supabase } from '@/app/integrations/supabase/client';
import React, { useState, useEffect, useCallback } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface DropInterestRow {
  drop_id: string;
  drop_name: string;
  pickup_point_id: string | null;
  pickup_point_name: string;
  pickup_point_city: string;
  interest_count: number;
}

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DropSuggestionsScreen() {
  const [activeTab, setActiveTab] = useState<'interests' | 'suggestions'>('interests');

  // Tab 1 state
  const [dropInterests, setDropInterests] = useState<DropInterestRow[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(true);
  const [interestsRefreshing, setInterestsRefreshing] = useState(false);

  // Tab 2 state
  const [suggestions, setSuggestions] = useState<DropSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestionsRefreshing, setSuggestionsRefreshing] = useState(false);
  const [minInterests, setMinInterests] = useState(5);

  useEffect(() => {
    loadDropInterests();
    loadSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Tab 1: Drop Interests ─────────────────────────────────────────────────

  const loadDropInterests = useCallback(async () => {
    console.log('[drop-suggestions] Loading drop interests from drop_interests table...');
    setInterestsLoading(true);
    try {
      // Query drop_interests joined with drops (approved only) and pickup_points
      const { data, error } = await supabase
        .from('drop_interests')
        .select(`
          drop_id,
          pickup_point_id,
          drops!inner (
            id,
            name,
            status,
            supplier_lists (
              name
            )
          ),
          pickup_points (
            id,
            name,
            city
          )
        `)
        .eq('drops.status', 'approved');

      if (error) {
        // Table may not exist yet — show empty state gracefully
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('[drop-suggestions] drop_interests table does not exist yet — showing empty state');
          setDropInterests([]);
          return;
        }
        console.error('[drop-suggestions] Error loading drop interests:', error);
        setDropInterests([]);
        return;
      }

      console.log('[drop-suggestions] Raw drop_interests rows:', data?.length ?? 0);

      // Group by drop_id + pickup_point_id
      const grouped = new Map<string, DropInterestRow>();
      (data ?? []).forEach((row: any) => {
        const drop = row.drops;
        const pp = row.pickup_points;
        const key = `${row.drop_id}_${row.pickup_point_id ?? 'null'}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            drop_id: row.drop_id,
            drop_name: drop?.supplier_lists?.name ?? drop?.name ?? 'Drop',
            pickup_point_id: row.pickup_point_id ?? null,
            pickup_point_name: pp?.name ?? 'Punto sconosciuto',
            pickup_point_city: pp?.city ?? 'Città sconosciuta',
            interest_count: 0,
          });
        }
        grouped.get(key)!.interest_count += 1;
      });

      const result = Array.from(grouped.values()).sort(
        (a, b) => b.interest_count - a.interest_count
      );

      console.log('[drop-suggestions] Grouped drop interest rows:', result.length);
      setDropInterests(result);
    } catch (err: any) {
      console.error('[drop-suggestions] Exception loading drop interests:', err?.message);
      setDropInterests([]);
    } finally {
      setInterestsLoading(false);
      setInterestsRefreshing(false);
    }
  }, []);

  const handleActivateDrop = async (dropId: string, dropName: string, pickupPointId: string | null) => {
    console.log('[drop-suggestions] Admin tapping Attiva Drop — dropId:', dropId, 'name:', dropName);
    Alert.alert(
      'Attiva Drop',
      `Vuoi attivare il drop "${dropName}"?\n\nIl drop diventerà immediatamente prenotabile dagli utenti.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Attiva',
          style: 'default',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              console.log('[drop-suggestions] Activating drop:', dropId);
              const { error } = await supabase
                .from('drops')
                .update({
                  status: 'active',
                  activated_at: new Date().toISOString(),
                })
                .eq('id', dropId);

              if (error) {
                console.error('[drop-suggestions] Error activating drop:', error);
                Alert.alert('Errore', 'Impossibile attivare il drop: ' + error.message);
                return;
              }

              console.log('[drop-suggestions] Drop activated successfully:', dropId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Drop Attivato!',
                `Il drop "${dropName}" è ora attivo e prenotabile dagli utenti.`,
                [{ text: 'OK', onPress: () => loadDropInterests() }]
              );
            } catch (err: any) {
              console.error('[drop-suggestions] Exception activating drop:', err?.message);
              Alert.alert('Errore', 'Si è verificato un errore durante l\'attivazione.');
            }
          },
        },
      ]
    );
  };

  // ─── Tab 2: Suggestions (legacy) ──────────────────────────────────────────

  const loadSuggestions = useCallback(async () => {
    console.log('[drop-suggestions] Loading list-based suggestions...');
    setSuggestionsLoading(true);
    try {
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'min_users_for_drop_suggestion')
        .maybeSingle();

      const minUsersThreshold = settingsData?.setting_value
        ? parseInt(settingsData.setting_value)
        : 5;
      setMinInterests(minUsersThreshold);

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
        console.error('[drop-suggestions] Error loading user interests:', interestError);
        setSuggestions([]);
        return;
      }

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

      const { data: existingDrops } = await supabase
        .from('drops')
        .select('supplier_list_id, pickup_point_id')
        .in('status', ['pending_approval', 'approved', 'active']);

      const existingDropKeys = new Set(
        existingDrops?.map(d => `${d.supplier_list_id}_${d.pickup_point_id}`) || []
      );

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

      const suggestionsArray: DropSuggestion[] = [];
      groupedInterests.forEach((group, key) => {
        const uniqueUsers = group.users.size;
        if (uniqueUsers >= minUsersThreshold && !existingDropKeys.has(key)) {
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

      suggestionsArray.sort((a, b) => b.interest_count - a.interest_count);
      console.log('[drop-suggestions] Generated', suggestionsArray.length, 'list-based suggestions');
      setSuggestions(suggestionsArray);
    } catch (error) {
      console.error('[drop-suggestions] Error loading suggestions:', error);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
      setSuggestionsRefreshing(false);
    }
  }, []);

  const handleCreateDrop = async (suggestion: DropSuggestion) => {
    console.log('[drop-suggestions] Admin creating drop from suggestion:', suggestion.supplier_list_name, suggestion.pickup_point_city);
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
              const { data: settings } = await supabase
                .from('app_settings')
                .select('setting_key, setting_value')
                .in('setting_key', ['drop_duration_days', 'min_drop_value', 'max_drop_value']);

              const settingsMap = new Map(
                settings?.map(s => [s.setting_key, s.setting_value]) || []
              );
              const dropDurationDays = parseInt(settingsMap.get('drop_duration_days') || '5');
              const maxDropValue = parseInt(settingsMap.get('max_drop_value') || '30000');

              const endTime = new Date();
              endTime.setDate(endTime.getDate() + dropDurationDays);

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
                console.error('[drop-suggestions] Error creating drop:', dropError);
                Alert.alert('Errore', 'Impossibile creare il drop');
                return;
              }

              console.log('[drop-suggestions] Drop created:', newDrop.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Drop Creato!',
                `Il drop "${newDrop.name}" è stato creato con successo ed è in attesa di approvazione.`,
                [
                  {
                    text: 'Visualizza',
                    onPress: () => router.push({ pathname: '/admin/drop-analytics', params: { dropId: newDrop.id } }),
                  },
                  { text: 'OK', style: 'cancel', onPress: () => loadSuggestions() },
                ]
              );
            } catch (error) {
              console.error('[drop-suggestions] Exception creating drop:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const renderDropInterestRow = (row: DropInterestRow) => {
    const key = `${row.drop_id}_${row.pickup_point_id ?? 'null'}`;
    return (
      <View key={key} style={styles.interestCard}>
        <View style={styles.interestCardHeader}>
          <View style={styles.interestCountBadge}>
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={18}
              color="#E11D48"
            />
            <Text style={styles.interestCountText}>{row.interest_count}</Text>
          </View>
          <View style={styles.interestCardInfo}>
            <Text style={styles.interestCardTitle} numberOfLines={1}>{row.drop_name}</Text>
            <View style={styles.interestCardLocation}>
              <IconSymbol
                ios_icon_name="mappin.circle.fill"
                android_material_icon_name="location_on"
                size={13}
                color={colors.textSecondary}
              />
              <Text style={styles.interestCardCity}>
                {row.pickup_point_city}
              </Text>
              <Text style={styles.interestCardPpSep}>·</Text>
              <Text style={styles.interestCardPp} numberOfLines={1}>{row.pickup_point_name}</Text>
            </View>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.activateButton, pressed && styles.activateButtonPressed]}
          onPress={() => handleActivateDrop(row.drop_id, row.drop_name, row.pickup_point_id)}
        >
          <IconSymbol
            ios_icon_name="bolt.fill"
            android_material_icon_name="flash_on"
            size={16}
            color="#FFF"
          />
          <Text style={styles.activateButtonText}>Attiva Drop</Text>
        </Pressable>
      </View>
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
            <Text style={styles.detailText}>{suggestion.unique_users} utenti interessati</Text>
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
            <Text style={styles.detailText}>{suggestion.product_count} prodotti disponibili</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.createButton, pressed && styles.createButtonPressed]}
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

  // ─── Render ────────────────────────────────────────────────────────────────

  const isLoading = activeTab === 'interests' ? interestsLoading : suggestionsLoading;

  return (
    <>
      <Stack.Screen options={{ title: 'Suggerimenti & Interessi Drop' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>

        {/* Tab switcher */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabItem, activeTab === 'interests' && styles.tabItemActive]}
            onPress={() => {
              console.log('[drop-suggestions] Switched to tab: Interessi Drop');
              setActiveTab('interests');
            }}
          >
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={15}
              color={activeTab === 'interests' ? '#E11D48' : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === 'interests' && styles.tabLabelActive]}>
              Interessi Drop
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabItem, activeTab === 'suggestions' && styles.tabItemActive]}
            onPress={() => {
              console.log('[drop-suggestions] Switched to tab: Suggerimenti Lista');
              setActiveTab('suggestions');
            }}
          >
            <IconSymbol
              ios_icon_name="lightbulb.fill"
              android_material_icon_name="lightbulb"
              size={15}
              color={activeTab === 'suggestions' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === 'suggestions' && styles.tabLabelActive]}>
              Suggerimenti Lista
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        ) : activeTab === 'interests' ? (
          /* ── Tab 1: Drop Interests ── */
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
              <RefreshControl
                refreshing={interestsRefreshing}
                onRefresh={() => { setInterestsRefreshing(true); loadDropInterests(); }}
                tintColor={colors.primary}
              />
            }
          >
            <View style={styles.sectionInfoCard}>
              <IconSymbol
                ios_icon_name="heart.circle.fill"
                android_material_icon_name="favorite"
                size={28}
                color="#E11D48"
              />
              <View style={styles.sectionInfoContent}>
                <Text style={styles.sectionInfoTitle}>Drop Approvati — Interesse per Città</Text>
                <Text style={styles.sectionInfoText}>
                  Mostra quanti utenti hanno premuto "Mi Interessa" su ciascun drop approvato, raggruppati per punto di ritiro. Usa questi dati per decidere quali drop attivare.
                </Text>
              </View>
            </View>

            {dropInterests.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <IconSymbol
                    ios_icon_name="chart.bar.fill"
                    android_material_icon_name="bar_chart"
                    size={22}
                    color="#E11D48"
                  />
                  <Text style={styles.sectionTitle}>
                    {dropInterests.length} combinazion{dropInterests.length === 1 ? 'e' : 'i'} drop-città
                  </Text>
                </View>
                {dropInterests.map(renderDropInterestRow)}
              </>
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="heart.slash"
                  android_material_icon_name="heart_broken"
                  size={64}
                  color={colors.textTertiary}
                />
                <Text style={styles.emptyTitle}>Nessun Interesse Registrato</Text>
                <Text style={styles.emptyText}>
                  Nessun utente ha ancora premuto "Mi Interessa" su drop approvati.
                  {'\n\n'}
                  Assicurati che la tabella drop_interests sia stata creata nel database.
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          /* ── Tab 2: Legacy Suggestions ── */
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
              <RefreshControl
                refreshing={suggestionsRefreshing}
                onRefresh={() => { setSuggestionsRefreshing(true); loadSuggestions(); }}
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
                <Text style={styles.infoTitle}>Suggerimenti da Interessi Lista</Text>
                <Text style={styles.infoText}>
                  Segnale secondario: drop suggeriti in base agli utenti che hanno mostrato interesse per una lista in una specifica città.
                  {'\n\n'}
                  <Text style={styles.infoBold}>Soglia minima attuale:</Text> {minInterests} utenti interessati
                  {'\n'}
                  <Text style={styles.infoSecondary}>(Modificabile in Impostazioni → Suggerimenti Drop)</Text>
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
        )}
      </SafeAreaView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    fontFamily: 'System',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  tabItemActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  tabLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },

  // Section info cards
  sectionInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    gap: 14,
  },
  sectionInfoContent: {
    flex: 1,
  },
  sectionInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    fontFamily: 'System',
  },
  sectionInfoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    fontFamily: 'System',
  },

  // Interest cards (Tab 1)
  interestCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  interestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  interestCountBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    flexShrink: 0,
  },
  interestCountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E11D48',
    fontFamily: 'System',
  },
  interestCardInfo: {
    flex: 1,
  },
  interestCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 5,
    fontFamily: 'System',
  },
  interestCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  interestCardCity: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  interestCardPpSep: {
    fontSize: 13,
    color: colors.textTertiary,
    fontFamily: 'System',
  },
  interestCardPp: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'System',
    flex: 1,
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
  },
  activateButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  activateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'System',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'System',
  },

  // Legacy suggestion cards (Tab 2)
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    fontFamily: 'System',
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: 'System',
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
    fontFamily: 'System',
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'System',
  },
  suggestionSupplier: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'System',
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
    fontFamily: 'System',
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
    fontFamily: 'System',
  },

  // Empty state
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
    fontFamily: 'System',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    fontFamily: 'System',
  },
});
