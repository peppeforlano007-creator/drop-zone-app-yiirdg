
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Platform, Text, Pressable, Alert, Animated } from 'react-native';
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
  const listFlatListRef = useRef<FlatList>(null);
  const productFlatListRef = useRef<FlatList>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const loadProducts = useCallback(async () => {
    try {
      console.log('Loading products from database...');
      
      // First, get all active products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error loading products:', productsError);
        Alert.alert('Errore', 'Impossibile caricare i prodotti: ' + productsError.message);
        setLoading(false);
        return;
      }

      if (!products || products.length === 0) {
        console.log('No products found');
        setLoading(false);
        return;
      }

      console.log(`Found ${products.length} products`);

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
        Alert.alert('Errore', 'Impossibile caricare le liste fornitori');
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
            supplierName: listData.supplierName,
            products: [],
            minDiscount: listData.min_discount || 30,
            maxDiscount: listData.max_discount || 80,
            minReservationValue: listData.min_reservation_value || 5000,
            maxReservationValue: listData.max_reservation_value || 30000,
          });
        }
        
        const productData: Product = {
          id: product.id,
          name: product.name,
          description: product.description || '',
          imageUrl: product.image_url,
          additionalImages: product.additional_images || [],
          originalPrice: parseFloat(product.original_price),
          availableSizes: product.available_sizes || [],
          availableColors: product.available_colors || [],
          condition: product.condition as any,
          category: product.category,
          stock: product.stock,
          listId: listId,
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
      setProductLists(lists);
      setLoading(false);
    } catch (error) {
      console.error('Exception loading products:', error);
      Alert.alert('Errore', 'Errore imprevisto durante il caricamento');
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

  const handleNextList = () => {
    if (currentListIndex < productLists.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const nextIndex = currentListIndex + 1;
      setCurrentListIndex(nextIndex);
      setCurrentProductIndex(0);
      listFlatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      console.log('Navigating to next list:', productLists[nextIndex].listId);
    }
  };

  const handlePreviousList = () => {
    if (currentListIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const prevIndex = currentListIndex - 1;
      setCurrentListIndex(prevIndex);
      setCurrentProductIndex(0);
      listFlatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      console.log('Navigating to previous list:', productLists[prevIndex].listId);
    }
  };

  const handleProductScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / SCREEN_HEIGHT);
    if (index !== currentProductIndex && index >= 0 && index < totalProductsInList) {
      setCurrentProductIndex(index);
    }
  };

  const renderList = ({ item, index }: { item: ProductList; index: number }) => {
    return (
      <View style={styles.listContainer}>
        <FlatList
          ref={index === currentListIndex ? productFlatListRef : null}
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
          onScroll={index === currentListIndex ? handleProductScroll : undefined}
          scrollEventThrottle={16}
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
          <Text style={styles.loadingText}>Caricamento prodotti...</Text>
        </View>
      </>
    );
  }

  if (productLists.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <IconSymbol ios_icon_name="tray" android_material_icon_name="inbox" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Nessun prodotto disponibile</Text>
          <Text style={styles.emptyText}>
            I fornitori non hanno ancora caricato prodotti
          </Text>
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
        />
        
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.pickupPointBadge}>
            <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={16} color={colors.text} />
            <Text style={styles.pickupPointText}>{user?.pickupPoint || 'Nessun punto'}</Text>
          </View>
          
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <IconSymbol ios_icon_name="rectangle.portrait.and.arrow.right" android_material_icon_name="logout" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* List Navigation Info */}
        <View style={styles.listInfoContainer}>
          <View style={styles.listInfoCard}>
            <View style={styles.listInfoHeader}>
              <View style={styles.supplierBadge}>
                <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={14} color={colors.text} />
                <Text style={styles.supplierName}>{currentList?.supplierName}</Text>
              </View>
              <View style={styles.listCounter}>
                <Text style={styles.listCounterText}>
                  Lista {currentListIndex + 1}/{productLists.length}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {currentProductIndex + 1}/{totalProductsInList}
              </Text>
            </View>

            {/* Interest Stats */}
            {interestedInCurrentList > 0 && (
              <View style={styles.interestStats}>
                <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={14} color="#FF3B30" />
                <Text style={styles.interestStatsText}>
                  {interestedInCurrentList} {interestedInCurrentList === 1 ? 'articolo interessato' : 'articoli interessati'} in questa lista
                </Text>
              </View>
            )}

            {/* Discount Range */}
            <View style={styles.discountRange}>
              <Text style={styles.discountRangeText}>
                Sconto: {currentList?.minDiscount}% → {currentList?.maxDiscount}%
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

        {/* Hint Message */}
        {interestedInCurrentList > 1 && (
          <View style={styles.hintContainer}>
            <View style={styles.hintCard}>
              <IconSymbol ios_icon_name="lightbulb.fill" android_material_icon_name="lightbulb" size={18} color="#FFB800" />
              <Text style={styles.hintText}>
                Ottimo! Più articoli della stessa lista aumentano le probabilità di attivare un drop!
              </Text>
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
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  pickupPointBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  pickupPointText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logoutButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listInfoContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  listInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  listInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  listCounter: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.text,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  interestStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  interestStatsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B30',
    letterSpacing: 0.2,
  },
  discountRange: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  discountRangeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
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
    right: 20,
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
});
