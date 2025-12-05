
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Platform, Text, Pressable, Alert, Animated, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import ProductCard from '@/components/ProductCard';
import { Product, ProductVariant } from '@/types/Product';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import FeedWelcomeModal from '@/components/FeedWelcomeModal';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// PERFORMANCE OPTIMIZATION: Batch size for loading variants
const VARIANT_BATCH_SIZE = 50;
const PRODUCT_BATCH_SIZE = 100;

interface SupplierList {
  id: string;
  name: string;
  supplier_id: string;
  supplier_name: string;
  min_discount: number;
  max_discount: number;
  min_reservation_value: number;
  max_reservation_value: number;
}

interface ProductList {
  listId: string;
  listName: string;
  supplierName: string;
  products: Product[];
  minDiscount: number;
  maxDiscount: number;
  minReservationValue: number;
  maxReservationValue: number;
}

const WELCOME_MODAL_KEY = 'feed_welcome_modal_shown';

export default function HomeScreen() {
  const { logout, user } = useAuth();
  const [interestedProducts, setInterestedProducts] = useState<Set<string>>(new Set());
  const [wishlistProducts, setWishlistProducts] = useState<Set<string>>(new Set());
  const [currentListIndex, setCurrentListIndex] = useState(0);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [productLists, setProductLists] = useState<ProductList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState<Record<string, boolean>>({});
  const [processingInterests, setProcessingInterests] = useState<Set<string>>(new Set());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showWishlistTip, setShowWishlistTip] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const listFlatListRef = useRef<FlatList>(null);
  const productFlatListRef = useRef<FlatList>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  // Check if welcome modal should be shown
  useEffect(() => {
    const checkWelcomeModal = async () => {
      try {
        const hasShown = await AsyncStorage.getItem(WELCOME_MODAL_KEY);
        if (!hasShown) {
          setTimeout(() => {
            setShowWelcomeModal(true);
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking welcome modal state:', error);
      }
    };

    checkWelcomeModal();
  }, []);

  const handleCloseWelcomeModal = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_MODAL_KEY, 'true');
      setShowWelcomeModal(false);
    } catch (error) {
      console.error('Error saving welcome modal state:', error);
      setShowWelcomeModal(false);
    }
  };

  const handleOpenWelcomeModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWelcomeModal(true);
  };

  // PERFORMANCE OPTIMIZATION: Load variants in batches to avoid URL length limits
  const loadVariantsInBatches = async (productIds: string[]) => {
    console.log(`📦 Loading variants for ${productIds.length} products in batches of ${VARIANT_BATCH_SIZE}`);
    
    const allVariants: any[] = [];
    const batches = Math.ceil(productIds.length / VARIANT_BATCH_SIZE);
    
    for (let i = 0; i < batches; i++) {
      const start = i * VARIANT_BATCH_SIZE;
      const end = Math.min(start + VARIANT_BATCH_SIZE, productIds.length);
      const batchIds = productIds.slice(start, end);
      
      console.log(`   Batch ${i + 1}/${batches}: Loading variants for ${batchIds.length} products`);
      setLoadingProgress(`Caricamento varianti ${i + 1}/${batches}...`);
      
      try {
        const { data, error } = await supabase
          .from('product_variants')
          .select('*')
          .in('product_id', batchIds)
          .gt('stock', 0);

        if (error) {
          console.warn(`⚠️  Error loading variant batch ${i + 1} (non-fatal):`, error.message);
          continue;
        }

        if (data && data.length > 0) {
          allVariants.push(...data);
          console.log(`   ✅ Batch ${i + 1}: Loaded ${data.length} variants`);
        }
      } catch (error) {
        console.error(`❌ Exception loading variant batch ${i + 1}:`, error);
      }
    }
    
    console.log(`✅ Total variants loaded: ${allVariants.length}`);
    return allVariants;
  };

  const loadProducts = useCallback(async () => {
    try {
      console.log('\n╔════════════════════════════════════════════════════════════════╗');
      console.log('║  🚀 OPTIMIZED FEED LOADING - PERFORMANCE MODE                 ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('👤 User:', user?.email || 'Not logged in');
      
      setError(null);
      setLoading(true);
      setLoadingProgress('Caricamento liste fornitori...');
      
      // ═══════════════════════════════════════════════════════════════════
      // STEP 1: FETCH ACTIVE SUPPLIER LISTS
      // ═══════════════════════════════════════════════════════════════════
      console.log('\n┌─ STEP 1: Fetching Active Supplier Lists ─────────────────────┐');
      
      const { data: supplierLists, error: listsError } = await supabase
        .from('supplier_lists')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (listsError) {
        throw new Error(`Failed to fetch supplier lists: ${listsError.message}`);
      }

      if (!supplierLists || supplierLists.length === 0) {
        console.log('⚠️  No active supplier lists found');
        console.log('└───────────────────────────────────────────────────────────────┘\n');
        setProductLists([]);
        setLoading(false);
        setLoadingProgress('');
        return;
      }

      console.log(`✅ Found ${supplierLists.length} active supplier lists:`);
      supplierLists.forEach((list, idx) => {
        console.log(`   ${idx + 1}. "${list.name}" (ID: ${list.id.substring(0, 8)}...)`);
      });
      console.log('└───────────────────────────────────────────────────────────────┘\n');

      // ═══════════════════════════════════════════════════════════════════
      // STEP 2: FETCH SUPPLIER PROFILES
      // ═══════════════════════════════════════════════════════════════════
      console.log('┌─ STEP 2: Fetching Supplier Profiles ─────────────────────────┐');
      setLoadingProgress('Caricamento profili fornitori...');
      
      const supplierIds = supplierLists.map(list => list.supplier_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', supplierIds);

      if (profilesError) {
        console.warn('⚠️  Error loading profiles (non-fatal):', profilesError.message);
      }

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      console.log(`✅ Loaded ${profiles?.length || 0} supplier profiles`);
      console.log('└───────────────────────────────────────────────────────────────┘\n');

      // ═══════════════════════════════════════════════════════════════════
      // STEP 3: FETCH PRODUCTS WITH STOCK (OPTIMIZED)
      // ═══════════════════════════════════════════════════════════════════
      console.log('┌─ STEP 3: Fetching Products with Stock (OPTIMIZED) ───────────┐');
      setLoadingProgress('Caricamento prodotti...');
      
      const listIds = supplierLists.map(list => list.id);
      
      // PERFORMANCE: Select only essential fields to reduce data transfer
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, description, brand, sku, image_url, additional_images, original_price, available_sizes, available_colors, condition, category, stock, supplier_list_id, supplier_id, status, created_at')
        .in('supplier_list_id', listIds)
        .gt('stock', 0)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (productsError) {
        throw new Error(`Failed to fetch products: ${productsError.message}`);
      }

      console.log(`✅ Loaded ${products?.length || 0} products with stock > 0`);
      
      if (!products || products.length === 0) {
        console.log('⚠️  No products with stock found');
        console.log('└───────────────────────────────────────────────────────────────┘\n');
        setProductLists([]);
        setLoading(false);
        setLoadingProgress('');
        return;
      }

      // Log products per list
      const productsPerList = new Map<string, number>();
      products.forEach(p => {
        const count = productsPerList.get(p.supplier_list_id) || 0;
        productsPerList.set(p.supplier_list_id, count + 1);
      });

      console.log('\n📊 Products per List:');
      supplierLists.forEach((list, idx) => {
        const count = productsPerList.get(list.id) || 0;
        console.log(`   ${idx + 1}. "${list.name}": ${count} products`);
      });
      console.log('└───────────────────────────────────────────────────────────────┘\n');

      // ═══════════════════════════════════════════════════════════════════
      // STEP 4: LOAD PRODUCT VARIANTS IN BATCHES (OPTIMIZED)
      // ═══════════════════════════════════════════════════════════════════
      console.log('┌─ STEP 4: Loading Product Variants (BATCHED) ─────────────────┐');
      
      const productIds = products.map(p => p.id);
      const variants = await loadVariantsInBatches(productIds);
      
      console.log('└───────────────────────────────────────────────────────────────┘\n');

      // Create variants map
      const variantsMap = new Map<string, ProductVariant[]>();
      if (variants && variants.length > 0) {
        variants.forEach(v => {
          if (!variantsMap.has(v.product_id)) {
            variantsMap.set(v.product_id, []);
          }
          variantsMap.get(v.product_id)!.push({
            id: v.id,
            productId: v.product_id,
            size: v.size || undefined,
            color: v.color || undefined,
            stock: v.stock || 0,
            status: v.status || 'active',
          });
        });
      }

      // ═══════════════════════════════════════════════════════════════════
      // STEP 5: BUILD PRODUCT LISTS (OPTIMIZED - LAZY LOADING)
      // ═══════════════════════════════════════════════════════════════════
      console.log('┌─ STEP 5: Building Product Lists (OPTIMIZED) ─────────────────┐');
      setLoadingProgress('Preparazione feed...');
      
      const finalLists: ProductList[] = [];

      // Process each supplier list
      for (const supplierList of supplierLists) {
        const listProducts = products.filter(p => p.supplier_list_id === supplierList.id);
        
        console.log(`\n📦 Processing "${supplierList.name}":`);
        console.log(`   • Raw products: ${listProducts.length}`);

        // Skip empty lists
        if (listProducts.length === 0) {
          console.log(`   ⚠️  Skipping - no products`);
          continue;
        }

        // PERFORMANCE: Transform products with minimal processing
        const transformedProducts: Product[] = listProducts.map(p => {
          const productVariants = variantsMap.get(p.id) || [];
          
          // PERFORMANCE: Simplified image handling
          let additionalImages: string[] = [];
          if (p.additional_images) {
            if (Array.isArray(p.additional_images)) {
              additionalImages = p.additional_images.filter(Boolean);
            }
          }
          
          const imageUrls = [p.image_url, ...additionalImages].filter(Boolean);
          
          return {
            id: p.id,
            name: p.name,
            description: p.description || undefined,
            brand: p.brand || undefined,
            sku: p.sku || undefined,
            imageUrl: p.image_url || '',
            imageUrls: imageUrls,
            originalPrice: parseFloat(p.original_price),
            availableSizes: p.available_sizes || [],
            availableColors: p.available_colors || [],
            sizes: p.available_sizes || [],
            colors: p.available_colors || [],
            condition: p.condition as any,
            category: p.category || undefined,
            stock: p.stock,
            listId: supplierList.id,
            supplierId: p.supplier_id,
            supplierName: profilesMap.get(supplierList.supplier_id) || 'Fornitore',
            minDiscount: supplierList.min_discount || 30,
            maxDiscount: supplierList.max_discount || 80,
            minReservationValue: supplierList.min_reservation_value || 5000,
            maxReservationValue: supplierList.max_reservation_value || 30000,
            hasVariants: productVariants.length > 0,
            variants: productVariants,
          };
        });

        console.log(`   ✅ Transformed: ${transformedProducts.length} products`);

        // Add to final lists
        finalLists.push({
          listId: supplierList.id,
          listName: supplierList.name,
          supplierName: profilesMap.get(supplierList.supplier_id) || 'Fornitore',
          products: transformedProducts,
          minDiscount: supplierList.min_discount || 30,
          maxDiscount: supplierList.max_discount || 80,
          minReservationValue: supplierList.min_reservation_value || 5000,
          maxReservationValue: supplierList.max_reservation_value || 30000,
        });
      }

      console.log('\n└───────────────────────────────────────────────────────────────┘\n');

      // ═══════════════════════════════════════════════════════════════════
      // FINAL VALIDATION & STATE UPDATE
      // ═══════════════════════════════════════════════════════════════════
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║  📊 FINAL RESULT & STATE UPDATE                                ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log(`✅ Active Supplier Lists in DB: ${supplierLists.length}`);
      console.log(`✅ Lists Being Added to State: ${finalLists.length}`);
      console.log(`✅ Total Products in Feed: ${finalLists.reduce((sum, l) => sum + l.products.length, 0)}`);
      
      console.log('\n📋 Final Lists Being Set:');
      finalLists.forEach((list, idx) => {
        console.log(`   ${idx + 1}. "${list.listName}" by ${list.supplierName}`);
        console.log(`      • Products: ${list.products.length}`);
        console.log(`      • Discount: ${list.minDiscount}% - ${list.maxDiscount}%`);
      });

      if (finalLists.length !== supplierLists.length) {
        console.log('\n⚠️  Some lists were filtered out (no products)');
      } else {
        console.log('\n✅ SUCCESS: All active lists with products are included!');
      }
      
      console.log('\n🎯 SETTING STATE NOW...');
      
      // CRITICAL: Set the state
      setProductLists(finalLists);
      
      console.log('✅ STATE SET COMPLETE');
      console.log('\n╚════════════════════════════════════════════════════════════════╝\n');
      
      setLoading(false);
      setLoadingProgress('');

    } catch (error) {
      console.error('\n╔════════════════════════════════════════════════════════════════╗');
      console.error('║  ❌ CRITICAL ERROR                                             ║');
      console.error('╚════════════════════════════════════════════════════════════════╝');
      console.error('Error:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
      setError(`Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      setLoading(false);
      setLoadingProgress('');
    }
  }, [user]);

  // Log state changes
  useEffect(() => {
    console.log('🔄 STATE CHANGE DETECTED:');
    console.log(`   productLists.length = ${productLists.length}`);
    console.log(`   currentListIndex = ${currentListIndex}`);
    if (productLists.length > 0) {
      console.log('   Lists in state:');
      productLists.forEach((list, idx) => {
        console.log(`     ${idx + 1}. "${list.listName}" (${list.products.length} products)`);
      });
    }
  }, [productLists, currentListIndex]);

  // Subscribe to real-time product updates
  useEffect(() => {
    console.log('Setting up real-time subscription for product stock updates');
    
    const channel = supabase
      .channel('home_product_stock_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          console.log('📡 Product stock update received:', payload);
          const updatedProduct = payload.new as any;
          
          if (updatedProduct.stock <= 0) {
            console.log('🗑️ Product stock is 0, removing from feed:', updatedProduct.id);
            
            setProductLists(prevLists => {
              const updatedLists = prevLists.map(list => {
                const filteredProducts = list.products.filter(p => p.id !== updatedProduct.id);
                return {
                  ...list,
                  products: filteredProducts,
                };
              }).filter(list => list.products.length > 0);
              
              console.log(`✓ Updated lists count: ${updatedLists.length}`);
              return updatedLists;
            });
          } else {
            console.log('✅ Product stock updated:', updatedProduct.id, 'new stock:', updatedProduct.stock);
            setProductLists(prevLists => {
              return prevLists.map(list => {
                if (list.listId === updatedProduct.supplier_list_id) {
                  return {
                    ...list,
                    products: list.products.map(p => 
                      p.id === updatedProduct.id 
                        ? { ...p, stock: updatedProduct.stock }
                        : p
                    ),
                  };
                }
                return list;
              });
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUserInterests = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: interests, error } = await supabase
        .from('user_interests')
        .select('product_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading user interests:', error);
        return;
      }

      if (interests) {
        const productIds = new Set(interests.map(i => i.product_id));
        setInterestedProducts(productIds);
        console.log(`Loaded ${productIds.size} user interests`);
      }
    } catch (error) {
      console.error('Exception loading user interests:', error);
    }
  }, [user]);

  const loadUserWishlist = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: wishlist, error } = await supabase
        .from('wishlists')
        .select('product_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading user wishlist:', error);
        return;
      }

      if (wishlist) {
        const productIds = new Set(wishlist.map(w => w.product_id));
        setWishlistProducts(productIds);
        console.log(`Loaded ${productIds.size} wishlist items`);
      }
    } catch (error) {
      console.error('Exception loading user wishlist:', error);
    }
  }, [user]);

  const loadUnreadNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error loading unread notifications count:', error);
        return;
      }

      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Exception loading unread notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    loadProducts();
    loadUserInterests();
    loadUserWishlist();
    loadUnreadNotifications();
  }, [loadProducts, loadUserInterests, loadUserWishlist, loadUnreadNotifications]);

  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications_badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadUnreadNotifications]);

  const currentList = productLists[currentListIndex];
  const totalProductsInList = currentList?.products.length || 0;
  const interestedInCurrentList = currentList?.products.filter(p => interestedProducts.has(p.id)).length || 0;

  // Load banner state from AsyncStorage when list changes
  useEffect(() => {
    const loadBannerState = async () => {
      if (!currentList) return;
      
      const sessionKey = `banner_dismissed_${currentList.listId}`;
      
      try {
        const dismissed = await AsyncStorage.getItem(sessionKey);
        setBannerDismissed(prev => ({
          ...prev,
          [currentList.listId]: dismissed === 'true'
        }));
      } catch (error) {
        console.error('Error loading banner state:', error);
      }
    };
    
    loadBannerState();
  }, [currentList]);

  // Animate banner visibility
  useEffect(() => {
    const shouldShowBanner = 
      currentList && 
      interestedInCurrentList > 1 && 
      !bannerDismissed[currentList.listId];

    if (shouldShowBanner) {
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [interestedInCurrentList, currentList, bannerDismissed, bannerOpacity]);

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: totalProductsInList > 0 ? (currentProductIndex + 1) / totalProductsInList : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentProductIndex, totalProductsInList, progressAnim]);

  const handleWishlistToggle = async (productId: string) => {
    if (!user) {
      Alert.alert('Errore', 'Devi essere registrato per usare la wishlist');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const isCurrentlyInWishlist = wishlistProducts.has(productId);

    try {
      if (isCurrentlyInWishlist) {
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (error) {
          console.error('Error removing from wishlist:', error);
          Alert.alert('Errore', 'Impossibile rimuovere dalla wishlist');
          return;
        }

        setWishlistProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('wishlists')
          .insert({
            user_id: user.id,
            product_id: productId,
            drop_id: null,
          });

        if (error) {
          console.error('Error adding to wishlist:', error);
          Alert.alert('Errore', 'Impossibile aggiungere alla wishlist');
          return;
        }

        setWishlistProducts(prev => {
          const newSet = new Set(prev);
          newSet.add(productId);
          return newSet;
        });
        
        if (wishlistProducts.size === 0) {
          setShowWishlistTip(true);
        }
      }
    } catch (error: any) {
      console.error('Exception handling wishlist:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    }
  };

  const handleInterest = async (productId: string) => {
    if (!user || !user.pickupPointId) {
      Alert.alert('Errore', 'Devi essere registrato con un punto di ritiro per mostrare interesse');
      return;
    }

    if (processingInterests.has(productId)) {
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const isCurrentlyInterested = interestedProducts.has(productId);
    const product = currentList?.products.find(p => p.id === productId);
    
    if (!product) return;

    setProcessingInterests(prev => new Set(prev).add(productId));

    try {
      if (isCurrentlyInterested) {
        const { error } = await supabase
          .from('user_interests')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (error) {
          console.error('Error removing interest:', error);
          Alert.alert('Errore', `Impossibile rimuovere l'interesse: ${error.message}`);
          return;
        }

        setInterestedProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('user_interests')
          .insert({
            user_id: user.id,
            product_id: productId,
            supplier_list_id: product.listId,
            pickup_point_id: user.pickupPointId,
          });

        if (error) {
          throw error;
        }

        setInterestedProducts(prev => {
          const newSet = new Set(prev);
          newSet.add(productId);
          return newSet;
        });
      }
    } catch (error: any) {
      console.error('Exception handling interest:', error);
      Alert.alert('Errore', `Impossibile gestire l'interesse: ${error.message}`);
    } finally {
      setProcessingInterests(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
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

  const handleNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/notifications');
  };

  const handleNextList = () => {
    if (currentListIndex < productLists.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const nextIndex = currentListIndex + 1;
      console.log(`→ Switching to list ${nextIndex + 1}/${productLists.length}: "${productLists[nextIndex].listName}"`);
      
      setCurrentListIndex(nextIndex);
      setCurrentProductIndex(0);
      
      setTimeout(() => {
        try {
          if (listFlatListRef.current) {
            listFlatListRef.current.scrollToOffset({
              offset: SCREEN_WIDTH * nextIndex,
              animated: true,
            });
          }
        } catch (error) {
          console.error('Error scrolling to next list:', error);
        }
      }, 100);
    }
  };

  const handlePreviousList = () => {
    if (currentListIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const prevIndex = currentListIndex - 1;
      console.log(`← Switching to list ${prevIndex + 1}/${productLists.length}: "${productLists[prevIndex].listName}"`);
      
      setCurrentListIndex(prevIndex);
      setCurrentProductIndex(0);
      
      setTimeout(() => {
        try {
          if (listFlatListRef.current) {
            listFlatListRef.current.scrollToOffset({
              offset: SCREEN_WIDTH * prevIndex,
              animated: true,
            });
          }
        } catch (error) {
          console.error('Error scrolling to previous list:', error);
        }
      }, 100);
    }
  };

  const handleProductScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / SCREEN_HEIGHT);
    if (index !== currentProductIndex && index >= 0 && index < totalProductsInList) {
      setCurrentProductIndex(index);
    }
  };

  const handleRetry = () => {
    console.log('Retrying product load...');
    setError(null);
    loadProducts();
  };

  const handleGoToAdmin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/admin/testing');
  };

  const handleDismissBanner = async () => {
    if (!currentList) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setBannerDismissed(prev => ({
      ...prev,
      [currentList.listId]: true
    }));
    
    const sessionKey = `banner_dismissed_${currentList.listId}`;
    try {
      await AsyncStorage.setItem(sessionKey, 'true');
    } catch (error) {
      console.error('Error saving banner state:', error);
    }
  };

  const renderList = ({ item, index }: { item: ProductList; index: number }) => {
    const isCurrentList = index === currentListIndex;
    
    // Handle empty lists
    if (item.products.length === 0) {
      return (
        <View style={styles.listContainer}>
          <View style={[styles.container, styles.centerContent]}>
            <IconSymbol 
              ios_icon_name="tray" 
              android_material_icon_name="inbox" 
              size={80} 
              color={colors.textTertiary} 
            />
            <Text style={styles.emptyTitle}>Lista Vuota</Text>
            <Text style={styles.emptyText}>
              La lista &quot;{item.listName}&quot; non ha prodotti disponibili al momento.
            </Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.listContainer}>
        <FlatList
          ref={isCurrentList ? productFlatListRef : null}
          data={item.products}
          renderItem={({ item: product }) => (
            <ProductCard
              product={product}
              onInterest={handleInterest}
              isInterested={interestedProducts.has(product.id)}
            />
          )}
          keyExtractor={(product) => product.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={(_, productIndex) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * productIndex,
            index: productIndex,
          })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={2}
          windowSize={3}
          initialNumToRender={1}
          onScroll={isCurrentList ? handleProductScroll : undefined}
          scrollEventThrottle={16}
          scrollEnabled={isCurrentList}
        />
      </View>
    );
  };

  const getItemLayout = (_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={styles.loadingText}>
            {loadingProgress || 'Caricamento prodotti...'}
          </Text>
          <Text style={styles.loadingHint}>
            Ottimizzazione in corso per prestazioni migliori
          </Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <IconSymbol 
            ios_icon_name="exclamationmark.triangle" 
            android_material_icon_name="error" 
            size={64} 
            color="#FF3B30" 
          />
          <Text style={styles.errorTitle}>Errore di Caricamento</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>
            Verifica la tua connessione internet e riprova.
          </Text>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <IconSymbol 
              ios_icon_name="arrow.clockwise" 
              android_material_icon_name="refresh" 
              size={20} 
              color="#FFF" 
            />
            <Text style={styles.retryButtonText}>Riprova</Text>
          </Pressable>
        </View>
      </>
    );
  }

  if (productLists.length === 0) {
    const isAdmin = user?.role === 'admin';
    
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <Pressable onPress={handleLogout} style={styles.topLeftButton}>
            <IconSymbol 
              ios_icon_name="rectangle.portrait.and.arrow.right" 
              android_material_icon_name="logout" 
              size={24} 
              color={colors.text} 
            />
          </Pressable>

          <Pressable onPress={handleNotifications} style={styles.topRightButton}>
            <IconSymbol 
              ios_icon_name="bell.fill" 
              android_material_icon_name="notifications" 
              size={24} 
              color={colors.text} 
            />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Text>
              </View>
            )}
          </Pressable>

          <IconSymbol 
            ios_icon_name="tray" 
            android_material_icon_name="inbox" 
            size={80} 
            color={colors.textTertiary} 
          />
          <Text style={styles.emptyTitle}>Nessun Prodotto Disponibile</Text>
          <Text style={styles.emptyText}>
            Al momento non ci sono prodotti disponibili.{'\n'}
            Tutti gli articoli potrebbero essere esauriti o i fornitori non hanno ancora caricato articoli.
          </Text>
          
          {isAdmin && (
            <>
              <Text style={styles.adminHint}>
                👨‍💼 Sei un amministratore
              </Text>
              <Text style={styles.emptySubtext}>
                Puoi creare dati di test per provare l&apos;app
              </Text>
              
              <Pressable style={styles.adminButton} onPress={handleGoToAdmin}>
                <IconSymbol 
                  ios_icon_name="wrench.and.screwdriver.fill" 
                  android_material_icon_name="build" 
                  size={20} 
                  color="#FFF" 
                />
                <Text style={styles.adminButtonText}>Vai a Testing & Crea Dati</Text>
              </Pressable>
            </>
          )}
          
          {!isAdmin && (
            <Text style={styles.emptySubtext}>
              Torna più tardi per scoprire le offerte!
            </Text>
          )}
          
          <Pressable style={styles.refreshButton} onPress={handleRetry}>
            <IconSymbol 
              ios_icon_name="arrow.clockwise" 
              android_material_icon_name="refresh" 
              size={20} 
              color={colors.text} 
            />
            <Text style={styles.refreshButtonText}>Aggiorna</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const shouldShowBanner = 
    currentList && 
    interestedInCurrentList > 1 && 
    !bannerDismissed[currentList.listId];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <FlatList
          ref={listFlatListRef}
          data={productLists}
          renderItem={renderList}
          keyExtractor={(item) => item.listId}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          onScrollToIndexFailed={(info) => {
            console.warn('Scroll to index failed:', info);
            setTimeout(() => {
              try {
                listFlatListRef.current?.scrollToOffset({ 
                  offset: SCREEN_WIDTH * info.index,
                  animated: false,
                });
              } catch (error) {
                console.error('Retry scroll failed:', error);
              }
            }, 100);
          }}
        />
        
        <Pressable onPress={handleLogout} style={styles.topLeftButton}>
          <IconSymbol 
            ios_icon_name="rectangle.portrait.and.arrow.right" 
            android_material_icon_name="logout" 
            size={24} 
            color={colors.text} 
          />
        </Pressable>

        <Pressable onPress={handleNotifications} style={styles.topRightButton}>
          <IconSymbol 
            ios_icon_name="bell.fill" 
            android_material_icon_name="notifications" 
            size={24} 
            color={colors.text} 
          />
          {unreadNotifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable onPress={handleOpenWelcomeModal} style={styles.helpButton}>
          <View style={styles.helpButtonCircle}>
            <IconSymbol 
              ios_icon_name="questionmark.circle.fill" 
              android_material_icon_name="help" 
              size={28} 
              color="#3B82F6" 
            />
          </View>
        </Pressable>
        
        <View style={styles.rightSideIcons}>
          <View style={styles.iconButton}>
            <View style={styles.iconCircle}>
              <IconSymbol 
                ios_icon_name="mappin.circle.fill" 
                android_material_icon_name="location_on" 
                size={18} 
                color={colors.text} 
              />
            </View>
            <Text style={styles.iconLabel} numberOfLines={1}>
              {user?.pickupPoint || 'N/A'}
            </Text>
          </View>

          <View style={styles.iconButton}>
            <View style={styles.iconCircle}>
              <IconSymbol 
                ios_icon_name="list.bullet.rectangle" 
                android_material_icon_name="list" 
                size={18} 
                color={colors.text} 
              />
            </View>
            <Text style={styles.iconLabel} numberOfLines={2}>
              {currentList?.listName}
            </Text>
          </View>

          <View style={styles.iconButton}>
            <View style={styles.progressCircle}>
              <View style={styles.progressCircleBackground}>
                <Animated.View 
                  style={[
                    styles.progressCircleFill,
                    {
                      height: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]} 
                />
              </View>
              <View style={styles.progressCircleContent}>
                <Text style={styles.progressNumber}>{currentProductIndex + 1}</Text>
                <Text style={styles.progressTotal}>/{totalProductsInList}</Text>
              </View>
            </View>
          </View>

          <View style={styles.iconButton}>
            <View style={styles.iconCircle}>
              <Text style={styles.listCounterIcon}>
                {currentListIndex + 1}/{productLists.length}
              </Text>
            </View>
          </View>
        </View>

        {currentListIndex > 0 && (
          <Pressable 
            style={({ pressed }) => [
              styles.navButtonLeft,
              pressed && styles.navButtonPressed,
            ]}
            onPress={handlePreviousList}
          >
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="chevron_left" size={18} color="#FFF" />
          </Pressable>
        )}

        {currentListIndex < productLists.length - 1 && (
          <Pressable 
            style={({ pressed }) => [
              styles.navButtonRight,
              pressed && styles.navButtonPressed,
            ]}
            onPress={handleNextList}
          >
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={18} color="#FFF" />
          </Pressable>
        )}

        {shouldShowBanner && (
          <Animated.View 
            style={[
              styles.hintContainer,
              {
                opacity: bannerOpacity,
                pointerEvents: shouldShowBanner ? 'auto' : 'none',
              }
            ]}
          >
            <View style={styles.hintCard}>
              <IconSymbol ios_icon_name="lightbulb.fill" android_material_icon_name="lightbulb" size={18} color="#FFB800" />
              <Text style={styles.hintText}>
                Ottimo! Più articoli della stessa lista aumentano le probabilità di attivare un drop!
              </Text>
              <Pressable onPress={handleDismissBanner} style={styles.closeBannerButton}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color="#8B6914" />
              </Pressable>
            </View>
          </Animated.View>
        )}

        <FeedWelcomeModal
          visible={showWelcomeModal}
          onClose={handleCloseWelcomeModal}
        />

        {showWishlistTip && (
          <View style={styles.modalOverlay}>
            <View style={styles.wishlistTipModal}>
              <Pressable 
                style={styles.wishlistTipClose}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowWishlistTip(false);
                }}
              >
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </Pressable>
              
              <View style={styles.wishlistTipIcon}>
                <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={48} color="#FF3B30" />
              </View>
              
              <Text style={styles.wishlistTipTitle}>Wishlist Creata!</Text>
              <Text style={styles.wishlistTipText}>
                Usa il cuore ❤️ per salvare gli articoli che ti interessano nella tua wishlist.
                {'\n\n'}
                Potrai trovarli nella sezione Profilo e raggiungerli direttamente nel feed quando vuoi!
                {'\n\n'}
                💡 Perfetto per non perdere di vista i prodotti che ami!
              </Text>
              
              <Pressable 
                style={styles.wishlistTipButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowWishlistTip(false);
                }}
              >
                <Text style={styles.wishlistTipButtonText}>Ho Capito!</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    fontWeight: '500',
  },
  loadingHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF3B30',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  adminHint: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  listContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topLeftButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 48 : 60,
    left: 20,
    backgroundColor: 'transparent',
    padding: 12,
    zIndex: 100,
  },
  topRightButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 48 : 60,
    right: 20,
    backgroundColor: 'transparent',
    padding: 12,
    zIndex: 100,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.background,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  helpButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 48 : 60,
    left: '50%',
    marginLeft: -20,
    zIndex: 100,
  },
  helpButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rightSideIcons: {
    position: 'absolute',
    right: 10,
    top: '18%',
    bottom: '35%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 16,
    zIndex: 10,
  },
  iconButton: {
    alignItems: 'center',
    gap: 3,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  iconLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    maxWidth: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  listCounterIcon: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
  },
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleBackground: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  progressCircleFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.text,
    opacity: 0.2,
  },
  progressCircleContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 13,
  },
  progressTotal: {
    fontSize: 7,
    fontWeight: '700',
    color: colors.textSecondary,
    lineHeight: 9,
  },
  navButtonLeft: {
    position: 'absolute',
    left: 8,
    bottom: '22%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  navButtonRight: {
    position: 'absolute',
    right: 8,
    bottom: '22%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  navButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  hintContainer: {
    position: 'absolute',
    bottom: 300,
    left: 20,
    right: 80,
    zIndex: 10,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 248, 220, 0.97)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFB800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#8B6914',
    lineHeight: 16,
  },
  closeBannerButton: {
    padding: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  wishlistTipModal: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 24,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  wishlistTipClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  wishlistTipIcon: {
    marginBottom: 20,
  },
  wishlistTipTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  wishlistTipText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  wishlistTipButton: {
    backgroundColor: colors.text,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  wishlistTipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
});
