
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Alert, ActivityIndicator, Animated, ScrollView } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Product } from '@/types/Product';
import { usePayment } from '@/contexts/PaymentContext';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ImageGallery from './ImageGallery';
import CachedImage from './CachedImage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EnhancedProductCardProps {
  product: Product;
  isInDrop?: boolean;
  currentDiscount?: number;
  onInterest?: (productId: string) => void;
  onBook?: (productId: string) => void;
  isInterested?: boolean;
}

export default function EnhancedProductCard({
  product,
  isInDrop = false,
  currentDiscount,
  onInterest,
  onBook,
  isInterested = false,
}: EnhancedProductCardProps) {
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const { getDefaultPaymentMethod, authorizePayment } = usePayment();
  
  // Enhanced animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const animateEntrance = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    animateEntrance();
  }, [animateEntrance]);

  const handleImagePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGalleryVisible(true);
    console.log('Opening image gallery for product:', product.id);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    if (isInDrop && onBook) {
      const defaultPaymentMethod = getDefaultPaymentMethod();
      
      if (!defaultPaymentMethod) {
        Alert.alert(
          'Metodo di Pagamento Richiesto',
          'Devi aggiungere un metodo di pagamento prima di prenotare.',
          [
            { text: 'Annulla', style: 'cancel' },
            {
              text: 'Aggiungi Carta',
              onPress: () => router.push('/add-payment-method'),
            },
          ]
        );
        return;
      }

      const discount = currentDiscount || product.minDiscount;
      const discountedPrice = product.originalPrice * (1 - discount / 100);

      Alert.alert(
        'Conferma Prenotazione',
        `Vuoi prenotare ${product.name}?\n\nPrezzo attuale: €${discountedPrice.toFixed(2)} (-${discount}%)\n\nBlocchiamo €${product.originalPrice.toFixed(2)} sulla tua carta ${defaultPaymentMethod.brand} •••• ${defaultPaymentMethod.last4}.\n\nAlla fine del drop, addebiteremo solo l'importo finale con lo sconto raggiunto.`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Prenota',
            onPress: async () => {
              setIsProcessing(true);
              try {
                const authId = await authorizePayment(
                  product.id,
                  product.originalPrice,
                  defaultPaymentMethod.id
                );
                console.log('Payment authorized:', authId);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onBook(product.id);
              } catch (error) {
                console.error('Payment authorization failed:', error);
                Alert.alert(
                  'Errore',
                  'Non è stato possibile autorizzare il pagamento. Riprova.'
                );
              } finally {
                setIsProcessing(false);
              }
            },
          },
        ]
      );
    } else if (onInterest) {
      onInterest(product.id);
    }
  };

  const handleSizeSelect = (size: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSize(size === selectedSize ? null : size);
    console.log('Selected size:', size);
  };

  const handleColorSelect = (color: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColor(color === selectedColor ? null : color);
    console.log('Selected color:', color);
  };

  const discount = currentDiscount || product.minDiscount;
  const discountedPrice = product.originalPrice * (1 - discount / 100);
  const hasMultipleImages = product.imageUrls && product.imageUrls.length > 1;

  // Helper functions to check if data exists
  const hasDescription = product.description && product.description.trim().length > 0;
  const hasSizes = product.availableSizes && product.availableSizes.length > 0;
  const hasColors = product.availableColors && product.availableColors.length > 0;
  const hasCondition = product.condition && product.condition.trim().length > 0;
  const hasStock = product.stock !== undefined && product.stock !== null;

  const getConditionColor = (condition?: string) => {
    switch (condition) {
      case 'nuovo':
        return '#4CAF50';
      case 'reso da cliente':
        return '#FF9800';
      case 'packaging rovinato':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  const getConditionIcon = (condition?: string) => {
    switch (condition) {
      case 'nuovo':
        return { ios: 'sparkles', android: 'star' };
      case 'reso da cliente':
        return { ios: 'arrow.uturn.backward', android: 'keyboard_return' };
      case 'packaging rovinato':
        return { ios: 'exclamationmark.triangle', android: 'warning' };
      default:
        return { ios: 'tag', android: 'label' };
    }
  };

  const conditionIcon = getConditionIcon(product.condition);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Image Section - Top 45% */}
      <Pressable 
        style={styles.imageWrapper}
        onPress={handleImagePress}
        activeOpacity={0.95}
      >
        <CachedImage
          uri={product.imageUrl}
          style={styles.image}
          resizeMode="cover"
        />

        {hasMultipleImages && (
          <View style={styles.imageIndicator}>
            <IconSymbol 
              ios_icon_name="photo.stack" 
              android_material_icon_name="collections" 
              size={16} 
              color="#FFFFFF" 
            />
            <Text style={styles.imageCount}>{product.imageUrls.length}</Text>
          </View>
        )}

        {/* Top badges overlay on image */}
        <View style={styles.topBadgesContainer}>
          <View style={styles.supplierBadge}>
            <Text style={styles.supplierText}>{product.supplierName}</Text>
          </View>
          {isInDrop && currentDiscount && (
            <Animated.View 
              style={[
                styles.dropBadge,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Text style={styles.dropBadgeText}>Drop -{currentDiscount}%</Text>
            </Animated.View>
          )}
        </View>
      </Pressable>

      {/* Content Section - Bottom 55% */}
      <View style={styles.contentWrapper}>
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEventThrottle={16}
        >
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            {/* Product Name */}
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>

            {/* Price Row */}
            <View style={styles.priceRow}>
              <View style={styles.priceInfo}>
                <Text style={styles.discountedPrice}>€{discountedPrice.toFixed(2)}</Text>
                <Text style={styles.originalPrice}>€{product.originalPrice.toFixed(2)}</Text>
              </View>
              <Animated.View 
                style={[
                  styles.discountBadge,
                  {
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                <Text style={styles.discountText}>-{discount}%</Text>
              </Animated.View>
            </View>

            {/* Product Details Row - Only show if there's data */}
            {(hasCondition || hasSizes || hasColors) && (
              <View style={styles.detailsRow}>
                {hasCondition && (
                  <View style={[
                    styles.conditionBadge,
                    { backgroundColor: getConditionColor(product.condition) + '20' }
                  ]}>
                    <IconSymbol 
                      ios_icon_name={conditionIcon.ios} 
                      android_material_icon_name={conditionIcon.android} 
                      size={12} 
                      color={getConditionColor(product.condition)} 
                    />
                    <Text style={[
                      styles.conditionText,
                      { color: getConditionColor(product.condition) }
                    ]}>
                      {product.condition}
                    </Text>
                  </View>
                )}
                
                {hasSizes && (
                  <View style={styles.detailBadge}>
                    <IconSymbol 
                      ios_icon_name="ruler" 
                      android_material_icon_name="straighten" 
                      size={12} 
                      color={colors.textSecondary} 
                    />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {Array.isArray(product.availableSizes) 
                        ? product.availableSizes.slice(0, 3).join(', ') 
                        : product.availableSizes}
                    </Text>
                  </View>
                )}
                
                {hasColors && (
                  <View style={styles.detailBadge}>
                    <IconSymbol 
                      ios_icon_name="paintpalette" 
                      android_material_icon_name="palette" 
                      size={12} 
                      color={colors.textSecondary} 
                    />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {Array.isArray(product.availableColors) 
                        ? product.availableColors.slice(0, 2).join(', ') 
                        : product.availableColors}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Description if available */}
            {hasDescription && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Descrizione</Text>
                <Text style={styles.descriptionText} numberOfLines={3}>
                  {product.description}
                </Text>
              </View>
            )}

            {/* Stock Info - Only show if stock data exists - NO MARGIN BOTTOM */}
            {hasStock && (
              <View style={styles.stockContainer}>
                <IconSymbol 
                  ios_icon_name="cube.box" 
                  android_material_icon_name="inventory_2" 
                  size={14} 
                  color={product.stock > 10 ? colors.success : colors.warning} 
                />
                <Text style={[
                  styles.stockText,
                  { color: product.stock > 10 ? colors.success : colors.warning }
                ]}>
                  {product.stock > 10 ? 'Disponibile' : `Solo ${product.stock} disponibili`}
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Fixed Action Button at Bottom - Outside ScrollView */}
        {isInDrop ? (
          <View style={styles.fixedButtonContainer}>
            <Animated.View 
              style={[
                styles.bookButtonWrapper,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isProcessing}
                style={styles.bookButton}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#333" size="small" />
                ) : (
                  <React.Fragment>
                    <View style={styles.bookButtonIconContainer}>
                      <IconSymbol 
                        ios_icon_name="creditcard.fill" 
                        android_material_icon_name="credit_card" 
                        size={22} 
                        color="#333" 
                      />
                    </View>
                    <View style={styles.bookButtonTextContainer}>
                      <Text style={styles.bookButtonTitle}>PRENOTA CON CARTA</Text>
                      <Text style={styles.bookButtonSubtitle}>
                        Blocco temporaneo • Addebito finale
                      </Text>
                    </View>
                    <View style={styles.bookButtonArrow}>
                      <IconSymbol 
                        ios_icon_name="chevron.right" 
                        android_material_icon_name="chevron_right" 
                        size={22} 
                        color="#333" 
                      />
                    </View>
                  </React.Fragment>
                )}
              </Pressable>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.fixedButtonContainer}>
            <Pressable
              style={[
                styles.actionButton,
                isInterested && styles.interestedButton,
                isProcessing && styles.actionButtonDisabled,
              ]}
              onPress={handlePress}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.actionButtonText}>
                  {isInterested
                    ? 'INTERESSATO ✓'
                    : 'VORRÒ PARTECIPARE AL DROP'}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <ImageGallery
        images={product.imageUrls || [product.imageUrl]}
        visible={galleryVisible}
        onClose={() => setGalleryVisible(false)}
        initialIndex={0}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: colors.background,
  },
  imageWrapper: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.45,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageIndicator: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  imageCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topBadgesContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supplierBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  supplierText: {
    color: '#333',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dropBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dropBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  contentWrapper: {
    height: SCREEN_HEIGHT * 0.55,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 0,
  },
  content: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  productName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 26,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  originalPrice: {
    fontSize: 16,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 0.5,
  },
  discountedPrice: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionContainer: {
    gap: 4,
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 0,
    paddingBottom: 0,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
    zIndex: 1000,
  },
  bookButtonWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#333',
  },
  bookButtonIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bookButtonTextContainer: {
    flex: 1,
    gap: 2,
  },
  bookButtonTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bookButtonSubtitle: {
    color: '#666',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  bookButtonArrow: {
    opacity: 0.8,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestedButton: {
    backgroundColor: colors.secondary,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
