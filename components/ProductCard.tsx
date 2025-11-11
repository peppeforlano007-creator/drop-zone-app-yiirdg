
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
          <IconSymbol name="photo" size={60} color={colors.textSecondary} />
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.supplierBadge}>
            <IconSymbol name="building.2" size={14} color={colors.card} />
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
              <IconSymbol name="clock.fill" size={16} color={colors.accent} />
              <Text style={styles.dropText}>
                Drop attivo! Sconto attuale: {currentDiscount}%
              </Text>
            </View>
          )}

          <Pressable
            style={[
              styles.actionButton,
              isInDrop ? styles.bookButton : styles.interestButton,
              isInterested && styles.interestedButton,
            ]}
            onPress={handlePress}
          >
            <IconSymbol
              name={isInDrop ? 'cart.fill' : isInterested ? 'checkmark.circle.fill' : 'heart'}
              size={20}
              color={colors.card}
            />
            <Text style={styles.actionButtonText}>
              {isInDrop
                ? 'PRENOTA CON CARTA'
                : isInterested
                ? 'INTERESSATO'
                : 'VORRÒ PARTECIPARE AL DROP'}
            </Text>
          </Pressable>

          <View style={styles.footer}>
            <View style={styles.footerItem}>
              <IconSymbol name="tag.fill" size={14} color={colors.textSecondary} />
              <Text style={styles.footerText}>{product.category}</Text>
            </View>
            <View style={styles.footerItem}>
              <IconSymbol name="cube.box.fill" size={14} color={colors.textSecondary} />
              <Text style={styles.footerText}>{product.stock} disponibili</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
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
    backgroundColor: colors.textSecondary + '20',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  supplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6,
  },
  supplierText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '600',
  },
  productName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.card,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.card,
    opacity: 0.9,
    marginBottom: 16,
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
    fontSize: 18,
    color: colors.card,
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  discountBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  discountedPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.card,
  },
  dropInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  dropText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  interestButton: {
    backgroundColor: colors.primary,
  },
  bookButton: {
    backgroundColor: colors.accent,
  },
  interestedButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: colors.card,
    fontSize: 13,
    opacity: 0.8,
  },
});
