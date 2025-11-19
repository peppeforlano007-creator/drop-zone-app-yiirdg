
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
  const { user, logout, updatePickupPoint } = useAuth();
  const [selectedPickupPoint, setSelectedPickupPoint] = useState(user?.pickupPoint || '');
  const [pickupPoints, setPickupPoints] = useState<{ id: string; city: string }[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [updatingPoint, setUpdatingPoint] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('393123456789'); // Default fallback

  useEffect(() => {
    loadPickupPoints();
    loadWhatsAppNumber();
  }, []);

  useEffect(() => {
    if (user?.pickupPoint) {
      setSelectedPickupPoint(user.pickupPoint);
    }
  }, [user?.pickupPoint]);

  const loadWhatsAppNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_support_number')
        .single();

      if (error) {
        console.error('Error loading WhatsApp number:', error);
        return;
      }

      if (data?.setting_value) {
        setWhatsappNumber(data.setting_value);
      }
    } catch (error) {
      console.error('Exception loading WhatsApp number:', error);
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
      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ pickup_point_id: pointId })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating pickup point:', error);
        Alert.alert('Errore', 'Impossibile aggiornare il punto di ritiro');
        return;
      }

      // Update in context (this will update the UI immediately)
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
      // Try to open WhatsApp app first
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // If WhatsApp app is not installed, open WhatsApp Web
        await Linking.openURL(whatsappWebUrl);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Errore',
        'Impossibile aprire WhatsApp. Assicurati di avere WhatsApp installato sul tuo dispositivo.',
        [
          {
            text: 'OK',
          },
        ]
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Profilo',
          headerStyle: {
            backgroundColor: colors.background,
          },
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
              {user?.role && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Admin Panel Button - Only visible for admins */}
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

          {/* Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Le Tue Statistiche</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={32} color={colors.text} />
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Prodotti Interessati</Text>
              </View>
              
              <View style={styles.statCard}>
                <IconSymbol ios_icon_name="cart.fill" android_material_icon_name="shopping_cart" size={32} color={colors.text} />
                <Text style={styles.statValue}>5</Text>
                <Text style={styles.statLabel}>Ordini Completati</Text>
              </View>
            </View>
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

            <Pressable style={styles.settingItem} onPress={handleSupport}>
              <View style={styles.settingContent}>
                <IconSymbol ios_icon_name="questionmark.circle.fill" android_material_icon_name="help" size={20} color={colors.text} />
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
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
});
