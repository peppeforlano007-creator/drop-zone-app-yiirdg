
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
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

interface SupplierData {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
  lists_count: number;
  products_count: number;
  active_drops_count: number;
}

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSuppliers = useCallback(async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      
      console.log('Loading suppliers...');
      
      // Get all supplier profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'supplier')
        .order('created_at', { ascending: false });

      console.log('Profiles query result:', { profiles, error: profilesError });

      if (profilesError) {
        console.error('Error loading suppliers:', profilesError);
        Alert.alert('Errore', `Impossibile caricare i fornitori: ${profilesError.message}`);
        return;
      }

      if (!profiles || profiles.length === 0) {
        console.log('No suppliers found in database');
        setSuppliers([]);
        return;
      }

      console.log(`Found ${profiles.length} supplier(s)`);

      // Get counts for each supplier
      const suppliersWithCounts = await Promise.all(
        profiles.map(async (profile) => {
          // Count lists
          const { count: listsCount } = await supabase
            .from('supplier_lists')
            .select('*', { count: 'exact', head: true })
            .eq('supplier_id', profile.user_id);

          // Count products
          const { count: productsCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('supplier_id', profile.user_id);

          // Count active drops
          const { data: lists } = await supabase
            .from('supplier_lists')
            .select('id')
            .eq('supplier_id', profile.user_id);

          let activeDropsCount = 0;
          if (lists && lists.length > 0) {
            const { count } = await supabase
              .from('drops')
              .select('*', { count: 'exact', head: true })
              .in('supplier_list_id', lists.map(l => l.id))
              .eq('status', 'active');
            activeDropsCount = count || 0;
          }

          return {
            ...profile,
            lists_count: listsCount || 0,
            products_count: productsCount || 0,
            active_drops_count: activeDropsCount,
          };
        })
      );

      console.log('Suppliers with counts:', suppliersWithCounts);
      setSuppliers(suppliersWithCounts);
    } catch (error) {
      console.error('Exception loading suppliers:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante il caricamento dei fornitori');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // Load suppliers when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadSuppliers();
    }, [loadSuppliers])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadSuppliers();
  };

  const handleViewSupplier = (supplierId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/admin/supplier-details',
      params: { supplierId },
    });
  };

  const handleDeleteSupplier = (supplier: SupplierData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Elimina Fornitore',
      `Sei sicuro di voler eliminare il fornitore "${supplier.full_name}"?\n\nQuesta azione eliminerà anche:\n- ${supplier.lists_count} liste\n- ${supplier.products_count} prodotti\n\nQuesta azione non può essere annullata.`,
      [
        {
          text: 'Annulla',
          style: 'cancel',
        },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              console.log('Deleting supplier:', supplier.user_id);
              
              // Delete products first
              const { error: productsError } = await supabase
                .from('products')
                .delete()
                .eq('supplier_id', supplier.user_id);
              
              if (productsError) {
                console.error('Error deleting products:', productsError);
                Alert.alert('Errore', `Impossibile eliminare i prodotti: ${productsError.message}`);
                return;
              }
              
              // Delete supplier lists
              const { error: listsError } = await supabase
                .from('supplier_lists')
                .delete()
                .eq('supplier_id', supplier.user_id);
              
              if (listsError) {
                console.error('Error deleting lists:', listsError);
                Alert.alert('Errore', `Impossibile eliminare le liste: ${listsError.message}`);
                return;
              }
              
              // Delete profile
              const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('user_id', supplier.user_id);
              
              if (profileError) {
                console.error('Error deleting profile:', profileError);
                Alert.alert('Errore', `Impossibile eliminare il profilo: ${profileError.message}`);
                return;
              }
              
              // Delete auth user (this will cascade delete everything else)
              const { error: authError } = await supabase.auth.admin.deleteUser(supplier.user_id);
              
              if (authError) {
                console.error('Error deleting auth user:', authError);
                // Don't show error if profile was already deleted
              }
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Fornitore eliminato con successo');
              
              // Reload suppliers
              loadSuppliers();
            } catch (error) {
              console.error('Exception deleting supplier:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Errore', 'Si è verificato un errore durante l\'eliminazione');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderSupplier = (supplier: SupplierData) => {
    return (
      <View key={supplier.id} style={styles.supplierCard}>
        <Pressable
          style={({ pressed }) => [
            styles.supplierContent,
            pressed && styles.supplierContentPressed,
          ]}
          onPress={() => handleViewSupplier(supplier.user_id)}
        >
          <View style={styles.supplierHeader}>
            <View style={styles.supplierIconContainer}>
              <IconSymbol
                ios_icon_name="building.2.fill"
                android_material_icon_name="store"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.supplierInfo}>
              <Text style={styles.supplierName}>{supplier.full_name || 'N/A'}</Text>
              <Text style={styles.supplierEmail}>{supplier.email}</Text>
              {supplier.phone && (
                <Text style={styles.supplierPhone}>{supplier.phone}</Text>
              )}
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={20}
              color={colors.textTertiary}
            />
          </View>

          <View style={styles.supplierStats}>
            <View style={styles.statItem}>
              <IconSymbol
                ios_icon_name="list.bullet"
                android_material_icon_name="list"
                size={16}
                color={colors.info}
              />
              <Text style={styles.statValue}>{supplier.lists_count}</Text>
              <Text style={styles.statLabel}>Liste</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol
                ios_icon_name="cube.box.fill"
                android_material_icon_name="inventory"
                size={16}
                color={colors.success}
              />
              <Text style={styles.statValue}>{supplier.products_count}</Text>
              <Text style={styles.statLabel}>Prodotti</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol
                ios_icon_name="bolt.circle.fill"
                android_material_icon_name="flash_on"
                size={16}
                color={colors.warning}
              />
              <Text style={styles.statValue}>{supplier.active_drops_count}</Text>
              <Text style={styles.statLabel}>Drop Attivi</Text>
            </View>
          </View>

          <View style={styles.supplierFooter}>
            <Text style={styles.supplierDate}>
              Registrato: {new Date(supplier.created_at).toLocaleDateString('it-IT')}
            </Text>
          </View>
        </Pressable>
        
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
          onPress={() => handleDeleteSupplier(supplier)}
        >
          <IconSymbol
            ios_icon_name="trash.fill"
            android_material_icon_name="delete"
            size={20}
            color="#FF3B30"
          />
          <Text style={styles.deleteButtonText}>Elimina</Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento fornitori...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gestisci Fornitori',
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
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              {suppliers.length} fornitor{suppliers.length === 1 ? 'e' : 'i'}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.createButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/create-supplier');
              }}
            >
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add_circle"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.createButtonText}>Nuovo</Text>
            </Pressable>
          </View>

          {suppliers.length > 0 ? (
            suppliers.map(renderSupplier)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="building.2"
                android_material_icon_name="store"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessun fornitore trovato</Text>
              <Text style={styles.emptyText}>
                I fornitori creati appariranno qui.{'\n'}
                Premi "Nuovo" per creare un fornitore.
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createButtonPressed: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  supplierCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  supplierContent: {
    padding: 16,
  },
  supplierContentPressed: {
    opacity: 0.7,
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  supplierIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  supplierEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  supplierPhone: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  supplierStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  supplierFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplierDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F0',
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteButtonPressed: {
    opacity: 0.7,
    backgroundColor: '#FFE5E3',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
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
    lineHeight: 20,
  },
});
