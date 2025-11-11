
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
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const drop = mockDrops.find(d => d.id === dropId);

  // Complex animation sequence for the share button
  useEffect(() => {
    // Pulsing scale animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // Glowing shadow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );

    // Subtle bounce animation
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    // Shimmer effect
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    glowAnimation.start();
    bounceAnimation.start();
    shimmerAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
      bounceAnimation.stop();
      shimmerAnimation.stop();
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(scaleAnim, {
      toValue: 0.94,
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

  // Interpolate shimmer position
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  // Interpolate glow opacity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
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
        
        {/* Enhanced WhatsApp Share Button with Multiple Animations */}
        <View style={styles.shareButtonContainer}>
          <Animated.View 
            style={[
              styles.shareButtonWrapper,
              {
                transform: [
                  { scale: Animated.multiply(pulseAnim, scaleAnim) },
                  { translateY: bounceAnim },
                ],
              },
            ]}
          >
            {/* Animated Glow Effect */}
            <Animated.View 
              style={[
                styles.glowEffect,
                {
                  opacity: glowOpacity,
                },
              ]}
            />
            
            <Pressable 
              onPress={handleShareWhatsApp}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={styles.whatsappButtonPressable}
            >
              <LinearGradient
                colors={['#25D366', '#20BA5A', '#128C7E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.whatsappButton}
              >
                {/* Shimmer overlay effect */}
                <Animated.View
                  style={[
                    styles.shimmerOverlay,
                    {
                      transform: [{ translateX: shimmerTranslate }],
                    },
                  ]}
                />
                
                {/* Badge with incentive */}
                <View style={styles.incentiveBadge}>
                  <Text style={styles.incentiveBadgeText}>🎁 AUMENTA LO SCONTO</Text>
                </View>
                
                <View style={styles.buttonContent}>
                  <View style={styles.whatsappIconContainer}>
                    <Text style={styles.whatsappIcon}>💬</Text>
                    <View style={styles.iconPulse} />
                  </View>
                  
                  <View style={styles.whatsappTextContainer}>
                    <Text style={styles.whatsappButtonTitle}>
                      Invita Amici e Parenti
                    </Text>
                    <Text style={styles.whatsappButtonSubtext}>
                      🚀 Più condividi, più risparmi!
                    </Text>
                    <View style={styles.discountIndicator}>
                      <Text style={styles.discountIndicatorText}>
                        {drop.currentDiscount}% → {drop.maxDiscount}%
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.whatsappArrowContainer}>
                    <IconSymbol name="arrow.right.circle.fill" size={32} color="#fff" />
                  </View>
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
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  glowEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: '#25D366',
    borderRadius: 24,
    opacity: 0.4,
  },
  whatsappButtonPressable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  whatsappButton: {
    position: 'relative',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  incentiveBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  incentiveBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  whatsappIconContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  whatsappIcon: {
    fontSize: 32,
  },
  iconPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  whatsappTextContainer: {
    flex: 1,
    gap: 4,
  },
  whatsappButtonTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  whatsappButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  discountIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  discountIndicatorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  whatsappArrowContainer: {
    opacity: 0.95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
