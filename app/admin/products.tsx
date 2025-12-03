
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
import { errorHandler, ErrorCategory, ErrorSeverity } from '@/utils/errorHandler';
import { Picker } from '@react-native-picker/picker';

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
    id: string;
    name: string;
  } | null;
  supplier_profile?: {
    full_name: string;
  } | null;
}

interface SupplierList {
  id: string;
  name: string;
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductData[]>([]);
  const [supplierLists, setSupplierLists] = useState<SupplierList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'sold_out'>('all');
  const [supplierListFilter, setSupplierListFilter] = useState<string>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 100;

  const filterProducts = useCallback(() => {
    let filtered = products;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => product.status === statusFilter);
    }

    // Filter by supplier list
    if (supplierListFilter !== 'all') {
      filtered = filtered.filter(product => product.supplier_lists?.id === supplierListFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.supplier_lists?.name?.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, statusFilter, supplierListFilter]);

  const loadSupplierLists = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_lists')
        .select('id, name')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading supplier lists:', error);
        return;
      }

      setSupplierLists(data || []);
    } catch (error) {
      console.error('Error loading supplier lists:', error);
    }
  }, []);

  const loadProducts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      console.log(`Loading products page ${pageNum} (${pageNum * PAGE_SIZE} - ${(pageNum + 1) * PAGE_SIZE - 1}) for admin...`);
      
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      // First, get all products with supplier_lists and count
      const { data: productsData, error: productsError, count } = await supabase
        .from('products')
        .select(`
          *,
          supplier_lists (
            id,
            name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (productsError) {
        console.error('Error loading products:', productsError);
        errorHandler.handleSupabaseError(productsError, { context: 'load_products' });
        return;
      }

      console.log(`Products loaded: ${productsData?.length || 0}, Total in DB: ${count}, Page: ${pageNum + 1}`);
      
      // Update total count
      if (count !== null) {
        setTotalCount(count);
      }

      // Check if there are more products to load
      setHasMore(count ? (from + PAGE_SIZE) < count : false);

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
            
            if (append) {
              setProducts(prev => [...prev, ...enrichedProducts]);
            } else {
              setProducts(enrichedProducts);
            }
          } else {
            console.error('Error loading profiles:', profilesError);
            if (append) {
              setProducts(prev => [...prev, ...productsData]);
            } else {
              setProducts(productsData);
            }
          }
        } else {
          if (append) {
            setProducts(prev => [...prev, ...productsData]);
          } else {
            setProducts(productsData);
          }
        }
      } else {
        if (!append) {
          setProducts([]);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
      errorHandler.handleError(
        'Errore imprevisto durante il caricamento dei prodotti',
        ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM,
        { context: 'load_products' },
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadSupplierLists();
    loadProducts(0, false);
  }, [loadSupplierLists, loadProducts]);

  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    loadProducts(0, false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadProducts(nextPage, true);
    }
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
      case 'nuovo':
        return colors.success;
      case 'reso da cliente':
        return colors.warning;
      case 'packaging rovinato':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    
    if (isCloseToBottom && !loadingMore && hasMore) {
      handleLoadMore();
    }
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
        {/* Search Bar */}
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
              placeholder="Cerca per nome, categoria, marca, SKU..."
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

        {/* Supplier List Filter */}
        <View style={styles.supplierFilterContainer}>
          <Text style={styles.filterLabel}>Lista Fornitore:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={supplierListFilter}
              onValueChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSupplierListFilter(value);
              }}
              style={styles.picker}
            >
              <Picker.Item label="Tutte le liste" value="all" />
              {supplierLists.map((list) => (
                <Picker.Item key={list.id} label={list.name} value={list.id} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Status Filter */}
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
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              Visualizzati: {filteredProducts.length} / {products.length} caricati / {totalCount} totali
            </Text>
            {hasMore && (
              <Text style={styles.loadMoreText}>
                Scorri per caricare altri
              </Text>
            )}
          </View>

          {filteredProducts.length > 0 ? (
            <>
              {filteredProducts.map((product, index) => (
                <Pressable
                  key={`${product.id}-${index}`}
                  style={({ pressed }) => [
                    styles.productCard,
                    pressed && styles.productCardPressed,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({
                      pathname: '/admin/edit-product',
                      params: { productId: product.id },
                    });
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
                            {product.condition}
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
              ))}
              {loadingMore && (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingMoreText}>Caricamento...</Text>
                </View>
              )}
              {!hasMore && products.length > 0 && (
                <View style={styles.endMessageContainer}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.endMessageText}>
                    Tutti i {totalCount} prodotti sono stati caricati
                  </Text>
                </View>
              )}
            </>
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
  supplierFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  loadMoreText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontStyle: 'italic',
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
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  endMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  endMessageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
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
