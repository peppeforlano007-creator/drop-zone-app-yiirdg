
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/app/integrations/supabase/client';
import { IconSymbol } from '@/components/IconSymbol';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useRealtimeDrop } from '@/hooks/useRealtimeDrop';
import { colors } from '@/styles/commonStyles';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable, Alert, Animated, ActivityIndicator } from 'react-native';
import ShareToGroupModal from '@/components/ShareToGroupModal';
import { useAuth } from '@/contexts/AuthContext';
import { useDropInterest } from '@/contexts/DropInterestContext';
import EnhancedProductCard from '@/components/EnhancedProductCard';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import { computeDropDiscount } from '@/utils/dropHelpers';

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
  final_discount_percentage?: number | null;
  description?: string | null;
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

// OPTIMIZED: Increased batch size and parallel loading for faster performance
async function loadVariantsInBatches(productIds: string[], batchSize: number = 100): Promise<any[]> {
  console.log(`→ Loading variants for ${productIds.length} products in batches of ${batchSize}...`);
  
  const allVariants: any[] = [];
  
  // Use Promise.all for parallel batch loading
  const batchPromises = [];
  
  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    
    batchPromises.push(
      supabase
        .from('product_variants')
        .select('*')
        .in('product_id', batch)
        .gt('stock', 0)
        .then(({ data, error }) => {
          if (error) {
            console.error(`  ❌ Batch failed:`, error.message);
            return [];
          }
          return data || [];
        })
        .catch(error => {
          console.error(`  ❌ Batch exception:`, error);
          return [];
        })
    );
  }
  
  // Wait for all batches to complete in parallel
  const results = await Promise.all(batchPromises);
  results.forEach(batchData => {
    allVariants.push(...batchData);
  });
  
  console.log(`✓ Variant loading complete: ${allVariants.length} total variants loaded`);
  return allVariants;
}

