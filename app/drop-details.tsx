
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import DropCategorySheet from '@/components/DropCategorySheet';
import { feedCategories, feedCounter, feedPosition, filterFeed, loadDropFeedProducts } from '@/utils/drop-feed';
import { canBookAtPickup } from '@/utils/pickup-rules';
import { loadActiveProfilePickup } from '@/utils/profile-pickup';
import { mergeStockProduct, StockRemovalQueue } from '@/utils/stock-updates';
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
import { getCardCheckoutKey, payAndBookWithCard, cardCheckFailed } from '@/utils/bookingCardCheckout';
import { fetchSavedCard, removeSavedCard, type SavedCard } from '@/utils/bookingCardApi';

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

// Keep zero-stock variants too: an exhausted size must not become a no-variant
// product. Page each batch and fail closed rather than silently losing choices.
async function loadVariantsInBatches(productIds: string[], batchSize = 100): Promise<any[]> {
  const results = await Promise.all(Array.from(
    { length: Math.ceil(productIds.length / batchSize) }, async (_, index) => {
      const batch = productIds.slice(index * batchSize, (index + 1) * batchSize);
      const variants = new Map<string, any>();
      let offset = 0;
      while (true) {
        const { data, error } = await supabase.from('product_variants').select('*')
          .in('product_id', batch).order('id').range(offset, offset + 499);
        if (error) throw error;
        const page = data ?? [];
        if (!page.length) return [...variants.values()];
        const previousSize = variants.size;
        page.forEach(variant => variants.set(variant.id, variant));
        if (variants.size === previousSize) throw new Error('Caricamento varianti non completo');
        offset += page.length;
      }
    },
  ));
  return results.flat();
}

