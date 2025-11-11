
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable, Alert } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import ProductCard from '@/components/ProductCard';
import { mockDrops } from '@/data/mockData';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DropDetailsScreen() {
  const { dropId } = useLocalSearchParams();
  const [bookedProducts, setBookedProducts] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);

  const drop = mockDrops.find(d => d.id === dropId);

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
          <IconSymbol name="exclamationmark.triangle" size={64} color={colors.error} />
          <Text style={styles.errorText}>Drop non trovato</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleBook = (productId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBookedProducts(prev => {
      const newSet = new Set(prev);
      newSet.add(productId);
      return newSet;
    });
    Alert.alert(
      'Prenotazione Confermata!',
      'Il prodotto è stato prenotato. Verrai addebitato alla fine del drop con lo sconto finale.',
      [{ text: 'OK' }]
    );
    console.log('Product booked:', productId);
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Condividi Drop',
      'Condividi questo drop con amici e parenti per aumentare lo sconto!',
      [{ text: 'OK' }]
    );
    console.log('Share drop:', dropId);
  };

  const renderProduct = ({ item }: { item: typeof drop.products[0] }) => (
    <ProductCard
      product={item}
      isInDrop={true}
      currentDiscount={drop.currentDiscount}
      onBook={handleBook}
      isInterested={bookedProducts.has(item.id)}
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
          title: drop.supplierName,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable onPress={handleShare} style={styles.shareButton}>
              <IconSymbol name="square.and.arrow.up" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={drop.products}
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  shareButton: {
    padding: 8,
    marginRight: 8,
  },
});
