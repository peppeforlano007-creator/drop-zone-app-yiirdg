
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

export default function RitiroScreen() {
  const { user, updatePickupPoint } = useAuth();
  const [selectedPickupPoint, setSelectedPickupPoint] = useState(user?.pickupPoint || '');
  const [pickupPoints, setPickupPoints] = useState<{ id: string; city: string }[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [updatingPoint, setUpdatingPoint] = useState(false);

  const loadPickupPoints = useCallback(async () => {
    console.log('Loading pickup points...');
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

      console.log('Pickup points loaded:', data);
      setPickupPoints(data || []);
    } catch (error) {
      console.error('Exception loading pickup points:', error);
    } finally {
      setLoadingPoints(false);
    }
  }, []);

  useEffect(() => {
    loadPickupPoints();
  }, [loadPickupPoints]);

  useEffect(() => {
    if (user?.pickupPoint) {
      setSelectedPickupPoint(user.pickupPoint);
    }
  }, [user?.pickupPoint]);

  const handlePickupPointChange = async (pointId: string, pointCity: string) => {
    if (!user) {
      Alert.alert('Errore', 'Devi essere autenticato per cambiare il punto di ritiro');
      return;
    }
    
    console.log('User tapped pickup point:', pointCity);
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
      
      console.log('Pickup point updated successfully to:', pointCity);
      Alert.alert('Successo', `Punto di ritiro aggiornato a ${pointCity}`);
    } catch (error) {
      console.error('Exception updating pickup point:', error);
      Alert.alert('Errore', 'Errore imprevisto durante l\'aggiornamento');
    } finally {
      setUpdatingPoint(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'RITIRO',
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
          <View style={styles.header}>
            <Text style={styles.headerTitle}>RITIRO</Text>
            <Text style={styles.headerSubtitle}>
              Gestisci il tuo punto di ritiro e metodo di pagamento
            </Text>
          </View>

          {/* 1. Come funziona */}
          <View style={styles.howItWorksCard}>
            <View style={styles.cardHeader}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={28}
                color={colors.primary}
              />
              <Text style={styles.cardTitle}>Come funziona?</Text>
            </View>
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
                    Alla chiusura del drop, ti notificheremo l&apos;importo esatto da pagare
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
                    Quando l&apos;ordine arriva al punto di ritiro, ritiralo e paga in contanti
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 2. Scelta del punto di ritiro */}
          <View style={styles.pickupPointSection}>
            <View style={styles.cardHeader}>
              <IconSymbol
                ios_icon_name="mappin.circle.fill"
                android_material_icon_name="location_on"
                size={28}
                color={colors.primary}
              />
              <Text style={styles.cardTitle}>Punto di Ritiro</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Seleziona il punto di ritiro più vicino a te. Tutti i tuoi ordini verranno consegnati qui.
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
                    {selectedPickupPoint === point.city && !updatingPoint && (
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

          {/* 3. Metodi di pagamento */}
          <View style={styles.paymentCard}>
            <View style={styles.cardHeader}>
              <IconSymbol
                ios_icon_name="creditcard.fill"
                android_material_icon_name="payment"
                size={28}
                color={colors.primary}
              />
              <Text style={styles.cardTitle}>Metodo di Pagamento</Text>
            </View>
            <View style={styles.paymentMethodContainer}>
              <View style={styles.paymentHeader}>
                <View style={styles.paymentInfo}>
                  <View style={styles.iconContainer}>
                    <IconSymbol
                      ios_icon_name="banknote.fill"
                      android_material_icon_name="payments"
                      size={48}
                      color={colors.text}
                    />
                  </View>
                  <View style={styles.paymentDetails}>
                    <Text style={styles.paymentTitle}>Pagamento alla Consegna</Text>
                    <Text style={styles.paymentDescription}>
                      Paga in contanti quando ritiri il tuo ordine
                    </Text>
                  </View>
                </View>
                <View style={styles.activeBadge}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color="#4CAF50"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 4. Importante - Ritiro entro i tempi stabiliti */}
          <View style={styles.importantCard}>
            <View style={styles.cardHeader}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={28}
                color="#FF9800"
              />
              <Text style={styles.cardTitle}>Importante</Text>
            </View>
            <Text style={styles.importantText}>
              <Text style={styles.importantBold}>Assicurati di ritirare i tuoi ordini entro i tempi stabiliti.</Text>
              {'\n\n'}
              Dopo 5 ordini non ritirati e rispediti al fornitore, l&apos;account verrà bloccato definitivamente.
              {'\n\n'}
              Al punto di ritiro sarà possibile effettuare resi dei singoli articoli, ma dopo molti articoli restituiti il profilo sarà bloccato momentaneamente.
            </Text>
          </View>

          {/* 5. Sistema di rating */}
          <View style={styles.ratingCard}>
            <View style={styles.cardHeader}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={28}
                color="#FFD700"
              />
              <Text style={styles.cardTitle}>Sistema di Rating</Text>
            </View>
            <Text style={styles.ratingText}>
              Il tuo rating è fondamentale per accedere ai vantaggi della piattaforma:
            </Text>
            <View style={styles.ratingPointsList}>
              <View style={styles.ratingPoint}>
                <IconSymbol
                  ios_icon_name="arrow.up.circle.fill"
                  android_material_icon_name="arrow_upward"
                  size={20}
                  color="#4CAF50"
                />
                <Text style={styles.ratingPointText}>
                  <Text style={styles.ratingPointBold}>Il rating aumenta</Text> quando ritiri gli ordini nei tempi stabiliti
                </Text>
              </View>
              <View style={styles.ratingPoint}>
                <IconSymbol
                  ios_icon_name="arrow.down.circle.fill"
                  android_material_icon_name="arrow_downward"
                  size={20}
                  color="#F44336"
                />
                <Text style={styles.ratingPointText}>
                  <Text style={styles.ratingPointBold}>Il rating diminuisce</Text> quando gli ordini vengono rispediti al mittente
                </Text>
              </View>
              <View style={styles.ratingPoint}>
                <IconSymbol
                  ios_icon_name="star.circle.fill"
                  android_material_icon_name="stars"
                  size={20}
                  color="#FFD700"
                />
                <Text style={styles.ratingPointText}>
                  <Text style={styles.ratingPointBold}>Con 5 stelle</Text> accedi al programma fedeltà e guadagni punti su ogni acquisto
                </Text>
              </View>
            </View>
            <View style={styles.ratingFooter}>
              <Text style={styles.ratingFooterText}>
                Mantieni un rating alto per sbloccare coupon esclusivi e vantaggi speciali!
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
  header: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
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
  pickupPointSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.backgroundSecondary,
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
  paymentCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  paymentDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  activeBadge: {
    marginLeft: 8,
  },
  importantCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  importantText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 22,
  },
  importantBold: {
    fontWeight: '700',
    fontSize: 15,
  },
  ratingCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  ratingText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 16,
    lineHeight: 20,
  },
  ratingPointsList: {
    gap: 16,
    marginBottom: 20,
  },
  ratingPoint: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  ratingPointText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  ratingPointBold: {
    fontWeight: '700',
  },
  ratingFooter: {
    backgroundColor: '#FFD70030',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  ratingFooterText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
