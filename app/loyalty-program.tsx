
import React, { useState, useEffect } from 'react';
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
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
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

export default function LoyaltyProgramScreen() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true });

      if (error) {
        console.error('Error loading coupons:', error);
      } else {
        setCoupons(data || []);
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCouponColor = (index: number) => {
    const colors = ['#4CAF50', '#2196F3', '#9C27B0'];
    return colors[index % colors.length];
  };
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Programma Fedeltà',
          headerStyle: {
            backgroundColor: colors.background,
          },
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
              Guadagna punti e riscatta coupon esclusivi
            </Text>
          </View>

          {/* How it works */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Come Funziona</Text>
            
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={24}
                  color="#FFD700"
                />
                <Text style={styles.cardTitle}>Mantieni 5 Stelle</Text>
              </View>
              <Text style={styles.cardText}>
                Solo gli utenti con rating a 5 stelle possono guadagnare punti fedeltà. 
                Ritira sempre i tuoi ordini per mantenere il rating massimo!
              </Text>
            </View>

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
                Per ogni euro speso, guadagni 1 punto fedeltà. Più acquisti, più punti accumuli!
              </Text>
              <View style={styles.exampleBox}>
                <Text style={styles.exampleText}>
                  Esempio: Spendi €50 → Guadagni 50 punti
                </Text>
              </View>
            </View>

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
                Usa i tuoi punti per riscattare coupon sconto da utilizzare sui prossimi acquisti.
              </Text>
            </View>
          </View>

          {/* Coupon Tiers */}
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

          {/* Additional Points */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Altri Modi per Guadagnare Punti</Text>
            
            <View style={styles.activityCard}>
              <IconSymbol
                ios_icon_name="hand.thumbsup.fill"
                android_material_icon_name="thumb_up"
                size={20}
                color={colors.text}
              />
              <Text style={styles.activityText}>
                Scorri il feed dei prodotti
              </Text>
            </View>

            <View style={styles.activityCard}>
              <IconSymbol
                ios_icon_name="heart.fill"
                android_material_icon_name="favorite"
                size={20}
                color={colors.text}
              />
              <Text style={styles.activityText}>
                Clicca su &quot;Vorrò partecipare al drop&quot;
              </Text>
            </View>

            <View style={styles.activityCard}>
              <IconSymbol
                ios_icon_name="square.and.arrow.up.fill"
                android_material_icon_name="share"
                size={20}
                color={colors.text}
              />
              <Text style={styles.activityText}>
                Condividi i drop con amici e parenti
              </Text>
            </View>

            <View style={styles.activityCard}>
              <IconSymbol
                ios_icon_name="cart.fill"
                android_material_icon_name="shopping_cart"
                size={20}
                color={colors.text}
              />
              <Text style={styles.activityText}>
                Prenota articoli nei drop attivi
              </Text>
            </View>
          </View>

          {/* Warning */}
          <View style={styles.warningCard}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={24}
              color="#FF6B35"
            />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Attenzione</Text>
              <Text style={styles.warningText}>
                Se il tuo rating scende sotto le 5 stelle, non potrai più guadagnare punti fedeltà 
                fino a quando non tornerai al rating massimo. Ritira sempre i tuoi ordini!
              </Text>
            </View>
          </View>

          {/* CTA Button */}
          <Pressable
            style={styles.ctaButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/my-coupons');
            }}
          >
            <IconSymbol
              ios_icon_name="ticket.fill"
              android_material_icon_name="local_offer"
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.ctaButtonText}>Vai ai Miei Coupon</Text>
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
    paddingBottom: 40,
  },
  contentContainerWithTabBar: {
    paddingBottom: 120,
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
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FF6B35',
    gap: 16,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#D84315',
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
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
