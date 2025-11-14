
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface ProductData {
  id: string;
  name: string;
  description: string;
  image_url: string;
  original_price: number;
  condition: string;
  category: string;
  stock: number;
  status: string;
  created_at: string;
  supplier_lists: {
    name: string;
  } | null;
  supplier_profile?: {
    full_name: string;
  } | null;
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'sold_out'>('all');

  const filterProducts = useCallback(() => {
    let filtered = products;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => product.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.supplier_lists?.name?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, statusFilter]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading products for admin...');
      
      // First, get all products with supplier_lists
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          supplier_lists (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (productsError) {
        console.error('Error loading products:', productsError);
        Alert.alert('Errore', `Impossibile caricare i prodotti: ${productsError.message}`);
        return;
      }

      console.log('Products loaded:', productsData?.length || 0);

      // Then, get supplier profiles separately
      if (productsData && productsData.length > 0) {
        const supplierIds = [...new Set(productsData.map(p => p.supplier_id).filter(Boolean))];
        
        if (supplierIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', supplierIds);

          if (!profilesError && profilesData) {
            // Create a map of supplier_id to profile
            const profilesMap = new Map(profilesData.map(p => [p.user_id, p]));
            
            // Merge the data
            const enrichedProducts = productsData.map(product => ({
              ...product,
              supplier_profile: product.supplier_id ? profilesMap.get(product.supplier_id) : null
            }));
            
            setProducts(enrichedProducts);
          } else {
            console.error('Error loading profiles:', profilesError);
            setProducts(productsData);
          }
        } else {
          setProducts(productsData);
        }
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante il caricamento dei prodotti');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.textTertiary;
      case 'sold_out':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Attivo';
      case 'inactive':
        return 'Inattivo';
      case 'sold_out':
        return 'Esaurito';
      default:
        return status;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new':
        return colors.success;
      case 'like_new':
        return colors.info;
      case 'good':
        return colors.warning;
      case 'fair':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'new':
        return 'Nuovo';
      case 'like_new':
        return 'Come Nuovo';
      case 'good':
        return 'Buono';
      case 'fair':
        return 'Discreto';
      default:
        return condition;
    }
  };

  const renderProduct = (product: ProductData) => {
    return (
      <Pressable
        key={product.id}
        style={({ pressed }) => [
          styles.productCard,
          pressed && styles.productCardPressed,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert('Prodotto', `Dettagli per: ${product.name}`);
        }}
      >
        <Image
          source={{ uri: product.image_url }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <View style={styles.badges}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(product.status) }]}>
                  {getStatusLabel(product.status)}
                </Text>
              </View>
              <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(product.condition) + '20' }]}>
                <Text style={[styles.conditionText, { color: getConditionColor(product.condition) }]}>
                  {getConditionLabel(product.condition)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.productSupplier}>
            Fornitore: {product.supplier_profile?.full_name || 'N/A'}
          </Text>
          <Text style={styles.productList}>
            Lista: {product.supplier_lists?.name || 'N/A'}
          </Text>
          {product.category && (
            <Text style={styles.productCategory}>
              Categoria: {product.category}
            </Text>
          )}

          <View style={styles.productFooter}>
            <View style={styles.priceContainer}>
              <Text style={styles.productPrice}>€{product.original_price.toFixed(2)}</Text>
              <Text style={styles.productStock}>Stock: {product.stock}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento prodotti...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gestisci Prodotti',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={20}
              color={colors.textTertiary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca prodotti..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {[
              { key: 'all', label: 'Tutti', count: products.length },
              { key: 'active', label: 'Attivi', count: products.filter(p => p.status === 'active').length },
              { key: 'inactive', label: 'Inattivi', count: products.filter(p => p.status === 'inactive').length },
              { key: 'sold_out', label: 'Esauriti', count: products.filter(p => p.status === 'sold_out').length },
            ].map((item) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.filterButton,
                  statusFilter === item.key && styles.filterButtonActive,
                  pressed && styles.filterButtonPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStatusFilter(item.key as any);
                }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    statusFilter === item.key && styles.filterButtonTextActive,
                  ]}
                >
                  {item.label} ({item.count})
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              {filteredProducts.length} prodott{filteredProducts.length === 1 ? 'o' : 'i'} trovat{filteredProducts.length === 1 ? 'o' : 'i'}
            </Text>
          </View>

          {filteredProducts.length > 0 ? (
            filteredProducts.map(renderProduct)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="cube.box"
                android_material_icon_name="inventory"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessun prodotto trovato</Text>
              <Text style={styles.emptyText}>
                {products.length === 0 
                  ? 'Non ci sono ancora prodotti nel sistema. I fornitori possono importare prodotti dalla loro dashboard.'
                  : 'Prova a modificare i filtri di ricerca'}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  filterContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonPressed: {
    opacity: 0.7,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  statsRow: {
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  productCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  productCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.backgroundSecondary,
  },
  productInfo: {
    padding: 16,
  },
  productHeader: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  productSupplier: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  productList: {
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  productStock: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
