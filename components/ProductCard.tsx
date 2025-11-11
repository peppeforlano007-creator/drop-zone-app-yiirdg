
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions, Alert, ActivityIndicator } from 'react-native';
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
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getDefaultPaymentMethod, authorizePayment } = usePayment();

  const handleImagePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGalleryVisible(true);
    console.log('Opening image gallery for product:', product.id);
  };

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
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

  const discount = currentDiscount || product.minDiscount;
  const discountedPrice = product.originalPrice * (1 - discount / 100);
  const hasMultipleImages = product.imageUrls && product.imageUrls.length > 1;

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
        return 'sparkles';
      case 'reso da cliente':
        return 'arrow.uturn.backward';
      case 'packaging rovinato':
        return 'exclamationmark.triangle';
      default:
        return 'tag';
    }
  };

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.imageWrapper}
        onPress={handleImagePress}
        activeOpacity={0.95}
      >
        <Image
          source={{ uri: product.imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
        />
        
        {!imageLoaded && (
          <View style={styles.imagePlaceholder}>
            <IconSymbol name="photo" size={60} color={colors.textTertiary} />
          </View>
        )}

        {hasMultipleImages && (
          <View style={styles.imageIndicator}>
            <IconSymbol name="photo.stack" size={18} color={colors.background} />
            <Text style={styles.imageCount}>{product.imageUrls.length}</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.supplierBadge}>
              <Text style={styles.supplierText}>{product.supplierName}</Text>
            </View>
            {isInDrop && currentDiscount && (
              <View style={styles.dropBadge}>
                <Text style={styles.dropBadgeText}>Drop -{currentDiscount}%</Text>
              </View>
            )}
          </View>

          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>

          {/* Sizes and Condition Row */}
          {(product.sizes || product.condition) && (
            <View style={styles.detailsRow}>
              {product.sizes && product.sizes.length > 0 && (
                <View style={styles.sizesContainer}>
                  <IconSymbol name="ruler" size={14} color={colors.textSecondary} />
                  <Text style={styles.sizesText}>
                    {Array.isArray(product.sizes) 
                      ? product.sizes.join(', ') 
                      : product.sizes}
                  </Text>
                </View>
              )}
              
              {product.condition && (
                <View style={[
                  styles.conditionBadge,
                  { backgroundColor: getConditionColor(product.condition) + '20' }
                ]}>
                  <IconSymbol 
                    name={getConditionIcon(product.condition)} 
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
            </View>
          )}

          <View style={styles.priceRow}>
            <View style={styles.priceInfo}>
              <Text style={styles.discountedPrice}>€{discountedPrice.toFixed(2)}</Text>
              <Text style={styles.originalPrice}>€{product.originalPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          </View>

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
                {isInDrop
                  ? 'PRENOTA CON CARTA'
                  : isInterested
                  ? 'INTERESSATO ✓'
                  : 'VORRÒ PARTECIPARE AL DROP'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <ImageGallery
        images={product.imageUrls || [product.imageUrl]}
        visible={galleryVisible}
        onClose={() => setGalleryVisible(false)}
        initialIndex={0}
      />
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
    height: '100%',
    position: 'absolute',
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
  imageIndicator: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageCount: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  supplierBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  supplierText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dropBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dropBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  sizesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sizesText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.5,
  },
  discountedPrice: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.8,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 4,
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
    letterSpacing: 1.5,
  },
});