export default function DropDetailsScreen() {
  const { dropId, scrollToProductId } = useLocalSearchParams<{ dropId: string; scrollToProductId?: string }>();
  const [drop, setDrop] = useState<DropData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBookings, setUserBookings] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareProduct, setShareProduct] = useState<{ id: string; name: string } | null>(null);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const { user } = useAuth();
  const { isInterested, isLoading: isInterestLoading, loadInterest, toggleInterest } = useDropInterest();
  const flatListRef = useRef<FlatList>(null);

  // --- Debounce + sold-out animation refs ---
  const pendingUpdatesRef = useRef<Map<string, ProductData | null>>(new Map());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soldOutAnimationsRef = useRef<Map<string, Animated.Value>>(new Map());
  const [soldOutItems, setSoldOutItems] = useState<Set<string>>(new Set());

  // Derived: drop is viewable but booking is disabled
  const isDropBookingDisabled = drop?.status === 'approved' || drop?.status === 'pending_approval' || drop?.status === 'inactive';
  const isDropCompleted = drop?.status === 'completed';

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
          updated_at,
          final_discount_percentage,
          description,
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
        console.error('❌ Supabase dropError:', dropError.code, dropError.message, dropError.details);
        console.error('❌ Error loading drop:', dropError);
        Alert.alert('Errore', 'Impossibile caricare i dettagli del drop');
        return;
      }

      console.log('✅ Drop data loaded:', {
        id: dropData.id,
        name: dropData.name,
        status: dropData.status,
        current_discount: dropData.current_discount,
        current_value: dropData.current_value,
        end_time: dropData.end_time,
        updated_at: dropData.updated_at,
      });

      // Check if drop is truly expired/terminated (not just non-active)
      // pending_approval, inactive, approved and completed drops are visible but not bookable — never treat them as expired
      const terminalStatuses = ['expired', 'cancelled', 'underfunded'];
      const nonActiveStatuses = ['pending_approval', 'inactive', 'approved', 'completed'];
      const isTerminal = terminalStatuses.includes(dropData.status);
      const isNonActiveStatus = nonActiveStatuses.includes(dropData.status);
      // Only use end_time expiry check for active drops that have a valid end_time
      const now = new Date();
      const endTime = dropData.end_time ? new Date(dropData.end_time) : null;
      const isEndTimePast = endTime && !isNaN(endTime.getTime()) && now > endTime;
      const expired = isTerminal || (!isNonActiveStatus && !!isEndTimePast);

      console.log('📊 Drop status check:', {
        status: dropData.status,
        isTerminal,
        isNonActiveStatus,
        end_time: dropData.end_time,
        isEndTimePast,
        expired,
      });
      
      setIsExpired(expired);
      setDrop(dropData);

      // If drop is truly terminated, show message and don't load products
      if (expired) {
        console.log('⚠️ Drop is expired or closed, status:', dropData.status);
        setProducts([]);
        setLoading(false);
        return;
      }

      // For non-active statuses (approved, pending_approval, inactive) stock may not
      // be set yet — show ALL products so the list is never empty.
      const showAllProducts = ['approved', 'pending_approval', 'inactive'].includes(dropData.status);
      console.log('📦 Drop status:', dropData.status, '| showAllProducts:', showAllProducts);

      // OPTIMIZED: Load products with larger batch size
      let productsQuery = supabase
        .from('products')
        .select('*')
        .eq('supplier_list_id', dropData.supplier_list_id)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!showAllProducts) {
        productsQuery = productsQuery.gt('stock', 0);
      }

      const { data: productsData, error: productsError } = await productsQuery;

      if (productsError) {
        console.error('❌ Error loading products:', productsError);
      } else {
        const availableProducts = showAllProducts
          ? (productsData || [])
          : (productsData || []).filter(p => p.stock > 0);
        console.log('✅ Products loaded:', availableProducts.length, showAllProducts ? '(all, stock filter skipped)' : 'with stock > 0');
        
        // OPTIMIZED: Load variants with larger batch size and parallel processing
        if (availableProducts.length > 0) {
          const productIds = availableProducts.map(p => p.id);
          
          try {
            const variantsData = await loadVariantsInBatches(productIds, 100);
            console.log('✅ Successfully loaded', variantsData.length, 'variants');
            
            const variantsMap = new Map<string, any[]>();
            variantsData.forEach(v => {
              if (!variantsMap.has(v.product_id)) {
                variantsMap.set(v.product_id, []);
              }
              variantsMap.get(v.product_id)!.push(v);
            });
            
            const productsWithVariants = availableProducts.map(p => ({
              ...p,
              variants: variantsMap.get(p.id) || [],
              hasVariants: (variantsMap.get(p.id) || []).length > 0,
            }));
            
            setProducts(productsWithVariants);
          } catch (error) {
            console.error('⚠ Error loading variants (non-fatal):', error);
            setProducts(availableProducts);
          }
        } else {
          setProducts(availableProducts);
        }
      }
    } catch (error) {
      console.error('❌ Error in loadDropDetails:', error);
      Alert.alert('Errore', 'Impossibile caricare i dettagli del drop');
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

  const dropStatus = drop?.status;
  useEffect(() => {
    if (!dropId || dropStatus !== 'approved') return;
    loadInterest(dropId);
  }, [dropId, dropStatus, loadInterest]);

  const handleInterestToggle = async () => {
    if (!user) {
      console.log('[drop-details] Interest pressed but user not logged in, drop:', dropId);
      Alert.alert('Accesso richiesto', 'Devi effettuare l\'accesso per mostrare interesse.');
      return;
    }
    console.log('[drop-details] Interest toggle pressed — drop:', dropId, 'currently interested:', isInterested(dropId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleInterest(dropId);
    if (!isInterested(dropId)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

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

  // Fallback polling every 30 seconds in case Realtime channel errors
  useEffect(() => {
    if (!drop || isExpired) return;

    const interval = setInterval(async () => {
      console.log('[drop-details] Polling fallback: refreshing product stock...');
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_list_id', drop.supplier_list_id)
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (data) {
        const available = data.filter((p: ProductData) => p.stock > 0);
        console.log('[drop-details] Polling fallback: received', available.length, 'available products');
        setProducts(prev => {
          return prev
            .map(p => {
              const updated = available.find((a: ProductData) => a.id === p.id);
              return updated ? { ...p, stock: updated.stock } : { ...p, stock: 0 };
            })
            .filter(p => p.stock > 0);
        });
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [drop, isExpired]);

  // --- Debounce helpers for realtime updates ---
  const flushPendingUpdates = useCallback(() => {
    const pending = new Map(pendingUpdatesRef.current);
    if (pending.size === 0) return;
    pendingUpdatesRef.current.clear();
    console.log('[drop-details] flushPendingUpdates: applying', pending.size, 'pending product updates');

    setProducts(prev => {
      let next = [...prev];
      pending.forEach((updatedProduct, productId) => {
        if (updatedProduct === null) {
          // Remove the product (already fading out via animation)
          next = next.filter(p => p.id !== productId);
        } else {
          const idx = next.findIndex(p => p.id === productId);
          if (idx >= 0) {
            next[idx] = updatedProduct;
          } else if (updatedProduct.stock > 0) {
            next = [...next, updatedProduct];
          }
        }
      });
      return next;
    });
  }, []);

  const scheduleProductUpdate = useCallback((productId: string, updatedProduct: ProductData | null) => {
    console.log('[drop-details] scheduleProductUpdate:', productId, updatedProduct === null ? 'REMOVE' : 'stock=' + updatedProduct.stock);

    if (updatedProduct === null) {
      // Immediately mark as sold-out for instant UI feedback
      setSoldOutItems(prev => {
        const next = new Set(prev);
        next.add(productId);
        return next;
      });

      // Create fade animation if not already present
      if (!soldOutAnimationsRef.current.has(productId)) {
        soldOutAnimationsRef.current.set(productId, new Animated.Value(1));
      }

      // After 3s, fade out then remove
      setTimeout(() => {
        const anim = soldOutAnimationsRef.current.get(productId);
        if (anim) {
          Animated.timing(anim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            console.log('[drop-details] Fade-out complete, removing product:', productId);
            // Remove from products array
            setProducts(prev => prev.filter(p => p.id !== productId));
            // Clean up sold-out tracking
            setSoldOutItems(prev => {
              const next = new Set(prev);
              next.delete(productId);
              return next;
            });
            soldOutAnimationsRef.current.delete(productId);
          });
        }
      }, 3000);

      // Don't add to pending (removal is handled by the animation above)
      return;
    }

    // Queue the update and debounce
    pendingUpdatesRef.current.set(productId, updatedProduct);
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      flushPendingUpdates();
    }, 400);
  }, [flushPendingUpdates]);

  // Real-time subscription for product stock updates
  useEffect(() => {
    if (!drop || isExpired) return;

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
          console.log('[drop-details] Realtime product update — id:', updatedProduct.id, 'stock:', updatedProduct.stock);

          if (updatedProduct.stock <= 0) {
            console.log('🗑️ Product out of stock, scheduling sold-out animation:', updatedProduct.id);
            scheduleProductUpdate(updatedProduct.id, null);
          } else {
            scheduleProductUpdate(updatedProduct.id, updatedProduct);
          }
        }
      )
      .subscribe((status) => {
        console.log('📶 Product stock subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up real-time subscription');
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [drop, isExpired, scheduleProductUpdate]);

  // Secondo canale: ascolta INSERT su bookings per aggiornare stock immediatamente
  useEffect(() => {
    if (!drop || isExpired) return;

    const bookingsChannel = supabase
      .channel(`bookings_stock_sync_${drop.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `drop_id=eq.${drop.id}`,
        },
        async (payload) => {
          console.log('📡 New booking detected, refreshing product stock...');
          // Ricarica i prodotti con stock > 0
          const { data } = await supabase
            .from('products')
            .select('*')
            .eq('supplier_list_id', drop.supplier_list_id)
            .gt('stock', 0)
            .order('created_at', { ascending: false })
            .limit(1000);

          if (data) {
            const available = data.filter((p: any) => p.stock > 0);
            console.log('[drop-details] Bookings sync: received', available.length, 'available products after booking');

            // Use scheduleProductUpdate for each product that changed stock
            setProducts(prev => {
              prev.forEach(p => {
                const fresh = available.find((a: any) => a.id === p.id);
                if (!fresh || fresh.stock <= 0) {
                  // Product went out of stock
                  scheduleProductUpdate(p.id, null);
                } else if (fresh.stock !== p.stock) {
                  // Stock changed but still available
                  scheduleProductUpdate(p.id, { ...p, stock: fresh.stock, status: fresh.status });
                }
              });
              return prev; // Don't mutate yet — debounce will apply changes
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📶 Bookings sync channel status:', status);
      });

    return () => {
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(bookingsChannel);
    };
  }, [drop, isExpired, scheduleProductUpdate]);

  const handleDropUpdate = useCallback((updatedDrop: any) => {
    console.log('🔄 Real-time drop update received in drop-details:', {
      id: updatedDrop.id,
      status: updatedDrop.status,
      current_discount: updatedDrop.current_discount,
      current_value: updatedDrop.current_value,
      updated_at: updatedDrop.updated_at,
    });
    
    // Only mark as expired for truly terminal statuses (not completed — those stay browsable)
    const terminalStatuses = ['expired', 'cancelled', 'underfunded'];
    if (updatedDrop.status && terminalStatuses.includes(updatedDrop.status)) {
      console.log('⚠️ Drop status changed to', updatedDrop.status);
      setIsExpired(true);
      Alert.alert(
        'Drop Terminato',
        'Questo drop è stato chiuso e non accetta più prenotazioni.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }
    
    setDrop(prevDrop => {
      if (!prevDrop || prevDrop.id !== updatedDrop.id) return prevDrop;
      
      const newDrop = {
        ...prevDrop,
        current_discount: updatedDrop.current_discount ?? prevDrop.current_discount,
        current_value: updatedDrop.current_value ?? prevDrop.current_value,
        status: updatedDrop.status ?? prevDrop.status,
        updated_at: updatedDrop.updated_at,
        final_discount_percentage: updatedDrop.final_discount_percentage ?? prevDrop.final_discount_percentage,
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
    enabled: !!dropId && !isExpired,
  });

  useEffect(() => {
    if (!drop) return;

    const updateTimer = () => {
      const nonActiveStatuses = ['pending_approval', 'inactive', 'approved'];
      if (nonActiveStatuses.includes(drop.status)) {
        setTimeRemaining('Non ancora attivo');
        return;
      }

      if (drop.status === 'completed') {
        setTimeRemaining('Terminato');
        return;
      }

      if (!drop.end_time) {
        setTimeRemaining('—');
        return;
      }

      const now = new Date().getTime();
      const endTime = new Date(drop.end_time).getTime();
      if (isNaN(endTime)) {
        setTimeRemaining('—');
        return;
      }
      const distance = endTime - now;

      if (distance < 0) {
        setTimeRemaining('Drop terminato');
        setIsExpired(true);
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

    return Math.round(newDiscount);
  }, [drop]);

  const handleBook = useCallback(async (productId: string, variantId?: string) => {
    console.log('=== HANDLE BOOK CALLED (COD) ===');
    console.log('Product ID:', productId);
    console.log('Variant ID:', variantId);
    console.log('User:', user?.id);
    console.log('Drop:', drop?.id);
    console.log('Is Expired:', isExpired);

    if (!user) {
      console.log('❌ User not authenticated');
      Alert.alert('Accesso richiesto', 'Devi effettuare l\'accesso per prenotare');
      router.push('/login');
      return;
    }

    if (!drop) {
      console.log('❌ Drop not found');
      Alert.alert('Errore', 'Impossibile prenotare in questo momento');
      return;
    }

    // Check if drop is expired or not bookable
    const bookableStatuses = ['active'];
    if (isExpired || isDropCompleted || !bookableStatuses.includes(drop.status)) {
      console.log('❌ Drop is not bookable, status:', drop.status);
      Alert.alert(
        'Drop Non Attivo',
        'Questo drop non è ancora attivo. Potrai prenotare quando l\'amministratore lo attiverà.',
        [{ text: 'OK' }]
      );
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) {
      console.log('❌ Product not found in products list');
      Alert.alert('Errore', 'Prodotto non trovato');
      return;
    }

    if (product.stock <= 0) {
      console.log('❌ Product out of stock, stock:', product.stock);
      Alert.alert('Prodotto esaurito', 'Questo prodotto non è più disponibile');
      loadDropDetails();
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Check network connectivity
      console.log('📡 Checking network connectivity...');
      const networkState = await Network.getNetworkStateAsync();
      console.log('Network state:', networkState);
      
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        console.error('❌ No internet connection');
        Alert.alert(
          'Nessuna connessione',
          'Verifica la tua connessione internet e riprova.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      console.log('✅ Network connected');

      // Verify user session is still valid
      console.log('🔐 Verifying user session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        console.error('❌ Session error:', sessionError);
        Alert.alert(
          'Sessione scaduta',
          'La tua sessione è scaduta. Effettua nuovamente l\'accesso.',
          [{ text: 'OK', onPress: () => router.push('/login') }]
        );
        return;
      }
      
      console.log('✅ Session valid, user:', sessionData.session.user.id);

      const bookingDiscount = computeDropDiscount({
        current_value: Number(drop.current_value ?? 0),
        min_reservation_value: Number(drop.supplier_lists?.min_reservation_value ?? 0),
        max_reservation_value: Number(drop.supplier_lists?.max_reservation_value ?? 0),
        min_discount: Number(drop.supplier_lists?.min_discount ?? 0),
        max_discount: Number(drop.supplier_lists?.max_discount ?? 0),
      });
      console.log('[drop-details] handleBook computeDropDiscount:', bookingDiscount);
      const originalPrice = product.original_price ?? 0;
      const currentDiscountedPrice = originalPrice * (1 - bookingDiscount / 100);

      console.log('📤 Sending atomic booking request to Supabase...');
      console.log('📡 Supabase URL:', supabase.supabaseUrl);
      console.log('🔑 User authenticated:', !!user);

      const { data: bookingData, error: bookingError } = await supabase
        .rpc('create_booking_atomic', {
          p_user_id: user.id,
          p_product_id: productId,
          p_variant_id: variantId || null,
          p_drop_id: drop.id,
          p_pickup_point_id: drop.pickup_point_id,
          p_original_price: originalPrice,
          p_discount_percentage: bookingDiscount,
          p_final_price: currentDiscountedPrice,
          p_payment_method: 'cod',
          p_payment_status: 'pending',
          p_status: 'active',
        });

      if (bookingError) {
        console.error('❌ Booking error details:', {
          message: bookingError.message,
          details: bookingError.details,
          hint: bookingError.hint,
          code: bookingError.code,
        });
        
        // Check for specific error messages
        if (bookingError.message?.toLowerCase().includes('terminato')) {
          Alert.alert(
            'Drop Terminato',
            'Questo drop è terminato e non accetta più prenotazioni.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else if (bookingError.code === 'P0001' || 
            bookingError.message?.toLowerCase().includes('esaurito') ||
            bookingError.message?.toLowerCase().includes('stock') ||
            bookingError.message?.toLowerCase().includes('disponibile')) {
          Alert.alert(
            'Prodotto esaurito', 
            'Questo prodotto non è più disponibile. Qualcun altro lo ha appena prenotato.',
            [{ text: 'OK', onPress: () => loadDropDetails() }]
          );
        } else {
          // Show detailed error for debugging
          const errorMessage = `${bookingError.message || 'Errore sconosciuto'}\n\nDettagli: ${bookingError.details || 'N/A'}\n\nCodice: ${bookingError.code || 'N/A'}`;
          console.error('📋 Full error message shown to user:', errorMessage);
          Alert.alert(
            'Errore di prenotazione', 
            errorMessage,
            [{ text: 'OK' }]
          );
        }
        return;
      }

      console.log('✅ Booking created successfully:', bookingData);

      setUserBookings(prev => new Set([...prev, productId]));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const maxDiscount = Math.floor(drop.supplier_lists?.max_discount ?? 0);
      const discountRemaining = maxDiscount - Math.floor(bookingDiscount);
      
      Alert.alert(
        '✅ Prenotazione confermata!',
        `Hai prenotato ${product.name} con sconto del ${Math.floor(bookingDiscount)}%.\n\n${discountRemaining > 0 ? `💡 Lo sconto può ancora aumentare! Mancano ${discountRemaining}% per raggiungere il massimo.\n\n` : '🎉 Hai già lo sconto massimo!\n\n'}👥 Condividi il drop con amici e parenti per raggiungere insieme il ${maxDiscount}% di sconto!`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ Exception in handleBook:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        error: error,
      });
      
      if (error?.message?.toLowerCase().includes('terminato')) {
        Alert.alert(
          'Drop Terminato',
          'Questo drop è terminato e non accetta più prenotazioni.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (error?.code === 'P0001' ||
          error?.message?.toLowerCase().includes('esaurito') ||
          error?.message?.toLowerCase().includes('stock') ||
          error?.message?.toLowerCase().includes('disponibile')) {
        Alert.alert(
          'Prodotto esaurito',
          'Questo prodotto non è più disponibile. Qualcun altro lo ha appena prenotato.',
          [{ text: 'OK', onPress: () => loadDropDetails() }]
        );
      } else {
        // Show detailed error for debugging
        const errorMessage = `Errore di rete o connessione.\n\nMessaggio: ${error?.message || 'Errore sconosciuto'}\n\nVerifica la tua connessione internet e riprova.`;
        console.error('📋 Network error shown to user:', errorMessage);
        Alert.alert(
          'Errore di connessione',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    }
  }, [user, drop, products, loadDropDetails, isExpired, isDropCompleted]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentProductIndex(viewableItems[0].index ?? 0);
    }
  }, []);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderProduct = useCallback(({ item }: { item: ProductData }) => {
    const isBooked = userBookings.has(item.id);

    // Compute the drop's current/final discount via linear interpolation
    const supplierLists = drop?.supplier_lists;
    let computedDropDiscount: number | undefined;
    if (drop && supplierLists) {
      computedDropDiscount = computeDropDiscount({
        current_value: Number(drop.current_value ?? 0),
        min_reservation_value: Number(supplierLists.min_reservation_value ?? 0),
        max_reservation_value: Number(supplierLists.max_reservation_value ?? 0),
        min_discount: Number(supplierLists.min_discount ?? 0),
        max_discount: Number(supplierLists.max_discount ?? 0),
      });
      console.log('[drop-details] computedDropDiscount for product', item.id, ':', computedDropDiscount, '(status:', drop.status, ')');
    }
    
    const productForCard = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      brand: item.brand || undefined,
      sku: item.sku || undefined,
      imageUrl: item.image_url,
      imageUrls: item.additional_images || [item.image_url],
      originalPrice: Number(item.original_price),
      minDiscount: supplierLists?.min_discount ?? 0,
      maxDiscount: supplierLists?.max_discount ?? 0,
      sizes: item.available_sizes?.join(', ') || '',
      colors: item.available_colors?.join(', ') || '',
      availableSizes: item.available_sizes || [],
      availableColors: item.available_colors || [],
      condition: item.condition || '',
      category: item.category || '',
      stock: item.stock,
      supplierName: supplierLists?.name || 'Fornitore',
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
    
    const isSoldOut = item.stock <= 0 || soldOutItems.has(item.id);
    const fadeAnim = soldOutAnimationsRef.current.get(item.id);

    const cardContent = (
      <>
        <EnhancedProductCard
          product={productForCard}
          isInDrop={true}
          currentDiscount={drop?.current_discount}
          maxDiscount={supplierLists?.max_discount}
          dropDiscount={computedDropDiscount}
          onBook={handleBook}
          isInterested={isBooked}
          dropId={dropId}
          dropBookingDisabled={isDropBookingDisabled || isSoldOut}
          dropStatus={drop?.status}
          onShare={() => {
            if (!drop) return;
            const currentProduct = products[currentProductIndex];
            console.log('[drop-details] Share button pressed — currentProductIndex:', currentProductIndex, 'product:', currentProduct?.id, currentProduct?.name);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (currentProduct) {
              setShareProduct({ id: currentProduct.id, name: currentProduct.name });
            }
            setShowShareModal(true);
          }}
        />
        {isSoldOut && (
          <View style={styles.soldOutOverlay}>
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>ESAURITO</Text>
            </View>
          </View>
        )}
      </>
    );

    if (fadeAnim) {
      return (
        <Animated.View style={[styles.productContainer, { opacity: fadeAnim }]}>
          {cardContent}
        </Animated.View>
      );
    }

    return (
      <View style={styles.productContainer}>
        {cardContent}
      </View>
    );
  }, [drop, userBookings, handleBook, dropId, isDropBookingDisabled, products, currentProductIndex, soldOutItems]);

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

  // Show expired message only for truly terminal statuses
  if (isExpired) {
    const completedText = drop.status === 'completed' ? '\n\nGli ordini sono stati inviati al fornitore.' : '';
    const underfundedText = drop.status === 'underfunded' ? '\n\nIl drop non ha raggiunto il valore minimo ed è stato annullato.' : '';
    const expiredSubtext = 'Questo drop è terminato e non accetta più prenotazioni.' + completedText + underfundedText;
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <IconSymbol ios_icon_name="clock.badge.xmark" android_material_icon_name="schedule" size={64} color={colors.warning} />
          <Text style={styles.errorText}>Drop Terminato</Text>
          <Text style={styles.errorSubtext}>{expiredSubtext}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Torna ai Drop Attivi</Text>
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
          <IconSymbol ios_icon_name="cube.box" android_material_icon_name="inventory-2" size={64} color={colors.textTertiary} />
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

  const currentValue = Number(drop.current_value ?? 0);
  const targetValue = Number(drop.target_value ?? 0);
  const minReservationValue = Number(drop.supplier_lists?.min_reservation_value ?? 0);
  const maxReservationValue = Number(drop.supplier_lists?.max_reservation_value ?? 0);
  const minDiscount = Number(drop.supplier_lists?.min_discount ?? 0);
  const maxDiscount = Number(drop.supplier_lists?.max_discount ?? 0);
  const currentDiscount = computeDropDiscount({
    current_value: currentValue,
    min_reservation_value: minReservationValue,
    max_reservation_value: maxReservationValue,
    min_discount: minDiscount,
    max_discount: maxDiscount,
  });
  console.log('[drop-details] computeDropDiscount result:', currentDiscount, '(current_value:', currentValue, ')');

  // Completed drop stats
  const completedValueFormatted = '€ ' + Math.round(currentValue).toLocaleString('it-IT');
  const completedTargetFormatted = '€ ' + Math.round(maxReservationValue).toLocaleString('it-IT');
  const completedProgressPct = maxReservationValue > 0
    ? Math.min(Math.floor((currentValue / maxReservationValue) * 100), 100)
    : 0;

  // Achieved discount: prefer final_discount_percentage, then linear interpolation
  let achievedDiscount: number | null = null;
  const finalDiscPct = Number(drop.final_discount_percentage ?? 0);
  if (drop.final_discount_percentage != null && finalDiscPct > 0) {
    achievedDiscount = Math.floor(finalDiscPct);
  } else if (isDropCompleted) {
    if (currentValue > 0 && maxReservationValue > minReservationValue) {
      if (currentValue <= minReservationValue) {
        achievedDiscount = Math.floor(minDiscount);
      } else if (currentValue >= maxReservationValue) {
        achievedDiscount = Math.floor(maxDiscount);
      } else {
        const valueRange = maxReservationValue - minReservationValue;
        const discountRange = maxDiscount - minDiscount;
        const progress = (currentValue - minReservationValue) / valueRange;
        achievedDiscount = Math.floor(minDiscount + discountRange * progress);
      }
    } else if (currentDiscount > 0) {
      achievedDiscount = Math.floor(currentDiscount);
    }
  }

  const valueProgress = maxReservationValue > 0 
    ? Math.min((currentValue / maxReservationValue) * 100, 100) 
    : 0;
  
  const discountProgress = maxDiscount > minDiscount
    ? Math.min(((currentDiscount - minDiscount) / (maxDiscount - minDiscount)) * 100, 100)
    : 0;

  const cityName = drop.pickup_points?.city ?? 'N/A';
  const listName = drop.supplier_lists?.name ?? 'N/A';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {isDropCompleted && (
        <View style={styles.bookingDisabledBanner} pointerEvents="none">
          <SafeAreaView edges={['bottom']} style={styles.bookingDisabledSafeArea}>
            <View style={[styles.bookingDisabledContent, styles.completedBannerContent]}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={18}
                color="#FFF"
              />
              <Text style={styles.bookingDisabledText}>
                Questo drop è terminato — puoi sfogliare gli articoli ma non effettuare ordini.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      )}

      {isDropBookingDisabled && !isDropCompleted && drop?.status !== 'approved' && (
        <View style={styles.bookingDisabledBanner} pointerEvents="none">
          <SafeAreaView edges={['bottom']} style={styles.bookingDisabledSafeArea}>
            <View style={styles.bookingDisabledContent}>
              <IconSymbol
                ios_icon_name="clock.badge.exclamationmark"
                android_material_icon_name="schedule"
                size={18}
                color="#FFF"
              />
              <Text style={styles.bookingDisabledText}>
                Questo drop non è ancora attivo. Potrai prenotare quando l&apos;amministratore lo attiverà.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      )}

      {drop?.status === 'approved' && (
        <View style={styles.bookingDisabledBanner}>
          <SafeAreaView edges={['bottom']} style={styles.bookingDisabledSafeArea}>
            <View style={styles.approvedBannerContent}>
              <IconSymbol
                ios_icon_name="heart.circle.fill"
                android_material_icon_name="favorite"
                size={18}
                color="#FFF"
              />
              <Text style={styles.approvedBannerText}>
                Non ancora attivo — lascia il tuo Mi Interessa per aumentare le probabilità di attivarlo per il tuo punto di ritiro.
              </Text>
              <Pressable
                style={[styles.bannerInterestButton, isInterested(dropId) && styles.bannerInterestButtonActive]}
                onPress={handleInterestToggle}
                disabled={isInterestLoading(dropId)}
              >
                <IconSymbol
                  ios_icon_name={isInterested(dropId) ? 'heart.fill' : 'heart'}
                  android_material_icon_name={isInterested(dropId) ? 'favorite' : 'favorite-border'}
                  size={14}
                  color="#E11D48"
                />
                <Text style={[styles.bannerInterestText, isInterested(dropId) && styles.bannerInterestTextActive]}>
                  {isInterested(dropId) ? 'Parteciperò!' : 'Mi Interessa'}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      )}

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
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 100);
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
          
          {isDropCompleted ? (
            <View style={styles.completedStatsOverlay}>
              <View style={styles.completedStatsRow}>
                <View style={styles.completedStatChip}>
                  <Text style={styles.completedStatChipLabel}>Prenotato</Text>
                  <Text style={styles.completedStatChipValue}>{completedValueFormatted}</Text>
                  <Text style={styles.completedStatChipSub}>su {completedTargetFormatted}</Text>
                </View>
                <View style={styles.completedStatDivider} />
                <View style={styles.completedStatChip}>
                  <Text style={styles.completedStatChipLabel}>Sconto finale</Text>
                  <Text style={styles.completedStatChipValue}>
                    {achievedDiscount != null ? achievedDiscount + '%' : '—'}
                  </Text>
                  <Text style={styles.completedStatChipSub}>
                    {completedProgressPct}% obiettivo
                  </Text>
                  <Text style={styles.completedStatChipMax}>
                    max: {Math.floor(maxDiscount)}%
                  </Text>
                </View>
              </View>
              <View style={styles.completedOverlayBar}>
                <View style={[styles.completedOverlayBarFill, { width: `${completedProgressPct}%` as any }]} />
              </View>
            </View>
          ) : (
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
          )}
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
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color="#FFF" />
          </Pressable>
        </SafeAreaView>
      </View>

      <View
        style={[
          styles.bottomLeftOverlay,
          (isDropCompleted || isDropBookingDisabled || drop?.status === 'approved')
            ? styles.bottomLeftOverlayWithBanner
            : null,
        ]}
        pointerEvents="box-none"
      >
        <SafeAreaView edges={['bottom']} style={styles.bottomLeftSafeArea}>
          <View style={styles.bottomLeftChipsRow} pointerEvents="box-none">
            <View style={styles.infoChip} pointerEvents="none">
              <MaterialCommunityIcons name="map-marker" size={12} color="#FFF" />
              <Text style={styles.infoChipText} numberOfLines={1}>
                {cityName}
              </Text>
            </View>
            <View style={styles.infoChip} pointerEvents="none">
              <MaterialCommunityIcons name="tag" size={12} color="#FFF" />
              <Text style={styles.infoChipText} numberOfLines={1}>
                {listName}
              </Text>
            </View>
          </View>

        </SafeAreaView>
      </View>

      {isConnected && (
        <View style={styles.realtimeIndicator}>
          <View style={styles.realtimeDot} />
          <Text style={styles.realtimeText}>Live</Text>
        </View>
      )}

      <ShareToGroupModal
        visible={showShareModal}
        onClose={() => { setShowShareModal(false); setShareProduct(null); }}
        product={shareProduct}
      />
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
    lineHeight: 20,
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
    paddingHorizontal: 32,
    paddingTop: 8,
  },
  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4ADE80',
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
  bottomLeftOverlay: {
    position: 'absolute',
    left: 16,
    bottom: 6,
    zIndex: 50,
  },
  bottomLeftOverlayWithBanner: {
    bottom: 64,
  },
  bottomLeftSafeArea: {
    backgroundColor: 'transparent',
    gap: 10,
  },
  bottomLeftChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  infoChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    maxWidth: 140,
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
  bookingDisabledBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 200,
  },
  bookingDisabledSafeArea: {
    backgroundColor: 'transparent',
  },
  bookingDisabledContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(107, 114, 128, 0.92)',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookingDisabledText: {
    flex: 1,
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
    fontFamily: 'System',
    lineHeight: 18,
  },
  completedBannerContent: {
    backgroundColor: 'rgba(55, 65, 81, 0.92)',
  },
  approvedBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(225, 29, 72, 0.88)',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  approvedBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    fontFamily: 'System',
    lineHeight: 17,
  },
  bannerInterestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFF',
    backgroundColor: 'transparent',
    flexShrink: 0,
  },
  bannerInterestButtonActive: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  bannerInterestText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
    fontFamily: 'System',
  },
  bannerInterestTextActive: {
    color: '#E11D48',
  },
  completedStatsOverlay: {
    marginHorizontal: 32,
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  completedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  completedStatChip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  completedStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 8,
  },
  completedStatChipLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: 'System',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  completedStatChipValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: 'System',
  },
  completedStatChipSub: {
    fontSize: 9,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.55)',
    fontFamily: 'System',
  },
  completedStatChipMax: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'System',
    letterSpacing: 0.2,
  },
  completedOverlayBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  completedOverlayBarFill: {
    height: '100%',
    backgroundColor: 'rgba(156, 163, 175, 0.9)',
    borderRadius: 2,
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  soldOutBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  soldOutText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 2,
  },

});
