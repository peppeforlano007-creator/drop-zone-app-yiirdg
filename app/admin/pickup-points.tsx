
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface PickupPointData {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  manager_name: string;
  commission_rate: number;
  status: string;
  created_at: string;
  users_count: number;
  active_drops_count: number;
}

export default function PickupPointsScreen() {
  const [pickupPoints, setPickupPoints] = useState<PickupPointData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPickupPoints();
  }, []);

  const loadPickupPoints = async () => {
    try {
      setLoading(true);
      
      const { data: points, error: pointsError } = await supabase
        .from('pickup_points')
        .select('*')
        .order('city', { ascending: true });

      if (pointsError) {
        console.error('Error loading pickup points:', pointsError);
        Alert.alert('Errore', 'Impossibile caricare i punti di ritiro');
        return;
      }

      // Get counts for each pickup point
      const pointsWithCounts = await Promise.all(
        (points || []).map(async (point) => {
          // Count users
          const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('pickup_point_id', point.id);

          // Count active drops
          const { count: dropsCount } = await supabase
            .from('drops')
            .select('*', { count: 'exact', head: true })
            .eq('pickup_point_id', point.id)
            .eq('status', 'active');

          return {
            ...point,
            users_count: usersCount || 0,
            active_drops_count: dropsCount || 0,
          };
        })
      );

      setPickupPoints(pointsWithCounts);
    } catch (error) {
      console.error('Error loading pickup points:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPickupPoints();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.textTertiary;
      case 'pending':
        return colors.warning;
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
      case 'pending':
        return 'In Attesa';
      default:
        return status;
    }
  };

  const renderPickupPoint = (point: PickupPointData) => {
    return (
      <Pressable
        key={point.id}
        style={({ pressed }) => [
          styles.pointCard,
          pressed && styles.pointCardPressed,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert('Punto di Ritiro', `Dettagli per: ${point.name}`);
        }}
      >
        <View style={styles.pointHeader}>
          <View style={styles.pointIconContainer}>
            <IconSymbol
              ios_icon_name="mappin.circle.fill"
              android_material_icon_name="location_on"
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.pointInfo}>
            <View style={styles.pointNameRow}>
              <Text style={styles.pointName}>{point.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(point.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(point.status) }]}>
                  {getStatusLabel(point.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.pointCity}>📍 {point.city}</Text>
            <Text style={styles.pointAddress}>{point.address}</Text>
          </View>
        </View>

        <View style={styles.pointDetails}>
          <View style={styles.detailRow}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.detailText}>Manager: {point.manager_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <IconSymbol
              ios_icon_name="phone.fill"
              android_material_icon_name="phone"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.detailText}>{point.phone}</Text>
          </View>
          <View style={styles.detailRow}>
            <IconSymbol
              ios_icon_name="envelope.fill"
              android_material_icon_name="email"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.detailText}>{point.email}</Text>
          </View>
        </View>

        <View style={styles.pointStats}>
          <View style={styles.statItem}>
            <IconSymbol
              ios_icon_name="person.3.fill"
              android_material_icon_name="group"
              size={16}
              color={colors.info}
            />
            <Text style={styles.statValue}>{point.users_count}</Text>
            <Text style={styles.statLabel}>Utenti</Text>
          </View>
          <View style={styles.statItem}>
            <IconSymbol
              ios_icon_name="bolt.circle.fill"
              android_material_icon_name="flash_on"
              size={16}
              color={colors.success}
            />
            <Text style={styles.statValue}>{point.active_drops_count}</Text>
            <Text style={styles.statLabel}>Drop Attivi</Text>
          </View>
          <View style={styles.statItem}>
            <IconSymbol
              ios_icon_name="percent"
              android_material_icon_name="percent"
              size={16}
              color={colors.warning}
            />
            <Text style={styles.statValue}>{point.commission_rate}%</Text>
            <Text style={styles.statLabel}>Commissione</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento punti di ritiro...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Punti di Ritiro',
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
              {pickupPoints.length} punt{pickupPoints.length === 1 ? 'o' : 'i'} di ritiro
            </Text>
          </View>

          {pickupPoints.length > 0 ? (
            pickupPoints.map(renderPickupPoint)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="mappin.slash"
                android_material_icon_name="location_off"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessun punto di ritiro trovato</Text>
              <Text style={styles.emptyText}>
                I punti di ritiro registrati appariranno qui
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
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pointCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pointCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  pointHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pointIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pointInfo: {
    flex: 1,
  },
  pointNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  pointName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pointCity: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  pointAddress: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  pointDetails: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  pointStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
