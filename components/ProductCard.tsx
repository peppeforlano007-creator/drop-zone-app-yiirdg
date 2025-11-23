
import React, { useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions, Alert, ActivityIndicator, Animated } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Product } from '@/types/Product';
import { usePayment } from '@/contexts/PaymentContext';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ImageGallery from './ImageGallery';
import { 
  getStandardizedImageUri, 
  getStandardizedImageUris, 
  isValidImageUrl,
  STANDARD_IMAGE_TEMPLATE,
  IMAGE_LOADING_CONFIG 
} from '@/utils/imageHelpers';

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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [descriptionHeight, setDescriptionHeight] = useState(0);
  const { getDefaultPaymentMethod, authorizePayment } = usePayment();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Safe value extraction with defaults
  const originalPrice = product.originalPrice ?? 0;
  const minDiscount = product.minDiscount ?? 0;
  const discount = currentDiscount ?? minDiscount;
  const discountedPrice = originalPrice * (1 - discount / 100);

  // Safely construct image URLs array with validation and standardization
  const imageUrls = React.useMemo(() => {
    const urls: string[] = [];
    
    // Add main image if it exists and is valid
    if (product.imageUrl && isValidImageUrl(product.imageUrl)) {
      urls.push(product.imageUrl);
    }
    
    // Add additional images if they exist, are an array, and are valid URLs
    if (product.imageUrls && Array.isArray(product.imageUrls)) {
      const validAdditionalUrls = product.imageUrls.filter(url => 
        url && 
        url !== product.imageUrl && 
        isValidImageUrl(url)
      );
      urls.push(...validAdditionalUrls);
    }
    
    // Apply standardization to all URLs
    return getStandardizedImageUris(urls, STANDARD_IMAGE_TEMPLATE);
  }, [product.imageUrl, product.imageUrls]);

  const hasMultipleImages = imageUrls.length > 1;
  const hasValidImage = imageUrls.length > 0;

  const handleImagePress = () => {
    if (!hasValidImage) {
      console.log('No valid images available for product:', product.id);
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
        `Vuoi prenotare ${product.name}?\n\nPrezzo attuale: €${discountedPrice.toFixed(2)} (-${Math.floor(discount)}%)\n\nBlocchiamo €${originalPrice.toFixed(2)} sulla tua carta ${defaultPaymentMethod.brand} •••• ${defaultPaymentMethod.last4}.\n\nAlla fine del drop, addebiteremo solo l'importo finale con lo sconto raggiunto.`,
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

  const handleDescriptionPress = () => {
    if (descriptionHeight > 17) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDescriptionExpanded(!descriptionExpanded);
    }
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

  // Get the main image URL (first in the array or empty string)
  const mainImageUrl = imageUrls[0] || '';

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.imageWrapper}
        onPress={handleImagePress}
        activeOpacity={0.95}
        disabled={!hasValidImage}
      >
        {hasValidImage && mainImageUrl ? (
          <Image
            source={{ uri: mainImageUrl }}
            style={styles.image}
            resizeMode={IMAGE_LOADING_CONFIG.resizeMode}
            onLoad={() => {
              console.log('Image loaded successfully for product:', product.id, 'URL:', mainImageUrl);
              setImageLoaded(true);
              setImageError(false);
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
            {product.imageUrl && !isValidImageUrl(product.imageUrl) && (
              <Text style={styles.imageDebugText}>URL non valido: {product.imageUrl}</Text>
            )}
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

        {/* Drop badge moved to bottom-left - FIXED: Always round down using Math.floor */}
        {isInDrop && currentDiscount && (
          <View style={styles.dropBadge}>
            <Text style={styles.dropBadgeText}>Drop -{Math.floor(currentDiscount)}%</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Product Name */}
          <Text style={styles.productName} numberOfLines={2}>{product.name ?? 'Prodotto'}</Text>

          {/* Brand and Category Row */}
          {(product.brand || product.category) && (
            <View style={styles.brandCategoryRow}>
              {product.brand && (
                <View style={styles.brandBadge}>
                  <IconSymbol 
                    ios_icon_name="tag.fill" 
                    android_material_icon_name="local_offer" 
                    size={10} 
                    color={colors.primary} 
                  />
                  <Text style={styles.brandText}>{product.brand}</Text>
                </View>
              )}
              {product.category && (
                <View style={styles.categoryBadge}>
                  <IconSymbol 
                    ios_icon_name="square.grid.2x2.fill" 
                    android_material_icon_name="category" 
                    size={10} 
                    color={colors.textSecondary} 
                  />
                  <Text style={styles.categoryText}>{product.category}</Text>
                </View>
              )}
            </View>
          )}

          {/* Description with swipe up gesture */}
          {product.description && (
            <Pressable 
              style={styles.descriptionContainer}
              onPress={handleDescriptionPress}
            >
              <Text 
                style={styles.descriptionText} 
                numberOfLines={descriptionExpanded ? undefined : 1}
                onLayout={(e) => {
                  const { height } = e.nativeEvent.layout;
                  if (descriptionHeight === 0) {
                    setDescriptionHeight(height);
                  }
                }}
              >
                {product.description}
              </Text>
              {descriptionHeight > 17 && !descriptionExpanded && (
                <View style={styles.swipeUpIndicator}>
                  <IconSymbol 
                    ios_icon_name="chevron.up" 
                    android_material_icon_name="expand_less" 
                    size={12} 
                    color={colors.primary} 
                  />
                  <Text style={styles.swipeUpText}>Tocca per espandere</Text>
                </View>
              )}
            </Pressable>
          )}

          {/* Product Details Row: Sizes, Colors, and Condition */}
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

          {/* Stock Information */}
          {product.stock !== undefined && product.stock !== null && (
            <View style={styles.stockContainer}>
              <IconSymbol 
                ios_icon_name="cube.box.fill" 
                android_material_icon_name="inventory" 
                size={12} 
                color={product.stock > 0 ? colors.success : colors.error} 
              />
              <Text style={[
                styles.stockText,
                { color: product.stock > 0 ? colors.success : colors.error }
              ]}>
                {product.stock > 0 ? `${product.stock} disponibili` : 'Esaurito'}
              </Text>
            </View>
          )}

          {/* Price row with discount badge - FIXED: Always round down using Math.floor */}
          <View style={styles.priceRow}>
            <View style={styles.priceInfo}>
              <Text style={styles.discountedPrice}>€{discountedPrice.toFixed(2)}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{Math.floor(discount)}%</Text>
              </View>
              <Text style={styles.originalPrice}>€{originalPrice.toFixed(2)}</Text>
            </View>
          </View>

          {/* Size and Color Selection for Fashion Items */}
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

          {/* Action Button */}
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

      {hasValidImage && (
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
    height: '60%',
    position: 'absolute',
    top: 0,
    backgroundColor: colors.backgroundSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
    aspectRatio: STANDARD_IMAGE_TEMPLATE.aspectRatio,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  imageErrorText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  imageDebugText: {
    marginTop: 8,
    fontSize: 10,
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
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
  dropBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
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
    height: '42%',
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
  brandCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  descriptionContainer: {
    marginBottom: 8,
    paddingVertical: 6,
  },
  descriptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  swipeUpIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  swipeUpText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
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
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  originalPrice: {
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  discountText: {
    fontSize: 11,
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
