
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
    const couponColors = ['#4CAF50', '#2196F3', '#9C27B0'];
    return couponColors[index % couponColors.length];
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
            
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="gamecontroller.fill"
                  android_material_icon_name="sports_esports"
                  size={24}
                  color="#FF6B35"
                />
                <Text style={styles.cardTitle}>Il Gioco delle Liste</Text>
              </View>
              <Text style={styles.cardText}>
                Completa 4 sfide settimanali nella sezione Punti per guadagnare punti extra. Le sfide si sbloccano progressivamente:
              </Text>
              
              {/* Challenge 1: COLLEZIONISTA */}
              <View style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeNumberBadge}>
                    <Text style={styles.challengeNumberText}>1</Text>
                  </View>
                  <View style={styles.challengeContent}>
                    <Text style={styles.challengeTitle}>COLLEZIONISTA</Text>
                    <Text style={styles.challengeDescription}>
                      Esplora i prodotti di tutte le liste disponibili
                    </Text>
                    <View style={styles.challengeReward}>
                      <IconSymbol
                        ios_icon_name="star.fill"
                        android_material_icon_name="star"
                        size={14}
                        color="#FFD700"
                      />
                      <Text style={styles.challengeRewardText}>100 punti</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Challenge 2: NAVIGATORE */}
              <View style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeNumberBadge}>
                    <Text style={styles.challengeNumberText}>2</Text>
                  </View>
                  <View style={styles.challengeContent}>
                    <Text style={styles.challengeTitle}>NAVIGATORE</Text>
                    <Text style={styles.challengeDescription}>
                      Naviga fino in fondo per scoprire tutti i prodotti di una lista
                    </Text>
                    <View style={styles.challengeReward}>
                      <IconSymbol
                        ios_icon_name="star.fill"
                        android_material_icon_name="star"
                        size={14}
                        color="#FFD700"
                      />
                      <Text style={styles.challengeRewardText}>150 punti</Text>
                    </View>
                    <Text style={styles.challengeUnlock}>
                      Sblocca: CACCIATORE DI OFFERTE
                    </Text>
                  </View>
                </View>
              </View>

              {/* Challenge 3: CACCIATORE DI OFFERTE */}
              <View style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeNumberBadge}>
                    <Text style={styles.challengeNumberText}>3</Text>
                  </View>
                  <View style={styles.challengeContent}>
                    <Text style={styles.challengeTitle}>CACCIATORE DI OFFERTE</Text>
                    <Text style={styles.challengeDescription}>
                      Mostra interesse per una lista
                    </Text>
                    <View style={styles.challengeReward}>
                      <IconSymbol
                        ios_icon_name="star.fill"
                        android_material_icon_name="star"
                        size={14}
                        color="#FFD700"
                      />
                      <Text style={styles.challengeRewardText}>100 punti</Text>
                    </View>
                    <Text style={styles.challengeUnlock}>
                      Sblocca: AMBASCIATORE
                    </Text>
                  </View>
                </View>
              </View>

              {/* Challenge 4: AMBASCIATORE */}
              <View style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeNumberBadge}>
                    <Text style={styles.challengeNumberText}>4</Text>
                  </View>
                  <View style={styles.challengeContent}>
                    <Text style={styles.challengeTitle}>AMBASCIATORE</Text>
                    <Text style={styles.challengeDescription}>
                      Condividi una lista con amici e parenti e potrai attivare un drop su quella lista con ritiro nella tua città
                    </Text>
                    <View style={styles.challengeReward}>
                      <IconSymbol
                        ios_icon_name="star.fill"
                        android_material_icon_name="star"
                        size={14}
                        color="#FFD700"
                      />
                      <Text style={styles.challengeRewardText}>200 punti</Text>
                    </View>
                    <Text style={styles.challengeFinal}>
                      Sfida finale - Nessuna sfida successiva
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.activityCard}>
              <IconSymbol
                ios_icon_name="cart.fill"
                android_material_icon_name="shopping_cart"
                size={20}
                color={colors.text}
              />
              <Text style={styles.activityText}>
                Prenota articoli nei drop attivi e completa gli acquisti
              </Text>
            </View>

            <View style={styles.activityCard}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color={colors.text}
              />
              <Text style={styles.activityText}>
                Ritira sempre i tuoi ordini per mantenere il rating a 5 stelle
              </Text>
            </View>
          </View>

          {/* Rating System */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sistema di Rating</Text>
            
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="arrow.down.circle.fill"
                  android_material_icon_name="remove_circle"
                  size={24}
                  color={colors.error}
                />
                <Text style={styles.cardTitle}>Penalità per Resi</Text>
              </View>
              <Text style={styles.cardText}>
                Ogni ordine rispedito al mittente riduce il tuo rating di 1 stella. I punti guadagnati dall&apos;ordine vengono sottratti dal tuo saldo.
              </Text>
              <View style={styles.exampleBox}>
                <Text style={styles.exampleText}>
                  Esempio: Ordine da €50 non ritirato → Perdi 1 stella e 50 punti
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="exclamationmark.shield.fill"
                  android_material_icon_name="block"
                  size={24}
                  color={colors.error}
                />
                <Text style={styles.cardTitle}>Soglia di Blocco</Text>
              </View>
              <Text style={styles.cardText}>
                Se accumuli 5 o più ordini rispediti al mittente, il tuo account verrà bloccato e non potrai più effettuare prenotazioni.
              </Text>
              <View style={styles.warningBox}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={16}
                  color="#FF6B35"
                />
                <Text style={styles.warningBoxText}>
                  Ritira sempre i tuoi ordini per evitare il blocco dell&apos;account!
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="arrow.up.circle.fill"
                  android_material_icon_name="add_circle"
                  size={24}
                  color={colors.success}
                />
                <Text style={styles.cardTitle}>Recupera il Tuo Rating</Text>
              </View>
              <Text style={styles.cardText}>
                Ogni ordine ritirato con successo aumenta il tuo rating di 1 stella, fino a un massimo di 5 stelle. Continua a ritirare i tuoi ordini per tornare al rating massimo!
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
  challengeCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  challengeHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  challengeNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  challengeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  challengeReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  challengeRewardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B6914',
  },
  challengeUnlock: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    fontStyle: 'italic',
  },
  challengeFinal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontStyle: 'italic',
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  warningBoxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#D84315',
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
