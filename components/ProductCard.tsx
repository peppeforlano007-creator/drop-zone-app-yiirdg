
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions, Alert } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Product } from '@/types/Product';
import * as Haptics from 'expo-haptics';

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

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isInDrop && onBook) {
      Alert.alert(
        'Conferma Prenotazione',
        `Vuoi prenotare ${product.name} con ${currentDiscount}% di sconto?`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Prenota',
            onPress: () => onBook(product.id),
          },
        ]
      );
    } else if (onInterest) {
      onInterest(product.id);
    }
  };

  const discount = currentDiscount || product.minDiscount;
  const discountedPrice = product.originalPrice * (1 - discount / 100);

  return (
    <View style={styles.container}>
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

      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.supplierBadge}>
            <Text style={styles.supplierText}>{product.supplierName}</Text>
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>

          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.originalPrice}>€{product.originalPrice.toFixed(2)}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            </View>
            <Text style={styles.discountedPrice}>€{discountedPrice.toFixed(2)}</Text>
          </View>

          {isInDrop && currentDiscount && (
            <View style={styles.dropInfo}>
              <Text style={styles.dropText}>
                Drop attivo • Sconto attuale: {currentDiscount}%
              </Text>
            </View>
          )}

          <Pressable
            style={[
              styles.actionButton,
              isInterested && styles.interestedButton,
            ]}
            onPress={handlePress}
          >
            <Text style={styles.actionButtonText}>
              {isInDrop
                ? 'PRENOTA CON CARTA'
                : isInterested
                ? 'INTERESSATO ✓'
                : 'VORRÒ PARTECIPARE AL DROP'}
            </Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{product.category}</Text>
            <Text style={styles.footerText}>•</Text>
            <Text style={styles.footerText}>{product.stock} disponibili</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  supplierBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  supplierText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  productName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  priceContainer: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 16,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.5,
  },
  discountedPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },
  dropInfo: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: 18,
    borderRadius: 4,
    marginBottom: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestedButton: {
    backgroundColor: colors.secondary,
  },
  actionButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
