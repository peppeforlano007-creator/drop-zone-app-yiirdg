
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/app/integrations/supabase/client';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useRealtimeDrop } from '@/hooks/useRealtimeDrop';
import { colors } from '@/styles/commonStyles';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable, Alert, Linking, Animated, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import EnhancedProductCard from '@/components/EnhancedProductCard';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  additional_images: string[] | null;
  original_price: number;
  available_sizes: string[] | null;
  available_colors: string[] | null;
  condition: string;
  category: string | null;
  stock: number;
  status: string;
  supplier_list_id: string;
  sku?: string | null;
  brand?: string | null;
  variants?: any[];
  hasVariants?: boolean;
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

// Helper function to load variants in batches with improved error handling
async function loadVariantsInBatches(productIds: string[], batchSize: number = 50): Promise<any[]> {
  console.log(`→ Loading variants for ${productIds.length} products in batches of ${batchSize}...`);
  
  const allVariants: any[] = [];
  const totalBatches = Math.ceil(productIds.length / batchSize);
  let successfulBatches = 0;
  let failedBatches = 0;
  
  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .in('product_id', batch)
        .gt('stock', 0);
      
      if (error) {
        console.error(`  ❌ Batch ${batchNumber}/${totalBatches} failed:`, error.message);
        failedBatches++;
        // Continue with other batches even if one fails
        continue;
      }
      
      if (data && data.length > 0) {
        allVariants.push(...data);
        successfulBatches++;
      }
    } catch (error) {
      console.error(`  ❌ Batch ${batchNumber}/${totalBatches} exception:`, error);
      failedBatches++;
      // Continue with other batches
      continue;
    }
  }
  
  console.log(`✓ Variant loading complete: ${successfulBatches}/${totalBatches} batches successful, ${failedBatches} failed, ${allVariants.length} total variants loaded`);
  return allVariants;
}

