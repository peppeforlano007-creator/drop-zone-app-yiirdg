
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

// OPTIMIZED: Increased batch size and improved error handling for faster loading
async function loadVariantsInBatches(productIds: string[], batchSize: number = 100): Promise<any[]> {
  console.log(`→ Loading variants for ${productIds.length} products in batches of ${batchSize}...`);
  
  const allVariants: any[] = [];
  const totalBatches = Math.ceil(productIds.length / batchSize);
  
  // Use Promise.all for parallel batch loading
  const batchPromises = [];
  
  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    batchPromises.push(
      supabase
        .from('product_variants')
        .select('*')
        .in('product_id', batch)
        .gt('stock', 0)
        .then(({ data, error }) => {
          if (error) {
            console.error(`  ❌ Batch ${batchNumber}/${totalBatches} failed:`, error.message);
            return [];
          }
          return data || [];
        })
        .catch(error => {
          console.error(`  ❌ Batch ${batchNumber}/${totalBatches} exception:`, error);
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

// FIXED: Load ALL products from ALL lists with improved pagination
async function loadAllProducts(listIds: string[]): Promise<any[]> {
  console.log(`→ Loading ALL products for ${listIds.length} lists...`);
  console.log(`   List IDs:`, listIds);
  
  const allProducts: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;
  let batchNumber = 0;
  
  while (hasMore) {
    batchNumber++;
    const rangeEnd = offset + batchSize - 1;
    console.log(`  → Fetching batch ${batchNumber} (range: ${offset}-${rangeEnd})...`);
    
    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .in('supplier_list_id', listIds)
      .gt('stock', 0)
      .eq('status', 'active')
      .range(offset, rangeEnd);
    
    if (error) {
      console.error(`  ❌ Batch ${batchNumber} failed:`, error.message);
      throw error;
    }
    
    const products = data || [];
    console.log(`  ✓ Batch ${batchNumber}: Loaded ${products.length} products (Total in DB: ${count})`);
    
    if (products.length > 0) {
      allProducts.push(...products);
    }
    
    // FIXED: Continue if we got a full batch AND there are more products to load
    // Stop if we got less than a full batch OR we've loaded all products
    if (products.length < batchSize) {
      hasMore = false;
      console.log(`  ✓ Reached end of products (batch had ${products.length} items, less than ${batchSize})`);
    } else if (count && allProducts.length >= count) {
      hasMore = false;
      console.log(`  ✓ Loaded all ${count} products from database`);
    } else {
      offset += batchSize;
    }
  }
  
  console.log(`✓ Total products loaded: ${allProducts.length}`);
  
  // Log products per list to verify all lists are included
  const productsPerList = new Map<string, number>();
  allProducts.forEach(p => {
    const count = productsPerList.get(p.supplier_list_id) || 0;
    productsPerList.set(p.supplier_list_id, count + 1);
  });
  
  console.log('✓ Products loaded per list:');
  listIds.forEach(listId => {
    const count = productsPerList.get(listId) || 0;
    console.log(`   - ${listId}: ${count} products`);
  });
  
  return allProducts;
}

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
          // Show modal after a short delay for better UX
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

  const loadProducts = useCallback(async () => {
    try {
      console.log('=== LOADING PRODUCTS - FIXED VERSION (ALL LISTS) ===');
      console.log('Timestamp:', new Date().toISOString());
      setError(null);
      setLoading(true);
      
      // STEP 1: Get all active supplier lists first
      console.log('→ Fetching active supplier lists...');
      const { data: supplierLists, error: listsError } = await supabase
        .from('supplier_lists')
        .select(`
          id,
          name,
          min_discount,
          max_discount,
          min_reservation_value,
          max_reservation_value,
          supplier_id,
          status
        `)
        .eq('status', 'active');

      if (listsError) {
        console.error('❌ Error loading supplier lists:', listsError);
        setError(`Errore nel caricamento delle liste fornitori: ${listsError.message}`);
        setLoading(false);
        return;
      }

      console.log(`✓ Found ${supplierLists?.length || 0} active supplier lists`);
      if (!supplierLists || supplierLists.length === 0) {
        console.log('⚠ No active supplier lists found');
        setProductLists([]);
        setLoading(false);
        return;
      }

      // Log each list found
      supplierLists.forEach((list, index) => {
        console.log(`  ${index + 1}. "${list.name}" (ID: ${list.id})`);
      });

      const listIds = supplierLists.map(list => list.id);
      console.log(`→ Will fetch products for ${listIds.length} lists`);
      
      // STEP 2: FIXED - Fetch ALL products from ALL lists using improved batching
      console.log('→ Fetching ALL products from ALL active lists...');
      
      let products: any[] = [];
      try {
        products = await loadAllProducts(listIds);
      } catch (productsError: any) {
        console.error('❌ Error loading products:', productsError);
        setError(`Errore nel caricamento dei prodotti: ${productsError.message}`);
        setLoading(false);
        return;
      }

      console.log(`✓ Found TOTAL of ${products.length} products with stock > 0`);

      // Log products per list
      const productsPerList = new Map<string, number>();
      products.forEach(p => {
        const count = productsPerList.get(p.supplier_list_id) || 0;
        productsPerList.set(p.supplier_list_id, count + 1);
      });
      
      console.log('→ Products per list:');
      supplierLists.forEach(list => {
        const count = productsPerList.get(list.id) || 0;
        console.log(`  - "${list.name}": ${count} products`);
      });

      // Check if all lists have products
      const listsWithoutProducts = supplierLists.filter(list => !productsPerList.has(list.id));
      if (listsWithoutProducts.length > 0) {
        console.warn(`⚠️ WARNING: ${listsWithoutProducts.length} lists have NO products with stock:`);
        listsWithoutProducts.forEach(list => {
          console.warn(`  - "${list.name}" (ID: ${list.id})`);
        });
      }

      if (!products || products.length === 0) {
        console.log('⚠ No products with stock found for active lists');
        setProductLists([]);
        setLoading(false);
        return;
      }

      // STEP 3: OPTIMIZED - Load variants with larger batch size and parallel processing
      console.log('→ Loading product variants (optimized)...');
      const productIds = products.map(p => p.id);
      
      let variants: any[] = [];
      if (productIds.length > 0) {
        try {
          // Use larger batch size (100 instead of 50) with parallel loading
          variants = await loadVariantsInBatches(productIds, 100);
          console.log(`✓ Successfully loaded ${variants.length} product variants`);
        } catch (error) {
          console.error('⚠ Error loading variants (non-fatal):', error);
          variants = [];
        }
      }

      // Create a map of product_id to variants
      const variantsMap = new Map<string, ProductVariant[]>();
      if (variants && variants.length > 0) {
        variants.forEach(v => {
          if (!v || !v.product_id) {
            return;
          }
          
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

      // STEP 4: Group products by SKU
      console.log('→ Grouping products by SKU...');
      const skuMap = new Map<string, any[]>();
      
      products.forEach(product => {
        const sku = product.sku || product.id;
        if (!skuMap.has(sku)) {
          skuMap.set(sku, []);
        }
        skuMap.get(sku)!.push(product);
      });

      console.log(`✓ Grouped into ${skuMap.size} unique SKUs`);

      // STEP 5: Aggregate products by SKU
      const aggregatedProducts: any[] = [];
      
      skuMap.forEach((skuProducts, sku) => {
        if (skuProducts.length === 1) {
          const product = skuProducts[0];
          const productVariants = variantsMap.get(product.id) || [];
          
          aggregatedProducts.push({
            ...product,
            hasVariants: productVariants.length > 0,
            variants: productVariants,
          });
        } else {
          const baseProduct = skuProducts[0];
          const totalStock = skuProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
          
          const allSizes = new Set<string>();
          const allColors = new Set<string>();
          const aggregatedVariants: ProductVariant[] = [];
          
          skuProducts.forEach(product => {
            const productVariants = variantsMap.get(product.id) || [];
            aggregatedVariants.push(...productVariants);
            
            if (product.available_sizes) {
              product.available_sizes.forEach((s: string) => allSizes.add(s));
            }
            if (product.available_colors) {
              product.available_colors.forEach((c: string) => allColors.add(c));
            }
          });
          
          aggregatedProducts.push({
            ...baseProduct,
            stock: totalStock,
            available_sizes: Array.from(allSizes),
            available_colors: Array.from(allColors),
            hasVariants: aggregatedVariants.length > 0 || allSizes.size > 0 || allColors.size > 0,
            variants: aggregatedVariants,
          });
        }
      });

      console.log(`✓ Created ${aggregatedProducts.length} aggregated products`);

      // STEP 6: Get supplier profiles
      const supplierIds = supplierLists.map(list => list.supplier_id);
      console.log(`→ Fetching ${supplierIds.length} supplier profiles...`);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', supplierIds);

      if (profilesError) {
        console.error('⚠ Error loading profiles:', profilesError);
      }

      console.log(`✓ Loaded ${profiles?.length || 0} supplier profiles`);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      const listsMap = new Map(supplierLists.map(list => [
        list.id,
        {
          ...list,
          supplierName: profilesMap.get(list.supplier_id) || 'Fornitore'
        }
      ]));

      console.log('=== GROUPING PRODUCTS BY LIST ===');
      
      const groupedLists = new Map<string, ProductList>();
      
      let skippedProducts = 0;
      let processedProducts = 0;
      
      console.log('→ Processing aggregated products...');
      aggregatedProducts.forEach((product: any, index: number) => {
        const listId = product.supplier_list_id;
        const listData = listsMap.get(listId);
        
        if (!listData) {
          skippedProducts++;
          return;
        }

        if (product.stock <= 0) {
          skippedProducts++;
          return;
        }

        if (!groupedLists.has(listId)) {
          groupedLists.set(listId, {
            listId: listId,
            listName: listData.name || 'Lista',
            supplierName: listData.supplierName,
            products: [],
            minDiscount: listData.min_discount || 30,
            maxDiscount: listData.max_discount || 80,
            minReservationValue: listData.min_reservation_value || 5000,
            maxReservationValue: listData.max_reservation_value || 30000,
          });
        }
        
        let additionalImages: string[] = [];
        if (product.additional_images) {
          if (Array.isArray(product.additional_images)) {
            additionalImages = product.additional_images.filter(Boolean);
          } else if (typeof product.additional_images === 'string') {
            try {
              const parsed = JSON.parse(product.additional_images);
              if (Array.isArray(parsed)) {
                additionalImages = parsed.filter(Boolean);
              }
            } catch {
              if (product.additional_images.startsWith('http')) {
                additionalImages = [product.additional_images];
              }
            }
          }
        }
        
        const imageUrls = [product.image_url, ...additionalImages].filter(Boolean);
        
        const productData: Product = {
          id: product.id,
          name: product.name,
          description: product.description || undefined,
          brand: product.brand || undefined,
          sku: product.sku || undefined,
          imageUrl: product.image_url || '',
          imageUrls: imageUrls,
          originalPrice: parseFloat(product.original_price),
          availableSizes: product.available_sizes || [],
          availableColors: product.available_colors || [],
          sizes: product.available_sizes || [],
          colors: product.available_colors || [],
          condition: product.condition as any,
          category: product.category || undefined,
          stock: product.stock,
          listId: listId,
          supplierId: product.supplier_id,
          supplierName: listData.supplierName,
          minDiscount: listData.min_discount || 30,
          maxDiscount: listData.max_discount || 80,
          minReservationValue: listData.min_reservation_value || 5000,
          maxReservationValue: listData.max_reservation_value || 30000,
          hasVariants: product.hasVariants || false,
          variants: product.variants || [],
        };
        
        groupedLists.get(listId)!.products.push(productData);
        processedProducts++;
      });
      
      console.log(`✓ Processed ${processedProducts} products, skipped ${skippedProducts} products`);
      
      const lists = Array.from(groupedLists.values()).filter(list => list.products.length > 0);
      
      console.log('=== FINAL RESULT ===');
      console.log(`✓ Created ${lists.length} product lists with products:`);
      lists.forEach((list, index) => {
        const variantCount = list.products.filter(p => p.hasVariants).length;
        console.log(`  ${index + 1}. "${list.listName}" by ${list.supplierName} - ${list.products.length} products (${variantCount} with variants)`);
      });
      
      if (lists.length !== supplierLists.length) {
        console.warn(`⚠️ WARNING: Expected ${supplierLists.length} lists but got ${lists.length} lists with products!`);
        console.warn('   Some lists may not have products with stock > 0');
        
        // Log which lists are missing
        const listIdsWithProducts = new Set(lists.map(l => l.listId));
        const missingLists = supplierLists.filter(sl => !listIdsWithProducts.has(sl.id));
        if (missingLists.length > 0) {
          console.warn('   Missing lists:');
          missingLists.forEach(ml => {
            console.warn(`     - "${ml.name}" (ID: ${ml.id})`);
          });
        }
      } else {
        console.log('✅ SUCCESS: All active lists are present in the feed!');
      }
      
      setProductLists(lists);
      setLoading(false);
      console.log('=== LOADING COMPLETE (ALL LISTS FIXED) ===');
    } catch (error) {
      console.error('❌ Exception loading products:', error);
      setError(`Errore imprevisto: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      setLoading(false);
    }
  }, []);

  // Subscribe to real-time product updates (stock changes)
  useEffect(() => {
    console.log('Setting up real-time subscription for product stock updates in home feed');
    
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
          console.log('📡 Product stock update received in home feed:', payload);
          const updatedProduct = payload.new as any;
          
          if (updatedProduct.stock <= 0) {
            console.log('🗑️ Product stock is 0 or less, removing from home feed:', updatedProduct.id);
            
            setProductLists(prevLists => {
              const updatedLists = prevLists.map(list => {
                const filteredProducts = list.products.filter(p => p.id !== updatedProduct.id);
                
                if (filteredProducts.length !== list.products.length) {
                  console.log(`  Removed product ${updatedProduct.id} from list "${list.listName}"`);
                }
                
                return {
                  ...list,
                  products: filteredProducts,
                };
              }).filter(list => list.products.length > 0);
              
              console.log(`✓ Updated lists count: ${updatedLists.length}`);
              return updatedLists;
            });
          } else {
            console.log('✅ Product stock updated, keeping in feed:', updatedProduct.id, 'new stock:', updatedProduct.stock);
            setProductLists(prevLists => {
              return prevLists.map(list => {
                if (list.listId === updatedProduct.supplier_list_id) {
                  const productExists = list.products.some(p => p.id === updatedProduct.id);
                  
                  if (productExists) {
                    console.log(`  Updating stock for product ${updatedProduct.id} in list "${list.listName}" to ${updatedProduct.stock}`);
                    return {
                      ...list,
                      products: list.products.map(p => 
                        p.id === updatedProduct.id 
                          ? { ...p, stock: updatedProduct.stock }
                          : p
                      ),
                    };
                  }
                }
                return list;
              });
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription in home feed');
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
      console.log(`Unread notifications: ${count || 0}`);
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
          console.log('Notification change detected, reloading count...');
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

  // Animate banner visibility based on conditions
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
        console.log('Product removed from wishlist:', productId);
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
        console.log('Product added to wishlist:', productId);
        
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
      console.log('Already processing interest for product:', productId);
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
        console.log('Interest removed for product:', productId);
      } else {
        let retryCount = 0;
        const maxRetries = 2;
        let success = false;

        while (retryCount <= maxRetries && !success) {
          try {
            const { error } = await supabase
              .from('user_interests')
              .insert({
                user_id: user.id,
                product_id: productId,
                supplier_list_id: product.listId,
                pickup_point_id: user.pickupPointId,
              });

            if (error) {
              if (error.code === '42501') {
                console.error('RLS policy error (42501) - insufficient privileges. Retrying...', retryCount + 1);
                retryCount++;
                if (retryCount <= maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
                  continue;
                }
              }
              throw error;
            }

            success = true;
            setInterestedProducts(prev => {
              const newSet = new Set(prev);
              newSet.add(productId);
              return newSet;
            });
            console.log('Interest added for product:', productId);
          } catch (innerError) {
            if (retryCount >= maxRetries) {
              throw innerError;
            }
            retryCount++;
          }
        }

        if (!success) {
          throw new Error('Failed to add interest after retries');
        }
      }
    } catch (error: any) {
      console.error('Exception handling interest:', error);
      const errorMessage = error?.message || 'Errore imprevisto';
      const errorCode = error?.code || 'unknown';
      
      Alert.alert(
        'Errore',
        `Impossibile ${isCurrentlyInterested ? 'rimuovere' : 'aggiungere'} l'interesse.\n\nCodice: ${errorCode}\nMessaggio: ${errorMessage}\n\nRiprova tra qualche secondo.`
      );
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
    console.log('Navigating to notifications screen');
  };

  const handleNextList = () => {
    if (currentListIndex < productLists.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const nextIndex = currentListIndex + 1;
      console.log(`→ Switching to next list: ${nextIndex + 1}/${productLists.length} - "${productLists[nextIndex].listName}"`);
      
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
    } else {
      console.log('Already at last list');
    }
  };

  const handlePreviousList = () => {
    if (currentListIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const prevIndex = currentListIndex - 1;
      console.log(`← Switching to previous list: ${prevIndex + 1}/${productLists.length} - "${productLists[prevIndex].listName}"`);
      
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
    } else {
      console.log('Already at first list');
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
      console.log('Banner dismissed for list:', currentList.listId);
    } catch (error) {
      console.error('Error saving banner state:', error);
    }
  };

  const renderList = ({ item, index }: { item: ProductList; index: number }) => {
    const isCurrentList = index === currentListIndex;
    
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
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
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
          <Text style={styles.loadingText}>Caricamento prodotti...</Text>
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
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
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
          removeClippedSubviews={Platform.OS === 'android'}
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
        
        {/* UPDATED: Icons moved higher and rearranged */}
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
