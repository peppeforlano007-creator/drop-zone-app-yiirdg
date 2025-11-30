
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';

interface BlockedUser {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  orders_returned: number;
  items_returned: number;
  blocked_reason: string;
  blocked_at: string;
  rating_stars: number;
}

interface Coupon {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number;
  points_required: number;
  is_active: boolean;
}

export default function LoyaltyProgramManagementScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedTab, setSelectedTab] = useState<'users' | 'coupons'>('users');
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ [key: string]: { discount: string; points: string } }>({});
  const [savingCoupon, setSavingCoupon] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load blocked users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, orders_returned, items_returned, blocked_reason, blocked_at, rating_stars')
        .eq('account_blocked', true)
        .order('blocked_at', { ascending: false });

      if (usersError) {
        console.error('Error loading blocked users:', usersError);
      } else {
        setBlockedUsers(usersData || []);
      }

      // Load coupons
      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select('*')
        .order('points_required', { ascending: true });

      if (couponsError) {
        console.error('Error loading coupons:', couponsError);
      } else {
        setCoupons(couponsData || []);
        // Initialize edit values
        const initialValues: { [key: string]: { discount: string; points: string } } = {};
        couponsData?.forEach(coupon => {
          initialValues[coupon.id] = {
            discount: coupon.discount_percentage.toString(),
            points: coupon.points_required.toString(),
          };
        });
        setEditValues(initialValues);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante il caricamento dei dati');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUnblockUser = async (userId: string, userName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Sblocca Utente',
      `Vuoi sbloccare l'account di ${userName}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Sblocca',
          onPress: async () => {
            try {
              setUnblocking(userId);

              const { data, error } = await supabase.rpc('admin_unblock_user', {
                p_user_id: userId,
                p_admin_id: user?.id,
              });

              if (error) {
                console.error('Error unblocking user:', error);
                Alert.alert('Errore', 'Impossibile sbloccare l\'utente');
                return;
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Utente sbloccato con successo');
              loadData();
            } catch (error: any) {
              console.error('Error unblocking user:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]
    );
  };

  const handleUpdateCoupon = async (couponId: string) => {
    const values = editValues[couponId];
    if (!values) return;

    const discount = parseInt(values.discount);
    const points = parseInt(values.points);

    if (isNaN(discount) || discount <= 0 || discount > 100) {
      Alert.alert('Errore', 'La percentuale di sconto deve essere tra 1 e 100');
      return;
    }

    if (isNaN(points) || points <= 0) {
      Alert.alert('Errore', 'I punti richiesti devono essere maggiori di 0');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setSavingCoupon(couponId);
      console.log('Updating coupon:', couponId, 'with values:', { discount, points });

      // First, update the coupon
      const { error: updateError } = await supabase
        .from('coupons')
        .update({
          discount_percentage: discount,
          points_required: points,
          updated_at: new Date().toISOString(),
        })
        .eq('id', couponId);

      if (updateError) {
        console.error('Error updating coupon:', updateError);
        Alert.alert('Errore', `Impossibile aggiornare il coupon: ${updateError.message}`);
        return;
      }

      // Then, fetch the updated coupon to verify
      const { data: updatedData, error: fetchError } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', couponId)
        .single();

      if (fetchError) {
        console.error('Error fetching updated coupon:', fetchError);
        Alert.alert('Errore', 'Coupon aggiornato ma impossibile verificare le modifiche');
        return;
      }

      console.log('Coupon updated successfully:', updatedData);

      // Update local state immediately to reflect changes
      setCoupons(prevCoupons => 
        prevCoupons.map(coupon => 
          coupon.id === couponId 
            ? updatedData
            : coupon
        )
      );

      // Update edit values to match the new values
      setEditValues(prev => ({
        ...prev,
        [couponId]: {
          discount: updatedData.discount_percentage.toString(),
          points: updatedData.points_required.toString(),
        },
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Successo', 'Coupon aggiornato con successo');
      setEditingCoupon(null);
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      Alert.alert('Errore', `Si è verificato un errore: ${error.message || 'Errore sconosciuto'}`);
    } finally {
      setSavingCoupon(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Gestione Programma Fedeltà',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Gestione Programma Fedeltà',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, selectedTab === 'users' && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('users');
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'users' && styles.tabTextActive]}>
              Utenti Bloccati ({blockedUsers.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, selectedTab === 'coupons' && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('coupons');
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'coupons' && styles.tabTextActive]}>
              Gestione Coupon ({coupons.length})
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {selectedTab === 'users' ? (
            <React.Fragment>
              {/* Info Card */}
              <View style={styles.infoCard}>
                <IconSymbol 
                  ios_icon_name="info.circle.fill" 
                  android_material_icon_name="info"
                  size={20} 
                  color={colors.info} 
                />
                <Text style={styles.infoText}>
                  Utenti bloccati per 5 ordini rispediti al fornitore o molti articoli restituiti. 
                  Puoi sbloccare manualmente gli account.
                </Text>
              </View>

              {/* Blocked Users List */}
              {blockedUsers.length > 0 ? (
                blockedUsers.map((blockedUser, index) => (
                  <View key={index} style={styles.userCard}>
                    <View style={styles.userHeader}>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{blockedUser.full_name || 'Utente'}</Text>
                        <Text style={styles.userEmail}>{blockedUser.email}</Text>
                        {blockedUser.phone && (
                          <Text style={styles.userPhone}>{blockedUser.phone}</Text>
                        )}
                      </View>
                      <View style={styles.ratingBadge}>
                        <IconSymbol 
                          ios_icon_name="star.fill" 
                          android_material_icon_name="star"
                          size={16} 
                          color="#FFD700" 
                        />
                        <Text style={styles.ratingText}>{blockedUser.rating_stars}</Text>
                      </View>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Ordini Rispediti</Text>
                        <Text style={styles.statValue}>{blockedUser.orders_returned}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Articoli Resi</Text>
                        <Text style={styles.statValue}>{blockedUser.items_returned}</Text>
                      </View>
                    </View>

                    <View style={styles.blockInfo}>
                      <Text style={styles.blockReason}>{blockedUser.blocked_reason}</Text>
                      <Text style={styles.blockDate}>
                        Bloccato il {new Date(blockedUser.blocked_at).toLocaleDateString('it-IT')}
                      </Text>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.unblockButton,
                        pressed && styles.unblockButtonPressed,
                        unblocking === blockedUser.user_id && styles.unblockButtonDisabled,
                      ]}
                      onPress={() => handleUnblockUser(blockedUser.user_id, blockedUser.full_name)}
                      disabled={unblocking === blockedUser.user_id}
                    >
                      {unblocking === blockedUser.user_id ? (
                        <ActivityIndicator size="small" color={colors.background} />
                      ) : (
                        <React.Fragment>
                          <IconSymbol 
                            ios_icon_name="lock.open.fill" 
                            android_material_icon_name="lock_open"
                            size={20} 
                            color={colors.background} 
                          />
                          <Text style={styles.unblockButtonText}>Sblocca Utente</Text>
                        </React.Fragment>
                      )}
                    </Pressable>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol 
                    ios_icon_name="checkmark.circle" 
                    android_material_icon_name="check_circle"
                    size={64} 
                    color={colors.textTertiary} 
                  />
                  <Text style={styles.emptyStateText}>
                    Nessun utente bloccato
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Tutti gli utenti hanno un buon comportamento
                  </Text>
                </View>
              )}
            </React.Fragment>
          ) : (
            <React.Fragment>
              {/* Info Card */}
              <View style={styles.infoCard}>
                <IconSymbol 
                  ios_icon_name="info.circle.fill" 
                  android_material_icon_name="info"
                  size={20} 
                  color={colors.info} 
                />
                <Text style={styles.infoText}>
                  Modifica le percentuali di sconto e i punti richiesti per ogni coupon. 
                  Le modifiche si rifletteranno immediatamente nell&apos;app utente.
                </Text>
              </View>

              {/* Coupons List */}
              {coupons.map((coupon, index) => (
                <View key={index} style={styles.couponCard}>
                  <View style={styles.couponHeader}>
                    <View style={styles.couponBadge}>
                      <Text style={styles.couponDiscount}>{coupon.discount_percentage}%</Text>
                    </View>
                    <View style={styles.couponInfo}>
                      <Text style={styles.couponName}>{coupon.name}</Text>
                      {coupon.description && (
                        <Text style={styles.couponDescription}>{coupon.description}</Text>
                      )}
                    </View>
                  </View>

                  {editingCoupon === coupon.id ? (
                    <View style={styles.editSection}>
                      <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Sconto %</Text>
                          <TextInput
                            style={styles.input}
                            value={editValues[coupon.id]?.discount || ''}
                            onChangeText={(text) => {
                              setEditValues({
                                ...editValues,
                                [coupon.id]: {
                                  ...editValues[coupon.id],
                                  discount: text,
                                },
                              });
                            }}
                            keyboardType="numeric"
                            placeholder="10"
                            placeholderTextColor={colors.textTertiary}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Punti Richiesti</Text>
                          <TextInput
                            style={styles.input}
                            value={editValues[coupon.id]?.points || ''}
                            onChangeText={(text) => {
                              setEditValues({
                                ...editValues,
                                [coupon.id]: {
                                  ...editValues[coupon.id],
                                  points: text,
                                },
                              });
                            }}
                            keyboardType="numeric"
                            placeholder="1000"
                            placeholderTextColor={colors.textTertiary}
                          />
                        </View>
                      </View>
                      <View style={styles.editActions}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.cancelButton,
                            pressed && styles.cancelButtonPressed,
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setEditingCoupon(null);
                            // Reset values
                            setEditValues({
                              ...editValues,
                              [coupon.id]: {
                                discount: coupon.discount_percentage.toString(),
                                points: coupon.points_required.toString(),
                              },
                            });
                          }}
                          disabled={savingCoupon === coupon.id}
                        >
                          <Text style={styles.cancelButtonText}>Annulla</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.saveButton,
                            pressed && styles.saveButtonPressed,
                            savingCoupon === coupon.id && styles.saveButtonDisabled,
                          ]}
                          onPress={() => handleUpdateCoupon(coupon.id)}
                          disabled={savingCoupon === coupon.id}
                        >
                          {savingCoupon === coupon.id ? (
                            <ActivityIndicator size="small" color={colors.background} />
                          ) : (
                            <React.Fragment>
                              <IconSymbol 
                                ios_icon_name="checkmark" 
                                android_material_icon_name="check"
                                size={20} 
                                color={colors.background} 
                              />
                              <Text style={styles.saveButtonText}>Salva</Text>
                            </React.Fragment>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.couponDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Sconto:</Text>
                        <Text style={styles.detailValue}>{coupon.discount_percentage}%</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Punti Richiesti:</Text>
                        <Text style={styles.detailValue}>{coupon.points_required}</Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [
                          styles.editButton,
                          pressed && styles.editButtonPressed,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setEditingCoupon(coupon.id);
                        }}
                      >
                        <IconSymbol 
                          ios_icon_name="pencil" 
                          android_material_icon_name="edit"
                          size={20} 
                          color={colors.text} 
                        />
                        <Text style={styles.editButtonText}>Modifica</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </React.Fragment>
          )}
        </ScrollView>
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
  tabsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.text,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  tabTextActive: {
    color: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  userCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  blockInfo: {
    backgroundColor: colors.error + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  blockReason: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 4,
  },
  blockDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 12,
  },
  unblockButtonPressed: {
    opacity: 0.7,
  },
  unblockButtonDisabled: {
    opacity: 0.5,
  },
  unblockButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
  couponCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  couponHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  couponBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponDiscount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  couponInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  couponName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  couponDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  couponDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
  },
  editButtonPressed: {
    opacity: 0.7,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  editSection: {
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 12,
  },
  saveButtonPressed: {
    opacity: 0.7,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
});
