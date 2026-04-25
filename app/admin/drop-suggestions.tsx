
import { supabase } from '@/app/integrations/supabase/client';
import React, { useState, useEffect, useCallback } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DropSuggestionsScreen() {
  const [dropInterests, setDropInterests] = useState<DropInterestRow[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(true);
  const [interestsRefreshing, setInterestsRefreshing] = useState(false);

  useEffect(() => {
    loadDropInterests();
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ title: 'Suggerimenti & Interessi Drop' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {interestsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        ) : (
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
