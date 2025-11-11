
import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Platform, Text } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import ProductCard from '@/components/ProductCard';
import { mockProducts, mockUser } from '@/data/mockData';
import { Product } from '@/types/Product';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const [interestedProducts, setInterestedProducts] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);

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

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onInterest={handleInterest}
      isInterested={interestedProducts.has(item.id)}
    />
  );

  const getItemLayout = (_: any, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
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
          ref={flatListRef}
          data={mockProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={getItemLayout}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
        />
        
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>{mockUser.pickupPoint}</Text>
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
  overlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  overlayText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
