
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
  Pressable,
  Alert,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface DataRequest {
  id: string;
  user_id: string;
  request_type: 'export' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: string;
  completed_at: string | null;
  notes: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function DataRequestsScreen() {
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'export' | 'deletion'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('data_requests')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('request_type', filter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading requests:', error);
        Alert.alert('Errore', 'Impossibile caricare le richieste');
        return;
      }

      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'processing':
        return colors.warning;
      case 'failed':
        return colors.error;
      case 'pending':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completata';
      case 'processing':
        return 'In Elaborazione';
      case 'failed':
        return 'Fallita';
      case 'pending':
        return 'In Attesa';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    return type === 'export' ? 'Esportazione' : 'Cancellazione';
  };

  const getTypeIcon = (type: string) => {
    if (type === 'export') {
      return { ios: 'square.and.arrow.down.fill', android: 'download' };
    }
    return { ios: 'trash.fill', android: 'delete' };
  };

  const renderRequest = (request: DataRequest) => {
    const typeIcon = getTypeIcon(request.request_type);
    const statusColor = getStatusColor(request.status);

    return (
      <View key={request.id} style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.requestTypeContainer}>
            <IconSymbol
              ios_icon_name={typeIcon.ios}
              android_material_icon_name={typeIcon.android}
              size={20}
              color={request.request_type === 'export' ? colors.primary : colors.error}
            />
            <Text style={styles.requestType}>{getTypeLabel(request.request_type)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(request.status)}
            </Text>
          </View>
        </View>

        <View style={styles.requestBody}>
          <View style={styles.requestRow}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.requestLabel}>Utente:</Text>
            <Text style={styles.requestValue}>
              {request.profiles?.full_name || 'N/A'}
            </Text>
          </View>

          <View style={styles.requestRow}>
            <IconSymbol
              ios_icon_name="envelope.fill"
              android_material_icon_name="email"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.requestLabel}>Email:</Text>
            <Text style={styles.requestValue}>
              {request.profiles?.email || 'N/A'}
            </Text>
          </View>

          <View style={styles.requestRow}>
            <IconSymbol
              ios_icon_name="clock.fill"
              android_material_icon_name="schedule"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.requestLabel}>Richiesta:</Text>
            <Text style={styles.requestValue}>
              {new Date(request.requested_at).toLocaleString('it-IT')}
            </Text>
          </View>

          {request.completed_at && (
            <View style={styles.requestRow}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={16}
                color={colors.success}
              />
              <Text style={styles.requestLabel}>Completata:</Text>
              <Text style={styles.requestValue}>
                {new Date(request.completed_at).toLocaleString('it-IT')}
              </Text>
            </View>
          )}

          {request.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Note:</Text>
              <Text style={styles.notesText}>{request.notes}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento richieste...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Richieste Dati GDPR',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            <Text style={styles.filterLabel}>Tipo:</Text>
            {[
              { key: 'all', label: 'Tutte' },
              { key: 'export', label: 'Esportazioni' },
              { key: 'deletion', label: 'Cancellazioni' },
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

            <View style={styles.filterSeparator} />

            <Text style={styles.filterLabel}>Stato:</Text>
            {[
              { key: 'all', label: 'Tutti' },
              { key: 'pending', label: 'In Attesa' },
              { key: 'processing', label: 'In Elaborazione' },
              { key: 'completed', label: 'Completate' },
              { key: 'failed', label: 'Fallite' },
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
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{requests.length}</Text>
              <Text style={styles.statLabel}>Totale Richieste</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {requests.filter(r => r.status === 'completed').length}
              </Text>
              <Text style={styles.statLabel}>Completate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {requests.filter(r => r.status === 'pending' || r.status === 'processing').length}
              </Text>
              <Text style={styles.statLabel}>In Corso</Text>
            </View>
          </View>

          {requests.length > 0 ? (
            requests.map(renderRequest)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="doc.text"
                android_material_icon_name="description"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessuna richiesta trovata</Text>
              <Text style={styles.emptyText}>
                Le richieste di esportazione e cancellazione dati appariranno qui
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
  filtersContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginRight: 4,
  },
  filterSeparator: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  requestTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestType: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requestBody: {
    padding: 16,
    gap: 12,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 80,
  },
  requestValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
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
    paddingHorizontal: 40,
  },
});
