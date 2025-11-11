
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable, Alert, Linking, Animated } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import ProductCard from '@/components/ProductCard';
import { mockDrops } from '@/data/mockData';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DropDetailsScreen() {
  const { dropId } = useLocalSearchParams();
  const [bookedProducts, setBookedProducts] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);
  
  // Animation values for WhatsApp button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const drop = mockDrops.find(d => d.id === dropId);

  // Pulsing animation for WhatsApp button
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
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
        
        {/* Enhanced WhatsApp Share Button */}
        <View style={styles.shareButtonContainer}>
          <Animated.View 
            style={[
              styles.shareButtonWrapper,
              {
                transform: [{ scale: Animated.multiply(pulseAnim, scaleAnim) }],
              },
            ]}
          >
            <Pressable 
              onPress={handleShareWhatsApp}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={styles.whatsappButtonPressable}
            >
              <LinearGradient
                colors={['#25D366', '#20BA5A', '#1DA851']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.whatsappButton}
              >
                <View style={styles.whatsappIconContainer}>
                  <Text style={styles.whatsappIcon}>💬</Text>
                </View>
                <View style={styles.whatsappTextContainer}>
                  <Text style={styles.whatsappButtonText}>Invita amici su WhatsApp</Text>
                  <Text style={styles.whatsappButtonSubtext}>
                    🚀 Più prenotazioni = più sconto!
                  </Text>
                </View>
                <View style={styles.whatsappArrow}>
                  <IconSymbol name="arrow.right.circle.fill" size={28} color="#fff" />
                </View>
              </LinearGradient>
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
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  whatsappButtonPressable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  whatsappIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappIcon: {
    fontSize: 28,
  },
  whatsappTextContainer: {
    flex: 1,
    gap: 2,
  },
  whatsappButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  whatsappButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  whatsappArrow: {
    opacity: 0.9,
  },
});
