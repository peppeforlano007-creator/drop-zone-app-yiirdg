
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import CachedImage from '@/components/CachedImage';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface WishlistItem {
  id: string;
  product_id: string;
  drop_id: string;
  created_at: string;
  products: {
    id: string;
    name: string;
    image_url: string;
    original_price: number;
    stock: number;
    status: string;
  };
  drops: {
    id: string;
    name: string;
    status: string;
    current_discount: number;
    end_time: string;
  };
}

export default function WishlistScreen() {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWishlist = useCallback(async () => {
    if (!user) {
      console.log('No user, skipping wishlist load');
      setLoading(false);
      return;
    }

    try {
      console.log('Loading wishlist for user:', user.id);
      
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
            stock,
            status
          ),
          drops (
            id,
            name,
            status,
            current_discount,
            end_time
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading wishlist:', error);
        Alert.alert('Errore', 'Impossibile caricare la wishlist');
        return;
      }

      console.log('Wishlist loaded:', data?.length || 0, 'items');
      setWishlistItems(data || []);
    } catch (error) {
      console.error('Exception loading wishlist:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante il caricamento');
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
              const { error } = await supabase
                .from('wishlists')
                .delete()
                .eq('id', wishlistId);

              if (error) {
                console.error('Error removing from wishlist:', error);
                Alert.alert('Errore', 'Impossibile rimuovere l\'articolo');
                return;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setWishlistItems(prev => prev.filter(item => item.id !== wishlistId));
            } catch (error) {
              console.error('Exception removing from wishlist:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const handleItemPress = (item: WishlistItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Check if drop is still active
    if (item.drops.status !== 'active') {
      Alert.alert(
        'Drop Terminato',
        'Questo drop non è più attivo. L\'articolo non è più disponibile per la prenotazione.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if product is still available
    if (item.products.stock <= 0) {
      Alert.alert(
        'Prodotto Esaurito',
        'Questo prodotto è esaurito. Non è più disponibile per la prenotazione.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to drop details with scroll to product
    console.log('Navigating to drop:', item.drop_id, 'product:', item.product_id);
    router.push({
      pathname: '/drop-details',
      params: {
        dropId: item.drop_id,
        scrollToProductId: item.product_id,
      },
    });
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => {
    const isDropActive = item.drops.status === 'active';
    const isProductAvailable = item.products.stock > 0;
    const currentDiscount = item.drops.current_discount || 0;
    const discountedPrice = item.products.original_price * (1 - currentDiscount / 100);

    return (
      <Pressable
        style={styles.card}
        onPress={() => handleItemPress(item)}
        disabled={!isDropActive || !isProductAvailable}
      >
        <View style={styles.imageContainer}>
          <CachedImage
            source={{ uri: item.products.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* Remove button */}
          <Pressable
            style={styles.removeButton}
            onPress={() => handleRemoveFromWishlist(item.id, item.products.name)}
          >
            <IconSymbol
              ios_icon_name="xmark.circle.fill"
              android_material_icon_name="cancel"
              size={24}
              color="#FFF"
            />
          </Pressable>

          {/* Status badges */}
          {!isDropActive && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Drop Terminato</Text>
            </View>
          )}
          {isDropActive && !isProductAvailable && (
            <View style={[styles.statusBadge, styles.outOfStockBadge]}>
              <Text style={styles.statusText}>Esaurito</Text>
            </View>
          )}
          {isDropActive && isProductAvailable && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{Math.floor(currentDiscount)}%</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.products.name}
          </Text>
          <Text style={styles.dropName} numberOfLines={1}>
            {item.drops.name}
          </Text>
          
          {isDropActive && isProductAvailable ? (
            <View style={styles.priceRow}>
              <Text style={styles.price}>€{discountedPrice.toFixed(2)}</Text>
              <Text style={styles.originalPrice}>€{item.products.original_price.toFixed(2)}</Text>
            </View>
          ) : (
            <Text style={styles.unavailableText}>Non disponibile</Text>
          )}
        </View>
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
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: '❤️ La mia wishlist',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="person.crop.circle.badge.exclamationmark"
            android_material_icon_name="account_circle"
            size={64}
            color={colors.textTertiary}
          />
          <Text style={styles.emptyTitle}>Accesso Richiesto</Text>
          <Text style={styles.emptyText}>
            Effettua l&apos;accesso per visualizzare la tua wishlist
          </Text>
          <Pressable
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Accedi</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: '❤️ La mia wishlist',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="heart.slash"
            android_material_icon_name="heart_broken"
            size={64}
            color={colors.textTertiary}
          />
          <Text style={styles.emptyTitle}>Wishlist Vuota</Text>
          <Text style={styles.emptyText}>
            Non hai ancora aggiunto articoli alla tua wishlist.{'\n'}
            Esplora i drop attivi e salva i tuoi prodotti preferiti!
          </Text>
          <Pressable
            style={styles.exploreButton}
            onPress={() => router.push('/(tabs)/drops')}
          >
            <Text style={styles.exploreButtonText}>Esplora Drop</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '❤️ La mia wishlist',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <FlatList
        data={wishlistItems}
        renderItem={renderWishlistItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
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
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  exploreButton: {
    backgroundColor: colors.text,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.2,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  discountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  cardContent: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  dropName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  unavailableText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
});
