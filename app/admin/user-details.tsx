
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
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
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'consumer' | 'supplier' | 'pickup_point' | 'admin';
  pickup_point_id?: string;
  created_at: string;
  pickup_points?: {
    id: string;
    name: string;
    city: string;
    address: string;
    phone: string;
  };
}

interface UserBooking {
  id: string;
  product_id: string;
  drop_id: string;
  status: string;
  created_at: string;
  products: {
    name: string;
    image_url: string;
    original_price: number;
  };
  drops: {
    name: string;
    status: string;
  };
}

export default function UserDetailsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUserDetails = useCallback(async () => {
    try {
      setLoading(true);

      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error loading user profile:', profileError);
        Alert.alert('Errore', 'Impossibile caricare il profilo utente');
        return;
      }

      // If user has a pickup point, load it
      if (profile.pickup_point_id) {
        const { data: pickupPoint, error: pickupPointError } = await supabase
          .from('pickup_points')
          .select('*')
          .eq('id', profile.pickup_point_id)
          .single();

        if (!pickupPointError && pickupPoint) {
          profile.pickup_points = pickupPoint;
        }
      }

      setUser(profile);

      // Load user bookings
      const { data: userBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          products (
            name,
            image_url,
            original_price
          ),
          drops (
            name,
            status
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error loading user bookings:', bookingsError);
      } else {
        setBookings(userBookings || []);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadUserDetails();
    }
  }, [userId, loadUserDetails]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUserDetails();
  };

  const handleEditUser = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/admin/edit-user',
      params: { userId },
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return colors.error;
      case 'supplier':
        return colors.warning;
      case 'pickup_point':
        return colors.info;
      case 'consumer':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'supplier':
        return 'Fornitore';
      case 'pickup_point':
        return 'Punto Ritiro';
      case 'consumer':
        return 'Consumatore';
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return { ios: 'shield.fill', android: 'admin_panel_settings' };
      case 'supplier':
        return { ios: 'building.2.fill', android: 'store' };
      case 'pickup_point':
        return { ios: 'mappin.circle.fill', android: 'location_on' };
      case 'consumer':
        return { ios: 'person.fill', android: 'person' };
      default:
        return { ios: 'person', android: 'person' };
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'cancelled':
        return colors.error;
      case 'completed':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const getBookingStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confermata';
      case 'pending':
        return 'In Attesa';
      case 'cancelled':
        return 'Annullata';
      case 'completed':
        return 'Completata';
      default:
        return status;
    }
  };

  const renderBooking = (booking: UserBooking) => {
    return (
      <View key={booking.id} style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingProductName}>
              {booking.products?.name || 'Prodotto'}
            </Text>
            <Text style={styles.bookingDropName}>
              Drop: {booking.drops?.name || 'N/A'}
            </Text>
            <Text style={styles.bookingDate}>
              {new Date(booking.created_at).toLocaleDateString('it-IT')}
            </Text>
          </View>
          <View
            style={[
              styles.bookingStatusBadge,
              { backgroundColor: getBookingStatusColor(booking.status) + '20' },
            ]}
          >
            <Text
              style={[
                styles.bookingStatusText,
                { color: getBookingStatusColor(booking.status) },
              ]}
            >
              {getBookingStatusLabel(booking.status)}
            </Text>
          </View>
        </View>
        {booking.products?.original_price && (
          <Text style={styles.bookingPrice}>
            €{booking.products.original_price.toFixed(2)}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento dettagli...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Dettagli Utente',
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={64}
            color="#FF3B30"
          />
          <Text style={styles.errorText}>Utente non trovato</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Torna Indietro</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const roleIcon = getRoleIcon(user.role);

  return (
    <>
      <Stack.Screen
        options={{
          title: user.full_name || 'Dettagli Utente',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* User Info Card */}
          <View style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.userIconContainer}>
                <IconSymbol
                  ios_icon_name={roleIcon.ios}
                  android_material_icon_name={roleIcon.android}
                  size={32}
                  color={getRoleColor(user.role)}
                />
              </View>
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{user.full_name || 'N/A'}</Text>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: getRoleColor(user.role) + '20' },
                    ]}
                  >
                    <Text
                      style={[styles.roleText, { color: getRoleColor(user.role) }]}
                    >
                      {getRoleLabel(user.role)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.userEmail}>{user.email}</Text>
                {user.phone && (
                  <Text style={styles.userPhone}>📞 {user.phone}</Text>
                )}
              </View>
            </View>

            {user.pickup_points && (
              <View style={styles.pickupPointSection}>
                <View style={styles.pickupPointHeader}>
                  <IconSymbol
                    ios_icon_name="mappin.circle.fill"
                    android_material_icon_name="location_on"
                    size={20}
                    color={colors.info}
                  />
                  <Text style={styles.pickupPointTitle}>Punto di Ritiro</Text>
                </View>
                <Text style={styles.pickupPointName}>
                  {user.pickup_points.name}
                </Text>
                <Text style={styles.pickupPointAddress}>
                  {user.pickup_points.address}
                </Text>
                <Text style={styles.pickupPointCity}>
                  {user.pickup_points.city}
                </Text>
                {user.pickup_points.phone && (
                  <Text style={styles.pickupPointPhone}>
                    📞 {user.pickup_points.phone}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.userFooter}>
              <Text style={styles.userDate}>
                Registrato: {new Date(user.created_at).toLocaleDateString('it-IT')}
              </Text>
            </View>

            {/* Action Button */}
            <Pressable
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.editButtonPressed,
              ]}
              onPress={handleEditUser}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={20}
                color="#FFF"
              />
              <Text style={styles.editButtonText}>Modifica Utente</Text>
            </Pressable>
          </View>

          {/* Bookings Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prenotazioni</Text>
              <Text style={styles.sectionCount}>({bookings.length})</Text>
            </View>

            {bookings.length > 0 ? (
              bookings.map(renderBooking)
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="tray"
                  android_material_icon_name="inbox"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text style={styles.emptyTitle}>Nessuna prenotazione</Text>
                <Text style={styles.emptyText}>
                  Questo utente non ha ancora effettuato prenotazioni
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
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  pickupPointSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickupPointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  pickupPointTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  pickupPointName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  pickupPointAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  pickupPointCity: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pickupPointPhone: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  userFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 16,
    marginBottom: 16,
  },
  userDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionCount: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookingInfo: {
    flex: 1,
    marginRight: 12,
  },
  bookingProductName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  bookingDropName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  bookingStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bookingStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bookingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
