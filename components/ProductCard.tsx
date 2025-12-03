
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions, Alert, ActivityIndicator, Animated } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Product, ProductVariant } from '@/types/Product';
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
  onBook?: (productId: string, variantId?: string) => void;
  isInterested?: boolean;
  onWishlistToggle?: (productId: string) => void;
  isInWishlist?: boolean;
  dropId?: string;
}

export default function ProductCard({
  product,
  isInDrop = false,
  currentDiscount,
  onInterest,
  onBook,
  isInterested = false,
  onWishlistToggle,
  isInWishlist = false,
  dropId,
}: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [descriptionHeight, setDescriptionHeight] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(product.imageUrl);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Check if product has variants
  const hasVariants = product.hasVariants && product.variants && product.variants.length > 0;

  // Get available sizes and colors from variants
  const availableSizes = hasVariants 
    ? [...new Set(product.variants!.filter(v => v.size).map(v => v.size!))]
    : product.availableSizes || [];
  
  const availableColors = hasVariants
    ? [...new Set(product.variants!.filter(v => v.color).map(v => v.color!))]
    : product.availableColors || [];

  // Update selected variant when size or color changes
  useEffect(() => {
    if (!hasVariants) return;

    const variant = product.variants!.find(v => {
      const sizeMatch = !selectedSize || v.size === selectedSize;
      const colorMatch = !selectedColor || v.color === selectedColor;
      return sizeMatch && colorMatch && v.stock > 0;
    });

    setSelectedVariant(variant || null);
    console.log('Selected variant:', variant);
  }, [selectedSize, selectedColor, hasVariants, product.variants]);

  // Update image when color is selected - check for color-specific image
  useEffect(() => {
    if (selectedColor && product.imageUrls && Array.isArray(product.imageUrls)) {
      // Check if there's a color-specific image in the additional images
      // This assumes the supplier has added color-specific images during import
      const colorImageIndex = availableColors.indexOf(selectedColor);
      if (colorImageIndex >= 0 && colorImageIndex < product.imageUrls.length) {
        const colorSpecificImage = product.imageUrls[colorImageIndex];
        if (colorSpecificImage && isValidImageUrl(colorSpecificImage)) {
          console.log(`Using color-specific image for ${selectedColor}:`, colorSpecificImage);
          setCurrentImageUrl(colorSpecificImage);
          return;
        }
      }
    }
    
    // Fallback to main image
    setCurrentImageUrl(product.imageUrl);
  }, [selectedColor, product.imageUrl, product.imageUrls, availableColors]);

  // Get stock for display
  const displayStock = hasVariants 
    ? (selectedVariant?.stock ?? 0)
    : (product.stock ?? 0);
  
  const isOutOfStock = displayStock <= 0;

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
    // Don't allow booking if out of stock
    if (isInDrop && isOutOfStock) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Prodotto esaurito', 
        'Questo prodotto non è più disponibile. Qualcun altro lo ha appena prenotato.'
      );
      return;
    }

    // STRICT VARIANT SELECTION ENFORCEMENT
    if (isInDrop) {
      // Check if there are sizes or colors to select
      const hasSizesToSelect = availableSizes.length > 0;
      const hasColorsToSelect = availableColors.length > 0;
      
      // If product has variants (sizes or colors), enforce selection
      if (hasSizesToSelect || hasColorsToSelect) {
        // Check size selection
        if (hasSizesToSelect && !selectedSize) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(
            'Selezione richiesta',
            'Devi selezionare una taglia prima di prenotare questo articolo.'
          );
          return;
        }
        
        // Check color selection
        if (hasColorsToSelect && !selectedColor) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(
            'Selezione richiesta',
            'Devi selezionare un colore prima di prenotare questo articolo.'
          );
          return;
        }
        
        // If product has variants, ensure a valid variant is selected
        if (hasVariants && !selectedVariant) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(
            'Variante non disponibile',
            'La combinazione selezionata non è disponibile. Seleziona un\'altra taglia o colore.'
          );
          return;
        }
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    if (isInDrop && onBook) {
      // Show confirmation alert
      const variantInfo = selectedVariant 
        ? `\n\n📦 Variante: ${selectedVariant.size || ''} ${selectedVariant.color || ''}`.trim()
        : '';

      Alert.alert(
        'Conferma Prenotazione',
        `Vuoi prenotare ${product.name}?${variantInfo}\n\nPrezzo attuale: €${discountedPrice.toFixed(2)} (-${Math.floor(discount)}%)\n\nPagamento alla consegna.`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Prenota',
            onPress: async () => {
              // Double-check stock before processing
              if (displayStock <= 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                  'Prodotto esaurito',
                  'Questo prodotto è stato appena prenotato da qualcun altro.'
                );
                return;
              }

              setIsProcessing(true);
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onBook(product.id, selectedVariant?.id);
              } catch (error) {
                console.error('Booking failed:', error);
                Alert.alert(
                  'Errore',
                  'Non è stato possibile completare la prenotazione. Riprova.'
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
    if (descriptionHeight > 15) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDescriptionExpanded(!descriptionExpanded);
    }
  };

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

  // Get the main image URL (use current image which may be color-specific)
  const mainImageUrl = currentImageUrl || imageUrls[0] || '';

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
              size={18} 
              color={colors.background} 
            />
            <Text style={styles.imageCount}>{imageUrls.length}</Text>
          </View>
        )}

        {/* Drop badge moved to bottom-left */}
        {isInDrop && currentDiscount && (
          <View style={styles.dropBadge}>
            <Text style={styles.dropBadgeText}>Drop -{Math.floor(currentDiscount)}%</Text>
          </View>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <View style={styles.outOfStockOverlay}>
            <View style={styles.outOfStockBadge}>
              <IconSymbol 
                ios_icon_name="xmark.circle.fill" 
                android_material_icon_name="cancel" 
                size={32} 
                color="#FFF" 
              />
              <Text style={styles.outOfStockText}>ESAURITO</Text>
            </View>
          </View>
        )}
      </Pressable>

      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Product Name - Reduced size */}
          <Text style={styles.productName} numberOfLines={2}>{product.name ?? 'Prodotto'}</Text>

          {/* Compact info row: Brand, Category, Condition, Stock */}
          <View style={styles.compactInfoRow}>
            {product.brand && (
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{product.brand}</Text>
              </View>
            )}
            {product.category && (
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{product.category}</Text>
              </View>
            )}
            {product.condition && (
              <View style={[styles.infoBadge, { backgroundColor: getConditionColor(product.condition) + '20' }]}>
                <Text style={[styles.infoBadgeText, { color: getConditionColor(product.condition) }]}>
                  {product.condition}
                </Text>
              </View>
            )}
            <View style={styles.stockBadge}>
              <IconSymbol 
                ios_icon_name="cube.box.fill" 
                android_material_icon_name="inventory" 
                size={10} 
                color={displayStock > 0 ? colors.success : colors.error} 
              />
              <Text style={[styles.stockBadgeText, { color: displayStock > 0 ? colors.success : colors.error }]}>
                {displayStock}
              </Text>
            </View>
          </View>

          {/* Description - More compact */}
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
            </Pressable>
          )}

          {/* Price row - More compact */}
          <View style={styles.priceRow}>
            <Text style={styles.discountedPrice}>€{discountedPrice.toFixed(2)}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{Math.floor(discount)}%</Text>
            </View>
            <Text style={styles.originalPrice}>€{originalPrice.toFixed(2)}</Text>
          </View>

          {/* Size and Color Selection - COMPACT VERSION WITH TEXT LABELS FOR COLORS */}
          {(availableSizes.length > 0 || availableColors.length > 0) && (
            <View style={styles.selectionContainer}>
              {/* Size Selection - Inline */}
              {availableSizes.length > 0 && (
                <View style={styles.inlineSelection}>
                  <Text style={styles.selectionLabel}>Taglia:</Text>
                  <View style={styles.optionsRow}>
                    {availableSizes.slice(0, 6).map((size, index) => (
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

              {/* Color Selection - TEXT LABELS INSTEAD OF COLOR CIRCLES */}
              {availableColors.length > 0 && (
                <View style={styles.inlineSelection}>
                  <Text style={styles.selectionLabel}>Colore:</Text>
                  <View style={styles.optionsRow}>
                    {availableColors.slice(0, 6).map((color, index) => (
                      <Pressable
                        key={index}
                        style={[
                          styles.colorOption,
                          selectedColor === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => handleColorSelect(color)}
                      >
                        <Text
                          style={[
                            styles.colorOptionText,
                            selectedColor === color && styles.colorOptionTextSelected,
                          ]}
                        >
                          {color}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Action Button - More compact */}
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
                disabled={isProcessing || isOutOfStock}
                style={[
                  styles.bookButton,
                  (isProcessing || isOutOfStock) && styles.bookButtonDisabled,
                ]}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : isOutOfStock ? (
                  <>
                    <View style={styles.bookButtonIconContainer}>
                      <IconSymbol 
                        ios_icon_name="xmark.circle.fill" 
                        android_material_icon_name="cancel" 
                        size={20} 
                        color="#999" 
                      />
                    </View>
                    <View style={styles.bookButtonTextContainer}>
                      <Text style={[styles.bookButtonTitle, styles.bookButtonTitleDisabled]}>
                        ESAURITO
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.bookButtonIconContainer}>
                      <IconSymbol 
                        ios_icon_name="cube.box.fill" 
                        android_material_icon_name="inventory" 
                        size={20} 
                        color="#333" 
                      />
                    </View>
                    <View style={styles.bookButtonTextContainer}>
                      <Text style={styles.bookButtonTitle}>PRENOTA ARTICOLO</Text>
                      <Text style={styles.bookButtonSubtitle}>
                        Pagamento alla consegna
                      </Text>
                    </View>
                    <View style={styles.bookButtonArrow}>
                      <IconSymbol 
                        ios_icon_name="chevron.right" 
                        android_material_icon_name="chevron_right" 
                        size={18} 
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageCount: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  dropBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  dropBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  outOfStockBadge: {
    alignItems: 'center',
    gap: 8,
  },
  outOfStockText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    padding: 14,
    paddingBottom: 110,
  },
  productName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 5,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  compactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  infoBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  infoBadgeText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  descriptionContainer: {
    marginBottom: 5,
  },
  descriptionText: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  discountedPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.6,
  },
  discountBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.3,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  selectionContainer: {
    marginBottom: 8,
    gap: 6,
  },
  inlineSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  selectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    minWidth: 50,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    flex: 1,
  },
  sizeOption: {
    minWidth: 30,
    height: 28,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sizeOptionSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  sizeOptionText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  sizeOptionTextSelected: {
    color: colors.background,
  },
  colorOption: {
    paddingHorizontal: 8,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: colors.backgroundSecondary,
  },
  colorOptionSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  colorOptionText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  colorOptionTextSelected: {
    color: colors.background,
  },
  bookButtonWrapper: {
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  bookButtonDisabled: {
    opacity: 0.5,
    borderColor: '#999',
  },
  bookButtonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bookButtonTextContainer: {
    flex: 1,
    gap: 1,
  },
  bookButtonTitle: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bookButtonTitleDisabled: {
    color: '#999',
  },
  bookButtonSubtitle: {
    color: '#666',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  bookButtonArrow: {
    opacity: 0.8,
  },
  actionButton: {
    paddingVertical: 13,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
