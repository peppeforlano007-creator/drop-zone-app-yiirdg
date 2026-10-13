
-- Migration: Fix RLS policies for user_interests and drops tables
-- This fixes the 42501 error when users try to express interest in products

-- ============================================================================
-- FIX USER_INTERESTS RLS POLICIES
-- ============================================================================

-- Drop existing policies on user_interests
DROP POLICY IF EXISTS "Users can view their own interests" ON user_interests;
DROP POLICY IF EXISTS "Users can insert their own interests" ON user_interests;
DROP POLICY IF EXISTS "Users can delete their own interests" ON user_interests;
DROP POLICY IF EXISTS "Admins can view all interests" ON user_interests;
DROP POLICY IF EXISTS "System can insert interests" ON user_interests;

-- Recreate RLS policies for user_interests with proper permissions
-- Allow users to view their own interests
CREATE POLICY "Users can view their own interests" ON user_interests
  FOR SELECT 
  USING (user_id = auth.uid());

-- Allow users to insert their own interests (THIS IS THE KEY FIX)
CREATE POLICY "Users can insert their own interests" ON user_interests
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own interests
CREATE POLICY "Users can delete their own interests" ON user_interests
  FOR DELETE 
  USING (user_id = auth.uid());

-- Allow admins to view all interests
CREATE POLICY "Admins can view all interests" ON user_interests
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- FIX DROPS RLS POLICIES
-- ============================================================================

-- Drop existing policies on drops
DROP POLICY IF EXISTS "Anyone can view active drops" ON drops;
DROP POLICY IF EXISTS "Users can view drops for their pickup point" ON drops;
DROP POLICY IF EXISTS "Admins can manage all drops" ON drops;
DROP POLICY IF EXISTS "System can create drops" ON drops;
DROP POLICY IF EXISTS "Admins can insert drops" ON drops;
DROP POLICY IF EXISTS "Admins can update drops" ON drops;

-- Recreate drops RLS policies
-- Allow anyone to view active and approved drops
CREATE POLICY "Anyone can view active drops" ON drops
  FOR SELECT 
  USING (status IN ('active', 'approved'));

