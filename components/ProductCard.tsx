
import React, { useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions, Alert, ActivityIndicator, Animated } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Product } from '@/types/Product';
import { usePayment } from '@/contexts/PaymentContext';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ImageGallery from './ImageGallery';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ProductCardProps {
  product: Product;
  isInDrop?: boolean;
  currentDiscount?: number;
  onInterest?: (productId: string) => void;
  onBook?: (productId: string) => void;
  isInterested?: boolean;
}

export default function ProductCard({
  product,
  isInDrop = false,
  currentDiscount,
  onInterest,
  onBook,
  isInterested = false,
}: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const { getDefaultPaymentMethod, authorizePayment } = usePayment();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Safe value extraction with defaults
  const originalPrice = product.originalPrice ?? 0;
  const minDiscount = product.minDiscount ?? 0;
  const discount = currentDiscount ?? minDiscount;
  const discountedPrice = originalPrice * (1 - discount / 100);

  // Safely construct image URLs array
  const imageUrls = React.useMemo(() => {
    const urls: string[] = [];
    
    // Add main image if it exists
    if (product.imageUrl) {
      urls.push(product.imageUrl);
    }
    
    // Add additional images if they exist and are an array
    if (product.imageUrls && Array.isArray(product.imageUrls)) {
      // Filter out the main image URL to avoid duplicates
      const additionalUrls = product.imageUrls.filter(url => url && url !== product.imageUrl);
      urls.push(...additionalUrls);
    }
    
    return urls.filter(Boolean); // Remove any null/undefined values
  }, [product.imageUrl, product.imageUrls]);

  const hasMultipleImages = imageUrls.length > 1;

  const handleImagePress = () => {
    if (imageUrls.length === 0) {
      console.log('No images available for product:', product.id);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGalleryVisible(true);
    console.log('Opening image gallery for product:', product.id, 'with', imageUrls.length, 'images');
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

      Alert.alert(
        'Conferma Prenotazione',
        `Vuoi prenotare ${product.name}?\n\nPrezzo attuale: €${discountedPrice.toFixed(2)} (-${discount.toFixed(1)}%)\n\nBlocchiamo €${originalPrice.toFixed(2)} sulla tua carta ${defaultPaymentMethod.brand} •••• ${defaultPaymentMethod.last4}.\n\nAlla fine del drop, addebiteremo solo l'importo finale con lo sconto raggiunto.`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Prenota',
            onPress: async () => {
              setIsProcessing(true);
              try {
                const authId = await authorizePayment(
                  product.id,
                  originalPrice,
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

  const isFashionItem = product.category === 'Fashion';

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

  // Get the main image URL (first in the array or fallback)
  const mainImageUrl = imageUrls[0] || '';

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.imageWrapper}
        onPress={handleImagePress}
        activeOpacity={0.95}
      >
        {!imageError && mainImageUrl ? (
          <Image
            source={{ uri: mainImageUrl }}
            style={styles.image}
            resizeMode="contain"
            onLoadStart={() => {
              setImageLoaded(false);
              setImageError(false);
            }}
            onLoad={() => {
              setImageLoaded(true);
              setImageError(false);
              console.log('Image loaded successfully:', mainImageUrl);
            }}
            onError={(error) => {
              console.error('Image load error for product:', product.id, 'URL:', mainImageUrl, 'Error:', error.nativeEvent.error);
              setImageError(true);
              setImageLoaded(false);
            }}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <IconSymbol 
              ios_icon_name="photo" 
              android_material_icon_name="broken_image" 
              size={100} 
              color={colors.textTertiary} 
            />
            <Text style={styles.imageErrorText}>Immagine non disponibile</Text>
          </View>
        )}
        
        {!imageLoaded && !imageError && mainImageUrl && (
          <View style={styles.imageLoadingOverlay}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        )}

        {hasMultipleImages && (
          <View style={styles.imageIndicator}>
            <IconSymbol 
              ios_icon_name="photo.stack" 
              android_material_icon_name="collections" 
              size={20} 
              color={colors.background} 
            />
            <Text style={styles.imageCount}>{imageUrls.length}</Text>
          </View>
        )}

        {/* Top badges overlay on image */}
        <View style={styles.topBadgesContainer}>
          {isInDrop && currentDiscount && (
            <View style={styles.dropBadge}>
              <Text style={styles.dropBadgeText}>Drop -{currentDiscount.toFixed(1)}%</Text>
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.productName} numberOfLines={1}>{product.name ?? 'Prodotto'}</Text>

          {/* Product Details Row: Sizes, Colors, and Condition - Compact */}
          {(product.sizes || product.colors || product.condition) && (
            <View style={styles.detailsRow}>
              {/* Sizes */}
              {product.sizes && product.sizes.length > 0 && (
                <View style={styles.detailBadge}>
                  <IconSymbol 
                    ios_icon_name="ruler" 
                    android_material_icon_name="straighten" 
                    size={10} 
                    color={colors.textSecondary} 
                  />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {Array.isArray(product.sizes) 
                      ? product.sizes.slice(0, 3).join(', ') 
                      : product.sizes}
                  </Text>
                </View>
              )}
              
              {/* Colors */}
              {product.colors && product.colors.length > 0 && (
                <View style={styles.detailBadge}>
                  <IconSymbol 
                    ios_icon_name="paintpalette" 
                    android_material_icon_name="palette" 
                    size={10} 
                    color={colors.textSecondary} 
                  />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {Array.isArray(product.colors) 
                      ? product.colors.slice(0, 2).join(', ') 
                      : product.colors}
                  </Text>
                </View>
              )}
              
              {/* Condition */}
              {product.condition && (
                <View style={[
                  styles.conditionBadge,
                  { backgroundColor: getConditionColor(product.condition) + '20' }
                ]}>
                  <IconSymbol 
                    ios_icon_name={conditionIcon.ios} 
                    android_material_icon_name={conditionIcon.android} 
                    size={10} 
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
            </View>
          )}

          <View style={styles.priceRow}>
            <View style={styles.priceInfo}>
              <Text style={styles.discountedPrice}>€{discountedPrice.toFixed(2)}</Text>
              <Text style={styles.originalPrice}>€{originalPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount.toFixed(0)}%</Text>
            </View>
          </View>

          {/* Size and Color Selection for Fashion Items - Compact */}
          {isFashionItem && (product.availableSizes || product.availableColors) && (
            <View style={styles.selectionContainer}>
              {/* Size Selection */}
              {product.availableSizes && product.availableSizes.length > 0 && (
                <View style={styles.sizeColorSection}>
                  <View style={styles.sectionHeader}>
                    <IconSymbol 
                      ios_icon_name="ruler" 
                      android_material_icon_name="straighten" 
                      size={12} 
                      color={colors.textSecondary} 
                    />
                    <Text style={styles.sectionLabel}>Taglia</Text>
                  </View>
                  <View style={styles.optionsRow}>
                    {product.availableSizes.slice(0, 5).map((size, index) => (
                      <Pressable
                        key={index}
                        style={[
                          styles.sizeOption,
                          selectedSize === size && styles.sizeOptionSelected,
                        ]}
                        onPress={() => handleSizeSelect(size)}
                      >
                        <Text
                          style={[
                            styles.sizeOptionText,
                            selectedSize === size && styles.sizeOptionTextSelected,
                          ]}
                        >
                          {size}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Color Selection */}
              {product.availableColors && product.availableColors.length > 0 && (
                <View style={styles.sizeColorSection}>
                  <View style={styles.sectionHeader}>
                    <IconSymbol 
                      ios_icon_name="paintpalette" 
                      android_material_icon_name="palette" 
                      size={12} 
                      color={colors.textSecondary} 
                    />
                    <Text style={styles.sectionLabel}>Colore</Text>
                  </View>
                  <View style={styles.optionsRow}>
                    {product.availableColors.slice(0, 5).map((color, index) => (
                      <Pressable
                        key={index}
                        style={[
                          styles.colorOption,
                          selectedColor === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => handleColorSelect(color)}
                      >
                        <View
                          style={[
                            styles.colorCircle,
                            { backgroundColor: color },
                          ]}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Compact "PRENOTA CON CARTA" Button */}
          {isInDrop ? (
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
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
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
                        size={20} 
                        color="#333" 
                      />
                    </View>
                  </>
                )}
              </Pressable>
            </Animated.View>
          ) : (
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
          )}
        </View>
      </View>

      {imageUrls.length > 0 && (
        <ImageGallery
          images={imageUrls}
          visible={galleryVisible}
          onClose={() => setGalleryVisible(false)}
          initialIndex={0}
        />
      )}
    </View>
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
    height: '65%',
    position: 'absolute',
    top: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  imageErrorText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  imageIndicator: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  imageCount: {
    color: colors.background,
    fontSize: 13,
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
    letterSpacing: 0.8,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  productName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    maxWidth: 120,
  },
  detailText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  conditionText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  originalPrice: {
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.4,
  },
  discountedPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.8,
  },
  // Size and Color Selection Styles - Compact
  selectionContainer: {
    marginBottom: 10,
    gap: 8,
  },
  sizeColorSection: {
    gap: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  sizeOption: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sizeOptionSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  sizeOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  sizeOptionTextSelected: {
    color: colors.background,
  },
  colorOption: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.backgroundSecondary,
  },
  colorOptionSelected: {
    borderColor: colors.text,
  },
  colorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  // Compact "PRENOTA CON CARTA" button styles
  bookButtonWrapper: {
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
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
    borderWidth: 2,
    borderColor: '#333',
  },
  bookButtonIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  bookButtonArrow: {
    opacity: 0.8,
  },
  // Standard action button (for non-drop products)
  actionButton: {
    paddingVertical: 15,
    borderRadius: 6,
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