export default function DropDetailsScreen() {
  const { dropId, scrollToProductId } = useLocalSearchParams<{ dropId: string; scrollToProductId?: string }>();
  const [drop, setDrop] = useState<DropData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBookings, setUserBookings] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState('');
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const loadDropDetails = useCallback(async () => {
    if (!dropId) {
      console.log('❌ No dropId provided');
      return;
    }

    try {
      console.log('📥 Loading drop details for:', dropId);
      
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
        console.error('❌ Error loading drop:', dropError);
        Alert.alert('Errore', 'Impossibile caricare i dettagli del drop');
        return;
      }

      console.log('✅ Drop data loaded:', {
        id: dropData.id,
        name: dropData.name,
        current_discount: dropData.current_discount,
        current_value: dropData.current_value,
        updated_at: dropData.updated_at,
      });
      setDrop(dropData);

      // Load products with stock > 0 - IGNORE status field
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_list_id', dropData.supplier_list_id)
        .gt('stock', 0)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('❌ Error loading products:', productsError);
      } else {
        // Filter to ensure only products with stock > 0
        const availableProducts = (productsData || []).filter(p => p.stock > 0);
        console.log('✅ Products loaded:', availableProducts.length, 'with stock > 0');
        
        // Load variants for these products IN BATCHES to avoid URL length issues
        if (availableProducts.length > 0) {
          const productIds = availableProducts.map(p => p.id);
          
          try {
            // Use smaller batch size (50 instead of 100) to avoid URL length issues
            const variantsData = await loadVariantsInBatches(productIds, 50);
            console.log('✅ Successfully loaded', variantsData.length, 'variants');
            
            // Map variants to products
            const variantsMap = new Map<string, any[]>();
            variantsData.forEach(v => {
              if (!variantsMap.has(v.product_id)) {
                variantsMap.set(v.product_id, []);
              }
              variantsMap.get(v.product_id)!.push(v);
            });
            
            // Add variants to products
            const productsWithVariants = availableProducts.map(p => ({
              ...p,
              variants: variantsMap.get(p.id) || [],
              hasVariants: (variantsMap.get(p.id) || []).length > 0,
            }));
            
            setProducts(productsWithVariants);
          } catch (error) {
            // Log error but don't fail the entire load - products can still be displayed without variants
            console.error('⚠ Error loading variants (non-fatal):', error);
            setProducts(availableProducts);
          }
        } else {
          setProducts(availableProducts);
        }
      }
    } catch (error) {
      console.error('❌ Error in loadDropDetails:', error);
    } finally {
      setLoading(false);
    }
  }, [dropId]);

  const loadUserBookings = useCallback(async () => {
    if (!user || !dropId) {
      console.log('⏭️ No user or dropId for loading bookings');
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
        console.error('❌ Error loading user bookings:', error);
        return;
      }

      if (data) {
        const bookingSet = new Set(data.map(b => b.product_id));
        setUserBookings(bookingSet);
        console.log('✅ User bookings loaded:', bookingSet.size);
      }
    } catch (error) {
      console.error('❌ Error in loadUserBookings:', error);
    }
  }, [user, dropId]);

  useEffect(() => {
    loadDropDetails();
    loadUserBookings();
  }, [dropId, loadDropDetails, loadUserBookings]);

  // Scroll to specific product if coming from wishlist
  useEffect(() => {
    if (scrollToProductId && products.length > 0 && flatListRef.current) {
      const productIndex = products.findIndex(p => p.id === scrollToProductId);
      if (productIndex !== -1) {
        console.log('📍 Scrolling to product at index:', productIndex);
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: productIndex,
            animated: true,
          });
        }, 500);
      }
    }
  }, [scrollToProductId, products]);

  // Real-time subscription for product stock updates
  useEffect(() => {
    if (!drop) return;

    console.log('🚀 Setting up real-time subscription for product stock updates');
    
    const channel = supabase
      .channel(`product_stock_updates_${drop.supplier_list_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `supplier_list_id=eq.${drop.supplier_list_id}`,
        },
        (payload) => {
          console.log('📡 Product stock update received:', payload);
          const updatedProduct = payload.new as ProductData;
          
          setProducts(prevProducts => {
            // IMPORTANT: Only remove if stock is 0 or less, ignore status field
            if (updatedProduct.stock <= 0) {
              console.log('🗑️ Product out of stock, removing from list:', updatedProduct.id, 'stock:', updatedProduct.stock);
              const filtered = prevProducts.filter(p => p.id !== updatedProduct.id);
              
              // If this was the last product, show a message
              if (filtered.length === 0 && prevProducts.length > 0) {
                console.log('⚠️ Last product removed from drop');
                setTimeout(() => {
                  Alert.alert(
                    'Tutti i prodotti esauriti',
                    'Tutti gli articoli di questo drop sono stati prenotati.',
                    [{ text: 'OK', onPress: () => router.back() }]
                  );
                }, 500);
              }
              
              return filtered;
            }
            
            // Update existing product if it has stock
            const existingIndex = prevProducts.findIndex(p => p.id === updatedProduct.id);
            if (existingIndex >= 0) {
              const newProducts = [...prevProducts];
              newProducts[existingIndex] = updatedProduct;
              console.log('✅ Product updated in list:', updatedProduct.id, 'stock:', updatedProduct.stock);
              return newProducts;
            } else if (updatedProduct.stock > 0) {
              // Product became available again (e.g., booking cancelled)
              console.log('✨ Product became available again, adding to list:', updatedProduct.id, 'stock:', updatedProduct.stock);
              return [...prevProducts, updatedProduct];
            }
            
            return prevProducts;
          });
        }
      )
      .subscribe((status) => {
        console.log('📶 Product stock subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [drop]);

  const handleDropUpdate = useCallback((updatedDrop: any) => {
    console.log('🔄 Real-time drop update received in drop-details:', {
      id: updatedDrop.id,
      current_discount: updatedDrop.current_discount,
      current_value: updatedDrop.current_value,
      updated_at: updatedDrop.updated_at,
    });
    
    setDrop(prevDrop => {
      if (!prevDrop || prevDrop.id !== updatedDrop.id) return prevDrop;
      
      const newDrop = {
        ...prevDrop,
        current_discount: updatedDrop.current_discount ?? prevDrop.current_discount,
        current_value: updatedDrop.current_value ?? prevDrop.current_value,
        status: updatedDrop.status ?? prevDrop.status,
        updated_at: updatedDrop.updated_at,
      };
      
      console.log('✅ Drop state updated:', {
        old_discount: prevDrop.current_discount,
        new_discount: newDrop.current_discount,
        old_value: prevDrop.current_value,
        new_value: newDrop.current_value,
      });
      
      return newDrop;
    });

    // Animate the discount badge
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

      const parts = [];
      if (days > 0) parts.push(`${days}g`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds >= 0) parts.push(`${seconds}s`);

      setTimeRemaining(parts.join(' '));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [drop]);

  const calculateNewDiscount = useCallback((newValue: number): number => {
    if (!drop || !drop.supplier_lists) return 0;

    const minDiscount = drop.supplier_lists.min_discount ?? 0;
    const maxDiscount = drop.supplier_lists.max_discount ?? 0;
    const minReservationValue = drop.supplier_lists.min_reservation_value ?? 0;
    const maxReservationValue = drop.supplier_lists.max_reservation_value ?? 0;

    if (newValue <= minReservationValue) {
      return minDiscount;
    }

    if (newValue >= maxReservationValue) {
      return maxDiscount;
    }

    const valueRange = maxReservationValue - minReservationValue;
    const discountRange = maxDiscount - minDiscount;
    const valueProgress = (newValue - minReservationValue) / valueRange;
    const newDiscount = minDiscount + (discountRange * valueProgress);

    return Math.round(newDiscount * 100) / 100;
  }, [drop]);

  const isAtRiskOfUnderfunding = useCallback((): boolean => {
    if (!drop || !drop.supplier_lists) return false;
    
    const now = new Date().getTime();
    const endTime = new Date(drop.end_time).getTime();
    const timeLeft = endTime - now;
    const hoursLeft = timeLeft / (1000 * 60 * 60);
    
    const currentValue = drop.current_value ?? 0;
    const minReservationValue = drop.supplier_lists.min_reservation_value ?? 0;
    
    return hoursLeft < 24 && currentValue < minReservationValue;
  }, [drop]);

  const getUnderfundingProgress = useCallback((): number => {
    if (!drop || !drop.supplier_lists) return 0;
    const currentValue = drop.current_value ?? 0;
    const minValue = drop.supplier_lists.min_reservation_value ?? 1;
    return (currentValue / minValue) * 100;
  }, [drop]);



  const handleBook = useCallback(async (productId: string, variantId?: string) => {
    console.log('=== HANDLE BOOK CALLED (COD) ===');
    console.log('Product ID:', productId);
    console.log('Variant ID:', variantId);
    console.log('User:', user?.id);
    console.log('Drop:', drop?.id);

    if (!user) {
      Alert.alert('Accesso richiesto', 'Devi effettuare l\'accesso per prenotare');
      router.push('/login');
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

    if (product.stock <= 0) {
      Alert.alert('Prodotto esaurito', 'Questo prodotto non è più disponibile');
      loadDropDetails();
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const currentDiscount = drop.current_discount ?? 0;
      const originalPrice = product.original_price ?? 0;
      const currentDiscountedPrice = originalPrice * (1 - currentDiscount / 100);

      console.log('Creating booking with COD payment:', {
        user_id: user.id,
        product_id: productId,
        variant_id: variantId || null,
        drop_id: drop.id,
        pickup_point_id: drop.pickup_point_id,
        original_price: originalPrice,
        discount_percentage: currentDiscount,
        final_price: currentDiscountedPrice,
        payment_method: 'cod',
        payment_status: 'pending',
        status: 'active',
      });

      // Create booking - the database trigger will automatically:
      // 1. Decrement variant stock (if variantId provided) or product stock
      // 2. Update drop discount and current_value
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          product_id: productId,
          variant_id: variantId || null,
          drop_id: drop.id,
          pickup_point_id: drop.pickup_point_id,
          original_price: originalPrice,
          discount_percentage: currentDiscount,
          final_price: currentDiscountedPrice,
          payment_method: 'cod',
          payment_status: 'pending',
          status: 'active',
        })
        .select()
        .single();

      if (bookingError) {
        // Check if it's a stock error (P0001 error code)
        if (bookingError.code === 'P0001' || 
            bookingError.message?.toLowerCase().includes('esaurito') ||
            bookingError.message?.toLowerCase().includes('stock') ||
            bookingError.message?.toLowerCase().includes('disponibile')) {
          // Only show user-friendly message, no technical error
          Alert.alert(
            'Prodotto esaurito', 
            'Questo prodotto non è più disponibile. Qualcun altro lo ha appena prenotato.',
            [{ text: 'OK', onPress: () => loadDropDetails() }]
          );
        } else {
          // For other errors, show the error message
          console.error('❌ Error creating booking:', bookingError);
          Alert.alert(
            'Errore', 
            'Impossibile creare la prenotazione. Riprova più tardi.',
            [{ text: 'OK' }]
          );
        }
        return;
      }

      console.log('✅ Booking created:', bookingData);

      // Update local state
      setUserBookings(prev => new Set([...prev, productId]));

      // The real-time subscriptions will handle:
      // 1. Product stock update (will remove from list if stock = 0)
      // 2. Drop discount and value update
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        '✅ Prenotazione confermata!',
        `Hai prenotato ${product.name} con sconto del ${Math.floor(currentDiscount)}%.\n\nLo sconto potrebbe aumentare se più persone prenotano. Condividi il drop con amici e parenti!`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      // Check if it's a stock-related error
      if (error?.code === 'P0001' ||
          error?.message?.toLowerCase().includes('esaurito') ||
          error?.message?.toLowerCase().includes('stock') ||
          error?.message?.toLowerCase().includes('disponibile')) {
        // Only show user-friendly message, no technical error
        Alert.alert(
          'Prodotto esaurito',
          'Questo prodotto non è più disponibile. Qualcun altro lo ha appena prenotato.',
          [{ text: 'OK', onPress: () => loadDropDetails() }]
        );
      } else {
        // For other errors, log and show generic message
        console.error('❌ Exception in handleBook:', error);
        Alert.alert(
          'Errore',
          'Si è verificato un errore durante la prenotazione. Riprova più tardi.',
          [{ text: 'OK' }]
        );
      }
    }
  }, [user, drop, products, loadDropDetails]);

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

    const atRisk = isAtRiskOfUnderfunding();
    const currentDiscount = drop.current_discount ?? 0;
    const currentValue = drop.current_value ?? 0;
    const minReservationValue = drop.supplier_lists?.min_reservation_value ?? 0;
    
    const urgencyMessage = atRisk 
      ? `\n\n⚠️ URGENTE: Mancano meno di 24 ore e non abbiamo ancora raggiunto l'ordine minimo! Se non raggiungiamo l'obiettivo (€${minReservationValue.toFixed(0)}), il drop verrà annullato.`
      : '';

    const message = `🔥 Drop attivo: ${drop.name}!\n\n💰 Sconto attuale: ${Math.floor(currentDiscount)}%\n⏰ Tempo rimanente: ${timeRemaining}\n\n🎯 Più persone prenotano, più lo sconto aumenta!${urgencyMessage}\n\nUnisciti ora! 👇`;

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

  const renderProduct = useCallback(({ item }: { item: ProductData }) => {
    const isBooked = userBookings.has(item.id);
    
    const productForCard = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      brand: item.brand || undefined,
      sku: item.sku || undefined,
      imageUrl: item.image_url,
      imageUrls: item.additional_images || [item.image_url],
      originalPrice: Number(item.original_price),
      minDiscount: drop?.supplier_lists?.min_discount ?? 0,
      maxDiscount: drop?.supplier_lists?.max_discount ?? 0,
      sizes: item.available_sizes?.join(', ') || '',
      colors: item.available_colors?.join(', ') || '',
      availableSizes: item.available_sizes || [],
      availableColors: item.available_colors || [],
      condition: item.condition || 'nuovo',
      category: item.category || '',
      stock: item.stock,
      supplierName: drop?.supplier_lists?.name || 'Fornitore',
      hasVariants: item.hasVariants || false,
      variants: (item.variants || []).map(v => ({
        id: v.id,
        productId: v.product_id,
        size: v.size || undefined,
        color: v.color || undefined,
        stock: v.stock || 0,
        status: v.status || 'active',
      })),
    };
    
    return (
      <View style={styles.productContainer}>
        <EnhancedProductCard
          product={productForCard}
          isInDrop={true}
          currentDiscount={drop?.current_discount}
          maxDiscount={drop?.supplier_lists?.max_discount}
          onBook={handleBook}
          isInterested={isBooked}
          dropId={dropId}
        />
      </View>
    );
  }, [drop, userBookings, handleBook, dropId]);

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

  if (products.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <IconSymbol ios_icon_name="cube.box" android_material_icon_name="inventory_2" size={64} color={colors.textTertiary} />
          <Text style={styles.errorText}>Tutti i prodotti sono esauriti</Text>
          <Text style={styles.errorSubtext}>
            Tutti gli articoli di questo drop sono stati prenotati.
          </Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Torna indietro</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const atRisk = isAtRiskOfUnderfunding();
  const underfundingProgress = getUnderfundingProgress();

  const currentValue = Number(drop.current_value ?? 0);
  const targetValue = Number(drop.target_value ?? 0);
  const currentDiscount = Number(drop.current_discount ?? 0);
  const minReservationValue = Number(drop.supplier_lists?.min_reservation_value ?? 0);
  const maxReservationValue = Number(drop.supplier_lists?.max_reservation_value ?? 0);
  const minDiscount = Number(drop.supplier_lists?.min_discount ?? 0);
  const maxDiscount = Number(drop.supplier_lists?.max_discount ?? 0);

  const valueProgress = maxReservationValue > 0 
    ? Math.min((currentValue / maxReservationValue) * 100, 100) 
    : 0;
  
  const discountProgress = maxDiscount > minDiscount
    ? ((currentDiscount - minDiscount) / (maxDiscount - minDiscount)) * 100
    : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <FlatList
        ref={flatListRef}
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        removeClippedSubviews={true}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={1}
        getItemLayout={(data, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          console.log('Scroll to index failed:', info);
          // Retry after a delay
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 100);
        }}
      />

      <View style={styles.timerOverlay} pointerEvents="box-none">
        <SafeAreaView edges={['top']} style={styles.timerSafeArea}>
          <View style={styles.timerContainer}>
            <View style={styles.timerContent}>
              <IconSymbol 
                ios_icon_name="clock.fill" 
                android_material_icon_name="schedule" 
                size={16} 
                color="#FFF" 
              />
              <Text style={styles.timerText}>{timeRemaining}</Text>
            </View>
          </View>
          
          {/* Enhanced progress bar with discount labels */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarWrapper}>
              <Text style={styles.progressBarLabel}>{Math.floor(minDiscount)}%</Text>
              <View style={styles.progressBarTrack}>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${discountProgress}%` }]} />
                </View>
                <View style={[styles.currentDiscountIndicator, { left: `${discountProgress}%` }]}>
                  <Text style={styles.currentDiscountText}>{Math.floor(currentDiscount)}%</Text>
                </View>
              </View>
              <Text style={styles.progressBarLabel}>{Math.floor(maxDiscount)}%</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.backButtonOverlay} pointerEvents="box-none">
        <SafeAreaView edges={['top']} style={styles.backButtonSafeArea}>
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color="#FFF" />
          </Pressable>
        </SafeAreaView>
      </View>

      {/* UPDATED: Smaller icons, removed min discount, max discount, and goal icons */}
      <View style={styles.rightSideIcons} pointerEvents="box-none">
        <Pressable style={styles.iconButton}>
          <View style={styles.iconCircle}>
            <IconSymbol 
              ios_icon_name="mappin.circle.fill" 
              android_material_icon_name="location_on" 
              size={16} 
              color="#FFF" 
            />
          </View>
          <Text style={styles.iconLabel} numberOfLines={1}>
            {drop.pickup_points?.city ?? 'N/A'}
          </Text>
        </Pressable>

        <Pressable style={styles.iconButton}>
          <View style={styles.iconCircle}>
            <IconSymbol 
              ios_icon_name="list.bullet.rectangle" 
              android_material_icon_name="list" 
              size={16} 
              color="#FFF" 
            />
          </View>
          <Text style={styles.iconLabel} numberOfLines={2}>
            {drop.supplier_lists?.name ?? 'N/A'}
          </Text>
        </Pressable>

        <Pressable style={styles.iconButton}>
          <Animated.View style={[styles.iconCircle, { transform: [{ scale: bounceAnim }] }]}>
            <Text style={styles.discountText}>{Math.floor(currentDiscount)}%</Text>
          </Animated.View>
          <Text style={styles.iconLabel}>Sconto</Text>
        </Pressable>

        <Pressable 
          style={styles.iconButton}
          onPress={handleShareWhatsApp}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View style={[styles.iconCircle, styles.shareCircle, { transform: [{ scale: bounceAnim }] }]}>
            <IconSymbol 
              ios_icon_name="square.and.arrow.up.fill" 
              android_material_icon_name="share" 
              size={16} 
              color="#FFF" 
            />
          </Animated.View>
          <Text style={styles.iconLabel}>Condividi</Text>
        </Pressable>
      </View>

      {atRisk && (
        <View style={styles.underfundingWarningBottom} pointerEvents="box-none">
          <View style={styles.underfundingCard}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={20}
              color="#FF6B35"
            />
            <View style={styles.underfundingContent}>
              <Text style={styles.underfundingTitle}>⚠️ Drop a Rischio!</Text>
              <Text style={styles.underfundingText}>
                €{currentValue.toFixed(0)} / €{minReservationValue.toFixed(0)} ({Math.floor(underfundingProgress)}%)
              </Text>
            </View>
          </View>
        </View>
      )}

      {isConnected && (
        <View style={styles.realtimeIndicator}>
          <View style={styles.realtimeDot} />
          <Text style={styles.realtimeText}>Live</Text>
        </View>
      )}
    </View>
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
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'System',
    textAlign: 'center',
    paddingHorizontal: 32,
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
  productContainer: {
    height: height,
    width: width,
  },
  timerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  timerSafeArea: {
    backgroundColor: 'transparent',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: 'System',
  },
  progressBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 32,
    textAlign: 'center',
  },
  progressBarTrack: {
    flex: 1,
    position: 'relative',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 3,
  },
  currentDiscountIndicator: {
    position: 'absolute',
    top: -20,
    transform: [{ translateX: -15 }],
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  currentDiscountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },
  backButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 100,
  },
  backButtonSafeArea: {
    backgroundColor: 'transparent',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    marginTop: 8,
  },
  rightSideIcons: {
    position: 'absolute',
    right: 12,
    top: '20%',
    bottom: '30%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  iconButton: {
    alignItems: 'center',
    gap: 3,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  shareCircle: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  iconLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    maxWidth: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    fontFamily: 'System',
  },
  underfundingWarningBottom: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 80,
    zIndex: 10,
  },
  underfundingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  underfundingContent: {
    flex: 1,
  },
  underfundingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  underfundingText: {
    fontSize: 11,
    color: '#FFF',
    fontFamily: 'System',
    fontWeight: '600',
  },
  realtimeIndicator: {
    position: 'absolute',
    top: 60,
    right: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 12,
    zIndex: 100,
  },
  realtimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginRight: 5,
  },
  realtimeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '700',
    fontFamily: 'System',
  },
});
