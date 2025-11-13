
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
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
import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';

interface Drop {
  id: string;
  name: string;
  status: 'pending_approval' | 'approved' | 'active' | 'inactive' | 'completed' | 'expired' | 'cancelled';
  current_discount: number;
  current_value: number;
  target_value: number;
  start_time: string;
  end_time: string;
  pickup_point_id: string;
  supplier_list_id: string;
  approved_at?: string;
  activated_at?: string;
  deactivated_at?: string;
  pickup_points?: {
    name: string;
    city: string;
  };
  supplier_lists?: {
    name: string;
    min_discount: number;
    max_discount: number;
  };
}

export default function ManageDropsScreen() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending_approval' | 'approved' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadDrops();
  }, []);

  const loadDrops = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('drops')
        .select(`
          *,
          pickup_points (
            name,
            city
          ),
          supplier_lists (
            name,
            min_discount,
            max_discount
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading drops:', error);
        Alert.alert('Errore', 'Impossibile caricare i drop');
        return;
      }

      setDrops(data || []);
    } catch (error) {
      console.error('Error loading drops:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDrops();
  };

  const handleApproveDrop = async (dropId: string, dropName: string) => {
    Alert.alert(
      'Approva Drop',
      `Sei sicuro di voler approvare il drop "${dropName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Approva',
          style: 'default',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('drops')
                .update({
                  status: 'approved',
                  approved_at: new Date().toISOString(),
                })
                .eq('id', dropId);

              if (error) {
                console.error('Error approving drop:', error);
                Alert.alert('Errore', 'Impossibile approvare il drop');
                return;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Drop approvato con successo');
              loadDrops();
            } catch (error) {
              console.error('Error approving drop:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const handleActivateDrop = async (dropId: string, dropName: string) => {
    Alert.alert(
      'Attiva Drop',
      `Sei sicuro di voler attivare il drop "${dropName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Attiva',
          style: 'default',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('drops')
                .update({
                  status: 'active',
                  activated_at: new Date().toISOString(),
                  start_time: new Date().toISOString(),
                })
                .eq('id', dropId);

              if (error) {
                console.error('Error activating drop:', error);
                Alert.alert('Errore', 'Impossibile attivare il drop');
                return;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Drop attivato con successo');
              loadDrops();
            } catch (error) {
              console.error('Error activating drop:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const handleDeactivateDrop = async (dropId: string, dropName: string) => {
    Alert.alert(
      'Disattiva Drop',
      `Sei sicuro di voler disattivare il drop "${dropName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Disattiva',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('drops')
                .update({
                  status: 'inactive',
                  deactivated_at: new Date().toISOString(),
                })
                .eq('id', dropId);

              if (error) {
                console.error('Error deactivating drop:', error);
                Alert.alert('Errore', 'Impossibile disattivare il drop');
                return;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Drop disattivato con successo');
              loadDrops();
            } catch (error) {
              console.error('Error deactivating drop:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return colors.warning;
      case 'approved':
        return colors.info;
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.textTertiary;
      case 'completed':
        return colors.primary;
      case 'expired':
        return colors.error;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return 'In Attesa';
      case 'approved':
        return 'Approvato';
      case 'active':
        return 'Attivo';
      case 'inactive':
        return 'Disattivato';
      case 'completed':
        return 'Completato';
      case 'expired':
        return 'Scaduto';
      case 'cancelled':
        return 'Annullato';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return { ios: 'clock.badge.exclamationmark', android: 'pending_actions' };
      case 'approved':
        return { ios: 'checkmark.circle', android: 'check_circle' };
      case 'active':
        return { ios: 'bolt.circle.fill', android: 'flash_on' };
      case 'inactive':
        return { ios: 'pause.circle', android: 'pause_circle' };
      case 'completed':
        return { ios: 'checkmark.circle.fill', android: 'check_circle' };
      case 'expired':
        return { ios: 'xmark.circle', android: 'cancel' };
      case 'cancelled':
        return { ios: 'xmark.circle.fill', android: 'cancel' };
      default:
        return { ios: 'circle', android: 'circle' };
    }
  };

  const filteredDrops = filter === 'all' 
    ? drops 
    : drops.filter(drop => drop.status === filter);

  const renderDrop = (drop: Drop) => {
    const statusIcon = getStatusIcon(drop.status);
    const canApprove = drop.status === 'pending_approval';
    const canActivate = drop.status === 'approved' || drop.status === 'inactive';
    const canDeactivate = drop.status === 'active';

    return (
      <View key={drop.id} style={styles.dropCard}>
        <View style={styles.dropHeader}>
          <View style={styles.dropInfo}>
            <Text style={styles.dropName}>{drop.name}</Text>
            <Text style={styles.dropLocation}>
              {drop.pickup_points?.city || 'N/A'} - {drop.pickup_points?.name || 'N/A'}
            </Text>
            <Text style={styles.dropSupplier}>
              Lista: {drop.supplier_lists?.name || 'N/A'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(drop.status) + '20' }]}>
            <IconSymbol
              ios_icon_name={statusIcon.ios}
              android_material_icon_name={statusIcon.android}
              size={16}
              color={getStatusColor(drop.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(drop.status) }]}>
              {getStatusText(drop.status)}
            </Text>
          </View>
        </View>

        <View style={styles.dropStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Sconto Attuale</Text>
            <Text style={styles.statValue}>{drop.current_discount}%</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Valore Attuale</Text>
            <Text style={styles.statValue}>€{drop.current_value.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Obiettivo</Text>
            <Text style={styles.statValue}>€{drop.target_value.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.dropActions}>
          {canApprove && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.approveButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleApproveDrop(drop.id, drop.name);
              }}
            >
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={18}
                color="#fff"
              />
              <Text style={styles.actionButtonText}>Approva</Text>
            </Pressable>
          )}

          {canActivate && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.activateButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleActivateDrop(drop.id, drop.name);
              }}
            >
              <IconSymbol
                ios_icon_name="bolt.circle.fill"
                android_material_icon_name="flash_on"
                size={18}
                color="#fff"
              />
              <Text style={styles.actionButtonText}>Attiva</Text>
            </Pressable>
          )}

          {canDeactivate && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.deactivateButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleDeactivateDrop(drop.id, drop.name);
              }}
            >
              <IconSymbol
                ios_icon_name="pause.circle.fill"
                android_material_icon_name="pause_circle"
                size={18}
                color="#fff"
              />
              <Text style={styles.actionButtonText}>Disattiva</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento drop...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gestisci Drop',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {[
              { key: 'all', label: 'Tutti' },
              { key: 'pending_approval', label: 'In Attesa' },
              { key: 'approved', label: 'Approvati' },
              { key: 'active', label: 'Attivi' },
              { key: 'inactive', label: 'Disattivati' },
            ].map((item) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.filterButton,
                  filter === item.key && styles.filterButtonActive,
                  pressed && styles.filterButtonPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilter(item.key as any);
                }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === item.key && styles.filterButtonTextActive,
                  ]}
                >
                  {item.label}
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
          {filteredDrops.length > 0 ? (
            filteredDrops.map(renderDrop)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="tray"
                android_material_icon_name="inbox"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessun drop trovato</Text>
              <Text style={styles.emptyText}>
                Non ci sono drop con il filtro selezionato
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
  dropCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dropInfo: {
    flex: 1,
    marginRight: 12,
  },
  dropName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  dropLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dropSupplier: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  dropActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  approveButton: {
    backgroundColor: colors.info,
  },
  activateButton: {
    backgroundColor: colors.success,
  },
  deactivateButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
  },
});
