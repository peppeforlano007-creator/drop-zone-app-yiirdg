
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import { errorHandler, ErrorCategory, ErrorSeverity } from '@/utils/errorHandler';
import { logDropActivity } from '@/utils/activityLogger';
import { getPlatformSettings } from '@/utils/dropHelpers';

interface SupplierList {
  id: string;
  name: string;
  min_discount: number;
  max_discount: number;
  min_reservation_value: number;
  max_reservation_value: number;
  supplier_id: string;
  profiles?: {
    full_name: string;
  };
}

interface PickupPoint {
  id: string;
  name: string;
  city: string;
  status: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + '10',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cardDetail: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonDisabled: {
    backgroundColor: colors.border,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoBox: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#FF9500' + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});

export default function CreateDropScreen() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [supplierLists, setSupplierLists] = useState<SupplierList[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<string | null>(null);
  const [dropDurationDays, setDropDurationDays] = useState(5); // Default value

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load platform settings
      const platformSettings = await getPlatformSettings();
      setDropDurationDays(platformSettings.dropDurationDays);
      console.log('Drop duration loaded from settings:', platformSettings.dropDurationDays);

      // Load supplier lists - load separately to avoid RLS issues
      const { data: lists, error: listsError } = await supabase
        .from('supplier_lists')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (listsError) {
        console.error('Error loading supplier lists:', listsError);
        errorHandler.handleSupabaseError(listsError, { context: 'load_supplier_lists' });
        return;
      }

      // Load supplier profiles separately
      if (lists && lists.length > 0) {
        const supplierIds = [...new Set(lists.map(l => l.supplier_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', supplierIds);

        if (!profilesError && profiles) {
          const profilesMap = new Map(profiles.map(p => [p.user_id, p]));
          const enrichedLists = lists.map(list => ({
            ...list,
            profiles: list.supplier_id ? profilesMap.get(list.supplier_id) : undefined
          }));
          setSupplierLists(enrichedLists);
        } else {
          setSupplierLists(lists);
        }
      } else {
        setSupplierLists([]);
      }

      // Load pickup points
      const { data: points, error: pointsError } = await supabase
        .from('pickup_points')
        .select('*')
        .eq('status', 'active')
        .order('city', { ascending: true });

      if (pointsError) {
        console.error('Error loading pickup points:', pointsError);
        errorHandler.handleSupabaseError(pointsError, { context: 'load_pickup_points' });
        return;
      }

      setPickupPoints(points || []);
    } catch (error) {
      console.error('Error in loadData:', error);
      errorHandler.handleError(
        'Errore imprevisto durante il caricamento',
        ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM,
        { context: 'load_data' },
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDrop = async () => {
    if (!selectedList || !selectedPickupPoint) {
      Alert.alert('Errore', 'Seleziona una lista fornitore e un punto di ritiro');
      return;
    }

    const list = supplierLists.find(l => l.id === selectedList);
    const point = pickupPoints.find(p => p.id === selectedPickupPoint);

    if (!list || !point) {
      Alert.alert('Errore', 'Dati non validi');
      return;
    }

    Alert.alert(
      'Conferma Creazione Drop',
      `Vuoi creare un drop per:\n\nLista: ${list.name}\nPunto di Ritiro: ${point.name} (${point.city})\n\nIl drop partirà con sconto ${list.min_discount}% e durerà ${dropDurationDays} ${dropDurationDays === 1 ? 'giorno' : 'giorni'}.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Crea Drop',
          onPress: async () => {
            try {
              setCreating(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              // Get current user for approved_by field
              const { data: { user } } = await supabase.auth.getUser();

              // Calculate end time using the configured duration
              const endTime = new Date();
              endTime.setDate(endTime.getDate() + dropDurationDays);

              // Create drop with 'approved' status (ready to be activated)
              const { data: drop, error: dropError } = await supabase
                .from('drops')
                .insert({
                  supplier_list_id: selectedList,
                  pickup_point_id: selectedPickupPoint,
                  name: `${point.city} - ${list.name}`,
                  current_discount: list.min_discount,
                  current_value: 0,
                  target_value: list.max_reservation_value,
                  status: 'approved',
                  start_time: new Date().toISOString(),
                  end_time: endTime.toISOString(),
                  approved_at: new Date().toISOString(),
                  approved_by: user?.id,
                })
                .select()
                .single();

              if (dropError) {
                console.error('Error creating drop:', dropError);
                errorHandler.handleSupabaseError(dropError, { context: 'create_drop' });
                return;
              }

              console.log('Drop created successfully:', drop);

              // Log activity
              await logDropActivity.created(drop.name, drop.id);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Drop Creato!',
                `Il drop "${drop.name}" è stato creato con successo.\n\nStato: Approvato (pronto per l'attivazione)\nSconto iniziale: ${list.min_discount}%\nSconto massimo: ${list.max_discount}%\nDurata: ${dropDurationDays} ${dropDurationDays === 1 ? 'giorno' : 'giorni'}`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.back();
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error in handleCreateDrop:', error);
              errorHandler.handleError(
                'Errore imprevisto durante la creazione del drop',
                ErrorCategory.UNKNOWN,
                ErrorSeverity.HIGH,
                { context: 'create_drop' },
                error
              );
            } finally {
              setCreating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Crea Drop Manuale',
            headerShown: true,
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
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Crea Drop Manuale',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Crea Drop Manuale</Text>
        <Text style={styles.subtitle}>
          Crea un drop manualmente anche se non è stato raggiunto il valore minimo di prenotazioni.
        </Text>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Attenzione: Creando un drop manualmente, gli utenti potranno prenotare prodotti anche se non è stato raggiunto il valore minimo. Assicurati che ci siano abbastanza interessi per giustificare il drop.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Seleziona Lista Fornitore</Text>
          {supplierLists.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>Nessuna lista fornitore disponibile</Text>
            </View>
          ) : (
            supplierLists.map((list) => (
              <Pressable
                key={list.id}
                style={[styles.card, selectedList === list.id && styles.selectedCard]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedList(list.id);
                }}
              >
                <Text style={styles.cardTitle}>{list.name}</Text>
                <Text style={styles.cardSubtitle}>
                  Fornitore: {list.profiles?.full_name || 'N/A'}
                </Text>
                <Text style={styles.cardDetail}>
                  Sconto: {list.min_discount}% - {list.max_discount}%
                </Text>
                <Text style={styles.cardDetail}>
                  Valore: €{list.min_reservation_value} - €{list.max_reservation_value}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Seleziona Punto di Ritiro</Text>
          {pickupPoints.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>Nessun punto di ritiro disponibile</Text>
            </View>
          ) : (
            pickupPoints.map((point) => (
              <Pressable
                key={point.id}
                style={[styles.card, selectedPickupPoint === point.id && styles.selectedCard]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPickupPoint(point.id);
                }}
              >
                <Text style={styles.cardTitle}>{point.name}</Text>
                <Text style={styles.cardSubtitle}>{point.city}</Text>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Il drop verrà creato con stato "Approvato" e potrà essere attivato dalla sezione Gestione Drops. Durerà {dropDurationDays} {dropDurationDays === 1 ? 'giorno' : 'giorni'} dalla data di attivazione.
          </Text>
        </View>

        <Pressable
          style={[
            styles.createButton,
            (!selectedList || !selectedPickupPoint || creating) && styles.createButtonDisabled,
          ]}
          onPress={handleCreateDrop}
          disabled={!selectedList || !selectedPickupPoint || creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.createButtonText}>Crea Drop</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
