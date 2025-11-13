
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import DropCard from '@/components/DropCard';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DropData {
  id: string;
  name: string;
  current_discount: number;
  current_value: number;
  target_value: number;
  start_time: string;
  end_time: string;
  status: string;
  pickup_points: {
    name: string;
    city: string;
  };
  supplier_lists: {
    name: string;
    min_discount: number;
    max_discount: number;
    min_reservation_value: number;
    max_reservation_value: number;
  };
}

export default function DropsScreen() {
  const [drops, setDrops] = useState<DropData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const loadDrops = useCallback(async () => {
    try {
      console.log('Loading active drops...');
      
      // Get user's pickup point
      const { data: profile } = await supabase
        .from('profiles')
        .select('pickup_point_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.pickup_point_id) {
        console.log('User has no pickup point assigned');
        setLoading(false);
        return;
      }

      // Load active drops for user's pickup point
      const { data, error } = await supabase
        .from('drops')
        .select(`
          id,
          name,
          current_discount,
          current_value,
          target_value,
          start_time,
          end_time,
          status,
          pickup_points (
            name,
            city
          ),
          supplier_lists (
            name,
            min_discount,
            max_discount,
            min_reservation_value,
            max_reservation_value
          )
        `)
        .eq('pickup_point_id', profile.pickup_point_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading drops:', error);
        return;
      }

      console.log('Loaded drops:', data?.length || 0);
      setDrops(data || []);
    } catch (error) {
      console.error('Error in loadDrops:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDrops();
  }, [loadDrops]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDrops();
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Drop Attivi',
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
          }}
        />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={styles.loadingText}>Caricamento drop...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Drop Attivi',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            Platform.OS !== 'ios' && styles.contentContainerWithTabBar,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.text}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Drop Attivi</Text>
            <Text style={styles.headerSubtitle}>
              Prenota ora e ottieni sconti incredibili
            </Text>
          </View>

          {drops.length > 0 ? (
            drops.map(drop => <DropCard key={drop.id} drop={drop} />)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="tray"
                android_material_icon_name="inbox"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessun drop attivo</Text>
              <Text style={styles.emptyText}>
                I drop si attiveranno quando abbastanza utenti del tuo punto di ritiro
                mostreranno interesse per gli stessi prodotti
              </Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Come funzionano i Drop?</Text>
            <View style={styles.infoList}>
              <Text style={styles.infoText}>
                • Quando abbastanza utenti del tuo punto di ritiro prenotano prodotti della stessa lista, si crea un drop in attesa di approvazione
              </Text>
              <Text style={styles.infoText}>
                • Una volta approvato e attivato, il drop parte con lo sconto minimo e dura 5 giorni
              </Text>
              <Text style={styles.infoText}>
                • Più persone prenotano, più lo sconto aumenta
              </Text>
              <Text style={styles.infoText}>
                • Alla fine del drop, paghi solo il prezzo finale con lo sconto raggiunto
              </Text>
            </View>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  contentContainerWithTabBar: {
    paddingBottom: 120,
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
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
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
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