-- Allow users to view drops for their pickup point (all statuses)
CREATE POLICY "Users can view drops for their pickup point" ON drops
  FOR SELECT 
  USING (
    pickup_point_id IN (
      SELECT pickup_point_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Allow admins to view all drops
CREATE POLICY "Admins can view all drops" ON drops
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to insert drops (for manual drop creation)
CREATE POLICY "Admins can insert drops" ON drops
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update drops
CREATE POLICY "Admins can update drops" ON drops
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to delete drops
CREATE POLICY "Admins can delete drops" ON drops
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow system/functions to create drops automatically (SECURITY DEFINER functions)
-- This policy allows drops to be created by triggers and functions
CREATE POLICY "System can create drops" ON drops
  FOR INSERT 
  WITH CHECK (true);

-- ============================================================================
-- ADD MISSING COLUMNS TO DROPS TABLE
-- ============================================================================

-- Add columns for tracking drop lifecycle
ALTER TABLE drops 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS underfunded_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- ============================================================================
-- CREATE OR REPLACE AUTOMATIC DROP CREATION FUNCTION
-- ============================================================================

-- This function checks if conditions are met to create drops automatically
-- It runs with SECURITY DEFINER to bypass RLS policies
CREATE OR REPLACE FUNCTION check_and_create_drops()
RETURNS void AS $$
DECLARE
  v_list RECORD;
  v_pickup_point RECORD;
  v_total_value NUMERIC;
  v_drop_exists BOOLEAN;
  v_drop_id UUID;
  v_drop_duration_days INTEGER;
BEGIN
  -- Get drop duration from settings (default 5 days)
  SELECT COALESCE(
    (SELECT setting_value::INTEGER FROM app_settings WHERE setting_key = 'drop_duration_days'),
    5
  ) INTO v_drop_duration_days;

  -- Loop through all active supplier lists
  FOR v_list IN 
    SELECT * FROM supplier_lists WHERE status = 'active'
  LOOP
    -- Loop through all active pickup points
    FOR v_pickup_point IN 
      SELECT * FROM pickup_points WHERE status = 'active'
    LOOP
      -- Calculate total interest value for this list and pickup point
      SELECT COALESCE(SUM(p.original_price), 0)
      INTO v_total_value
      FROM user_interests ui
      JOIN products p ON ui.product_id = p.id
      WHERE ui.supplier_list_id = v_list.id
        AND ui.pickup_point_id = v_pickup_point.id;

      -- Check if a drop already exists for this combination
      SELECT EXISTS(
        SELECT 1 FROM drops
        WHERE supplier_list_id = v_list.id
          AND pickup_point_id = v_pickup_point.id
          AND status IN ('pending_approval', 'approved', 'active')
      ) INTO v_drop_exists;

      -- If total value meets minimum and no drop exists, create one
      IF v_total_value >= v_list.min_reservation_value AND NOT v_drop_exists THEN
        -- Create the drop with pending_approval status
        INSERT INTO drops (
          supplier_list_id,
          pickup_point_id,
          name,
          current_discount,
          current_value,
          target_value,
          status,
          start_time,
          end_time
        ) VALUES (
          v_list.id,
          v_pickup_point.id,
          v_pickup_point.city || ' - ' || v_list.name,
          v_list.min_discount,
          0,
          v_list.max_reservation_value,
          'pending_approval',
          NOW(),
          NOW() + (v_drop_duration_days || ' days')::INTERVAL
        )
        RETURNING id INTO v_drop_id;

        -- Log the creation
        RAISE NOTICE 'Auto-created drop % for list % and pickup point % (value: €%)', 
          v_drop_id, v_list.id, v_pickup_point.id, v_total_value;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_and_create_drops() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_create_drops() TO anon;

-- ============================================================================
-- CREATE TRIGGER FOR AUTOMATIC DROP CREATION
-- ============================================================================

-- Create a trigger function that calls check_and_create_drops
CREATE OR REPLACE FUNCTION trigger_check_drops()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the check function (runs with SECURITY DEFINER)
  PERFORM check_and_create_drops();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS after_interest_insert_check_drops ON user_interests;

-- Create trigger on user_interests to check for drops after each insert
CREATE TRIGGER after_interest_insert_check_drops
  AFTER INSERT ON user_interests
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_check_drops();

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, DELETE ON user_interests TO authenticated;
GRANT SELECT ON drops TO authenticated;
GRANT SELECT ON supplier_lists TO authenticated;
GRANT SELECT ON pickup_points TO authenticated;
GRANT SELECT ON products TO authenticated;
GRANT SELECT ON profiles TO authenticated;

-- ============================================================================
-- ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can insert their own interests" ON user_interests IS 
  'Allows users to express interest in products - fixes 42501 error';

COMMENT ON POLICY "System can create drops" ON drops IS 
  'Allows automatic drop creation by triggers and SECURITY DEFINER functions';

COMMENT ON FUNCTION check_and_create_drops() IS 
  'Automatically creates drops when interest threshold is met for a supplier list and pickup point';

COMMENT ON FUNCTION trigger_check_drops() IS 
  'Trigger function that calls check_and_create_drops after user interest is added';

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for user_interests queries
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_product_id ON user_interests(product_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_supplier_list_id ON user_interests(supplier_list_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_pickup_point_id ON user_interests(pickup_point_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_list_pickup ON user_interests(supplier_list_id, pickup_point_id);

-- Indexes for drops queries
CREATE INDEX IF NOT EXISTS idx_drops_status ON drops(status);
CREATE INDEX IF NOT EXISTS idx_drops_supplier_list_id ON drops(supplier_list_id);
CREATE INDEX IF NOT EXISTS idx_drops_pickup_point_id ON drops(pickup_point_id);
CREATE INDEX IF NOT EXISTS idx_drops_list_pickup_status ON drops(supplier_list_id, pickup_point_id, status);
CREATE INDEX IF NOT EXISTS idx_drops_end_time ON drops(end_time);

-- ============================================================================
-- VERIFICATION QUERIES (for debugging)
-- ============================================================================

-- To verify RLS policies are working, run these queries as a regular user:
-- SELECT * FROM user_interests WHERE user_id = auth.uid();
-- INSERT INTO user_interests (user_id, product_id, supplier_list_id, pickup_point_id) VALUES (...);
-- DELETE FROM user_interests WHERE user_id = auth.uid() AND id = '...';

-- To verify drops can be created by admins:
-- INSERT INTO drops (...) VALUES (...); -- as admin user

-- To test automatic drop creation:
-- SELECT check_and_create_drops();
</parameter>
</invoke>

Now let me update the admin create-drop screen to ensure it properly shows the supplier list selection:

<write file="app/admin/create-drop.tsx">
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
import { IconSymbol } from '@/components/IconSymbol';

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

export default function CreateDropScreen() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [supplierLists, setSupplierLists] = useState<SupplierList[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<string | null>(null);
  const [dropDurationDays, setDropDurationDays] = useState(5);

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

      // Load supplier lists
      const { data: lists, error: listsError } = await supabase
        .from('supplier_lists')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (listsError) {
        console.error('Error loading supplier lists:', listsError);
        errorHandler.handleSupabaseError(listsError, { context: 'load_supplier_lists' });
        Alert.alert('Errore', `Impossibile caricare le liste fornitori: ${listsError.message}`);
        return;
      }

      console.log(`Loaded ${lists?.length || 0} supplier lists`);

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
          console.log('Enriched lists with supplier names');
        } else {
          setSupplierLists(lists);
          console.log('Using lists without supplier names');
        }
      } else {
        setSupplierLists([]);
        console.log('No supplier lists found');
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
        Alert.alert('Errore', `Impossibile caricare i punti di ritiro: ${pointsError.message}`);
        return;
      }

      console.log(`Loaded ${points?.length || 0} pickup points`);
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
      Alert.alert('Errore', 'Si è verificato un errore durante il caricamento dei dati');
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
      `Vuoi creare un drop per:\n\nLista: ${list.name}\nFornitore: ${list.profiles?.full_name || 'N/A'}\nPunto di Ritiro: ${point.name} (${point.city})\n\nIl drop partirà con sconto ${list.min_discount}% e durerà ${dropDurationDays} ${dropDurationDays === 1 ? 'giorno' : 'giorni'}.`,
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

              if (!user) {
                Alert.alert('Errore', 'Utente non autenticato');
                return;
              }

              // Calculate end time using the configured duration
              const endTime = new Date();
              endTime.setDate(endTime.getDate() + dropDurationDays);

              console.log('Creating drop with data:', {
                supplier_list_id: selectedList,
                pickup_point_id: selectedPickupPoint,
                name: `${point.city} - ${list.name}`,
                current_discount: list.min_discount,
                target_value: list.max_reservation_value,
                end_time: endTime.toISOString(),
              });

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
                  approved_by: user.id,
                })
                .select()
                .single();

              if (dropError) {
                console.error('Error creating drop:', dropError);
                errorHandler.handleSupabaseError(dropError, { context: 'create_drop' });
                Alert.alert(
                  'Errore',
                  `Impossibile creare il drop.\n\nCodice: ${dropError.code}\nMessaggio: ${dropError.message}\n\nDettagli: ${dropError.details || 'N/A'}`
                );
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
              Alert.alert('Errore', 'Si è verificato un errore imprevisto');
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
          Crea un drop manualmente selezionando una lista fornitore e un punto di ritiro.
        </Text>

        <View style={styles.warningBox}>
          <IconSymbol 
            ios_icon_name="exclamationmark.triangle.fill" 
            android_material_icon_name="warning" 
            size={20} 
            color="#FF9500" 
          />
          <Text style={styles.warningText}>
            Attenzione: Creando un drop manualmente, gli utenti potranno prenotare prodotti anche se non è stato raggiunto il valore minimo di interesse. Assicurati che ci siano abbastanza interessi per giustificare il drop.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Seleziona Lista Fornitore</Text>
          {supplierLists.length === 0 ? (
            <View style={styles.emptyCard}>
              <IconSymbol 
                ios_icon_name="tray" 
                android_material_icon_name="inbox" 
                size={48} 
                color={colors.textTertiary} 
              />
              <Text style={styles.emptyText}>Nessuna lista fornitore disponibile</Text>
              <Text style={styles.emptySubtext}>
                Le liste fornitori devono essere create prima di poter creare un drop manuale.
              </Text>
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
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{list.name}</Text>
                  {selectedList === list.id && (
                    <IconSymbol 
                      ios_icon_name="checkmark.circle.fill" 
                      android_material_icon_name="check_circle" 
                      size={24} 
                      color={colors.primary} 
                    />
                  )}
                </View>
                <Text style={styles.cardSubtitle}>
                  Fornitore: {list.profiles?.full_name || 'N/A'}
                </Text>
                <View style={styles.cardDetails}>
                  <View style={styles.cardDetailItem}>
                    <IconSymbol 
                      ios_icon_name="percent" 
                      android_material_icon_name="percent" 
                      size={14} 
                      color={colors.textTertiary} 
                    />
                    <Text style={styles.cardDetail}>
                      Sconto: {list.min_discount}% - {list.max_discount}%
                    </Text>
                  </View>
                  <View style={styles.cardDetailItem}>
                    <IconSymbol 
                      ios_icon_name="eurosign.circle" 
                      android_material_icon_name="euro" 
                      size={14} 
                      color={colors.textTertiary} 
                    />
                    <Text style={styles.cardDetail}>
                      Valore: €{list.min_reservation_value.toLocaleString()} - €{list.max_reservation_value.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Seleziona Punto di Ritiro</Text>
          {pickupPoints.length === 0 ? (
            <View style={styles.emptyCard}>
              <IconSymbol 
                ios_icon_name="mappin.slash" 
                android_material_icon_name="location_off" 
                size={48} 
                color={colors.textTertiary} 
              />
              <Text style={styles.emptyText}>Nessun punto di ritiro disponibile</Text>
              <Text style={styles.emptySubtext}>
                I punti di ritiro devono essere creati prima di poter creare un drop manuale.
              </Text>
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
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <IconSymbol 
                      ios_icon_name="mappin.circle.fill" 
                      android_material_icon_name="location_on" 
                      size={20} 
                      color={colors.primary} 
                    />
                    <Text style={styles.cardTitle}>{point.name}</Text>
                  </View>
                  {selectedPickupPoint === point.id && (
                    <IconSymbol 
                      ios_icon_name="checkmark.circle.fill" 
                      android_material_icon_name="check_circle" 
                      size={24} 
                      color={colors.primary} 
                    />
                  )}
                </View>
                <Text style={styles.cardSubtitle}>{point.city}</Text>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.infoBox}>
          <IconSymbol 
            ios_icon_name="lightbulb.fill" 
            android_material_icon_name="lightbulb" 
            size={20} 
            color={colors.primary} 
          />
          <Text style={styles.infoText}>
            Il drop verrà creato con stato "Approvato" e potrà essere attivato dalla sezione Gestione Drops. Durerà {dropDurationDays} {dropDurationDays === 1 ? 'giorno' : 'giorni'} dalla data di attivazione.
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
            <>
              <IconSymbol 
                ios_icon_name="plus.circle.fill" 
                android_material_icon_name="add_circle" 
                size={20} 
                color="#FFF" 
              />
              <Text style={styles.createButtonText}>Crea Drop</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cardDetails: {
    gap: 6,
  },
  cardDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDetail: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FF9500' + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
