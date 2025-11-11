
import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Platform, Text, Pressable, Alert, Animated } from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import ProductCard from '@/components/ProductCard';
import { mockProducts, mockUser } from '@/data/mockData';
import { Product } from '@/types/Product';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
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
  const { logout } = useAuth();
  const [interestedProducts, setInterestedProducts] = useState<Set<string>>(new Set());
  const [currentListIndex, setCurrentListIndex] = useState(0);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const listFlatListRef = useRef<FlatList>(null);
  const productFlatListRef = useRef<FlatList>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Group products by list
  const productLists: ProductList[] = React.useMemo(() => {
    const listsMap = new Map<string, ProductList>();
    
    mockProducts.forEach(product => {
      if (!listsMap.has(product.listId)) {
        listsMap.set(product.listId, {
          listId: product.listId,
          supplierName: product.supplierName,
          products: [],
          minDiscount: product.minDiscount,
          maxDiscount: product.maxDiscount,
          minReservationValue: product.minReservationValue,
          maxReservationValue: product.maxReservationValue,
        });
      }
      listsMap.get(product.listId)!.products.push(product);
    });
    
    return Array.from(listsMap.values());
  }, []);

  const currentList = productLists[currentListIndex];
  const totalProductsInList = currentList?.products.length || 0;
  const interestedInCurrentList = currentList?.products.filter(p => interestedProducts.has(p.id)).length || 0;

  React.useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: totalProductsInList > 0 ? (currentProductIndex + 1) / totalProductsInList : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentProductIndex, totalProductsInList]);

  const handleInterest = (productId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setInterestedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
    console.log('User interested in product:', productId);
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
            <IconSymbol name="mappin.circle.fill" size={16} color={colors.text} />
            <Text style={styles.pickupPointText}>{mockUser.pickupPoint}</Text>
          </View>
          
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* List Navigation Info */}
        <View style={styles.listInfoContainer}>
          <View style={styles.listInfoCard}>
            <View style={styles.listInfoHeader}>
              <View style={styles.supplierBadge}>
                <IconSymbol name="building.2" size={14} color={colors.text} />
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
                <IconSymbol name="heart.fill" size={14} color="#FF3B30" />
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

        {/* List Navigation Buttons - Moved higher to avoid overlap */}
        <View style={styles.navigationContainer}>
          {currentListIndex > 0 && (
            <Pressable 
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={handlePreviousList}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
              <Text style={styles.navButtonText}>Lista Precedente</Text>
            </Pressable>
          )}

          {currentListIndex < productLists.length - 1 && (
            <Pressable 
              style={[styles.navButton, styles.navButtonRight]}
              onPress={handleNextList}
            >
              <Text style={styles.navButtonText}>Lista Successiva</Text>
              <IconSymbol name="chevron.right" size={24} color={colors.text} />
            </Pressable>
          )}
        </View>

        {/* Hint Message */}
        {interestedInCurrentList > 1 && (
          <View style={styles.hintContainer}>
            <View style={styles.hintCard}>
              <IconSymbol name="lightbulb.fill" size={18} color="#FFB800" />
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
  navigationContainer: {
    position: 'absolute',
    bottom: 240,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  navButtonLeft: {
    marginRight: 'auto',
  },
  navButtonRight: {
    marginLeft: 'auto',
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
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
