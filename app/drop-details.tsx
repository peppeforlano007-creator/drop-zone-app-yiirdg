
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable, Alert, Linking, Animated } from 'react-native';
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
  
  // Animation values for share button
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const drop = mockDrops.find(d => d.id === dropId);

  // Subtle bounce animation for the share button
  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -4,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    bounceAnimation.start();

    return () => {
      bounceAnimation.stop();
    };
  }, []);

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
          <IconSymbol name="exclamationmark.triangle" size={64} color={colors.text} />
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

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleShareWhatsApp = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Create a shareable message
    const message = `🎉 Guarda questo Drop su DROPMARKET!\n\n` +
      `📦 ${drop.supplierName}\n` +
      `📍 Punto di ritiro: ${drop.pickupPoint}\n` +
      `💰 Sconto attuale: ${drop.currentDiscount}%\n` +
      `🎯 Sconto massimo: ${drop.maxDiscount}%\n` +
      `🛍️ ${drop.products.length} prodotti disponibili\n\n` +
      `Più persone prenotano con carta, più lo sconto aumenta! 🚀\n\n` +
      `Unisciti al drop: dropmarket://drop/${dropId}`;

    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        console.log('WhatsApp opened successfully');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(
          'WhatsApp non disponibile',
          'WhatsApp non è installato sul tuo dispositivo. Installa WhatsApp per condividere questo drop.',
          [{ text: 'OK' }]
        );
        console.log('WhatsApp not available');
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Errore',
        'Si è verificato un errore durante l\'apertura di WhatsApp. Riprova più tardi.',
        [{ text: 'OK' }]
      );
    }
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
        
        {/* Minimal WhatsApp Share Button */}
        <View style={styles.shareButtonContainer}>
          <Animated.View 
            style={[
              styles.shareButtonWrapper,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateY: bounceAnim },
                ],
              },
            ]}
          >
            <Pressable 
              onPress={handleShareWhatsApp}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={styles.whatsappButton}
            >
              <View style={styles.buttonContent}>
                <View style={styles.iconContainer}>
                  <IconSymbol name="square.and.arrow.up" size={16} color="#1E88E5" />
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={styles.buttonTitle}>Invita Amici e Parenti</Text>
                  <Text style={styles.buttonSubtext}>
                    Più condividi, più risparmi
                  </Text>
                </View>
                
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>
                    {drop.currentDiscount}% → {drop.maxDiscount}%
                  </Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  shareButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'transparent',
  },
  shareButtonWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  whatsappButton: {
    backgroundColor: '#B3E5FC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#81D4FA',
    overflow: 'hidden',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#81D4FA',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  buttonTitle: {
    color: '#0D47A1',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  buttonSubtext: {
    color: '#1565C0',
    fontSize: 11,
    fontWeight: '500',
  },
  discountBadge: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
