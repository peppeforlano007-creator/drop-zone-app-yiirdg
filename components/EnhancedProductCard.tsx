
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';

interface EnhancedProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string;
    image_url: string;
    original_price: number;
    stock: number;
    condition: string;
    available_sizes?: string[];
    available_colors?: string[];
  };
  discount: number;
  onPress: () => void;
}

export default function EnhancedProductCard({
  product,
  discount,
  onPress,
}: EnhancedProductCardProps) {
  const handlePress = () => {
    console.log('User tapped product card:', product.name);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const discountedPrice = product.original_price * (1 - discount / 100);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
    >
      <Image
        source={{ uri: product.image_url }}
        style={styles.image}
        resizeMode="cover"
      />
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        
        {product.description && (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        <View style={styles.priceContainer}>
          <Text style={styles.originalPrice}>€{product.original_price.toFixed(2)}</Text>
          <Text style={styles.discountedPrice}>€{discountedPrice.toFixed(2)}</Text>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.stockContainer}>
            <IconSymbol
              ios_icon_name="cube.box.fill"
              android_material_icon_name="inventory"
              size={16}
              color={product.stock > 0 ? colors.success : colors.error}
            />
            <Text style={[
              styles.stockText,
              { color: product.stock > 0 ? colors.success : colors.error }
            ]}>
              {product.stock > 0 ? `${product.stock} disponibili` : 'Esaurito'}
            </Text>
          </View>

          {product.condition && (
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{product.condition}</Text>
            </View>
          )}
        </View>

        {(product.available_sizes || product.available_colors) && (
          <View style={styles.variantsContainer}>
            {product.available_sizes && product.available_sizes.length > 0 && (
              <View style={styles.variantInfo}>
                <IconSymbol
                  ios_icon_name="ruler"
                  android_material_icon_name="straighten"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.variantText}>
                  {product.available_sizes.length} taglie
                </Text>
              </View>
            )}
            {product.available_colors && product.available_colors.length > 0 && (
              <View style={styles.variantInfo}>
                <IconSymbol
                  ios_icon_name="paintpalette"
                  android_material_icon_name="palette"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.variantText}>
                  {product.available_colors.length} colori
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  originalPrice: {
    fontSize: 16,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  discountBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '600',
  },
  conditionBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  variantsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  variantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  variantText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
