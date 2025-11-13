
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable, Alert, Linking, Animated, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import ProductCard from '@/components/ProductCard';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePayment } from '@/contexts/PaymentContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const { dropId } = useLocalSearchParams();
  const [drop, setDrop] = useState<DropData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [bookedProducts, setBookedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();
  const { getDefaultPaymentMethod } = usePayment();
  
  // Animation values for share button
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const loadDropDetails = useCallback(async () => {
    try {
      console.log('Loading drop details for:', dropId);

      // Load drop details
      const { data: dropData, error: dropError } = await supabase
        .from('drops')
        .select(`
          id,
          name,
          current_discount,
          current_value,
          target_value,
          start_time,
          end_time,
          status,
          supplier_list_id,
          pickup_point_id,
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
        setLoading(false);
        return;
      }

      console.log('Drop loaded:', dropData);
      setDrop(dropData);

      // Load products for this drop's supplier list
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_list_id', dropData.supplier_list_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error loading products:', productsError);
        setLoading(false);
        return;
      }

      console.log('Products loaded:', productsData?.length || 0);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error in loadDropDetails:', error);
    } finally {
      setLoading(false);
    }
  }, [dropId]);

  const loadUserBookings = useCallback(async () => {
    try {
      if (!user?.id) {
        console.log('No user ID available');
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('drop_id', dropId)
        .in('status', ['active', 'confirmed']);

      if (error) {
        console.error('Error loading bookings:', error);
        return;
      }

      const bookedIds = new Set(data?.map(b => b.product_id) || []);
      setBookedProducts(bookedIds);
    } catch (error) {
      console.error('Error in loadUserBookings:', error);
    }
  }, [user?.id, dropId]);

  useEffect(() => {
    if (dropId) {
      loadDropDetails();
      loadUserBookings();
    }
  }, [dropId, loadDropDetails, loadUserBookings]);

  // Subtle bounce animation for the share button
  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -4,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    bounceAnimation.start();

    return () => {
      bounceAnimation.stop();
    };
  }, [bounceAnim]);

  const calculateNewDiscount = (newValue: number): number => {
    if (!drop) return 0;

    const minValue = drop.supplier_lists.min_reservation_value;
    const maxValue = drop.supplier_lists.max_reservation_value;
    const minDiscount = drop.supplier_lists.min_discount;
    const maxDiscount = drop.supplier_lists.max_discount;

    // Calculate discount based on value progress
    const valueProgress = (newValue - minValue) / (maxValue - minValue);
    const discountRange = maxDiscount - minDiscount;
    const newDiscount = minDiscount + (discountRange * valueProgress);

    // Clamp between min and max
    return Math.min(Math.max(newDiscount, minDiscount), maxDiscount);
  };

  const handleBook = async (productId: string, selectedSize?: string, selectedColor?: string) => {
    if (!drop || !user) return;

    try {
      console.log('Booking product:', productId);

      // Check if user has a payment method
      const defaultPaymentMethod = getDefaultPaymentMethod();
      if (!defaultPaymentMethod) {
        Alert.alert(
          'Metodo di Pagamento Richiesto',
          'Devi aggiungere un metodo di pagamento prima di prenotare.',
          [
            { text: 'Annulla', style: 'cancel' },
            {
              text: 'Aggiungi Carta',
              onPress: () => router.push('/add-payment-method'),
            },
          ]
        );
        return;
      }

      // Get product details
      const product = products.find(p => p.id === productId);
      if (!product) return;

      // IMPORTANTE: Blocchiamo l'importo allo sconto ATTUALE, non il prezzo listino
      const currentDiscountedPrice = product.original_price * (1 - drop.current_discount / 100);
      
      // Il prezzo finale sarà calcolato quando il drop si chiude in base allo sconto finale raggiunto
      const minPossiblePrice = product.original_price * (1 - drop.supplier_lists.max_discount / 100);
      const maxPossiblePrice = product.original_price * (1 - drop.supplier_lists.min_discount / 100);

      // Get user's profile for pickup point
      const { data: profile } = await supabase
        .from('profiles')
        .select('pickup_point_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.pickup_point_id) {
        Alert.alert('Errore', 'Punto di ritiro non trovato');
        return;
      }

      // Create booking
      // authorized_amount: importo bloccato sulla carta ORA (allo sconto attuale)
      // final_price: sarà calcolato quando il drop si chiude (allo sconto finale)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          product_id: productId,
          drop_id: drop.id,
          pickup_point_id: profile.pickup_point_id,
          selected_size: selectedSize,
          selected_color: selectedColor,
          original_price: product.original_price,
          discount_percentage: drop.current_discount,
          authorized_amount: currentDiscountedPrice, // Blocchiamo il prezzo con sconto attuale
          final_price: null, // Sarà calcolato alla chiusura del drop
          payment_status: 'authorized',
          status: 'active',
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        Alert.alert('Errore', 'Non è stato possibile completare la prenotazione');
        return;
      }

      console.log('Booking created:', booking);

      // Update drop value and discount
      const newValue = drop.current_value + product.original_price;
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
      } else {
        console.log('Drop updated - New value:', newValue, 'New discount:', newDiscount);
        
        // Update local state
        setDrop({
          ...drop,
          current_value: newValue,
          current_discount: newDiscount,
        });
      }

      // Update booked products
      setBookedProducts(prev => {
        const newSet = new Set(prev);
        newSet.add(productId);
        return newSet;
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Prenotazione Confermata! 🎉',
        `Il prodotto è stato prenotato.\n\n` +
        `💳 Importo bloccato sulla carta: €${currentDiscountedPrice.toFixed(2)}\n` +
        `(Sconto attuale: ${drop.current_discount.toFixed(0)}%)\n\n` +
        `🎯 Alla fine del drop, addebiteremo solo il prezzo finale con lo sconto raggiunto.\n\n` +
        `💰 Prezzo minimo possibile: €${minPossiblePrice.toFixed(2)}\n` +
        `(Se si raggiunge lo sconto massimo del ${drop.supplier_lists.max_discount}%)\n\n` +
        `💵 Prezzo massimo possibile: €${maxPossiblePrice.toFixed(2)}\n` +
        `(Se rimane allo sconto minimo del ${drop.supplier_lists.min_discount}%)`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error in handleBook:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante la prenotazione');
    }
  };

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleShareWhatsApp = async () => {
    if (!drop) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Create a shareable message
    const message = `🎉 Guarda questo Drop su DROPMARKET!\n\n` +
      `📦 ${drop.supplier_lists.name}\n` +
      `📍 Punto di ritiro: ${drop.pickup_points.city}\n` +
      `💰 Sconto attuale: ${drop.current_discount.toFixed(0)}%\n` +
      `🎯 Sconto massimo: ${drop.supplier_lists.max_discount}%\n` +
      `🛍️ ${products.length} prodotti disponibili\n\n` +
      `Più persone prenotano con carta, più lo sconto aumenta! 🚀\n\n` +
      `Unisciti al drop: dropmarket://drop/${dropId}`;

    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        console.log('WhatsApp opened successfully');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(
          'WhatsApp non disponibile',
          'WhatsApp non è installato sul tuo dispositivo. Installa WhatsApp per condividere questo drop.',
          [{ text: 'OK' }]
        );
        console.log('WhatsApp not available');
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Errore',
        'Si è verificato un errore durante l\'apertura di WhatsApp. Riprova più tardi.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderProduct = ({ item }: { item: ProductData }) => {
    // Transform database product to ProductCard format
    const transformedProduct = {
      id: item.id,
      supplierId: '',
      supplierName: drop?.supplier_lists.name || '',
      listId: drop?.supplier_list_id || '',
      name: item.name,
      description: item.description || '',
      imageUrl: item.image_url,
      imageUrls: [item.image_url, ...(item.additional_images || [])],
      originalPrice: Number(item.original_price),
      minDiscount: drop?.supplier_lists.min_discount || 0,
      maxDiscount: drop?.supplier_lists.max_discount || 0,
      minReservationValue: drop?.supplier_lists.min_reservation_value || 0,
      maxReservationValue: drop?.supplier_lists.max_reservation_value || 0,
      category: item.category || '',
      stock: item.stock || 0,
      sizes: item.available_sizes,
      colors: item.available_colors,
      condition: item.condition as any,
      availableSizes: item.available_sizes,
      availableColors: item.available_colors,
    };

    return (
      <ProductCard
        product={transformedProduct}
        isInDrop={true}
        currentDiscount={drop?.current_discount}
        onBook={handleBook}
        isInterested={bookedProducts.has(item.id)}
      />
    );
  };

  const getItemLayout = (_: any, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  });

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Caricamento...',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={styles.loadingText}>Caricamento drop...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!drop) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Drop non trovato',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol 
            ios_icon_name="exclamationmark.triangle" 
            android_material_icon_name="warning" 
            size={64} 
            color={colors.text} 
          />
          <Text style={styles.errorText}>Drop non trovato</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (products.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: drop.supplier_lists.name,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <IconSymbol 
              ios_icon_name="tray" 
              android_material_icon_name="inbox" 
              size={64} 
              color={colors.textTertiary} 
            />
            <Text style={styles.errorText}>Nessun prodotto disponibile</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: drop.supplier_lists.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
        />
        
        {/* Minimal WhatsApp Share Button */}
        <View style={styles.shareButtonContainer}>
          <Animated.View 
            style={[
              styles.shareButtonWrapper,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateY: bounceAnim },
                ],
              },
            ]}
          >
            <Pressable 
              onPress={handleShareWhatsApp}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={styles.whatsappButton}
            >
              <View style={styles.buttonContent}>
                <View style={styles.iconContainer}>
                  <IconSymbol 
                    ios_icon_name="square.and.arrow.up" 
                    android_material_icon_name="share" 
                    size={16} 
                    color="#FFF" 
                  />
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={styles.buttonTitle}>Invita Amici e Parenti</Text>
                  <Text style={styles.buttonSubtext}>
                    Più condividi, più risparmi
                  </Text>
                </View>
                
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>
                    {drop.current_discount.toFixed(0)}% → {drop.supplier_lists.max_discount}%
                  </Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  shareButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'transparent',
  },
  shareButtonWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  whatsappButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1565C0',
    overflow: 'hidden',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  buttonTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  buttonSubtext: {
    color: '#E3F2FD',
    fontSize: 11,
    fontWeight: '500',
  },
  discountBadge: {
    backgroundColor: '#B3E5FC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#0D47A1',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
