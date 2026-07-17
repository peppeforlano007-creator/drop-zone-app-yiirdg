
import React, { useState, useEffect, useCallback } from 'react';
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
}

const LEVELS = [
  { name: 'Nuovo', range: '0–99 punti', discount: '0%', color: '#9E9E9E' },
  { name: 'Fedele', range: '100–299 punti', discount: '−3%', color: '#2196F3' },
  { name: 'VIP', range: '300–699 punti', discount: '−6%', color: '#9C27B0' },
  { name: 'Top', range: '700+ punti', discount: '−10%', color: '#FFD700' },
];

export default function LoyaltyProgramManagementScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    console.log('AdminLoyalty: Loading blocked users');
    try {
      setLoading(true);

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, orders_returned, items_returned, blocked_reason, blocked_at')
        .eq('account_blocked', true)
        .order('blocked_at', { ascending: false });

      if (usersError) {
        console.error('AdminLoyalty: Error loading blocked users:', usersError);
      } else {
        setBlockedUsers(usersData || []);
        console.log('AdminLoyalty: Loaded', usersData?.length ?? 0, 'blocked users');
      }
    } catch (error) {
      console.error('AdminLoyalty: Error loading data:', error);
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
    console.log('AdminLoyalty: User triggered refresh');
    setRefreshing(true);
    loadData();
  };

  const handleUnblockUser = async (userId: string, userName: string) => {
    console.log('AdminLoyalty: User tapped Sblocca for', userName, userId);
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
              console.log('AdminLoyalty: Unblocking user', userId);

              const { error } = await supabase.rpc('admin_unblock_user', {
                p_user_id: userId,
                p_admin_id: user?.id,
              });

              if (error) {
                console.error('AdminLoyalty: Error unblocking user:', error);
                Alert.alert('Errore', 'Impossibile sbloccare l\'utente');
                return;
              }

              console.log('AdminLoyalty: User unblocked successfully', userId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Utente sbloccato con successo');
              loadData();
            } catch (error: any) {
              console.error('AdminLoyalty: Error unblocking user:', error);
              Alert.alert('Errore', 'Si è verificato un errore');
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]
    );
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Levels Info Table */}
          <View style={styles.levelsCard}>
            <View style={styles.levelsHeader}>
              <IconSymbol
                ios_icon_name="star.circle.fill"
                android_material_icon_name="stars"
                size={20}
                color="#FFD700"
              />
              <Text style={styles.levelsTitle}>Livelli e Sconti Automatici</Text>
            </View>
            <Text style={styles.levelsSubtitle}>
              I punti crescono sempre — non scendono mai. Lo sconto è applicato automaticamente su ogni ordine.
            </Text>
            {LEVELS.map((level) => (
              <View key={level.name} style={styles.levelRow}>
                <View style={[styles.levelBadge, { backgroundColor: level.color }]}>
                  <Text style={styles.levelBadgeText}>{level.name}</Text>
                </View>
                <Text style={styles.levelRange}>{level.range}</Text>
                <Text style={styles.levelDiscount}>{level.discount}</Text>
              </View>
            ))}
          </View>

          {/* Blocked Users Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Utenti Bloccati
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{blockedUsers.length}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.info}
            />
            <Text style={styles.infoText}>
              Utenti bloccati per 5 o più ordini non ritirati (no-show). Puoi sbloccare manualmente gli account.
            </Text>
          </View>

          {blockedUsers.length > 0 ? (
            blockedUsers.map((blockedUser, index) => (
              <View key={index} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{blockedUser.full_name || 'Utente'}</Text>
                    <Text style={styles.userEmail}>{blockedUser.email}</Text>
                    {blockedUser.phone ? (
                      <Text style={styles.userPhone}>{blockedUser.phone}</Text>
                    ) : null}
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
                        android_material_icon_name="lock-open"
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
                android_material_icon_name="check-circle"
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  levelsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  levelsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  levelsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  levelsSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelRange: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  levelDiscount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.text,
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
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
