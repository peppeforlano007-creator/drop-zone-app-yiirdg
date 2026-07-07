
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles, layout } from '@/styles/commonStyles';
import React, { useState, useEffect, useCallback } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { getLoyaltyLevel, getLoyaltyLevelColor, getNextLevelInfo } from '@/utils/loyaltyHelpers';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

export default function ProfileScreen() {
  const { logout, user, session, updatePickupPoint } = useAuth();
  const unreadCount = useUnreadNotifications();
  const [selectedPickupPoint, setSelectedPickupPoint] = useState(user?.pickupPoint || '');
  const [pickupPoints, setPickupPoints] = useState<{ id: string; city: string }[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [updatingPoint, setUpdatingPoint] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('393123456789');
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [accountBlocked, setAccountBlocked] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadUserProfile = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false);
      setProfileError('Utente non autenticato');
      return;
    }

    console.log('Profile (iOS): Loading user profile for', user.id);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('loyalty_points, points_balance, account_blocked')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Profile (iOS): Error loading user profile:', error);
        setProfileError(`Errore caricamento profilo: ${error.message}`);
        setLoadingProfile(false);
        return;
      }

      if (data) {
        const balance = (data as any).points_balance ?? data.loyalty_points ?? 0;
        setPointsBalance(balance);
        setAccountBlocked((data as any).account_blocked ?? false);
        setProfileError(null);
        console.log('Profile (iOS): Loaded points_balance:', balance);
      } else {
        setProfileError('Profilo non trovato');
      }
    } catch (error) {
      console.error('Profile (iOS): Exception loading user profile:', error);
      setProfileError(`Errore imprevisto: ${error}`);
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  const loadWishlistCount = useCallback(async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('Profile (iOS): Error loading wishlist count:', error);
        return;
      }

      setWishlistCount(count || 0);
    } catch (error) {
      console.error('Profile (iOS): Exception loading wishlist count:', error);
    }
  }, [user]);

  const loadWhatsAppNumber = useCallback(async () => {
    try {
      setLoadingWhatsapp(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_support_number')
        .maybeSingle();

      if (error) {
        console.error('Profile (iOS): Error loading WhatsApp number:', error);
        return;
      }

      if (data?.setting_value) {
        setWhatsappNumber(data.setting_value);
      }
    } catch (error) {
      console.error('Profile (iOS): Exception loading WhatsApp number:', error);
    } finally {
      setLoadingWhatsapp(false);
    }
  }, []);

  const loadPickupPoints = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pickup_points')
        .select('id, city')
        .eq('status', 'active')
        .order('city');

      if (error) {
        console.error('Profile (iOS): Error loading pickup points:', error);
        Alert.alert('Errore', 'Impossibile caricare i punti di ritiro');
        return;
      }

      setPickupPoints(data || []);
    } catch (error) {
      console.error('Profile (iOS): Exception loading pickup points:', error);
    } finally {
      setLoadingPoints(false);
    }
  }, []);

  useEffect(() => {
    loadPickupPoints();
    loadWhatsAppNumber();
    loadUserProfile();
    loadWishlistCount();
  }, [loadPickupPoints, loadWhatsAppNumber, loadUserProfile, loadWishlistCount]);

  // Refresh wishlist count when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadWishlistCount();
    }, [loadWishlistCount])
  );

  useEffect(() => {
    if (user?.pickupPoint) {
      setSelectedPickupPoint(user.pickupPoint);
    }
  }, [user?.pickupPoint]);

  const handlePickupPointChange = async (pointId: string, pointCity: string) => {
    if (!user) return;

    console.log('Profile (iOS): User tapped pickup point:', pointCity);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUpdatingPoint(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pickup_point_id: pointId })
        .eq('user_id', user.id);

      if (error) {
        console.error('Profile (iOS): Error updating pickup point:', error);
        Alert.alert('Errore', 'Impossibile aggiornare il punto di ritiro');
        return;
      }

      updatePickupPoint(pointId, pointCity);
      setSelectedPickupPoint(pointCity);

      console.log('Profile (iOS): Pickup point updated to:', pointCity);
      Alert.alert('Successo', `Punto di ritiro aggiornato a ${pointCity}`);
    } catch (error) {
      console.error('Profile (iOS): Exception updating pickup point:', error);
      Alert.alert('Errore', 'Errore imprevisto durante l\'aggiornamento');
    } finally {
      setUpdatingPoint(false);
    }
  };

  const handleLogout = async () => {
    console.log('Profile (iOS): User tapped logout');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace('/login');
  };

  const handleViewBookings = () => {
    console.log('Profile (iOS): User tapped Le Mie Prenotazioni');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/my-bookings');
  };

  const handleNotifications = () => {
    console.log('Profile (iOS): User tapped Notifiche');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/notifications');
  };

  const handleAdminPanel = () => {
    console.log('Profile (iOS): User tapped Pannello Amministratore');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/admin/dashboard');
  };

  const handleEditProfile = () => {
    console.log('Profile (iOS): User tapped Modifica Profilo');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/edit-profile');
  };

  const handleViewWishlist = () => {
    console.log('Profile (iOS): User tapped La mia wishlist');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/wishlist');
  };

  const handleSupport = async () => {
    console.log('Profile (iOS): User tapped Aiuto e Supporto');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const sanitizedNumber = whatsappNumber.replace(/\D/g, '');
    const message = encodeURIComponent('Ciao, ho bisogno di supporto.');
    const whatsappUrl = `whatsapp://send?phone=${sanitizedNumber}&text=${message}`;
    const whatsappWebUrl = `https://wa.me/${sanitizedNumber}?text=${message}`;

    console.log('Profile (iOS): Opening WhatsApp with sanitized number:', sanitizedNumber);

    try {
      console.log('Profile (iOS): Trying WhatsApp app URL...');
      await Linking.openURL(whatsappUrl);
      console.log('Profile (iOS): WhatsApp app opened successfully');
    } catch (appError) {
      console.log('Profile (iOS): WhatsApp app URL failed, falling back to wa.me:', appError);
      try {
        await Linking.openURL(whatsappWebUrl);
        console.log('Profile (iOS): WhatsApp web fallback opened successfully');
      } catch (webError) {
        console.error('Profile (iOS): Both WhatsApp URLs failed:', webError);
        Alert.alert(
          'Errore',
          'Impossibile aprire WhatsApp. Assicurati di avere WhatsApp installato sul tuo dispositivo.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleViewLoyaltyProgram = () => {
    console.log('Profile (iOS): User tapped Scopri il Programma Fedeltà');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/loyalty-program');
  };

  const handleViewCoupons = () => {
    console.log('Profile (iOS): User tapped I Miei Punti');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/my-coupons');
  };

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Profilo',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={styles.loadingText}>Caricamento profilo...</Text>
          {profileError && (
            <Text style={styles.errorText}>{profileError}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const displayName = user.name || 'Utente';
  const displayEmail = user.email || 'Email non disponibile';
  const displayPhone = user.phone || 'Telefono non disponibile';
  const displayRole = user.role === 'consumer' ? 'Utente' : user.role?.toUpperCase();

  if (accountBlocked) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Profilo',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.blockedContainer}>
          <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="block" size={64} color={colors.error} />
          <Text style={styles.blockedTitle}>Account Bloccato</Text>
          <Text style={styles.blockedText}>
            Il tuo account è stato bloccato per 5 o più ordini rispediti al mittente.
          </Text>
          <Text style={styles.blockedSubtext}>
            Contatta il supporto per maggiori informazioni.
          </Text>
          <Pressable style={styles.supportButton} onPress={handleSupport}>
            <IconSymbol ios_icon_name="questionmark.circle.fill" android_material_icon_name="help" size={20} color={colors.background} />
            <Text style={styles.supportButtonText}>Contatta Supporto</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const loyaltyLevel = getLoyaltyLevel(pointsBalance);
  const loyaltyLevelColor = getLoyaltyLevelColor(loyaltyLevel);
  const nextLevelInfo = getNextLevelInfo(pointsBalance);
  const progressMax = loyaltyLevel === 'Nuovo' ? 100 : loyaltyLevel === 'Fedele' ? 200 : loyaltyLevel === 'VIP' ? 400 : 700;
  const progressBase = loyaltyLevel === 'Nuovo' ? 0 : loyaltyLevel === 'Fedele' ? 100 : loyaltyLevel === 'VIP' ? 300 : 700;
  const progressValue = nextLevelInfo ? Math.min((pointsBalance - progressBase) / (progressMax - progressBase), 1) : 1;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Profilo',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 }}>
              <Pressable
                onPress={() => {
                  console.log('[Profile iOS] Bell icon pressed, navigating to notifications');
                  router.push('/(tabs)/notifications');
                }}
                style={{ position: 'relative' }}
              >
                <IconSymbol
                  ios_icon_name="bell.fill"
                  android_material_icon_name="notifications"
                  size={24}
                  color={colors.text}
                />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {unreadCount > 99 ? '99+' : String(unreadCount)}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable onPress={handleLogout}>
                <IconSymbol ios_icon_name="rectangle.portrait.and.arrow.right" android_material_icon_name="logout" size={24} color={colors.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Info */}
          <View style={styles.section}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={48} color={colors.text} />
              </View>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail}>{displayEmail}</Text>
              <Text style={styles.userPhone}>{displayPhone}</Text>
              {displayRole && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{displayRole}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Fedeltà Section */}
          {!loadingProfile && !profileError && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fedeltà</Text>

              {/* Level + progress card */}
              <View style={styles.ratingCard}>
                <View style={styles.levelRow}>
                  <View style={[styles.levelBadge, { backgroundColor: loyaltyLevelColor }]}>
                    <Text style={styles.levelBadgeText}>{loyaltyLevel}</Text>
                  </View>
                  <View style={styles.levelDetails}>
                    <Text style={styles.levelLabel}>Livello attuale</Text>
                  </View>
                </View>

                {nextLevelInfo && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progressValue * 100}%` as any, backgroundColor: loyaltyLevelColor }]} />
                    </View>
                    <Text style={styles.progressLabel}>
                      {nextLevelInfo.pointsNeeded} punti al livello {nextLevelInfo.nextLevel}
                    </Text>
                  </View>
                )}

                <Pressable style={styles.learnMoreButton} onPress={handleViewLoyaltyProgram}>
                  <Text style={styles.learnMoreText}>Scopri il Programma Fedeltà</Text>
                  <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={16} color={colors.primary} />
                </Pressable>
              </View>

              {/* Loyalty balance card — always visible */}
              <View style={styles.loyaltyCard}>
                <View style={styles.loyaltyHeader}>
                  <IconSymbol ios_icon_name="star.circle.fill" android_material_icon_name="stars" size={32} color="#FFD700" />
                  <View style={styles.loyaltyInfo}>
                    <Text style={styles.loyaltyTitle}>Saldo Spendibile</Text>
                    <Text style={styles.loyaltyPoints}>{pointsBalance} punti</Text>
                  </View>
                </View>
                <Text style={styles.loyaltyDescription}>
                  Guadagni 1 punto per ogni euro speso. Il tuo livello determina lo sconto automatico applicato su ogni ordine.
                </Text>
                <Pressable style={styles.couponsButton} onPress={handleViewCoupons}>
                  <IconSymbol ios_icon_name="star.circle.fill" android_material_icon_name="stars" size={20} color={colors.background} />
                  <Text style={styles.couponsButtonText}>I Miei Punti</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Show error if profile failed to load */}
          {profileError && (
            <View style={styles.section}>
              <View style={styles.errorCard}>
                <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={48} color={colors.error} />
                <Text style={styles.errorCardTitle}>Errore Caricamento Dati</Text>
                <Text style={styles.errorCardText}>{profileError}</Text>
                <Pressable style={styles.retryButton} onPress={loadUserProfile}>
                  <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={20} color={colors.background} />
                  <Text style={styles.retryButtonText}>Riprova</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Admin Panel Button */}
          {user.role === 'admin' && (
            <View style={styles.section}>
              <Pressable
                style={styles.adminButton}
                onPress={handleAdminPanel}
              >
                <View style={styles.adminButtonContent}>
                  <IconSymbol ios_icon_name="gear.circle.fill" android_material_icon_name="settings" size={24} color={colors.background} />
                  <View style={styles.adminButtonTextContainer}>
                    <Text style={styles.adminButtonTitle}>Pannello Amministratore</Text>
                    <Text style={styles.adminButtonSubtitle}>Gestisci utenti, fornitori, prodotti e drop</Text>
                  </View>
                </View>
                <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={24} color={colors.background} />
              </Pressable>
            </View>
          )}

          {/* Pickup Point Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Punto di Ritiro</Text>
            <Text style={styles.sectionDescription}>
              Seleziona il punto di ritiro più vicino a te
            </Text>

            {loadingPoints ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.text} />
                <Text style={styles.loadingText}>Caricamento punti di ritiro...</Text>
              </View>
            ) : (
              <View style={styles.pickupPointsContainer}>
                {pickupPoints.map((point) => (
                  <Pressable
                    key={point.id}
                    style={[
                      styles.pickupPointCard,
                      selectedPickupPoint === point.city && styles.pickupPointCardSelected,
                    ]}
                    onPress={() => handlePickupPointChange(point.id, point.city)}
                    disabled={updatingPoint}
                  >
                    <View style={styles.pickupPointContent}>
                      <IconSymbol
                        ios_icon_name="mappin.circle.fill"
                        android_material_icon_name="location-on"
                        size={24}
                        color={selectedPickupPoint === point.city ? colors.background : colors.text}
                      />
                      <Text
                        style={[
                          styles.pickupPointText,
                          selectedPickupPoint === point.city && styles.pickupPointTextSelected,
                        ]}
                      >
                        {point.city}
                      </Text>
                    </View>
                    {selectedPickupPoint === point.city && (
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={24}
                        color={colors.background}
                      />
                    )}
                    {updatingPoint && selectedPickupPoint === point.city && (
                      <ActivityIndicator size="small" color={colors.background} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Impostazioni</Text>

            <Pressable style={styles.settingItem} onPress={handleEditProfile}>
              <View style={styles.settingContent}>
                <IconSymbol ios_icon_name="person.crop.circle" android_material_icon_name="edit" size={20} color={colors.text} />
                <Text style={styles.settingText}>Modifica Profilo</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable style={styles.settingItem} onPress={handleViewWishlist}>
              <View style={styles.settingContent}>
                <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={20} color="#FF6B6B" />
                <Text style={styles.settingText}>La mia wishlist</Text>
                {wishlistCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{wishlistCount}</Text>
                  </View>
                )}
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable style={styles.settingItem} onPress={handleViewBookings}>
              <View style={styles.settingContent}>
                <IconSymbol ios_icon_name="cart.fill" android_material_icon_name="shopping-cart" size={20} color={colors.text} />
                <Text style={styles.settingText}>Le Mie Prenotazioni</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable style={styles.settingItem} onPress={handleNotifications}>
              <View style={styles.settingContent}>
                <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={20} color={colors.text} />
                <Text style={styles.settingText}>Notifiche</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable
              style={styles.settingItem}
              onPress={() => {
                console.log('Profile (iOS): User tapped I Miei Dati (GDPR)');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/my-data');
              }}
            >
              <View style={styles.settingContent}>
                <IconSymbol ios_icon_name="shield.fill" android_material_icon_name="shield" size={20} color={colors.text} />
                <Text style={styles.settingText}>I Miei Dati (GDPR)</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable
              style={styles.settingItem}
              onPress={handleSupport}
              disabled={loadingWhatsapp}
            >
              <View style={styles.settingContent}>
                {loadingWhatsapp ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <IconSymbol ios_icon_name="questionmark.circle.fill" android_material_icon_name="help" size={20} color={colors.text} />
                )}
                <Text style={styles.settingText}>Aiuto e Supporto</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: layout.contentPaddingBottom,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
  },
  errorCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error,
  },
  errorCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorCardText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.text,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
  adminButton: {
    backgroundColor: colors.text,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  adminButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  adminButtonTextContainer: {
    flex: 1,
  },
  adminButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background,
    marginBottom: 4,
  },
  adminButtonSubtitle: {
    fontSize: 13,
    color: colors.background,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  ratingCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  levelBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  levelBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelDetails: {
    flex: 1,
  },
  levelLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  totalPointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  loyaltyCard: {
    backgroundColor: '#FFD70020',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  loyaltyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  loyaltyInfo: {
    flex: 1,
  },
  loyaltyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  loyaltyPoints: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  loyaltyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  couponsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.text,
    paddingVertical: 12,
    borderRadius: 12,
  },
  couponsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
  pickupPointsContainer: {
    gap: 12,
  },
  pickupPointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  pickupPointCardSelected: {
    borderColor: colors.text,
    backgroundColor: colors.text,
  },
  pickupPointContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickupPointText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pickupPointTextSelected: {
    color: colors.background,
  },
  loadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
  },
  badge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  blockedText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  blockedSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.text,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
});
