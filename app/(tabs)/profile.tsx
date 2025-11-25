
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import React, { useState, useEffect } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const { logout, user, updatePickupPoint } = useAuth();
  const [selectedPickupPoint, setSelectedPickupPoint] = useState(user?.pickupPoint || '');
  const [pickupPoints, setPickupPoints] = useState<{ id: string; city: string }[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [updatingPoint, setUpdatingPoint] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('393123456789');
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);
  const [ratingStars, setRatingStars] = useState(5);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [ordersPickedUp, setOrdersPickedUp] = useState(0);
  const [ordersReturned, setOrdersReturned] = useState(0);
  const [accountBlocked, setAccountBlocked] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    loadPickupPoints();
    loadWhatsAppNumber();
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (user?.pickupPoint) {
      setSelectedPickupPoint(user.pickupPoint);
    }
  }, [user?.pickupPoint]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('rating_stars, loyalty_points, orders_picked_up, orders_returned, account_blocked')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      if (data) {
        setRatingStars(data.rating_stars ?? 5);
        setLoyaltyPoints(data.loyalty_points ?? 0);
        setOrdersPickedUp(data.orders_picked_up ?? 0);
        setOrdersReturned(data.orders_returned ?? 0);
        setAccountBlocked(data.account_blocked ?? false);
      }
    } catch (error) {
      console.error('Exception loading user profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadWhatsAppNumber = async () => {
    try {
      setLoadingWhatsapp(true);
      console.log('Profile: Loading WhatsApp number from database...');
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_support_number')
        .maybeSingle();

      if (error) {
        console.error('Profile: Error loading WhatsApp number:', error);
        return;
      }

      if (data?.setting_value) {
        console.log('Profile: WhatsApp number loaded successfully:', data.setting_value);
        setWhatsappNumber(data.setting_value);
      } else {
        console.log('Profile: No WhatsApp number found in database, using fallback');
      }
    } catch (error) {
      console.error('Profile: Exception loading WhatsApp number:', error);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const loadPickupPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('pickup_points')
        .select('id, city')
        .eq('status', 'active')
        .order('city');

      if (error) {
        console.error('Error loading pickup points:', error);
        Alert.alert('Errore', 'Impossibile caricare i punti di ritiro');
        return;
      }

      setPickupPoints(data || []);
    } catch (error) {
      console.error('Exception loading pickup points:', error);
    } finally {
      setLoadingPoints(false);
    }
  };

  const handlePickupPointChange = async (pointId: string, pointCity: string) => {
    if (!user) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUpdatingPoint(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pickup_point_id: pointId })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating pickup point:', error);
        Alert.alert('Errore', 'Impossibile aggiornare il punto di ritiro');
        return;
      }

      updatePickupPoint(pointId, pointCity);
      setSelectedPickupPoint(pointCity);
      
      console.log('Pickup point updated to:', pointCity);
      Alert.alert('Successo', `Punto di ritiro aggiornato a ${pointCity}`);
    } catch (error) {
      console.error('Exception updating pickup point:', error);
      Alert.alert('Errore', 'Errore imprevisto durante l\'aggiornamento');
    } finally {
      setUpdatingPoint(false);
    }
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleViewBookings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/my-bookings');
  };

  const handleNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/notifications');
    console.log('Navigating to notifications screen');
  };

  const handleAdminPanel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/admin/dashboard');
  };

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/edit-profile');
  };

  const handleSupport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const message = encodeURIComponent('Ciao, ho bisogno di supporto.');
    const whatsappUrl = `whatsapp://send?phone=${whatsappNumber}&text=${message}`;
    const whatsappWebUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(whatsappWebUrl);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Errore',
        'Impossibile aprire WhatsApp. Assicurati di avere WhatsApp installato sul tuo dispositivo.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleViewLoyaltyProgram = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/loyalty-program');
  };

  const handleViewCoupons = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/my-coupons');
  };

  const renderStars = (stars: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <IconSymbol
            key={star}
            ios_icon_name={star <= stars ? 'star.fill' : 'star'}
            android_material_icon_name={star <= stars ? 'star' : 'star_border'}
            size={20}
            color={star <= stars ? '#FFD700' : colors.textTertiary}
          />
        ))}
      </View>
    );
  };

  const displayRole = user?.role === 'consumer' ? 'Utente' : user?.role?.toUpperCase();

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

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Profilo',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 8 }}>
              <IconSymbol ios_icon_name="rectangle.portrait.and.arrow.right" android_material_icon_name="logout" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS !== 'ios' && styles.scrollContentWithTabBar,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* User Info */}
          <View style={styles.section}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={48} color={colors.text} />
              </View>
              <Text style={styles.userName}>{user?.name || 'Utente'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'Email non disponibile'}</Text>
              {displayRole && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{displayRole}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Rating & Loyalty Section */}
          {!loadingProfile && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Il Tuo Rating</Text>
              <View style={styles.ratingCard}>
                {renderStars(ratingStars)}
                <Text style={styles.ratingText}>{ratingStars} / 5 Stelle</Text>
                <View style={styles.ratingStats}>
                  <View style={styles.ratingStat}>
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.success} />
                    <Text style={styles.ratingStatText}>{ordersPickedUp} ritirati</Text>
                  </View>
                  <View style={styles.ratingStat}>
                    <IconSymbol ios_icon_name="arrow.uturn.backward.circle.fill" android_material_icon_name="undo" size={20} color={colors.error} />
                    <Text style={styles.ratingStatText}>{ordersReturned} rispediti</Text>
                  </View>
                </View>
                <Pressable style={styles.learnMoreButton} onPress={handleViewLoyaltyProgram}>
                  <Text style={styles.learnMoreText}>Scopri il Programma Fedeltà</Text>
                  <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={16} color={colors.primary} />
                </Pressable>
              </View>

              {ratingStars === 5 && (
                <View style={styles.loyaltyCard}>
                  <View style={styles.loyaltyHeader}>
                    <IconSymbol ios_icon_name="star.circle.fill" android_material_icon_name="stars" size={32} color="#FFD700" />
                    <View style={styles.loyaltyInfo}>
                      <Text style={styles.loyaltyTitle}>Punti Fedeltà</Text>
                      <Text style={styles.loyaltyPoints}>{loyaltyPoints} punti</Text>
                    </View>
                  </View>
                  <Text style={styles.loyaltyDescription}>
                    🎉 Hai 5 stelle! Guadagni 1 punto per ogni euro speso.
                  </Text>
                  <Pressable style={styles.couponsButton} onPress={handleViewCoupons}>
                    <IconSymbol ios_icon_name="ticket.fill" android_material_icon_name="local_offer" size={20} color={colors.background} />
                    <Text style={styles.couponsButtonText}>I Miei Coupon</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Admin Panel Button */}
          {user?.role === 'admin' && (
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
                <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={24} color={colors.background} />
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
                        android_material_icon_name="location_on"
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
                        android_material_icon_name="check_circle" 
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
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable style={styles.settingItem} onPress={handleViewBookings}>
              <View style={styles.settingContent}>
                <IconSymbol ios_icon_name="cart.fill" android_material_icon_name="shopping_cart" size={20} color={colors.text} />
                <Text style={styles.settingText}>Le Mie Prenotazioni</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable style={styles.settingItem} onPress={handleNotifications}>
              <View style={styles.settingContent}>
                <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={20} color={colors.text} />
                <Text style={styles.settingText}>Notifiche</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable 
              style={styles.settingItem} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/my-data');
              }}
            >
              <View style={styles.settingContent}>
                <IconSymbol ios_icon_name="shield.fill" android_material_icon_name="shield" size={20} color={colors.text} />
                <Text style={styles.settingText}>I Miei Dati (GDPR)</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
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
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
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
    paddingBottom: 40,
  },
  scrollContentWithTabBar: {
    paddingBottom: 120,
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
  adminButton: {
    backgroundColor: colors.text,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
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
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  ratingStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  ratingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingStatText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
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
});
