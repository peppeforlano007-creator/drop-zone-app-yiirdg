
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock: number;
  status: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  image_url: string;
  original_price: number;
  available_sizes: string[];
  available_colors: string[];
  condition: string;
  category: string;
  stock: number;
  status: string;
  created_at: string;
  sku: string | null;
  brand: string | null;
  variants?: ProductVariant[];
}

interface ListDetails {
  id: string;
  name: string;
  min_discount: number;
  max_discount: number;
  min_reservation_value: number;
  max_reservation_value: number;
  status: string;
  created_at: string;
  supplier_id: string;
  supplier_profile?: {
    full_name: string;
    email: string;
  };
}

export default function ListDetailsScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const [list, setList] = useState<ListDetails | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadListDetails = useCallback(async () => {
    try {
      setLoading(true);

      console.log('=== LOADING LIST DETAILS WITH VARIANTS ===');
      console.log('List ID:', listId);

      // Load list details first
      const { data: listData, error: listError } = await supabase
        .from('supplier_lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (listError) {
        console.error('Error loading list details:', listError);
        Alert.alert(
          'Errore',
          `Impossibile caricare i dettagli della lista: ${listError.message}\n\nCodice: ${listError.code}`
        );
        return;
      }

      console.log('✓ List data loaded:', listData.name);

      // Load supplier profile separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', listData.supplier_id)
        .single();

      if (profileError) {
        console.error('Error loading supplier profile:', profileError);
        // Don't fail the whole operation if profile loading fails
      }

      setList({
        ...listData,
        supplier_profile: profileData || undefined,
      });

      // Load products for this list
      console.log('→ Loading products...');
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_list_id', listId)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error loading products:', productsError);
        Alert.alert('Errore', 'Impossibile caricare i prodotti');
        return;
      }

      console.log(`✓ Loaded ${productsData?.length || 0} products`);

      // Load variants for all products
      if (productsData && productsData.length > 0) {
        console.log('→ Loading product variants...');
        const productIds = productsData.map(p => p.id);
        
        const { data: variantsData, error: variantsError } = await supabase
          .from('product_variants')
          .select('*')
          .in('product_id', productIds)
          .order('size', { ascending: true });

        if (variantsError) {
          console.error('Error loading variants:', variantsError);
          // Don't fail completely if variants fail to load
        } else {
          console.log(`✓ Loaded ${variantsData?.length || 0} variants`);
          
          // Create a map of product_id to variants
          const variantsMap = new Map<string, ProductVariant[]>();
          variantsData?.forEach(v => {
            if (!variantsMap.has(v.product_id)) {
              variantsMap.set(v.product_id, []);
            }
            variantsMap.get(v.product_id)!.push(v);
          });

          // Attach variants to products
          const productsWithVariants = productsData.map(product => ({
            ...product,
            variants: variantsMap.get(product.id) || [],
          }));

          setProducts(productsWithVariants);
          console.log('✓ Products with variants loaded');
          return;
        }
      }

      setProducts(productsData || []);
      console.log('=== LOADING COMPLETE ===');
    } catch (error) {
      console.error('❌ Exception loading list details:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listId]);

  useEffect(() => {
    if (listId) {
      loadListDetails();
    }
  }, [listId, loadListDetails]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadListDetails();
  };

  const handleToggleListStatus = async () => {
    if (!list) return;

    const newStatus = list.status === 'active' ? 'inactive' : 'active';
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Cambia Stato Lista',
      `Vuoi ${newStatus === 'active' ? 'attivare' : 'disattivare'} questa lista?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('supplier_lists')
                .update({ status: newStatus })
                .eq('id', listId);

              if (error) {
                console.error('Error updating list status:', error);
                Alert.alert('Errore', 'Impossibile aggiornare lo stato della lista');
                return;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', `Lista ${newStatus === 'active' ? 'attivata' : 'disattivata'} con successo`);
              loadListDetails();
            } catch (error) {
              console.error('Error updating list status:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const handleToggleProductStatus = async (productId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product status:', error);
        Alert.alert('Errore', 'Impossibile aggiornare lo stato del prodotto');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadListDetails();
    } catch (error) {
      console.error('Error updating product status:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    }
  };

  const handleToggleVariantStatus = async (variantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ status: newStatus })
        .eq('id', variantId);

      if (error) {
        console.error('Error updating variant status:', error);
        Alert.alert('Errore', 'Impossibile aggiornare lo stato della variante');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadListDetails();
    } catch (error) {
      console.error('Error updating variant status:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'inactive':
        return '#FF9800';
      case 'sold_out':
        return '#F44336';
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
        return '#4CAF50';
      case 'reso da cliente':
        return '#FF9800';
      case 'packaging rovinato':
        return '#2196F3';
      default:
        return colors.textSecondary;
    }
  };

  const renderProduct = (product: Product) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const totalVariantStock = hasVariants 
      ? product.variants!.reduce((sum, v) => sum + v.stock, 0)
      : 0;

    return (
      <View key={product.id} style={styles.productCard}>
        <View style={styles.productHeader}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.productImagePlaceholder]}>
              <IconSymbol
                ios_icon_name="photo"
                android_material_icon_name="image"
                size={32}
                color={colors.textTertiary}
              />
            </View>
          )}
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            {product.sku && (
              <View style={styles.skuBadge}>
                <IconSymbol
                  ios_icon_name="barcode"
                  android_material_icon_name="qr_code"
                  size={10}
                  color={colors.primary}
                />
                <Text style={styles.skuText}>SKU: {product.sku}</Text>
              </View>
            )}
            {product.brand && (
              <Text style={styles.productBrand}>{product.brand}</Text>
            )}
            <Text style={styles.productPrice}>
              €{product.original_price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </Text>
            <View style={styles.productMeta}>
              <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(product.condition) }]}>
                <Text style={styles.conditionBadgeText}>{product.condition}</Text>
              </View>
              {hasVariants ? (
                <Text style={styles.productStock}>
                  Stock totale: {totalVariantStock} ({product.variants!.length} varianti)
                </Text>
              ) : (
                <Text style={styles.productStock}>Stock: {product.stock}</Text>
              )}
            </View>
          </View>

          <View style={styles.productActions}>
            <Pressable
              style={[styles.statusButton, { backgroundColor: getStatusColor(product.status) }]}
              onPress={() => handleToggleProductStatus(product.id, product.status)}
            >
              <Text style={styles.statusButtonText}>{getStatusLabel(product.status)}</Text>
            </Pressable>
          </View>
        </View>

        {product.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        {/* Variants Section */}
        {hasVariants && (
          <View style={styles.variantsSection}>
            <View style={styles.variantsSectionHeader}>
              <IconSymbol
                ios_icon_name="square.grid.2x2"
                android_material_icon_name="grid_view"
                size={14}
                color={colors.primary}
              />
              <Text style={styles.variantsSectionTitle}>Varianti ({product.variants!.length})</Text>
            </View>
            
            {product.variants!.map((variant, index) => (
              <View key={variant.id} style={styles.variantRow}>
                <View style={styles.variantInfo}>
                  <View style={styles.variantDetails}>
                    {variant.size && (
                      <View style={styles.variantBadge}>
                        <IconSymbol
                          ios_icon_name="ruler"
                          android_material_icon_name="straighten"
                          size={10}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.variantBadgeText}>{variant.size}</Text>
                      </View>
                    )}
                    {variant.color && (
                      <View style={styles.variantBadge}>
                        <IconSymbol
                          ios_icon_name="paintpalette"
                          android_material_icon_name="palette"
                          size={10}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.variantBadgeText}>{variant.color}</Text>
                      </View>
                    )}
                    {!variant.size && !variant.color && (
                      <Text style={styles.variantBadgeText}>Variante {index + 1}</Text>
                    )}
                  </View>
                  <Text style={[
                    styles.variantStock,
                    { color: variant.stock > 0 ? colors.success : colors.error }
                  ]}>
                    Stock: {variant.stock}
                  </Text>
                </View>
                
                <Pressable
                  style={[
                    styles.variantStatusButton,
                    { backgroundColor: getStatusColor(variant.status) }
                  ]}
                  onPress={() => handleToggleVariantStatus(variant.id, variant.status)}
                >
                  <Text style={styles.variantStatusButtonText}>
                    {getStatusLabel(variant.status)}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.productDetails}>
          {product.available_sizes && product.available_sizes.length > 0 && (
            <View style={styles.productDetailItem}>
              <IconSymbol
                ios_icon_name="ruler"
                android_material_icon_name="straighten"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.productDetailText}>
                Taglie: {product.available_sizes.join(', ')}
              </Text>
            </View>
          )}
          
          {product.available_colors && product.available_colors.length > 0 && (
            <View style={styles.productDetailItem}>
              <IconSymbol
                ios_icon_name="paintpalette"
                android_material_icon_name="palette"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.productDetailText}>
                Colori: {product.available_colors.join(', ')}
              </Text>
            </View>
          )}
          
          {product.category && (
            <View style={styles.productDetailItem}>
              <IconSymbol
                ios_icon_name="tag"
                android_material_icon_name="label"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.productDetailText}>
                {product.category}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.productDate}>
          Aggiunto: {new Date(product.created_at).toLocaleDateString('it-IT')}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento dettagli...</Text>
      </View>
    );
  }

  if (!list) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Dettagli Lista',
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={64}
            color="#FF3B30"
          />
          <Text style={styles.errorText}>Lista non trovata</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Torna Indietro</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const totalProducts = products.length;
  const totalVariants = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
  const productsWithVariants = products.filter(p => p.variants && p.variants.length > 0).length;

  return (
    <>
      <Stack.Screen
        options={{
          title: list.name || 'Dettagli Lista',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
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
          {/* List Info Card */}
          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <View style={styles.listIconContainer}>
                <IconSymbol
                  ios_icon_name="list.bullet.rectangle"
                  android_material_icon_name="list_alt"
                  size={32}
                  color={colors.primary}
                />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{list.name}</Text>
                {list.supplier_profile && (
                  <Text style={styles.listSupplier}>
                    Fornitore: {list.supplier_profile.full_name}
                  </Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(list.status) }]}>
                <Text style={styles.statusBadgeText}>{getStatusLabel(list.status)}</Text>
              </View>
            </View>

            <View style={styles.listStats}>
              <View style={styles.listStatItem}>
                <IconSymbol
                  ios_icon_name="cube.box.fill"
                  android_material_icon_name="inventory"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.listStatValue}>{totalProducts}</Text>
                <Text style={styles.listStatLabel}>Prodotti</Text>
              </View>
              {totalVariants > 0 && (
                <View style={styles.listStatItem}>
                  <IconSymbol
                    ios_icon_name="square.grid.2x2"
                    android_material_icon_name="grid_view"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.listStatValue}>{totalVariants}</Text>
                  <Text style={styles.listStatLabel}>Varianti</Text>
                </View>
              )}
              <View style={styles.listStatItem}>
                <IconSymbol
                  ios_icon_name="percent"
                  android_material_icon_name="percent"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.listStatValue}>
                  {list.min_discount}% - {list.max_discount}%
                </Text>
                <Text style={styles.listStatLabel}>Sconto</Text>
              </View>
              <View style={styles.listStatItem}>
                <IconSymbol
                  ios_icon_name="eurosign.circle"
                  android_material_icon_name="euro"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.listStatValue}>
                  €{list.min_reservation_value.toLocaleString()} - €{list.max_reservation_value.toLocaleString()}
                </Text>
                <Text style={styles.listStatLabel}>Valore Ordine</Text>
              </View>
            </View>

            {productsWithVariants > 0 && (
              <View style={styles.variantsInfoBox}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={16}
                  color={colors.info}
                />
                <Text style={styles.variantsInfoText}>
                  {productsWithVariants} prodott{productsWithVariants === 1 ? 'o ha' : 'i hanno'} varianti (taglia/colore)
                </Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: list.status === 'active' ? '#FF9800' : '#4CAF50' }]}
                onPress={handleToggleListStatus}
              >
                <IconSymbol
                  ios_icon_name={list.status === 'active' ? 'pause.circle' : 'play.circle'}
                  android_material_icon_name={list.status === 'active' ? 'pause_circle' : 'play_circle'}
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.toggleButtonText}>
                  {list.status === 'active' ? 'Disattiva' : 'Attiva'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Products Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prodotti</Text>
              <Text style={styles.sectionCount}>({totalProducts})</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.addProductButton,
                  pressed && styles.addProductButtonPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/admin/add-product',
                    params: { 
                      listId,
                      supplierId: list.supplier_id,
                    },
                  });
                }}
              >
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add_circle"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.addProductButtonText}>Aggiungi</Text>
              </Pressable>
            </View>

            {products.length > 0 ? (
              products.map(renderProduct)
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="tray"
                  android_material_icon_name="inbox"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text style={styles.emptyTitle}>Nessun prodotto trovato</Text>
                <Text style={styles.emptyText}>
                  Questa lista non contiene ancora prodotti.
                  {'\n'}
                  Potrebbero esserci stati problemi durante l&apos;importazione.
                </Text>
              </View>
            )}
          </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  listIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  listSupplier: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  listStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  listStatItem: {
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  listStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  listStatLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  variantsInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '15',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  variantsInfoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionCount: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addProductButtonPressed: {
    opacity: 0.7,
  },
  addProductButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productImagePlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  skuBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  skuText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: '700',
  },
  productBrand: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conditionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  productStock: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  productActions: {
    justifyContent: 'center',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  productDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  variantsSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  variantsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  variantsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variantInfo: {
    flex: 1,
    marginRight: 8,
  },
  variantDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  variantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  variantBadgeText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  variantStock: {
    fontSize: 11,
    fontWeight: '600',
  },
  variantStatusButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  variantStatusButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  productDetails: {
    gap: 6,
    marginBottom: 12,
  },
  productDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  productDate: {
    fontSize: 11,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
