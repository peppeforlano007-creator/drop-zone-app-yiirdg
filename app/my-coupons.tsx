
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import {
  getLoyaltyLevel,
  getLoyaltyLevelColor,
  getLoyaltyDiscount,
  getNextLevelInfo,
} from '@/utils/loyaltyHelpers';

export default function MyPointsScreen() {
  const { user } = useAuth();
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;

    console.log('MyPoints: Loading points for user', user.id);
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('loyalty_points, points_balance, points_total')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('MyPoints: Error loading profile:', error);
      } else {
        const points = (data as any)?.loyalty_points ?? (data as any)?.points_balance ?? (data as any)?.points_total ?? 0;
        setLoyaltyPoints(points);
        console.log('MyPoints: loyalty_points:', points);
      }
    } catch (error) {
      console.error('MyPoints: Exception loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const loyaltyLevel = getLoyaltyLevel(loyaltyPoints);
  const loyaltyLevelColor = getLoyaltyLevelColor(loyaltyLevel);
  const discount = getLoyaltyDiscount(loyaltyLevel);
  const nextLevelInfo = getNextLevelInfo(loyaltyPoints);

  const progressBase = loyaltyLevel === 'Nuovo' ? 0 : loyaltyLevel === 'Fedele' ? 100 : loyaltyLevel === 'VIP' ? 300 : 700;
  const progressMax = loyaltyLevel === 'Nuovo' ? 100 : loyaltyLevel === 'Fedele' ? 300 : loyaltyLevel === 'VIP' ? 700 : 700;
  const progressValue = nextLevelInfo
    ? Math.min((loyaltyPoints - progressBase) / (progressMax - progressBase), 1)
    : 1;
  const progressPercent = `${Math.round(progressValue * 100)}%`;

  const discountLabel = discount > 0 ? `Sconto attivo: −${discount}% su ogni ordine` : 'Nessuno sconto attivo';

  const levelExplanation = discount > 0
    ? `Sei al livello ${loyaltyLevel}. Ogni ordine che effettui ha uno sconto automatico del ${discount}% applicato alla chiusura del drop. Lo sconto non scala i tuoi punti.`
    : `Sei al livello Nuovo. Raggiungi 100 punti ritirando i tuoi ordini per ottenere il 3% di sconto automatico.`;

  const nextLevelDiscount = nextLevelInfo
    ? getLoyaltyDiscount(getLoyaltyLevel(loyaltyPoints + (nextLevelInfo?.pointsNeeded ?? 0)))
    : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'I Miei Punti',
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'I Miei Punti',
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            Platform.OS !== 'ios' && styles.contentContainerWithTabBar,
          ]}
        >
          {/* Points Balance Card */}
          <View style={styles.pointsCard}>
            <View style={styles.pointsHeader}>
              <IconSymbol
                ios_icon_name="star.circle.fill"
                android_material_icon_name="stars"
                size={48}
                color="#FFD700"
              />
              <View style={styles.pointsInfo}>
                <Text style={styles.pointsBalanceLabel}>Punti Totali</Text>
                <Text style={styles.pointsValue}>{loyaltyPoints}</Text>
                <View style={styles.levelRow}>
                  <Text style={styles.levelPrefix}>Livello:</Text>
                  <View style={[styles.levelBadge, { backgroundColor: loyaltyLevelColor }]}>
                    <Text style={styles.levelBadgeText}>{loyaltyLevel}</Text>
                  </View>
                </View>
                <Text style={styles.discountLabel}>{discountLabel}</Text>
              </View>
            </View>
            <Pressable
              style={styles.learnMoreButton}
              onPress={() => {
                console.log('MyPoints: User tapped Scopri come funziona il programma fedeltà');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/loyalty-program');
              }}
            >
              <Text style={styles.learnMoreText}>Scopri come funziona il programma fedeltà</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={16}
                color={colors.primary}
              />
            </Pressable>
          </View>

          {/* Il Tuo Livello */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Il Tuo Livello</Text>
            <View style={styles.card}>
              <View style={styles.cardIconRow}>
                <View style={[styles.levelBadgeLarge, { backgroundColor: loyaltyLevelColor }]}>
                  <Text style={styles.levelBadgeLargeText}>{loyaltyLevel}</Text>
                </View>
              </View>
              <Text style={styles.cardText}>{levelExplanation}</Text>
            </View>
          </View>

          {/* Prossimo Livello */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prossimo Livello</Text>
            {nextLevelInfo ? (
              <View style={styles.card}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: progressPercent as any, backgroundColor: loyaltyLevelColor },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  Ti mancano
                  <Text style={styles.progressHighlight}> {nextLevelInfo.pointsNeeded} punti </Text>
                  per raggiungere
                  <Text style={styles.progressHighlight}> {nextLevelInfo.nextLevel} </Text>
                  e ottenere lo sconto del
                  <Text style={styles.progressHighlight}> {nextLevelDiscount}%</Text>
                </Text>
              </View>
            ) : (
              <View style={[styles.card, styles.topCard]}>
                <IconSymbol
                  ios_icon_name="star.circle.fill"
                  android_material_icon_name="stars"
                  size={32}
                  color="#FFD700"
                />
                <Text style={styles.topCardText}>
                  Hai raggiunto il livello massimo! Goditi il 10% di sconto su ogni ordine.
                </Text>
              </View>
            )}
          </View>

          {/* Come Guadagni Punti */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Come Guadagni Punti</Text>
            <View style={styles.card}>
              <View style={styles.ruleRow}>
                <Text style={styles.ruleIcon}>✓</Text>
                <Text style={styles.ruleText}>€1 speso in un ordine ritirato = +1 punto</Text>
              </View>
              <View style={styles.ruleDivider} />
              <View style={styles.ruleRow}>
                <Text style={[styles.ruleIcon, { color: colors.error }]}>−</Text>
                <Text style={styles.ruleText}>Reso effettuato = perdi tutti i punti guadagnati con quell&apos;ordine (es. reso da €50 = −50 punti)</Text>
              </View>
              <View style={styles.ruleDivider} />
              <View style={styles.ruleRow}>
                <Text style={styles.ruleIcon}>✓</Text>
                <Text style={styles.ruleText}>Lo sconto fedeltà non scala i tuoi punti</Text>
              </View>
              <View style={styles.ruleDivider} />
              <View style={styles.ruleRow}>
                <Text style={[styles.ruleIcon, { color: '#FF9800' }]}>⚠</Text>
                <Text style={styles.ruleText}>Dopo 5 ordini non ritirati l&apos;account viene bloccato</Text>
              </View>
            </View>
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
    paddingBottom: 40,
  },
  contentContainerWithTabBar: {
    paddingBottom: 120,
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
  pointsCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsBalanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  pointsValue: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  levelPrefix: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  discountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIconRow: {
    marginBottom: 12,
  },
  levelBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 4,
  },
  levelBadgeLargeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  progressBar: {
    height: 10,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  progressHighlight: {
    fontWeight: '700',
    color: colors.text,
  },
  topCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topCardText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    fontWeight: '600',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  ruleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
    width: 24,
    textAlign: 'center',
  },
  ruleText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  ruleDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
