
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (listId) {
      loadListDetails();
    }
  }, [listId]);

  const loadListDetails = async () => {
    try {
      setLoading(true);

      console.log('Loading list details for listId:', listId);

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

      console.log('List data loaded:', listData);

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

      setProducts(productsData || []);
      console.log(`Loaded ${productsData?.length || 0} products for list ${listId}`);
    } catch (error) {
      console.error('Error loading list details:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
            <Text style={styles.productPrice}>
              €{product.original_price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </Text>
            <View style={styles.productMeta}>
              <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(product.condition) }]}>
                <Text style={styles.conditionBadgeText}>{product.condition}</Text>
              </View>
              <Text style={styles.productStock}>Stock: {product.stock}</Text>
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
                <Text style={styles.listStatValue}>{products.length}</Text>
                <Text style={styles.listStatLabel}>Prodotti</Text>
              </View>
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
                {list.status === 'active' ? 'Disattiva Lista' : 'Attiva Lista'}
              </Text>
            </Pressable>
          </View>

          {/* Products Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prodotti</Text>
              <Text style={styles.sectionCount}>({products.length})</Text>
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
  },
  listStatItem: {
    alignItems: 'center',
    gap: 6,
  },
  listStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  listStatLabel: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  toggleButtonText: {
    fontSize: 16,
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
