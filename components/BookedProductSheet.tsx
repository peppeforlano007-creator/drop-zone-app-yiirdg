import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import CachedImage from './CachedImage';
import ImageGallery from './ImageGallery';
import { isValidImageUrl } from '@/utils/imageHelpers';

export interface BookedProductInfo {
  name: string;
  imageUrl?: string | null;
  additionalImages?: string[] | null;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
  sku?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
  originalPrice: number;
  finalPrice: number;
  discountPercentage: number;
  dropName?: string | null;
  pickupPointName?: string | null;
  pickupPointAddress?: string | null;
  statusLabel?: string | null;
}

const PHOTO_WIDTH = Dimensions.get('window').width;

export default function BookedProductSheet({
  product,
  onClose,
}: {
  product: BookedProductInfo | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const images = useMemo(() => {
    if (!product) return [];
    const all = [product.imageUrl, ...(product.additionalImages ?? [])]
      .filter((u): u is string => !!u && isValidImageUrl(u));
    return Array.from(new Set(all));
  }, [product]);

  if (!product) return null;

  const details: { label: string; value: string }[] = [];
  if (product.selectedSize) details.push({ label: 'Taglia', value: product.selectedSize });
  if (product.selectedColor) details.push({ label: 'Colore', value: product.selectedColor });
  if (product.brand) details.push({ label: 'Marca', value: product.brand });
  if (product.category) details.push({ label: 'Categoria', value: product.category });
  if (product.condition) details.push({ label: 'Condizione', value: product.condition });
  if (product.sku) details.push({ label: 'Codice', value: product.sku });

  const close = () => {
    setIndex(0);
    onClose();
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={close}
    >
      <SafeAreaView style={styles.container} edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle} numberOfLines={1}>Dettagli articolo</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chiudi"
            onPress={close}
            hitSlop={8}
            style={styles.closeButton}
          >
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {images.length > 0 ? (
            <View>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, i) => `${item}-${i}`}
                onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / PHOTO_WIDTH))}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="imagebutton"
                    accessibilityLabel="Apri foto a schermo intero"
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGalleryOpen(true);
                    }}
                  >
                    <CachedImage uri={item} style={styles.photo} contentFit="contain" />
                  </Pressable>
                )}
              />
              {images.length > 1 && (
                <View style={styles.dots}>
                  {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.photo, styles.noPhoto]}>
              <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={48} color={colors.textSecondary} />
              <Text style={styles.noPhotoText}>Foto non disponibile</Text>
            </View>
          )}

          <View style={styles.body}>
            {!!product.statusLabel && <Text style={styles.status}>{product.statusLabel}</Text>}
            <Text style={styles.name}>{product.name}</Text>

            <View style={styles.priceRow}>
              {product.originalPrice > product.finalPrice && (
                <Text style={styles.originalPrice}>€{product.originalPrice.toFixed(2)}</Text>
              )}
              <Text style={styles.finalPrice}>€{product.finalPrice.toFixed(2)}</Text>
              {product.discountPercentage > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{product.discountPercentage.toFixed(1)}%</Text>
                </View>
              )}
            </View>

            {details.length > 0 && (
              <View style={styles.detailsBox}>
                {details.map((d, i) => (
                  <View key={d.label} style={[styles.detailRow, i > 0 && styles.detailRowBorder]}>
                    <Text style={styles.detailLabel}>{d.label}</Text>
                    <Text style={styles.detailValue}>{d.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {!!product.description && (
              <>
                <Text style={styles.sectionTitle}>Descrizione</Text>
                <Text style={styles.description}>{product.description}</Text>
              </>
            )}

            {(!!product.dropName || !!product.pickupPointName) && (
              <View style={styles.detailsBox}>
                {!!product.dropName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Drop</Text>
                    <Text style={styles.detailValue}>{product.dropName}</Text>
                  </View>
                )}
                {!!product.pickupPointName && (
                  <View style={[styles.detailRow, !!product.dropName && styles.detailRowBorder]}>
                    <Text style={styles.detailLabel}>Ritiro</Text>
                    <Text style={styles.detailValue}>
                      {product.pickupPointName}
                      {product.pickupPointAddress ? `\n${product.pickupPointAddress}` : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {galleryOpen && (
        <ImageGallery
          images={images}
          visible={galleryOpen}
          initialIndex={index}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  content: { paddingBottom: 32 },
  photo: { width: PHOTO_WIDTH, height: PHOTO_WIDTH, backgroundColor: '#FFFFFF' },
  noPhoto: { alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.backgroundSecondary },
  noPhotoText: { fontSize: 14, color: colors.textSecondary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 20, backgroundColor: colors.text },
  body: { padding: 16, gap: 12 },
  status: { fontSize: 13, fontWeight: '700', color: colors.primary },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, lineHeight: 26 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  originalPrice: { fontSize: 16, color: colors.textSecondary, textDecorationLine: 'line-through' },
  finalPrice: { fontSize: 24, fontWeight: '800', color: colors.text },
  discountBadge: { backgroundColor: colors.success + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  discountText: { fontSize: 13, fontWeight: '700', color: colors.success },
  detailsBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11 },
  detailRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },
  description: { fontSize: 15, lineHeight: 22, color: colors.text },
});