async function withProductVariants(items: ProductData[]): Promise<ProductData[]> {
  const variants = await loadVariantsInBatches(items.map(item => item.id));
  const byProduct = new Map<string, any[]>();
  variants.forEach(variant => {
    const group = byProduct.get(variant.product_id) ?? [];
    group.push(variant);
    byProduct.set(variant.product_id, group);
  });
  return items.map(item => ({
    ...item, variants: byProduct.get(item.id) ?? [],
    hasVariants: (byProduct.get(item.id) ?? []).some(v => v.size != null || v.color != null),
  }));
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
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [catalogueError, setCatalogueError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [initialProductIndex, setInitialProductIndex] = useState(0);
  const visibleProduct = useRef<{ id: string | null; index: number }>({ id: null, index: 0 });
  const unfilteredPosition = useRef<{ id: string | null; index: number }>({ id: null, index: 0 });
  const deepLinkHandled = useRef<string | null>(null);
  const categories = useMemo(() => feedCategories(products), [products]);
  const filteredProducts = useMemo(() => filterFeed(products, selectedCategory), [products, selectedCategory]);
  const hasUsefulCategories = categories.some(category => category.key !== '') && categories.length > 1;
  const selectedCategoryLabel = selectedCategory === null ? null
    : categories.find(category => category.key === selectedCategory)?.label ?? 'Categoria';
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const { user } = useAuth();
  const { isInterested, isLoading: isInterestLoading, loadInterest, toggleInterest } = useDropInterest();
  const flatListRef = useRef<FlatList>(null);

  const soldOutAnimationsRef = useRef<Map<string, Animated.Value>>(new Map());
  const stockRemovals = useRef(new StockRemovalQueue()).current;
  const productsRef = useRef(products);
  productsRef.current = products;
  const refreshInventoryRef = useRef<() => void>(() => {});
  const bookingRequests = useRef(new Set<string>());
  // Set only for users the server enrolled in the card test, on builds that have
  // Stripe. Everyone else never sees a difference: booking stays as it is.
  const cardCheckoutKey = useRef<string | null>(null);
  const [savedCard, setSavedCard] = useState<SavedCard>(null);
  const [soldOutItems, setSoldOutItems] = useState<Set<string>>(new Set());

  // Derived: drop is viewable but booking is disabled
  const isDropBookingDisabled = drop?.status === 'approved' || drop?.status === 'pending_approval' || drop?.status === 'inactive';
  const isDropCompleted = drop?.status === 'completed';

  const loadDropDetails = useCallback(async () => {
    if (!dropId) {
      console.log('❌ No dropId provided');
      return;
    }

    setInitialProductIndex(visibleProduct.current.index);
    setLoading(true);
    setCatalogueError(false);
    try {
      const pickup = user?.id ? await loadActiveProfilePickup(supabase, user.id) : null;
      if (!pickup) {
        setDrop(null);
        setProducts([]);
        Alert.alert('Scegli il punto di ritiro', 'Seleziona un punto di ritiro attivo nel profilo prima di visualizzare i drop.', [
          { text: 'Vai al profilo', onPress: () => router.replace('/(tabs)/profile') },
          { text: 'Indietro', onPress: () => router.back() },
        ]);
        return;
      }
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

      // Complete catalogue: do not show the server's first page as the total.
      const availableProducts = await loadDropFeedProducts<ProductData>(
        supabase, dropData.supplier_list_id, showAllProducts,
      );
      setProducts(await withProductVariants(availableProducts));
    } catch (error) {
      console.error('❌ Error in loadDropDetails:', error);
      setCatalogueError(true);
    } finally {
      setLoading(false);
    }
  }, [dropId, user?.id]);

  useEffect(() => {
    setBannerDismissed(false);
    setSelectedCategory(null);
    setShowCategorySheet(false);
    setInitialProductIndex(0);
    setCurrentProductIndex(0);
    visibleProduct.current = { id: null, index: 0 };
    unfilteredPosition.current = { id: null, index: 0 };
    deepLinkHandled.current = null;
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

  useEffect(() => {
    cardCheckoutKey.current = null;
    if (!user?.id || !dropId) return;
    let active = true;
    setSavedCard(null);
    getCardCheckoutKey(String(dropId)).then(async key => {
      if (!active) return;
      cardCheckoutKey.current = key;
      if (key) { const card = await fetchSavedCard(); if (active) setSavedCard(card); }
    });
    return () => { active = false; };
  }, [user?.id, dropId]);

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

  // One remembered unfiltered position; switching category starts at its first item.
  const selectCategory = useCallback((key: string | null) => {
    setShowCategorySheet(false);
    if (key === selectedCategory) return;
    if (selectedCategory === null) unfilteredPosition.current = { ...visibleProduct.current };
    const next = filterFeed(products, key);
    const index = key === null
      ? feedPosition(next, unfilteredPosition.current.id, unfilteredPosition.current.index) : 0;
    visibleProduct.current = { id: next[index]?.id ?? null, index };
    setInitialProductIndex(index);
    setCurrentProductIndex(index);
    setSelectedCategory(key);
    Haptics.selectionAsync().catch(() => {});
  }, [products, selectedCategory]);

  // Keep the same article visible if earlier items disappear in realtime.
  // If the visible article disappears, use the next surviving page (or the last).
  useEffect(() => {
    if (loading || !filteredProducts.length) return;
    let index = feedPosition(filteredProducts, visibleProduct.current.id, visibleProduct.current.index);
    let needsPositioning = index !== visibleProduct.current.index;
    const linkKey = `${dropId}:${scrollToProductId}`;
    if (scrollToProductId && deepLinkHandled.current !== linkKey && selectedCategory === null) {
      const linkedIndex = filteredProducts.findIndex(product => product.id === scrollToProductId);
      if (linkedIndex >= 0) {
        index = linkedIndex;
        needsPositioning = true;
        deepLinkHandled.current = linkKey;
      }
    }
    visibleProduct.current = { id: filteredProducts[index].id, index };
    setCurrentProductIndex(index);
    if (!needsPositioning) return; // Stock-only refreshes must not interrupt a swipe.
    // Data is committed before the non-animated positioning; no long scroll through pages.
    const frame = requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({ index, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [dropId, scrollToProductId, filteredProducts, selectedCategory, loading]);

  const scheduleProductUpdate = useCallback((productId: string, updated: ProductData | null) => {
    if (updated === null) {
      if (!productsRef.current.some(item => item.id === productId)) return;
      setProducts(prev => prev.map(item => item.id === productId ? { ...item, stock: 0 } : item));
      setSoldOutItems(prev => new Set(prev).add(productId));
      if (!soldOutAnimationsRef.current.has(productId)) {
        soldOutAnimationsRef.current.set(productId, new Animated.Value(1));
      }
      // Preserve the existing sold-out notice/fade, but never remove a restocked
      // item when an old timeout or animation completion fires afterwards.
      stockRemovals.schedule(productId, isCurrent => {
        const anim = soldOutAnimationsRef.current.get(productId);
        if (!anim || !isCurrent()) return;
        Animated.timing(anim, { toValue: 0, duration: 500, useNativeDriver: true })
          .start(({ finished }) => {
            if (!finished || !isCurrent()) return;
            stockRemovals.cancel(productId);
            setProducts(prev => prev.filter(item => item.id !== productId));
            setSoldOutItems(prev => { const next = new Set(prev); next.delete(productId); return next; });
            soldOutAnimationsRef.current.delete(productId);
          });
      });
      return;
    }
    stockRemovals.cancel(productId);
    const anim = soldOutAnimationsRef.current.get(productId);
    if (anim) { anim.stopAnimation(); anim.setValue(1); soldOutAnimationsRef.current.delete(productId); }
    setSoldOutItems(prev => {
      if (!prev.has(productId)) return prev;
      const next = new Set(prev); next.delete(productId); return next;
    });
    setProducts(prev => {
      const index = prev.findIndex(item => item.id === productId);
      if (index < 0) return [...prev, updated];
      const next = [...prev]; next[index] = mergeStockProduct(prev[index], updated); return next;
    });
  }, [stockRemovals]);

  // One coherent, enriched stock refresh for Realtime and the 15-second fallback.
  // Include zero-stock rows: absence from a stock>0 query is not a stock value.
  const inventoryListId = drop?.supplier_list_id;
  const inventoryDropId = drop?.id;
  useEffect(() => {
    if (!inventoryListId || !inventoryDropId || isExpired) return;
    let active = true;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const showAll = ['approved', 'pending_approval', 'inactive'].includes(dropStatus ?? '');
    const requestRefresh = () => {
      const request = ++revision;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const rows = await loadDropFeedProducts<ProductData>(supabase, inventoryListId, true);
          const fresh = await withProductVariants(rows);
          if (!active || request !== revision) return;
          fresh.forEach(item => {
            scheduleProductUpdate(item.id, !showAll && item.stock <= 0 ? null : item);
          });
        } catch (error) {
          // Retain known choices on a failed/partial refresh, never invent stock.
          console.warn('[drop-details] Inventory refresh incomplete:', error);
        }
      }, 400);
    };
    refreshInventoryRef.current = requestRefresh;
    const channel = supabase.channel(`inventory_${inventoryDropId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'products',
        filter: `supplier_list_id=eq.${inventoryListId}`,
      }, payload => {
        const updated = payload.new as ProductData;
        if (productsRef.current.some(item => item.id === updated.id)) {
          scheduleProductUpdate(updated.id, !showAll && updated.stock <= 0 ? null : updated);
        }
        requestRefresh();
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings', filter: `drop_id=eq.${inventoryDropId}`,
      }, () => { requestRefresh(); loadUserBookings(); })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'product_variants',
      }, payload => {
        const row = payload.new as { product_id?: string };
        if (productsRef.current.some(item => item.id === row.product_id)) requestRefresh();
      })
      .subscribe(status => { if (status === 'SUBSCRIBED') requestRefresh(); });
    const interval = setInterval(requestRefresh, 15000);
    return () => {
      active = false; revision++;
      clearTimeout(timer); clearInterval(interval);
      refreshInventoryRef.current = () => {};
      stockRemovals.clear();
      soldOutAnimationsRef.current.forEach(anim => anim.stopAnimation());
      soldOutAnimationsRef.current.clear();
      setSoldOutItems(new Set());
      supabase.removeChannel(channel);
    };
  }, [inventoryListId, inventoryDropId, dropStatus, isExpired, scheduleProductUpdate, loadUserBookings, stockRemovals]);

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

    if (bookingRequests.current.has(productId)) return;
    bookingRequests.current.add(productId);
    try {
      const bookingPickup = await loadActiveProfilePickup(supabase, user.id);
      if (!canBookAtPickup(bookingPickup, drop.pickup_point_id)) {
        Alert.alert('Verifica il punto di ritiro', bookingPickup
          ? 'Questo drop appartiene a un altro punto di ritiro. Torna ai drop del tuo punto selezionato.'
          : 'Seleziona un punto di ritiro nel profilo prima di prenotare.', [
          { text: 'Vai al profilo', onPress: () => router.push('/(tabs)/profile') },
          { text: 'Annulla', style: 'cancel' },
        ]);
        return;
      }
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

      // Only if the earlier check ERRORED (not when the customer simply isn't enrolled) ask once more.
      if (!cardCheckoutKey.current && cardCheckFailed) {
        cardCheckoutKey.current = await getCardCheckoutKey(String(dropId), 0);
      }
      if (cardCheckoutKey.current) {
        // Explicit consent, asked before the payment form. A card is saved only on the first button.
        let saveCard = false;
        if (!savedCard) {
          const choice = await new Promise<'save' | 'once' | 'cancel'>(resolve => Alert.alert(
            'Salva questa carta',
            'Salva questa carta per le prossime prenotazioni. Puoi rimuoverla quando vuoi.\n\nLa carta verrà addebitata solo alla chiusura del drop, per l\'importo finale scontato.',
            [
              { text: 'Salva carta e paga', onPress: () => resolve('save') },
              { text: 'Paga senza salvare', onPress: () => resolve('once') },
              { text: 'Annulla', style: 'cancel', onPress: () => resolve('cancel') },
            ],
            { cancelable: true, onDismiss: () => resolve('cancel') },
          ));
          if (choice === 'cancel') return;
          saveCard = choice === 'save';
        }
        const outcome = await payAndBookWithCard({
          publishableKey: cardCheckoutKey.current, productId, dropId: String(dropId), variantId: variantId || null, saveCard,
        });
        if (saveCard && outcome.kind === 'booked') fetchSavedCard().then(setSavedCard);
        if (outcome.kind === 'cancelled') return;
        if (outcome.kind === 'failed') {
          Alert.alert('Pagamento non completato', outcome.message);
          loadDropDetails();
          return;
        }
        refreshInventoryRef.current();
        loadUserBookings();
        loadDropDetails();
        if (outcome.kind === 'booked') {
          setUserBookings(prev => new Set([...prev, productId]));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('✅ Prenotato!', `${product.name} prenotato e pagato con carta. L'importo definitivo sarà addebitato alla chiusura del drop, mai superiore a quello autorizzato. Puoi annullare da Le mie prenotazioni fino alla chiusura.`, [{ text: 'OK' }]);
        } else {
          Alert.alert('Pagamento in verifica', 'La banca ha risposto ma la conferma non è ancora arrivata. Controlla Le mie prenotazioni tra poco prima di riprovare.', [{ text: 'OK' }]);
        }
        return;
      }

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
        
        // Pickup failures must not be mislabeled as stock errors (also P0001).
        if (bookingError.message?.includes('PICKUP_POINT_')) throw bookingError;
        if (bookingError.message?.includes('BOOKING_DUPLICATE:')) {
          setUserBookings(prev => new Set(prev).add(productId));
          Alert.alert('Già prenotato', 'Hai già una prenotazione per questo articolo o variante.');
          refreshInventoryRef.current();
        } else if (bookingError.message?.includes('VARIANT_REQUIRED:')) {
          Alert.alert('Seleziona una variante', 'Scegli una combinazione di taglia e colore disponibile.');
          refreshInventoryRef.current();
        } else if (bookingError.message?.toLowerCase().includes('terminato')) {
          Alert.alert(
            'Drop Terminato',
            'Questo drop è terminato e non accetta più prenotazioni.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else if (bookingError.message?.toLowerCase().includes('esaurito') ||
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
      refreshInventoryRef.current();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const maxDiscount = Math.floor(drop.supplier_lists?.max_discount ?? 0);
      const discountRemaining = maxDiscount - Math.floor(bookingDiscount);
      const euroRemaining = (drop.supplier_lists?.max_reservation_value ?? 0) - (drop.current_value ?? 0);
      
      Alert.alert(
        '✅ Prenotato!',
        discountRemaining > 0
          ? `${product.name} prenotato con il ${Math.floor(bookingDiscount)}% di sconto.\nMancano €${euroRemaining.toLocaleString('it-IT')} allo sconto massimo — condividi il drop per arrivarci!`
          : `${product.name} prenotato con il ${Math.floor(bookingDiscount)}% di sconto massimo. 🎉`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ Exception in handleBook:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        error: error,
      });
      
      if (error?.message?.includes('PICKUP_POINT_')) {
        Alert.alert('Verifica il punto di ritiro', 'Seleziona un punto attivo nel profilo e prenota soltanto dai drop di quel punto.', [
          { text: 'Vai al profilo', onPress: () => router.push('/(tabs)/profile') },
          { text: 'Annulla', style: 'cancel' },
        ]);
      } else if (error?.message?.toLowerCase().includes('terminato')) {
        Alert.alert(
          'Drop Terminato',
          'Questo drop è terminato e non accetta più prenotazioni.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (error?.message?.toLowerCase().includes('esaurito') ||
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
    } finally {
      bookingRequests.current.delete(productId);
    }
  }, [user, drop, products, loadDropDetails, loadUserBookings, dropId, isExpired, isDropCompleted, savedCard]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    const visible = viewableItems.find((entry: any) => entry.isViewable && entry.index != null);
    if (visible) {
      visibleProduct.current = { id: visible.item.id, index: visible.index };
      setCurrentProductIndex(visible.index);
    }
  }, []);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShareProduct({ id: item.id, name: item.name });
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
  }, [drop, userBookings, handleBook, dropId, isDropBookingDisabled, soldOutItems]);

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

  if (catalogueError) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Catalogo non disponibile</Text>
          <Text style={styles.errorSubtext}>Non è stato possibile caricare tutti gli articoli. Riprova per vedere il catalogo completo.</Text>
          <Pressable style={styles.backButton} onPress={loadDropDetails} accessibilityRole="button">
            <Text style={styles.backButtonText}>Riprova</Text>
          </Pressable>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.backButtonText}>Torna indietro</Text>
          </Pressable>
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

      {drop?.status === 'approved' && !bannerDismissed && (
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
              <Pressable
                onPress={() => {
                  console.log('[DropDetails] Banner close button pressed');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBannerDismissed(true);
                }}
                style={styles.bannerCloseButton}
                hitSlop={8}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={12}
                  color="#E11D48"
                />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      )}

      {savedCard && (
        <View style={styles.savedCardRow}>
          <Text style={styles.savedCardText} numberOfLines={1}>Carta salvata {savedCard.brand.toUpperCase()} •••• {savedCard.last4}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rimuovi carta salvata"
            style={styles.savedCardRemove}
            onPress={() => Alert.alert('Rimuovere la carta?', 'La carta salvata verrà eliminata. Potrai salvarne una nuova alla prossima prenotazione.', [
              { text: 'Annulla', style: 'cancel' },
              { text: 'Rimuovi', style: 'destructive', onPress: async () => {
                try { await removeSavedCard(); setSavedCard(null); }
                catch (e) {
                  const inUse = (e as { code?: string })?.code === 'CARD_IN_USE';
                  Alert.alert('Carta non rimossa', inUse ? 'Hai una prenotazione con carta ancora in corso. Potrai rimuovere la carta dopo la chiusura del drop.' : 'Riprova più tardi.');
                }
              } },
            ])}
          >
            <Text style={styles.savedCardRemoveText}>Rimuovi</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        key={selectedCategory === null ? 'all' : `category:${selectedCategory}`}
        ref={flatListRef}
        data={filteredProducts}
        initialScrollIndex={filteredProducts.length ? Math.min(initialProductIndex, filteredProducts.length - 1) : undefined}
        ListEmptyComponent={
          <View style={[styles.productContainer, styles.loadingContainer]}>
            <Text style={styles.errorText}>Nessun articolo in questa categoria</Text>
            <Pressable onPress={() => selectCategory(null)} style={styles.backButton} accessibilityRole="button">
              <Text style={styles.backButtonText}>Mostra tutti gli articoli</Text>
            </Pressable>
          </View>
        }
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
            flatListRef.current?.scrollToOffset({
              offset: height * visibleProduct.current.index,
              animated: false,
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
          <View style={styles.feedControls} pointerEvents="box-none">
            <View style={styles.feedCounter} pointerEvents="none">
              <Text style={styles.feedCounterText}>{feedCounter(currentProductIndex, filteredProducts.length)}</Text>
            </View>
            {(hasUsefulCategories || selectedCategory !== null) && (
              <View style={styles.feedFilterGroup}>
                <Pressable onPress={() => setShowCategorySheet(true)}
                  accessibilityRole="button" accessibilityLabel={selectedCategoryLabel ? `Cambia categoria, ${selectedCategoryLabel}` : 'Filtra per categoria'}
                  style={({ pressed }) => [styles.feedFilter, pressed && { opacity: 0.65 }]}>
                  <MaterialCommunityIcons name="filter-variant" size={17} color={colors.text} />
                  <Text style={styles.feedFilterText} numberOfLines={1}>{selectedCategoryLabel ?? 'Filtra'}</Text>
                </Pressable>
                {selectedCategory !== null && (
                  <Pressable onPress={() => selectCategory(null)} style={styles.feedClear}
                    accessibilityRole="button" accessibilityLabel="Rimuovi filtro categoria">
                    <MaterialCommunityIcons name="close" size={18} color={colors.text} />
                  </Pressable>
                )}
              </View>
            )}
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

      <DropCategorySheet
        visible={showCategorySheet}
        categories={categories}
        total={products.length}
        selected={selectedCategory}
        onSelect={selectCategory}
        onClose={() => setShowCategorySheet(false)}
      />
      <ShareToGroupModal
        visible={showShareModal}
        onClose={() => { setShowShareModal(false); setShareProduct(null); }}
        product={shareProduct}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  savedCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginHorizontal: 16, marginTop: 6, paddingLeft: 12, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  savedCardText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  savedCardRemove: { minWidth: 44, minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  savedCardRemoveText: { color: '#E11D48', fontSize: 13, fontWeight: '700' },
  feedControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginHorizontal: 16, marginTop: 6 },
  feedCounter: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.65)', flexShrink: 1 },
  feedCounterText: { color: '#FFF', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  feedFilterGroup: { flexDirection: 'row', alignItems: 'center', maxWidth: '58%', borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: colors.border },
  feedFilter: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, flexShrink: 1 },
  feedFilterText: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  feedClear: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
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
  bannerCloseButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
