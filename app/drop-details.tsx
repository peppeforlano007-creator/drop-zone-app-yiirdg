
import { usePayment } from '@/contexts/PaymentContext';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable, Alert, Linking, Animated, ActivityIndicator } from 'react-native';
import { useRealtimeDrop } from '@/hooks/useRealtimeDrop';

const { width, height } = Dimensions.get('window');

interface ProductData {
  id: string;
  name: string;
  description: string;
  image_url: string;
  additional_images: string[];
  original_price: number;
  available_sizes: string[];
  available_colors: string[];
  condition: string;
  category: string;
  stock: number;
}

interface DropData {
  id: string;
  name: string;
  current_discount: number;
  current_value: number;
  target_value: number;
  start_time: string;
  end_time: string;
  status: string;
  supplier_list_id: string;
  pickup_point_id: string;
  pickup_points: {
    name: string;
    city: string;
  };
  supplier_lists: {
    name: string;
    min_discount: number;
    max_discount: number;
    min_reservation_value: number;
    max_reservation_value: number;
  };
}

export default function DropDetailsScreen() {
  const { dropId } = useLocalSearchParams<{ dropId: string }>();
  const [drop, setDrop] = useState<DropData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBookings, setUserBookings] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState('');
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const { hasPaymentMethod } = usePayment();
  const { user } = useAuth();

  const loadDropDetails = useCallback(async () => {
    if (!dropId) {
      console.log('No dropId provided');
      return;
    }

    try {
      console.log('Loading drop details for:', dropId);
      
      const { data: dropData, error: dropError } = await supabase
        .from('drops')
        .select(`
          *,
          pickup_points (
            name,
            city
          ),
          supplier_lists (
            name,
            min_discount,
            max_discount,
            min_reservation_value,
            max_reservation_value
          )
        `)
        .eq('id', dropId)
        .single();

      if (dropError) {
        console.error('Error loading drop:', dropError);
        Alert.alert('Errore', 'Impossibile caricare i dettagli del drop');
        return;
      }

      console.log('Drop data loaded:', dropData);
      setDrop(dropData);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_list_id', dropData.supplier_list_id)
        .eq('status', 'active');

      if (productsError) {
        console.error('Error loading products:', productsError);
      } else {
        console.log('Products loaded:', productsData?.length);
        setProducts(productsData || []);
      }
    } catch (error) {
      console.error('Error in loadDropDetails:', error);
    } finally {
      setLoading(false);
    }
  }, [dropId]);

  const loadUserBookings = useCallback(async () => {
    if (!user || !dropId) {
      console.log('No user or dropId for loading bookings');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('drop_id', dropId)
        .in('status', ['active', 'confirmed']);

      if (error) {
        console.error('Error loading user bookings:', error);
        return;
      }

      const bookingSet = new Set(data.map(b => b.product_id));
      setUserBookings(bookingSet);
      console.log('User bookings loaded:', bookingSet.size);
    } catch (error) {
      console.error('Error in loadUserBookings:', error);
    }
  }, [user, dropId]);

  useEffect(() => {
    loadDropDetails();
    loadUserBookings();
  }, [dropId, loadDropDetails, loadUserBookings]);

  // Set up real-time subscription for drop updates
  const handleDropUpdate = useCallback((updatedDrop: any) => {
    console.log('Real-time drop update received:', updatedDrop);
    
    setDrop(prevDrop => {
      if (!prevDrop) return prevDrop;
      
      return {
        ...prevDrop,
        current_discount: updatedDrop.current_discount,
        current_value: updatedDrop.current_value,
        status: updatedDrop.status,
        updated_at: updatedDrop.updated_at,
      };
    });

    // Trigger bounce animation on discount update
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [bounceAnim]);

  const { isConnected } = useRealtimeDrop({
    dropId: dropId || '',
    onUpdate: handleDropUpdate,
    enabled: !!dropId,
  });

  useEffect(() => {
    if (!drop) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(drop.end_time).getTime();
      const distance = endTime - now;

      if (distance < 0) {
        setTimeRemaining('Drop terminato');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeRemaining(`${days}g ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [drop]);

  const calculateNewDiscount = (newValue: number): number => {
    if (!drop) return 0;

    const { min_discount, max_discount, min_reservation_value, max_reservation_value } = drop.supplier_lists;

    if (newValue <= min_reservation_value) {
      return min_discount;
    }

    if (newValue >= max_reservation_value) {
      return max_discount;
    }

    const valueRange = max_reservation_value - min_reservation_value;
    const discountRange = max_discount - min_discount;
    const valueProgress = (newValue - min_reservation_value) / valueRange;
    const newDiscount = min_discount + (discountRange * valueProgress);

    return Math.round(newDiscount * 100) / 100;
  };

  const handleBook = async (productId: string) => {
    if (!user) {
      Alert.alert('Accesso richiesto', 'Devi effettuare l\'accesso per prenotare');
      router.push('/login');
      return;
    }

    if (!hasPaymentMethod()) {
      Alert.alert(
        'Metodo di pagamento richiesto',
        'Aggiungi un metodo di pagamento per prenotare',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Aggiungi carta', onPress: () => router.push('/add-payment-method') }
        ]
      );
      return;
    }

    if (!drop) {
      Alert.alert('Errore', 'Impossibile prenotare in questo momento');
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) {
      Alert.alert('Errore', 'Prodotto non trovato');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const currentDiscountedPrice = product.original_price * (1 - drop.current_discount / 100);

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          product_id: productId,
          drop_id: drop.id,
          pickup_point_id: drop.pickup_point_id,
          original_price: product.original_price,
          discount_percentage: drop.current_discount,
          authorized_amount: currentDiscountedPrice,
          payment_status: 'authorized',
          status: 'active',
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        Alert.alert('Errore', 'Impossibile creare la prenotazione');
        return;
      }

      console.log('Booking created:', booking);

      const newValue = drop.current_value + currentDiscountedPrice;
      const newDiscount = calculateNewDiscount(newValue);

      const { error: updateError } = await supabase
        .from('drops')
        .update({
          current_value: newValue,
          current_discount: newDiscount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', drop.id);

      if (updateError) {
        console.error('Error updating drop:', updateError);
      }

      setUserBookings(prev => new Set([...prev, productId]));

      Alert.alert(
        'Prenotazione confermata!',
        `Hai prenotato ${product.name} con uno sconto del ${drop.current_discount.toFixed(1)}%.\n\nImporto bloccato: €${currentDiscountedPrice.toFixed(2)}\n\nL'importo finale verrà addebitato alla chiusura del drop in base allo sconto raggiunto.`,
        [{ text: 'OK' }]
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error in handleBook:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante la prenotazione');
    }
  };

  const handlePressIn = () => {
    Animated.spring(bounceAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(bounceAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleShareWhatsApp = async () => {
    if (!drop) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const message = `🔥 Drop attivo: ${drop.name}!\n\n💰 Sconto attuale: ${drop.current_discount.toFixed(1)}%\n⏰ Tempo rimanente: ${timeRemaining}\n\n🎯 Più persone prenotano, più lo sconto aumenta!\n\nUnisciti ora! 👇`;

    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Errore', 'WhatsApp non è installato sul dispositivo');
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert('Errore', 'Impossibile aprire WhatsApp');
    }
  };

  const renderProduct = ({ item }: { item: ProductData }) => {
    const isBooked = userBookings.has(item.id);
    
    return (
      <View style={styles.productContainer}>
        <ProductCard
          product={item}
          isInDrop={true}
          currentDiscount={drop?.current_discount}
          onBook={isBooked ? undefined : handleBook}
          isInterested={isBooked}
        />
      </View>
    );
  };

  const getItemLayout = (_: any, index: number) => ({
    length: height,
    offset: height * index,
    index,
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento drop...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!drop) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="error" size={48} color={colors.error} />
          <Text style={styles.errorText}>Drop non trovato</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Torna indietro</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.dropName}>{drop.name}</Text>
          <Text style={styles.pickupPoint}>
            <IconSymbol ios_icon_name="location.fill" android_material_icon_name="location_on" size={14} color={colors.textSecondary} />
            {' '}{drop.pickup_points.name}
          </Text>
        </View>

        <Pressable
          style={styles.shareBtn}
          onPress={handleShareWhatsApp}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
            <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={24} color={colors.text} />
          </Animated.View>
        </Pressable>
      </View>

      {/* Drop Info Bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Sconto attuale</Text>
          <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
            <Text style={styles.discountText}>{drop.current_discount.toFixed(1)}%</Text>
          </Animated.View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Tempo rimanente</Text>
          <Text style={styles.timerText}>{timeRemaining}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Progresso</Text>
          <Text style={styles.progressText}>
            €{drop.current_value.toFixed(0)} / €{drop.target_value.toFixed(0)}
          </Text>
        </View>
      </View>

      {/* Real-time connection indicator */}
      {isConnected && (
        <View style={styles.realtimeIndicator}>
          <View style={styles.realtimeDot} />
          <Text style={styles.realtimeText}>Aggiornamenti in tempo reale attivi</Text>
        </View>
      )}

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min((drop.current_value / drop.target_value) * 100, 100)}%` }
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {Math.min(Math.round((drop.current_value / drop.target_value) * 100), 100)}% dell'obiettivo
        </Text>
      </View>

      {/* Products List */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={1}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'System',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  dropName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'System',
  },
  pickupPoint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: 'System',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontFamily: 'System',
  },
  discountText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'System',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'System',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'System',
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.success + '20',
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 8,
  },
  realtimeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    fontFamily: 'System',
  },
  progressBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'System',
  },
  productContainer: {
    height: height,
  },
});
