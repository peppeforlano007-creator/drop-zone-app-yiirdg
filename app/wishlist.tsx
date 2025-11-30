
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

interface WishlistItem {
  id: string;
  product_id: string;
  drop_id: string | null;
  created_at: string;
  products: {
    id: string;
    name: string;
    image_url: string;
    original_price: number;
    brand: string | null;
    category: string | null;
    stock: number;
    supplier_list_id: string;
  };
  drops: {
    id: string;
    name: string;
    status: string;
  } | null;
}

export default function WishlistScreen() {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    if (!user) {
      console.log('❌ No user logged in');
      setLoading(false);
      return;
    }

    try {
      console.log('📥 Loading wishlist for user:', user.id);

      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          id,
          product_id,
          drop_id,
          created_at,
          products (
            id,
            name,
            image_url,
            original_price,
            brand,
            category,
            stock,
            supplier_list_id
          ),
          drops (
            id,
            name,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading wishlist:', error);
        Alert.alert('Errore', 'Impossibile caricare la wishlist');
        return;
      }

      setWishlistItems(data || []);
      console.log('✅ Wishlist loaded:', data?.length || 0, 'items');
    } catch (error) {
      console.error('❌ Exception loading wishlist:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWishlist();
  };

  const handleRemoveFromWishlist = async (wishlistId: string, productName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Rimuovi dalla Wishlist',
      `Vuoi rimuovere "${productName}" dalla tua wishlist?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingId(wishlistId);

              const { error } = await supabase
                .from('wishlists')
                .delete()
                .eq('id', wishlistId);

              if (error) {
                console.error('❌ Error removing from wishlist:', error);
                Alert.alert('Errore', 'Impossibile rimuovere dalla wishlist');
                return;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setWishlistItems(prev => prev.filter(item => item.id !== wishlistId));
              console.log('✅ Item removed from wishlist');
            } catch (error) {
              console.error('❌ Exception removing from wishlist:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const handleGoToProduct = async (item: WishlistItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if the product is in an active drop
    if (item.drop_id && item.drops) {
      const dropStatus = item.drops.status;
      
      if (dropStatus === 'active' || dropStatus === 'approved') {
        // Navigate to the drop details screen with the product ID
        console.log('🚀 Navigating to drop:', item.drop_id, 'product:', item.product_id);
        router.push({
          pathname: '/drop-details',
          params: { 
            dropId: item.drop_id,
            scrollToProductId: item.product_id,
          },
        });
      } else {
        Alert.alert(
          'Drop non più attivo',
          `Il drop "${item.drops.name}" non è più attivo. Il prodotto potrebbe apparire in un nuovo drop in futuro.`,
          [{ text: 'OK' }]
        );
      }
    } else {
      // Product not in a drop yet
      Alert.alert(
        'Prodotto non in un Drop',
        'Questo prodotto non è ancora in un drop attivo. Controlla la sezione Drop per vedere quando sarà disponibile!',
        [
          { text: 'OK' },
          { 
            text: 'Vai ai Drop', 
            onPress: () => router.push('/(tabs)/drops')
          }
        ]
      );
    }
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => {
    const product = item.products;
    const isRemoving = removingId === item.id;
    const isOutOfStock = product.stock <= 0;
    const isInActiveDrop = item.drop_id && item.drops && (item.drops.status === 'active' || item.drops.status === 'approved');

    return (
      <Pressable
        style={[styles.wishlistCard, isOutOfStock && styles.wishlistCardOutOfStock]}
        onPress={() => handleGoToProduct(item)}
        disabled={isRemoving}
      >
        <Image
          source={{ uri: product.image_url }}
          style={styles.productImage}
          resizeMode="cover"
        />

        {isOutOfStock && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Esaurito</Text>
          </View>
        )}

        {isInActiveDrop && (
          <View style={styles.dropActiveBadge}>
            <IconSymbol
              ios_icon_name="bolt.fill"
              android_material_icon_name="flash_on"
              size={12}
              color="#FFF"
            />
            <Text style={styles.dropActiveText}>Drop Attivo</Text>
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

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

          <Text style={styles.productPrice}>€{product.original_price.toFixed(2)}</Text>

          {product.stock > 0 && (
            <View style={styles.stockInfo}>
              <IconSymbol
                ios_icon_name="cube.box.fill"
                android_material_icon_name="inventory"
                size={12}
                color={colors.success}
              />
              <Text style={styles.stockText}>{product.stock} disponibili</Text>
            </View>
          )}

          {item.drops && (
            <View style={styles.dropInfo}>
              <IconSymbol
                ios_icon_name="tag.circle.fill"
                android_material_icon_name="local_offer"
                size={12}
                color={colors.primary}
              />
              <Text style={styles.dropInfoText} numberOfLines={1}>
                {item.drops.name}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          style={styles.removeButton}
          onPress={() => handleRemoveFromWishlist(item.id, product.name)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <IconSymbol
              ios_icon_name="trash.fill"
              android_material_icon_name="delete"
              size={20}
              color={colors.error}
            />
          )}
        </Pressable>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: '❤️ La mia wishlist',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '❤️ La mia wishlist',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {wishlistItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="heart"
              android_material_icon_name="favorite_border"
              size={80}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>Wishlist Vuota</Text>
            <Text style={styles.emptyText}>
              Non hai ancora salvato nessun prodotto nella tua wishlist.
              {'\n\n'}
              Usa il cuore ❤️ sulle card prodotto nei drop per salvare i prodotti che ti interessano!
            </Text>
            <Pressable
              style={styles.goToFeedButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(tabs)/drops');
              }}
            >
              <IconSymbol
                ios_icon_name="tag.fill"
                android_material_icon_name="local_offer"
                size={20}
                color={colors.background}
              />
              <Text style={styles.goToFeedButtonText}>Vai ai Drop</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={wishlistItems}
            renderItem={renderWishlistItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListHeaderComponent={
              <View style={styles.headerContainer}>
                <Text style={styles.headerText}>
                  {wishlistItems.length} {wishlistItems.length === 1 ? 'prodotto salvato' : 'prodotti salvati'}
                </Text>
                <View style={styles.infoCard}>
                  <IconSymbol
                    ios_icon_name="info.circle.fill"
                    android_material_icon_name="info"
                    size={16}
                    color={colors.info}
                  />
                  <Text style={styles.infoText}>
                    Tocca un prodotto per andare direttamente al suo drop. I prodotti con il badge "Drop Attivo" sono disponibili per la prenotazione!
                  </Text>
                </View>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  goToFeedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.text,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  goToFeedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerContainer: {
    marginBottom: 16,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  wishlistCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  wishlistCardOutOfStock: {
    opacity: 0.6,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  dropActiveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dropActiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  dropInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
});
