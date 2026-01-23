
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  manager_name: string;
  status: string;
}

export default function PickupPointsScreen() {
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPickupPoints();
  }, []);

  const loadPickupPoints = async () => {
    try {
      console.log('Loading pickup points...');
      const { data, error } = await supabase
        .from('pickup_points')
        .select('*')
        .eq('status', 'active')
        .order('city', { ascending: true });

      if (error) {
        console.error('Error loading pickup points:', error);
        Alert.alert('Errore', 'Impossibile caricare i punti di ritiro');
        return;
      }

      console.log('Loaded pickup points:', data?.length || 0);
      setPickupPoints(data || []);
    } catch (error) {
      console.error('Error loading pickup points:', error);
      Alert.alert('Errore', 'Impossibile caricare i punti di ritiro');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPickupPoints();
  };

  const handleOpenDirections = async (pickupPoint: PickupPoint) => {
    console.log('Opening directions for:', pickupPoint.name);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const fullAddress = `${pickupPoint.address}, ${pickupPoint.city}, ${pickupPoint.postal_code}`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    // Google Maps URL that works on both iOS and Android
    const googleMapsUrl = Platform.select({
      ios: `comgooglemaps://?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
    });

    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

    try {
      // Try to open Google Maps app first
      const canOpen = await Linking.canOpenURL(googleMapsUrl);
      if (canOpen) {
        await Linking.openURL(googleMapsUrl);
      } else {
        // Fallback to web browser
        await Linking.openURL(fallbackUrl);
      }
    } catch (error) {
      console.error('Error opening directions:', error);
      // Final fallback to web browser
      await Linking.openURL(fallbackUrl);
    }
  };

  const handleCallPickupPoint = async (phone: string, name: string) => {
    console.log('Calling pickup point:', name);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const phoneUrl = `tel:${phone}`;
    const canCall = await Linking.canOpenURL(phoneUrl);
    
    if (canCall) {
      await Linking.openURL(phoneUrl);
    } else {
      Alert.alert('Errore', 'Impossibile effettuare la chiamata');
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Punti di Ritiro',
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Caricamento punti di ritiro...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Punti di Ritiro',
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Punti di Ritiro</Text>
            <Text style={styles.headerSubtitle}>
              Ritira i tuoi ordini presso uno dei nostri punti di ritiro
            </Text>
          </View>

          {pickupPoints.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol
                ios_icon_name="location.slash"
                android_material_icon_name="location-off"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>Nessun punto di ritiro disponibile</Text>
              <Text style={styles.emptyText}>
                Al momento non ci sono punti di ritiro attivi nella tua zona
              </Text>
            </View>
          ) : (
            <View style={styles.pickupPointsList}>
              {pickupPoints.map((point) => {
                const fullAddress = `${point.address}, ${point.city}`;
                const postalCode = point.postal_code;
                
                return (
                  <View key={point.id} style={styles.pickupPointCard}>
                    <View style={styles.pickupPointHeader}>
                      <View style={styles.iconContainer}>
                        <IconSymbol
                          ios_icon_name="location.fill"
                          android_material_icon_name="location-on"
                          size={32}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.pickupPointInfo}>
                        <Text style={styles.pickupPointName}>{point.name}</Text>
                        <Text style={styles.pickupPointCity}>{point.city}</Text>
                      </View>
                    </View>

                    <View style={styles.pickupPointDetails}>
                      <View style={styles.detailRow}>
                        <IconSymbol
                          ios_icon_name="mappin.circle.fill"
                          android_material_icon_name="place"
                          size={20}
                          color={colors.textSecondary}
                        />
                        <View style={styles.detailTextContainer}>
                          <Text style={styles.detailText}>{fullAddress}</Text>
                          <Text style={styles.detailText}>{postalCode}</Text>
                        </View>
                      </View>

                      <View style={styles.detailRow}>
                        <IconSymbol
                          ios_icon_name="person.fill"
                          android_material_icon_name="person"
                          size={20}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.detailText}>{point.manager_name}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <IconSymbol
                          ios_icon_name="phone.fill"
                          android_material_icon_name="phone"
                          size={20}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.detailText}>{point.phone}</Text>
                      </View>
                    </View>

                    <View style={styles.actionsContainer}>
                      <Pressable
                        style={styles.directionsButton}
                        onPress={() => handleOpenDirections(point)}
                        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                      >
                        <IconSymbol
                          ios_icon_name="map.fill"
                          android_material_icon_name="directions"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={styles.directionsButtonText}>Indicazioni Stradali</Text>
                      </Pressable>

                      <Pressable
                        style={styles.callButton}
                        onPress={() => handleCallPickupPoint(point.phone, point.name)}
                        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                      >
                        <IconSymbol
                          ios_icon_name="phone.fill"
                          android_material_icon_name="phone"
                          size={20}
                          color={colors.primary}
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* How it works section */}
          <View style={styles.howItWorksCard}>
            <Text style={styles.howItWorksTitle}>Come funziona?</Text>
            <View style={styles.stepsList}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Prenota i prodotti</Text>
                  <Text style={styles.stepText}>
                    Prenota i prodotti che ti interessano durante il drop attivo
                  </Text>
                </View>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Ricevi notifica</Text>
                  <Text style={styles.stepText}>
                    Quando l&apos;ordine arriva al punto di ritiro, riceverai una notifica
                  </Text>
                </View>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Ritira e paga</Text>
                  <Text style={styles.stepText}>
                    Ritira il tuo ordine al punto di ritiro e paga in contanti
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Important info */}
          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={24}
              color={colors.primary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Importante</Text>
              <Text style={styles.infoText}>
                Assicurati di ritirare i tuoi ordini entro i tempi stabiliti. 
                Dopo 5 ordini non ritirati e rispediti al fornitore, l&apos;account verrà bloccato definitivamente.
                {'\n\n'}
                Al punto di ritiro sarà possibile effettuare resi dei singoli articoli, ma dopo molti articoli restituiti il profilo sarà bloccato momentaneamente.
              </Text>
            </View>
          </View>

          {/* Rating info */}
          <View style={styles.ratingCard}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={24}
              color="#FFD700"
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Sistema di Rating</Text>
              <Text style={styles.infoText}>
                Il tuo rating aumenta quando ritiri gli ordini e diminuisce quando vengono rispediti al mittente. 
                Mantieni un rating alto per accedere al programma fedeltà e guadagnare punti!
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
    paddingTop: 80,
    paddingBottom: 120,
  },
  contentContainerWithTabBar: {
    paddingBottom: 200,
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
  header: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  pickupPointsList: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  pickupPointCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  pickupPointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupPointInfo: {
    flex: 1,
  },
  pickupPointName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  pickupPointCity: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  pickupPointDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  directionsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  howItWorksCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  howItWorksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  stepsList: {
    gap: 24,
  },
  step: {
    flexDirection: 'row',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  ratingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 16,
  },
});
