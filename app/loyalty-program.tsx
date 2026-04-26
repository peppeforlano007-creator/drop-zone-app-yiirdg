
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors, layout } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';

interface Coupon {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number;
  points_required: number;
}

const LEVELS = [
  { name: 'Nuovo', range: '0–99', benefit: 'Nessun beneficio extra' },
  { name: 'Fedele', range: '100–299', benefit: 'Coupon 5% ogni 100 punti' },
  { name: 'VIP', range: '300–699', benefit: 'Coupon 10% + penalità reso ridotta' },
  { name: 'Top', range: '700+', benefit: 'Coupon 15% + penalità azzerata + priorità lista d\'attesa' },
];

const LEVEL_COLORS: Record<string, string> = {
  Nuovo: '#9E9E9E',
  Fedele: '#2196F3',
  VIP: '#9C27B0',
  Top: '#FFD700',
};

export default function LoyaltyProgramScreen() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    console.log('LoyaltyProgram: Loading available coupons');
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true });

      if (error) {
        console.error('LoyaltyProgram: Error loading coupons:', error);
      } else {
        console.log('LoyaltyProgram: Loaded', data?.length ?? 0, 'coupons');
        setCoupons(data || []);
      }
    } catch (error) {
      console.error('LoyaltyProgram: Exception loading coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCouponColor = (index: number) => {
    const couponColors = ['#4CAF50', '#2196F3', '#9C27B0'];
    return couponColors[index % couponColors.length];
  };

  const handleRedeemCoupons = () => {
    console.log('LoyaltyProgram: User tapped Riscatta i Miei Coupon');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/my-coupons');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Programma Fedeltà',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <IconSymbol
                ios_icon_name="star.circle.fill"
                android_material_icon_name="stars"
                size={64}
                color="#FFD700"
              />
            </View>
            <Text style={styles.heroTitle}>Programma Fedeltà</Text>
            <Text style={styles.heroSubtitle}>
              Guadagna punti e sali di livello per ottenere coupon esclusivi
            </Text>
          </View>

          {/* CTA Button */}
          <View style={styles.ctaButtonContainer}>
            <Pressable style={styles.ctaButton} onPress={handleRedeemCoupons}>
              <IconSymbol
                ios_icon_name="ticket.fill"
                android_material_icon_name="local_offer"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.ctaButtonText}>Riscatta i Miei Coupon</Text>
            </Pressable>
          </View>

          {/* Come Funziona */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Come Funziona</Text>

            {/* Card 1: Guadagna Punti */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="eurosign.circle.fill"
                  android_material_icon_name="euro"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.cardTitle}>Guadagna Punti</Text>
              </View>
              <Text style={styles.cardText}>
                Per ogni €1 speso guadagni 1 punto sul tuo saldo. I punti accumulati nel tempo determinano il tuo livello.
              </Text>
              <View style={styles.exampleBox}>
                <Text style={styles.exampleText}>
                  Esempio: Spendi €50 → Guadagni 50 punti
                </Text>
              </View>
            </View>

            {/* Card 2: Sali di Livello */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="chart.bar.fill"
                  android_material_icon_name="bar_chart"
                  size={24}
                  color="#9C27B0"
                />
                <Text style={styles.cardTitle}>Sali di Livello</Text>
              </View>
              <Text style={styles.cardText}>
                Il tuo livello dipende dal tuo saldo punti attuale. Più punti hai, più alto è il tuo livello.
              </Text>
              <View style={styles.levelsTable}>
                {LEVELS.map((level) => (
                  <View key={level.name} style={styles.levelRow}>
                    <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[level.name] }]}>
                      <Text style={styles.levelBadgeText}>{level.name}</Text>
                    </View>
                    <View style={styles.levelInfo}>
                      <Text style={styles.levelRange}>{level.range} punti</Text>
                      <Text style={styles.levelBenefit}>{level.benefit}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Card 3: Riscatta Coupon */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="ticket.fill"
                  android_material_icon_name="local_offer"
                  size={24}
                  color={colors.success}
                />
                <Text style={styles.cardTitle}>Riscatta Coupon</Text>
              </View>
              <Text style={styles.cardText}>
                Usa il tuo saldo punti per riscattare coupon sconto da utilizzare sui prossimi acquisti.
              </Text>
            </View>
          </View>

          {/* Coupon Disponibili */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coupon Disponibili</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : coupons.length > 0 ? (
              coupons.map((coupon, index) => (
                <View key={coupon.id} style={styles.tierCard}>
                  <View style={styles.tierHeader}>
                    <View style={[styles.tierBadge, { backgroundColor: getCouponColor(index) }]}>
                      <Text style={styles.tierDiscount}>{coupon.discount_percentage}%</Text>
                    </View>
                    <View style={styles.tierInfo}>
                      <Text style={styles.tierTitle}>{coupon.name}</Text>
                      <Text style={styles.tierPoints}>{coupon.points_required.toLocaleString('it-IT')} punti</Text>
                    </View>
                  </View>
                  <Text style={styles.tierDescription}>
                    {coupon.description || `Riscatta questo coupon per ottenere uno sconto del ${coupon.discount_percentage}% sul tuo prossimo ordine.`}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Nessun coupon disponibile al momento</Text>
            )}
          </View>

          {/* Regole Importanti */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Regole Importanti</Text>

            {/* Ordine Non Ritirato */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={24}
                  color={colors.error}
                />
                <Text style={styles.cardTitle}>Ordine Non Ritirato</Text>
              </View>
              <Text style={styles.cardText}>
                Se non ritiri un ordine perdi 50 punti dal saldo. Dopo 5 ordini non ritirati l&apos;account viene bloccato.
              </Text>
            </View>

            {/* Penalità Reso */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="arrow.uturn.backward"
                  android_material_icon_name="undo"
                  size={24}
                  color={colors.error}
                />
                <Text style={styles.cardTitle}>Penalità Reso</Text>
              </View>
              <Text style={styles.cardText}>
                Ogni reso comporta la perdita di 20 punti fissi più i punti guadagnati sull&apos;ordine restituito.
              </Text>
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
    paddingBottom: layout.contentPaddingBottom,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  ctaButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  cardText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  exampleBox: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  exampleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  levelsTable: {
    marginTop: 16,
    gap: 10,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  levelBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelInfo: {
    flex: 1,
  },
  levelRange: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  levelBenefit: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  tierCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  tierBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierDiscount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tierInfo: {
    flex: 1,
  },
  tierTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  tierPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  tierDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
