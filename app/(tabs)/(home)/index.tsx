
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Platform, Text, Pressable, Alert, Animated, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types/Product';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

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

export default function HomeScreen() {
  const { logout, user } = useAuth();
  const [interestedProducts, setInterestedProducts] = useState<Set<string>>(new Set());
  const [currentListIndex, setCurrentListIndex] = useState(0);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [productLists, setProductLists] = useState<ProductList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [bannerSessionKey, setBannerSessionKey] = useState<string>('');
  const listFlatListRef = useRef<FlatList>(null);
  const productFlatListRef = useRef<FlatList>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const loadProducts = useCallback(async () => {
    try {
      console.log('Loading products from database...');
      setError(null);
      setLoading(true);
      
      // First, get all active products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error loading products:', productsError);
        setError(`Errore nel caricamento dei prodotti: ${productsError.message}`);
        setLoading(false);
        return;
      }

      console.log(`Found ${products?.length || 0} products`);

      if (!products || products.length === 0) {
        console.log('No products found in database');
        setProductLists([]);
        setLoading(false);
        return;
      }

      // Get unique supplier list IDs
      const listIds = [...new Set(products.map(p => p.supplier_list_id))];
      
      // Fetch supplier lists with supplier info
      const { data: supplierLists, error: listsError } = await supabase
        .from('supplier_lists')
        .select(`
          id,
          name,
          min_discount,
          max_discount,
          min_reservation_value,
          max_reservation_value,
          supplier_id
        `)
        .in('id', listIds);

      if (listsError) {
        console.error('Error loading supplier lists:', listsError);
        setError(`Errore nel caricamento delle liste fornitori: ${listsError.message}`);
        setLoading(false);
        return;
      }

      // Get supplier profiles
      const supplierIds = supplierLists?.map(list => list.supplier_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', supplierIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        // Don't fail completely if profiles fail to load
      }

      // Create a map of supplier_id to full_name
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Create a map of list_id to list data
      const listsMap = new Map(supplierLists?.map(list => [
        list.id,
        {
          ...list,
          supplierName: profilesMap.get(list.supplier_id) || 'Fornitore'
        }
      ]) || []);

      // Group products by supplier list
      const groupedLists = new Map<string, ProductList>();
      
      products.forEach((product: any) => {
        const listId = product.supplier_list_id;
        const listData = listsMap.get(listId);
        
        if (!listData) {
          console.warn(`No list data found for list ID: ${listId}`);
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
        
        // Properly map database fields to Product interface
        const productData: Product = {
          id: product.id,
          name: product.name,
          description: product.description || '',
          imageUrl: product.image_url || '',
          imageUrls: product.additional_images && Array.isArray(product.additional_images) 
            ? [product.image_url, ...product.additional_images].filter(Boolean)
            : [product.image_url].filter(Boolean),
          originalPrice: parseFloat(product.original_price),
          availableSizes: product.available_sizes || [],
          availableColors: product.available_colors || [],
          sizes: product.available_sizes || [],
          colors: product.available_colors || [],
          condition: product.condition as any,
          category: product.category,
          stock: product.stock,
          listId: listId,
          supplierId: product.supplier_id,
          supplierName: listData.supplierName,
          minDiscount: listData.min_discount || 30,
          maxDiscount: listData.max_discount || 80,
          minReservationValue: listData.min_reservation_value || 5000,
          maxReservationValue: listData.max_reservation_value || 30000,
        };
        
        groupedLists.get(listId)!.products.push(productData);
      });
      
      const lists = Array.from(groupedLists.values());
      console.log(`Loaded ${lists.length} product lists with ${products.length} total products`);
      console.log('Lists:', lists.map(l => ({ id: l.listId, name: l.listName, productCount: l.products.length })));
      setProductLists(lists);
      setLoading(false);
    } catch (error) {
      console.error('Exception loading products:', error);
      setError(`Errore imprevisto: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      setLoading(false);
    }
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

  useEffect(() => {
    loadProducts();
    loadUserInterests();
  }, [loadProducts, loadUserInterests]);

  const currentList = productLists[currentListIndex];
  const totalProductsInList = currentList?.products.length || 0;
  const interestedInCurrentList = currentList?.products.filter(p => interestedProducts.has(p.id)).length || 0;

  // Load banner state from AsyncStorage
  useEffect(() => {
    const loadBannerState = async () => {
      if (!currentList) return;
      
      const sessionKey = `banner_dismissed_${currentList.listId}`;
      setBannerSessionKey(sessionKey);
      
      try {
        const dismissed = await AsyncStorage.getItem(sessionKey);
        setBannerDismissed(dismissed === 'true');
      } catch (error) {
        console.error('Error loading banner state:', error);
      }
    };
    
    loadBannerState();
  }, [currentList?.listId]);

  // Reset banner when navigating to a new list
  useEffect(() => {
    setBannerDismissed(false);
  }, [currentListIndex]);

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: totalProductsInList > 0 ? (currentProductIndex + 1) / totalProductsInList : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentProductIndex, totalProductsInList, progressAnim]);

  const handleInterest = async (productId: string) => {
    if (!user || !user.pickupPointId) {
      Alert.alert('Errore', 'Devi essere registrato con un punto di ritiro per mostrare interesse');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const isCurrentlyInterested = interestedProducts.has(productId);
    const product = currentList?.products.find(p => p.id === productId);
    
    if (!product) return;

    try {
      if (isCurrentlyInterested) {
        // Remove interest
        const { error } = await supabase
          .from('user_interests')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (error) {
          console.error('Error removing interest:', error);
          Alert.alert('Errore', 'Impossibile rimuovere l\'interesse');
          return;
        }

        setInterestedProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        console.log('Interest removed for product:', productId);
      } else {
        // Add interest
        const { error } = await supabase
          .from('user_interests')
          .insert({
            user_id: user.id,
            product_id: productId,
            supplier_list_id: product.listId,
            pickup_point_id: user.pickupPointId,
          });

        if (error) {
          console.error('Error adding interest:', error);
          Alert.alert('Errore', 'Impossibile aggiungere l\'interesse');
          return;
        }

        setInterestedProducts(prev => {
          const newSet = new Set(prev);
          newSet.add(productId);
          return newSet;
        });
        console.log('Interest added for product:', productId);
      }
    } catch (error) {
      console.error('Exception handling interest:', error);
      Alert.alert('Errore', 'Errore imprevisto');
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
    // TODO: Navigate to notifications screen or show notifications modal
    Alert.alert('Notifiche', 'Funzionalità notifiche in arrivo!');
    console.log('Notifications button pressed');
  };

  const handleNextList = () => {
    if (currentListIndex < productLists.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const nextIndex = currentListIndex + 1;
      setCurrentListIndex(nextIndex);
      setCurrentProductIndex(0);
      
      // Scroll to the next list
      listFlatListRef.current?.scrollToIndex({ 
        index: nextIndex, 
        animated: true,
        viewPosition: 0
      });
      
      console.log(`Navigating to next list (${nextIndex + 1}/${productLists.length}):`, productLists[nextIndex].listName);
    }
  };

  const handlePreviousList = () => {
    if (currentListIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const prevIndex = currentListIndex - 1;
      setCurrentListIndex(prevIndex);
      setCurrentProductIndex(0);
      
      // Scroll to the previous list
      listFlatListRef.current?.scrollToIndex({ 
        index: prevIndex, 
        animated: true,
        viewPosition: 0
      });
      
      console.log(`Navigating to previous list (${prevIndex + 1}/${productLists.length}):`, productLists[prevIndex].listName);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBannerDismissed(true);
    
    // Save to AsyncStorage for this session
    if (bannerSessionKey) {
      try {
        await AsyncStorage.setItem(bannerSessionKey, 'true');
        console.log('Banner dismissed for list:', currentList?.listId);
      } catch (error) {
        console.error('Error saving banner state:', error);
      }
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
          {/* Top Buttons - Logout (Left) and Notifications (Right) */}
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
            I fornitori non hanno ancora caricato articoli.
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
            // Retry after a delay
            setTimeout(() => {
              listFlatListRef.current?.scrollToIndex({ 
                index: info.index, 
                animated: false,
                viewPosition: 0
              });
            }, 100);
          }}
        />
        
        {/* Top Buttons - Logout (Left) and Notifications (Right) with Transparent Background */}
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
        </Pressable>
        
        {/* TikTok-style Right Side Icons */}
        <View style={styles.rightSideIcons}>
          {/* Pickup Point */}
          <View style={styles.iconButton}>
            <View style={styles.iconCircle}>
              <IconSymbol 
                ios_icon_name="mappin.circle.fill" 
                android_material_icon_name="location_on" 
                size={20} 
                color={colors.text} 
              />
            </View>
            <Text style={styles.iconLabel} numberOfLines={1}>
              {user?.pickupPoint || 'N/A'}
            </Text>
          </View>

          {/* List Name */}
          <View style={styles.iconButton}>
            <View style={styles.iconCircle}>
              <IconSymbol 
                ios_icon_name="list.bullet.rectangle" 
                android_material_icon_name="list" 
                size={20} 
                color={colors.text} 
              />
            </View>
            <Text style={styles.iconLabel} numberOfLines={2}>
              {currentList?.listName}
            </Text>
          </View>

          {/* Progress Bar with Product Counter */}
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

          {/* List Counter */}
          <View style={styles.iconButton}>
            <View style={styles.iconCircle}>
              <Text style={styles.listCounterIcon}>
                {currentListIndex + 1}/{productLists.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Compact List Navigation Buttons - Small circular buttons on sides */}
        {currentListIndex > 0 && (
          <Pressable 
            style={styles.navButtonLeft}
            onPress={handlePreviousList}
          >
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="chevron_left" size={20} color="#000" />
          </Pressable>
        )}

        {currentListIndex < productLists.length - 1 && (
          <Pressable 
            style={styles.navButtonRight}
            onPress={handleNextList}
          >
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color="#000" />
          </Pressable>
        )}

        {/* Hint Message with Close Button */}
        {interestedInCurrentList > 1 && !bannerDismissed && (
          <View style={styles.hintContainer}>
            <View style={styles.hintCard}>
              <IconSymbol ios_icon_name="lightbulb.fill" android_material_icon_name="lightbulb" size={18} color="#FFB800" />
              <Text style={styles.hintText}>
                Ottimo! Più articoli della stessa lista aumentano le probabilità di attivare un drop!
              </Text>
              <Pressable onPress={handleDismissBanner} style={styles.closeBannerButton}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color="#8B6914" />
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
  // Top Buttons with Transparent Background
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
  // TikTok-style Right Side Icons
  rightSideIcons: {
    position: 'absolute',
    right: 12,
    top: '20%',
    bottom: '25%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 20,
    zIndex: 10,
  },
  iconButton: {
    alignItems: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    maxWidth: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  listCounterIcon: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
  },
  // Progress Circle
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleBackground: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
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
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 14,
  },
  progressTotal: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    lineHeight: 10,
  },
  navButtonLeft: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  navButtonRight: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
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
});
