
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Pressable,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  user_id: string;
  user_name: string;
  user_role: string;
  timestamp: string;
  metadata?: any;
}

export default function ActivityLogScreen() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'drop' | 'booking' | 'user' | 'product'>('all');

  const filterLogs = useCallback(() => {
    let filtered = logs;

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action.startsWith(actionFilter));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.description.toLowerCase().includes(query) ||
        log.user_name.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, actionFilter]);

  const loadActivityLogs = useCallback(async () => {
    try {
      setLoading(true);

      // Generate mock activity logs
      // In a real app, you would fetch these from a database table
      const mockLogs: ActivityLog[] = [
        {
          id: '1',
          action: 'drop_created',
          description: 'Nuovo drop creato: "Drop Roma Centro"',
          user_id: 'admin1',
          user_name: 'Admin User',
          user_role: 'admin',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          id: '2',
          action: 'drop_approved',
          description: 'Drop approvato: "Drop Milano Nord"',
          user_id: 'admin1',
          user_name: 'Admin User',
          user_role: 'admin',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          id: '3',
          action: 'booking_created',
          description: 'Nuova prenotazione per prodotto "Nike Air Max"',
          user_id: 'user123',
          user_name: 'Mario Rossi',
          user_role: 'consumer',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: '4',
          action: 'user_registered',
          description: 'Nuovo utente registrato: "Luigi Verdi"',
          user_id: 'user456',
          user_name: 'Luigi Verdi',
          user_role: 'consumer',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
        {
          id: '5',
          action: 'product_added',
          description: 'Nuovo prodotto aggiunto: "Adidas Ultraboost"',
          user_id: 'supplier1',
          user_name: 'Fornitore Sport',
          user_role: 'supplier',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
      ];

      setLogs(mockLogs);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadActivityLogs();
  }, [loadActivityLogs]);

  useEffect(() => {
    filterLogs();
  }, [filterLogs]);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadActivityLogs();
  };

  const getActionIcon = (action: string) => {
    if (action.startsWith('drop')) {
      return { ios: 'bolt.circle.fill', android: 'flash_on', color: colors.success };
    } else if (action.startsWith('booking')) {
      return { ios: 'cart.fill', android: 'shopping_cart', color: colors.warning };
    } else if (action.startsWith('user')) {
      return { ios: 'person.fill', android: 'person', color: colors.primary };
    } else if (action.startsWith('product')) {
      return { ios: 'cube.box.fill', android: 'inventory', color: colors.info };
    }
    return { ios: 'circle.fill', android: 'circle', color: colors.textSecondary };
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return colors.error;
      case 'supplier':
        return colors.warning;
      case 'consumer':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ora';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return date.toLocaleDateString('it-IT');
  };

  const renderLog = (log: ActivityLog) => {
    const actionIcon = getActionIcon(log.action);

    return (
      <View key={log.id} style={styles.logCard}>
        <View style={[styles.logIcon, { backgroundColor: actionIcon.color + '20' }]}>
          <IconSymbol
            ios_icon_name={actionIcon.ios}
            android_material_icon_name={actionIcon.android}
            size={20}
            color={actionIcon.color}
          />
        </View>
        <View style={styles.logContent}>
          <Text style={styles.logDescription}>{log.description}</Text>
          <View style={styles.logMeta}>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(log.user_role) + '20' }]}>
              <Text style={[styles.roleText, { color: getRoleColor(log.user_role) }]}>
                {log.user_name}
              </Text>
            </View>
            <Text style={styles.logTime}>{formatTimestamp(log.timestamp)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento log attività...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Log Attività',
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
              placeholder="Cerca attività..."
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
              { key: 'all', label: 'Tutte' },
              { key: 'drop', label: 'Drop' },
              { key: 'booking', label: 'Prenotazioni' },
              { key: 'user', label: 'Utenti' },
              { key: 'product', label: 'Prodotti' },
            ].map((item) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.filterButton,
                  actionFilter === item.key && styles.filterButtonActive,
                  pressed && styles.filterButtonPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActionFilter(item.key as any);
                }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    actionFilter === item.key && styles.filterButtonTextActive,
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
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              {filteredLogs.length} attività registrat{filteredLogs.length === 1 ? 'a' : 'e'}
            </Text>
          </View>

          {filteredLogs.length > 0 ? (
            filteredLogs.map(renderLog)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="tray"
                android_material_icon_name="inbox"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessuna attività trovata</Text>
              <Text style={styles.emptyText}>
                Prova a modificare i filtri di ricerca
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
  logCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logDescription: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logTime: {
    fontSize: 12,
    color: colors.textTertiary,
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
