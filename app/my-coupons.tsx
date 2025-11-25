
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

interface Coupon {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number;
  points_required: number;
  is_active: boolean;
}

interface UserCoupon {
  id: string;
  coupon_code: string;
  discount_percentage: number;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
  expires_at: string | null;
  coupons: {
    name: string;
    description: string | null;
  };
}

export default function MyCouponsScreen() {
  const { user } = useAuth();
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load user's loyalty points
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('loyalty_points')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      } else {
        setLoyaltyPoints(profileData?.loyalty_points ?? 0);
      }

      // Load available coupons
      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true });

      if (couponsError) {
        console.error('Error loading coupons:', couponsError);
      } else {
        setAvailableCoupons(couponsData || []);
      }

      // Load user's redeemed coupons
      const { data: userCouponsData, error: userCouponsError } = await supabase
        .from('user_coupons')
        .select(`
          *,
          coupons (
            name,
            description
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (userCouponsError) {
        console.error('Error loading user coupons:', userCouponsError);
      } else {
        setUserCoupons(userCouponsData || []);
      }
    } catch (error) {
      console.error('Exception loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCoupon = async (coupon: Coupon) => {
    if (!user) return;

    if (loyaltyPoints < coupon.points_required) {
      Alert.alert(
        'Punti Insufficienti',
        `Ti servono ${coupon.points_required} punti per riscattare questo coupon. Hai solo ${loyaltyPoints} punti.`
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Riscatta Coupon',
      `Vuoi riscattare "${coupon.name}" per ${coupon.points_required} punti?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Riscatta',
          onPress: async () => {
            try {
              setRedeeming(coupon.id);

              // Generate unique coupon code
              const couponCode = `COUPON-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

              // Create user coupon
              const { error: insertError } = await supabase
                .from('user_coupons')
                .insert({
                  user_id: user.id,
                  coupon_id: coupon.id,
                  coupon_code: couponCode,
                  discount_percentage: coupon.discount_percentage,
                  expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
                });

              if (insertError) {
                console.error('Error creating coupon:', insertError);
                Alert.alert('Errore', 'Impossibile riscattare il coupon');
                return;
              }

              // Deduct points
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  loyalty_points: loyaltyPoints - coupon.points_required,
                })
                .eq('user_id', user.id);

              if (updateError) {
                console.error('Error updating points:', updateError);
                Alert.alert('Errore', 'Impossibile aggiornare i punti');
                return;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Coupon Riscattato!',
                `Hai riscattato "${coupon.name}". Il codice coupon è: ${couponCode}`
              );

              // Reload data
              loadData();
            } catch (error) {
              console.error('Exception redeeming coupon:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            } finally {
              setRedeeming(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'I Miei Coupon',
            headerStyle: {
              backgroundColor: colors.background,
            },
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
          title: 'I Miei Coupon',
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
          {/* Points Balance */}
          <View style={styles.pointsCard}>
            <View style={styles.pointsHeader}>
              <IconSymbol
                ios_icon_name="star.circle.fill"
                android_material_icon_name="stars"
                size={48}
                color="#FFD700"
              />
              <View style={styles.pointsInfo}>
                <Text style={styles.pointsLabel}>I Tuoi Punti</Text>
                <Text style={styles.pointsValue}>{loyaltyPoints}</Text>
              </View>
            </View>
            <Pressable
              style={styles.learnMoreButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/loyalty-program');
              }}
            >
              <Text style={styles.learnMoreText}>Scopri come guadagnare punti</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={16}
                color={colors.primary}
              />
            </Pressable>
          </View>

          {/* Available Coupons */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Riscatta Coupon</Text>
            {availableCoupons.length > 0 ? (
              availableCoupons.map((coupon) => {
                const canRedeem = loyaltyPoints >= coupon.points_required;
                const isRedeeming = redeeming === coupon.id;

                return (
                  <View key={coupon.id} style={styles.couponCard}>
                    <View style={styles.couponHeader}>
                      <View style={styles.couponBadge}>
                        <Text style={styles.couponDiscount}>{coupon.discount_percentage}%</Text>
                      </View>
                      <View style={styles.couponInfo}>
                        <Text style={styles.couponName}>{coupon.name}</Text>
                        <Text style={styles.couponDescription}>
                          {coupon.description || 'Sconto sul prossimo ordine'}
                        </Text>
                        <Text style={styles.couponPoints}>
                          {coupon.points_required} punti
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      style={[
                        styles.redeemButton,
                        !canRedeem && styles.redeemButtonDisabled,
                      ]}
                      onPress={() => handleRedeemCoupon(coupon)}
                      disabled={!canRedeem || isRedeeming}
                    >
                      {isRedeeming ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <IconSymbol
                            ios_icon_name="ticket.fill"
                            android_material_icon_name="local_offer"
                            size={20}
                            color="#FFFFFF"
                          />
                          <Text style={styles.redeemButtonText}>
                            {canRedeem ? 'Riscatta' : 'Punti Insufficienti'}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="ticket"
                  android_material_icon_name="local_offer"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text style={styles.emptyText}>Nessun coupon disponibile</Text>
              </View>
            )}
          </View>

          {/* User's Coupons */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>I Tuoi Coupon Riscattati</Text>
            {userCoupons.length > 0 ? (
              userCoupons.map((userCoupon) => (
                <View
                  key={userCoupon.id}
                  style={[
                    styles.userCouponCard,
                    userCoupon.is_used && styles.userCouponCardUsed,
                  ]}
                >
                  <View style={styles.userCouponHeader}>
                    <View style={styles.userCouponBadge}>
                      <Text style={styles.userCouponDiscount}>
                        {userCoupon.discount_percentage}%
                      </Text>
                    </View>
                    <View style={styles.userCouponInfo}>
                      <Text style={styles.userCouponName}>
                        {userCoupon.coupons.name}
                      </Text>
                      <Text style={styles.userCouponCode}>
                        Codice: {userCoupon.coupon_code}
                      </Text>
                      {userCoupon.is_used ? (
                        <Text style={styles.userCouponStatus}>
                          ✓ Utilizzato il{' '}
                          {new Date(userCoupon.used_at!).toLocaleDateString('it-IT')}
                        </Text>
                      ) : (
                        <Text style={styles.userCouponStatusActive}>
                          ✓ Attivo - Usa al prossimo ordine
                        </Text>
                      )}
                    </View>
                  </View>
                  {!userCoupon.is_used && userCoupon.expires_at && (
                    <Text style={styles.expiryText}>
                      Scade il {new Date(userCoupon.expires_at).toLocaleDateString('it-IT')}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="ticket"
                  android_material_icon_name="local_offer"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text style={styles.emptyText}>
                  Non hai ancora riscattato nessun coupon
                </Text>
              </View>
            )}
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
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '800',
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
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  couponCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  couponHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  couponBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponDiscount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  couponInfo: {
    flex: 1,
  },
  couponName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  couponDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  couponPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  redeemButtonDisabled: {
    backgroundColor: colors.textTertiary,
    opacity: 0.5,
  },
  redeemButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userCouponCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.success,
  },
  userCouponCardUsed: {
    borderColor: colors.border,
    opacity: 0.6,
  },
  userCouponHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  userCouponBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCouponDiscount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userCouponInfo: {
    flex: 1,
  },
  userCouponName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userCouponCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  userCouponStatus: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  userCouponStatusActive: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  expiryText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
