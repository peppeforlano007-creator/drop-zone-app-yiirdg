
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions, Alert, ActivityIndicator, Animated } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Product, ProductVariant } from '@/types/Product';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ImageGallery from './ImageGallery';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import GoogleSearchModal from './GoogleSearchModal';
import { 
  getStandardizedImageUri, 
  getStandardizedImageUris, 
  isValidImageUrl,
  STANDARD_IMAGE_TEMPLATE,
  IMAGE_LOADING_CONFIG 
} from '@/utils/imageHelpers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EnhancedProductCardProps {
  product: Product;
  isInDrop?: boolean;
  currentDiscount?: number;
  maxDiscount?: number;
  /** Override discount to display — replaces product's static discount_percentage */
  dropDiscount?: number;
  onInterest?: (productId: string) => void;
  onBook?: (productId: string, variantId?: string) => void;
  isInterested?: boolean;
  dropId?: string;
  dropBookingDisabled?: boolean;
}

export default function EnhancedProductCard({
  product,
  isInDrop = false,
  currentDiscount,
  maxDiscount,
  dropDiscount,
  onInterest,
  onBook,
  isInterested = false,
  dropId,
  dropBookingDisabled = false,
}: EnhancedProductCardProps) {
  const { user } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [descriptionHeight, setDescriptionHeight] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [googleSearchVisible, setGoogleSearchVisible] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScaleAnim = useRef(new Animated.Value(1)).current;

  // Check if product has variants
  const hasVariants = product.hasVariants && product.variants && product.variants.length > 0;

  // CRITICAL FIX: Filter out empty/null/undefined values and only include actual sizes/colors
  const availableSizes = hasVariants 
    ? [...new Set(product.variants!.filter(v => v.size && v.size.trim() !== '').map(v => v.size!))]
    : (product.availableSizes && product.availableSizes.length > 0 
        ? product.availableSizes.filter(s => s && s.trim() !== '') 
        : []);
  
  const availableColors = hasVariants
    ? [...new Set(product.variants!.filter(v => v.color && v.color.trim() !== '').map(v => v.color!))]
    : (product.availableColors && product.availableColors.length > 0 
        ? product.availableColors.filter(c => c && c.trim() !== '') 
        : []);

  // CRITICAL: Determine if this product requires variant selection
  const requiresSizeSelection = availableSizes.length > 0;
  const requiresColorSelection = availableColors.length > 0;
  const requiresVariantSelection = requiresSizeSelection || requiresColorSelection;

  // CRITICAL: Check if all required selections are made
  const hasRequiredSizeSelection = !requiresSizeSelection || selectedSize !== null;
  const hasRequiredColorSelection = !requiresColorSelection || selectedColor !== null;
  const hasAllRequiredSelections = hasRequiredSizeSelection && hasRequiredColorSelection;

  console.log('=== ENHANCED PRODUCT CARD INITIALIZATION ===');
  console.log('Product ID:', product.id);
  console.log('Product Name:', product.name);
  console.log('Is In Drop:', isInDrop);
  console.log('Has Variants:', hasVariants);
  console.log('Available Sizes (filtered):', availableSizes);
  console.log('Available Colors (filtered):', availableColors);
  console.log('Requires Size Selection:', requiresSizeSelection);
  console.log('Requires Color Selection:', requiresColorSelection);
  console.log('Requires Variant Selection:', requiresVariantSelection);
  console.log('Has All Required Selections:', hasAllRequiredSelections);

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

  // Get stock for display
  const displayStock = hasVariants 
    ? (selectedVariant?.stock ?? 0)
    : (product.stock ?? 0);
  
  const isOutOfStock = displayStock <= 0;

  // Check if product is in wishlist
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!user || !isInDrop || !dropId) return;

      try {
        const { data, error } = await supabase
          .from('wishlists')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .eq('drop_id', dropId)
          .maybeSingle();

        if (error) {
          console.error('Error checking wishlist status:', error);
          return;
        }

        setIsInWishlist(!!data);
      } catch (error) {
        console.error('Exception checking wishlist status:', error);
      }
    };

    checkWishlistStatus();
  }, [user, product.id, dropId, isInDrop]);

  // Safe value extraction with defaults
  const originalPrice = product.originalPrice ?? 0;
  const minDiscount = product.minDiscount ?? 0;
  // dropDiscount overrides everything — it is the drop's computed/final discount
  const discount = dropDiscount ?? currentDiscount ?? minDiscount;
  const maxDiscountValue = maxDiscount ?? product.maxDiscount ?? 0;
  const discountedPrice = originalPrice * (1 - discount / 100);
  console.log('[EnhancedProductCard] discount resolution:', { productId: product.id, dropDiscount, currentDiscount, minDiscount, resolvedDiscount: discount });

  // Safely construct image URLs array with validation and standardization
  const imageUrls = React.useMemo(() => {
    const urls: string[] = [];
    
    if (product.imageUrl && isValidImageUrl(product.imageUrl)) {
      urls.push(product.imageUrl);
    }
    
    if (product.imageUrls && Array.isArray(product.imageUrls)) {
      const validAdditionalUrls = product.imageUrls.filter(url => 
        url && 
        url !== product.imageUrl && 
        isValidImageUrl(url)
      );
      urls.push(...validAdditionalUrls);
    }
    
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
    console.log('=== BOOKING BUTTON PRESSED (ENHANCED) ===');
    console.log('Product:', product.name);
    console.log('Is in drop:', isInDrop);
    console.log('Is out of stock:', isOutOfStock);
    console.log('Requires variant selection:', requiresVariantSelection);
    console.log('Has all required selections:', hasAllRequiredSelections);
    console.log('Selected size:', selectedSize);
    console.log('Selected color:', selectedColor);
    
    // CRITICAL: Block if out of stock
    if (isInDrop && isOutOfStock) {
      console.log('❌ Product is out of stock - blocking booking');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Prodotto esaurito', 
        'Questo prodotto non è più disponibile. Qualcun altro lo ha appena prenotato.'
      );
      return;
    }

    // CRITICAL: Block if required selections are missing (ONLY IN DROP)
    if (isInDrop && requiresVariantSelection && !hasAllRequiredSelections) {
      console.log('❌ REQUIRED SELECTIONS MISSING - BLOCKING BOOKING');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      
      const missingSelections = [];
      if (requiresSizeSelection && !selectedSize) {
        missingSelections.push(`Taglia (disponibili: ${availableSizes.join(', ')})`);
      }
      if (requiresColorSelection && !selectedColor) {
        missingSelections.push(`Colore (disponibili: ${availableColors.join(', ')})`);
      }
      
      Alert.alert(
        '⚠️ Selezione Obbligatoria', 
        `Per prenotare questo articolo devi prima selezionare:\n\n${missingSelections.map(s => `• ${s}`).join('\n')}\n\nSeleziona le opzioni richieste e riprova.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    if (isInDrop && onBook) {
      const variantInfo = selectedVariant 
        ? `\n\n📦 Variante: ${selectedVariant.size || ''} ${selectedVariant.color || ''}`.trim()
        : '';

      // Show confirmation alert ONLY after all validations pass
      Alert.alert(
        '🎉 Conferma Prenotazione',
        `Stai prenotando: ${product.name}${variantInfo}\n\n` +
        `💰 Sconto attuale: ${Math.floor(discount)}%\n` +
        `🎯 Sconto massimo raggiungibile: ${Math.floor(maxDiscountValue)}%\n\n` +
        `📊 Prenoteremo l'articolo allo sconto attuale del ${Math.floor(discount)}%, ma più utenti prenotano da questo drop e più la percentuale aumenta!\n\n` +
        `📦 Al termine del drop ti notificheremo con l'importo esatto da pagare alla consegna.\n\n` +
        `💡 Condividi il drop con amici e parenti tramite il tasto "Condividi Drop" per aumentare lo sconto!`,
        [
          { 
            text: 'Annulla', 
            style: 'cancel',
            onPress: () => {
              console.log('User cancelled booking');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
          {
            text: 'Prenota Articolo',
            onPress: async () => {
              console.log('→ User confirmed booking');
              
              // Final stock check before processing
              if (displayStock <= 0) {
                console.log('❌ Stock depleted at confirmation');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                  'Prodotto esaurito',
                  'Questo prodotto è stato appena prenotato da qualcun altro.'
                );
                return;
              }
              
              setIsProcessing(true);
              try {
                console.log('Processing booking with variant:', selectedVariant?.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onBook(product.id, selectedVariant?.id);
              } catch (error) {
                console.error('Booking failed:', error);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  const handleWishlistToggle = async () => {
    console.log('🔥 Wishlist toggle pressed!', { user: !!user, dropId, productId: product.id });
    
    if (!user) {
      Alert.alert('Accesso richiesto', 'Devi effettuare l\'accesso per aggiungere articoli alla wishlist');
      router.push('/login');
      return;
    }

    if (!dropId) {
      console.error('❌ No dropId provided for wishlist toggle');
      Alert.alert('Errore', 'Impossibile aggiungere alla wishlist in questo momento');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWishlistLoading(true);

    Animated.sequence([
      Animated.timing(heartScaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(heartScaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      if (isInWishlist) {
        console.log('🗑️ Removing from wishlist:', { userId: user.id, productId: product.id, dropId });
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .eq('drop_id', dropId);

        if (error) {
          console.error('❌ Error removing from wishlist:', error);
          Alert.alert('Errore', 'Impossibile rimuovere dalla wishlist');
          return;
        }

        setIsInWishlist(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('✅ Removed from wishlist:', product.id);
      } else {
        console.log('➕ Adding to wishlist:', { userId: user.id, productId: product.id, dropId });
        const { error } = await supabase
          .from('wishlists')
          .insert({
            user_id: user.id,
            product_id: product.id,
            drop_id: dropId,
          });

        if (error) {
          console.error('❌ Error adding to wishlist:', error);
          Alert.alert('Errore', 'Impossibile aggiungere alla wishlist');
          return;
        }

        setIsInWishlist(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('✅ Added to wishlist:', product.id);
      }
    } catch (error) {
      console.error('❌ Exception toggling wishlist:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setWishlistLoading(false);
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

  const mainImageUrl = imageUrls[0] || '';

  // CRITICAL: Determine if booking button should be disabled (ONLY IN DROP)
  const isBookingDisabled = isProcessing || isOutOfStock || dropBookingDisabled || (isInDrop && requiresVariantSelection && !hasAllRequiredSelections);

  return (
    <View style={styles.container}>
      <View style={styles.imageWrapper} pointerEvents="box-none">
        <Pressable 
          style={styles.imagePressable}
          onPress={handleImagePress}
          activeOpacity={0.95}
          disabled={!hasValidImage}
          pointerEvents="auto"
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
            <Pressable
              style={styles.noImageBanner}
              onPress={() => {
                const query = `${product.brand ?? ''} ${product.name ?? ''}`.trim();
                console.log('[EnhancedProductCard] No-image banner pressed, opening Google search for:', query);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setGoogleSearchVisible(true);
              }}
            >
              <IconSymbol
                ios_icon_name="magnifyingglass.circle.fill"
                android_material_icon_name="search"
                size={64}
                color="#FFF"
                style={styles.noImageBannerIcon}
              />
              <Text style={styles.noImageBannerTitle}>Scopri di più su questo prodotto</Text>
              <Text style={styles.noImageBannerSubtitle} numberOfLines={2}>
                Tocca per cercare immagini, prezzi e dettagli
              </Text>
              <View style={styles.noImageBannerChip}>
                <Text style={styles.noImageBannerChipText}>🔍 CERCA SU GOOGLE</Text>
              </View>
            </Pressable>
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

          {isInDrop && currentDiscount && (
            <View style={styles.dropBadge}>
              <Text style={styles.dropBadgeText}>Drop -{Math.floor(currentDiscount)}%</Text>
            </View>
          )}

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

        {isInDrop && dropId && (
          <Pressable
            style={styles.wishlistButtonWrapper}
            onPress={() => {
              console.log('🔥🔥🔥 WISHLIST BUTTON PRESSED! 🔥🔥🔥');
              handleWishlistToggle();
            }}
            disabled={wishlistLoading}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            pointerEvents="auto"
          >
            <Animated.View style={[styles.wishlistButton, { transform: [{ scale: heartScaleAnim }] }]}>
              {wishlistLoading ? (
                <ActivityIndicator size="small" color="#FF6B6B" />
              ) : (
                <IconSymbol
                  ios_icon_name={isInWishlist ? 'heart.fill' : 'heart'}
                  android_material_icon_name={isInWishlist ? 'favorite' : 'favorite_border'}
                  size={26}
                  color={isInWishlist ? '#FF6B6B' : '#FFF'}
                />
              )}
            </Animated.View>
          </Pressable>
        )}
      </View>

      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.productName} numberOfLines={2}>{product.name ?? 'Prodotto'}</Text>

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

          {!product.description && (
            <Pressable
              style={styles.noDescriptionBanner}
              onPress={() => {
                const query = `${product.brand ?? ''} ${product.name ?? ''}`.trim();
                console.log('[EnhancedProductCard] No-description banner pressed, opening Google search for:', query);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGoogleSearchVisible(true);
              }}
            >
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.noDescriptionBannerText}>Cerca info, foto e prezzi su Google</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={16}
                color={colors.textTertiary}
              />
            </Pressable>
          )}

          {!!product.description && hasValidImage && (
            <Pressable
              style={styles.googleSearchButton}
              onPress={() => {
                const query = `${product.brand ?? ''} ${product.name ?? ''}`.trim();
                console.log('[EnhancedProductCard] Cerca su Google pressed for:', query);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGoogleSearchVisible(true);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={13}
                color={colors.textSecondary}
              />
              <Text style={styles.googleSearchButtonText}>Cerca info</Text>
            </Pressable>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.discountedPrice}>€{discountedPrice.toFixed(2)}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{Math.floor(discount)}%</Text>
            </View>
            <Text style={styles.originalPrice}>€{originalPrice.toFixed(2)}</Text>
          </View>

          {/* CRITICAL FIX: Only show selection container if product actually has variants */}
          {requiresVariantSelection && (
            <View style={styles.selectionContainer}>
              {requiresSizeSelection && (
                <View style={styles.inlineSelection}>
                  <View style={styles.selectionLabelContainer}>
                    <Text style={styles.selectionLabel}>TAGLIA</Text>
                    {isInDrop && <Text style={styles.requiredIndicator}>*</Text>}
                  </View>
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

              {requiresColorSelection && (
                <View style={styles.inlineSelection}>
                  <View style={styles.selectionLabelContainer}>
                    <Text style={styles.selectionLabel}>COLORE</Text>
                    {isInDrop && <Text style={styles.requiredIndicator}>*</Text>}
                  </View>
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

          {/* CRITICAL: Enhanced booking button with clear disabled state (ONLY IN DROP) */}
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
                disabled={isBookingDisabled}
                style={[
                  styles.bookButton,
                  isBookingDisabled && styles.bookButtonDisabled,
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
                ) : requiresVariantSelection && !hasAllRequiredSelections ? (
                  <>
                    <View style={[styles.bookButtonIconContainer, styles.bookButtonIconWarning]}>
                      <IconSymbol 
                        ios_icon_name="exclamationmark.triangle.fill" 
                        android_material_icon_name="warning" 
                        size={20} 
                        color="#666" 
                      />
                    </View>
                    <View style={styles.bookButtonTextContainer}>
                      <Text style={[styles.bookButtonTitle, styles.bookButtonTitleWarning]}>
                        SELEZIONA OPZIONI
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

      <GoogleSearchModal
        visible={googleSearchVisible}
        onClose={() => {
          console.log('[EnhancedProductCard] GoogleSearchModal closed for product:', product.name);
          setGoogleSearchVisible(false);
        }}
        productName={`${product.brand ?? ''} ${product.name ?? ''}`.trim()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: colors.background,
    flexDirection: 'column',
    justifyContent: 'center',
    paddingVertical: SCREEN_HEIGHT * 0.08,
  },
  imageWrapper: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.42,
    position: 'relative',
    backgroundColor: colors.backgroundSecondary,
  },
  imagePressable: {
    width: '100%',
    height: '100%',
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
    top: 16,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 5,
  },
  imageCount: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  wishlistButtonWrapper: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    marginLeft: -26,
    zIndex: 999999,
    elevation: 999999,
    width: 52,
    height: 52,
  },
  wishlistButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
  },
  dropBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    zIndex: 5,
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
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    padding: 14,
    paddingBottom: 20,
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
    gap: 10,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  selectionWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  selectionWarningText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.5,
    flex: 1,
  },
  inlineSelection: {
    flexDirection: 'column',
    gap: 6,
  },
  selectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  selectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requiredIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sizeOption: {
    minWidth: 38,
    height: 34,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  sizeOptionSelected: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  sizeOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  sizeOptionTextSelected: {
    color: '#FFF',
  },
  colorOption: {
    minWidth: 38,
    height: 34,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  colorOptionSelected: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  colorOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  colorOptionTextSelected: {
    color: '#FFF',
  },
  bookButtonWrapper: {
    marginTop: 14,
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
    opacity: 0.6,
    borderColor: '#999',
    backgroundColor: '#F5F5F5',
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
  bookButtonIconWarning: {
    backgroundColor: '#F5F5F5',
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
  bookButtonTitleWarning: {
    color: '#666',
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
  googleSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 8,
  },
  googleSearchButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  noImageBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noImageBannerIcon: {
    marginBottom: 16,
  },
  noImageBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  noImageBannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  noImageBannerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  noImageBannerChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  noDescriptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 8,
  },
  noDescriptionBannerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
});
