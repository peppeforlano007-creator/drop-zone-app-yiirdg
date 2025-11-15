
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
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface SupplierList {
  id: string;
  name: string;
  min_discount: number;
  max_discount: number;
  min_reservation_value: number;
  max_reservation_value: number;
  status: string;
  created_at: string;
  products_count: number;
}

interface SupplierProfile {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
}

export default function SupplierDetailsScreen() {
  const { supplierId } = useLocalSearchParams<{ supplierId: string }>();
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null);
  const [lists, setLists] = useState<SupplierList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (supplierId) {
      loadSupplierDetails();
    }
  }, [supplierId]);

  const loadSupplierDetails = async () => {
    try {
      setLoading(true);

      // Load supplier profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supplierId)
        .single();

      if (profileError) {
        console.error('Error loading supplier profile:', profileError);
        Alert.alert('Errore', 'Impossibile caricare il profilo del fornitore');
        return;
      }

      setSupplier(profile);

      // Load supplier lists
      const { data: supplierLists, error: listsError } = await supabase
        .from('supplier_lists')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (listsError) {
        console.error('Error loading supplier lists:', listsError);
        Alert.alert('Errore', 'Impossibile caricare le liste del fornitore');
        return;
      }

      // Count products for each list
      const listsWithCounts = await Promise.all(
        (supplierLists || []).map(async (list) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('supplier_list_id', list.id);

          return {
            ...list,
            products_count: count || 0,
          };
        })
      );

      setLists(listsWithCounts);
    } catch (error) {
      console.error('Error loading supplier details:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSupplierDetails();
  };

  const handleViewList = (listId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/admin/list-details',
      params: { listId },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'inactive':
        return '#FF9800';
      case 'archived':
        return '#9E9E9E';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Attiva';
      case 'inactive':
        return 'Inattiva';
      case 'archived':
        return 'Archiviata';
      default:
        return status;
    }
  };

  const renderList = (list: SupplierList) => {
    return (
      <Pressable
        key={list.id}
        style={({ pressed }) => [
          styles.listCard,
          pressed && styles.listCardPressed,
        ]}
        onPress={() => handleViewList(list.id)}
      >
        <View style={styles.listHeader}>
          <View style={styles.listIconContainer}>
            <IconSymbol
              ios_icon_name="list.bullet.rectangle"
              android_material_icon_name="list_alt"
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listName}>{list.name}</Text>
            <Text style={styles.listDate}>
              Creata: {new Date(list.created_at).toLocaleDateString('it-IT')}
            </Text>
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
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.listStatValue}>{list.products_count}</Text>
            <Text style={styles.listStatLabel}>Prodotti</Text>
          </View>
          <View style={styles.listStatItem}>
            <IconSymbol
              ios_icon_name="percent"
              android_material_icon_name="percent"
              size={16}
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
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.listStatValue}>
              €{list.min_reservation_value.toLocaleString()}
            </Text>
            <Text style={styles.listStatLabel}>Min. Ordine</Text>
          </View>
        </View>

        <View style={styles.listFooter}>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron_right"
            size={20}
            color={colors.textTertiary}
          />
        </View>
      </Pressable>
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

  if (!supplier) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Dettagli Fornitore',
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={64}
            color="#FF3B30"
          />
          <Text style={styles.errorText}>Fornitore non trovato</Text>
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
          title: supplier.full_name || 'Dettagli Fornitore',
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
          {/* Supplier Info Card */}
          <View style={styles.supplierCard}>
            <View style={styles.supplierHeader}>
              <View style={styles.supplierIconContainer}>
                <IconSymbol
                  ios_icon_name="building.2.fill"
                  android_material_icon_name="store"
                  size={32}
                  color={colors.primary}
                />
              </View>
              <View style={styles.supplierInfo}>
                <Text style={styles.supplierName}>{supplier.full_name || 'N/A'}</Text>
                <Text style={styles.supplierEmail}>{supplier.email}</Text>
                {supplier.phone && (
                  <Text style={styles.supplierPhone}>📞 {supplier.phone}</Text>
                )}
              </View>
            </View>
            <View style={styles.supplierFooter}>
              <Text style={styles.supplierDate}>
                Registrato: {new Date(supplier.created_at).toLocaleDateString('it-IT')}
              </Text>
            </View>
          </View>

          {/* Lists Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Liste Prodotti</Text>
              <Text style={styles.sectionCount}>({lists.length})</Text>
            </View>

            {lists.length > 0 ? (
              lists.map(renderList)
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="tray"
                  android_material_icon_name="inbox"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text style={styles.emptyTitle}>Nessuna lista trovata</Text>
                <Text style={styles.emptyText}>
                  Questo fornitore non ha ancora creato liste di prodotti
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
  supplierCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  supplierIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  supplierEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  supplierPhone: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  supplierFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  supplierDate: {
    fontSize: 12,
    color: colors.textTertiary,
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
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  listIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  listDate: {
    fontSize: 12,
    color: colors.textTertiary,
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
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  listStatItem: {
    alignItems: 'center',
    gap: 4,
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
  listFooter: {
    alignItems: 'flex-end',
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
  },
});
