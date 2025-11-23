
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { utils, write } from 'xlsx';

interface DropData {
  id: string;
  name: string;
  status: string;
  completed_at: string | null;
  supplier_list_id: string;
  pickup_point_id: string;
  current_discount: number;
  supplier_lists: {
    name: string;
    supplier_id: string;
    profiles: {
      full_name: string;
      email: string;
    };
  };
  pickup_points: {
    name: string;
    city: string;
  };
}

interface OrderData {
  product_name: string;
  product_id: string;
  quantity: number;
  selected_size?: string;
  selected_color?: string;
  final_price: number;
  customer_name: string;
  customer_phone: string;
}

export default function ExportOrdersScreen() {
  const [completedDrops, setCompletedDrops] = useState<DropData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    loadCompletedDrops();
  }, []);

  const loadCompletedDrops = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('drops')
        .select(`
          id,
          name,
          status,
          completed_at,
          supplier_list_id,
          pickup_point_id,
          current_discount,
          supplier_lists (
            name,
            supplier_id,
            profiles:profiles!supplier_lists_supplier_id_fkey (
              full_name,
              email
            )
          ),
          pickup_points (
            name,
            city
          )
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading completed drops:', error);
        Alert.alert('Errore', 'Impossibile caricare i drop completati');
        return;
      }

      console.log('Completed drops loaded:', data?.length || 0);
      setCompletedDrops(data || []);
    } catch (error) {
      console.error('Error in loadCompletedDrops:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  const exportDropOrders = async (drop: DropData) => {
    try {
      setExporting(drop.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      console.log('Exporting orders for drop:', drop.id);

      // Get all bookings for this drop
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          product_id,
          final_price,
          products (
            name,
            available_sizes,
            available_colors
          ),
          profiles (
            full_name,
            phone
          )
        `)
        .eq('drop_id', drop.id)
        .eq('status', 'confirmed');

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError);
        Alert.alert('Errore', 'Impossibile caricare le prenotazioni');
        return;
      }

      if (!bookings || bookings.length === 0) {
        Alert.alert('Nessun Ordine', 'Non ci sono ordini confermati per questo drop');
        return;
      }

      console.log('Bookings loaded:', bookings.length);

      // Group bookings by product
      const ordersByProduct = new Map<string, OrderData>();

      bookings.forEach((booking: any) => {
        const productId = booking.product_id;
        const productName = booking.products?.name || 'Prodotto Sconosciuto';
        
        if (ordersByProduct.has(productId)) {
          const existing = ordersByProduct.get(productId)!;
          existing.quantity += 1;
        } else {
          ordersByProduct.set(productId, {
            product_id: productId,
            product_name: productName,
            quantity: 1,
            selected_size: booking.products?.available_sizes?.[0],
            selected_color: booking.products?.available_colors?.[0],
            final_price: booking.final_price,
            customer_name: booking.profiles?.full_name || 'N/A',
            customer_phone: booking.profiles?.phone || 'N/A',
          });
        }
      });

      // Convert to array for export
      const ordersArray = Array.from(ordersByProduct.values());

      // Create Excel workbook
      const worksheet = utils.json_to_sheet(
        ordersArray.map((order, index) => ({
          '#': index + 1,
          'Prodotto': order.product_name,
          'Quantità': order.quantity,
          'Taglia': order.selected_size || 'N/A',
          'Colore': order.selected_color || 'N/A',
          'Prezzo Unitario': `€${order.final_price.toFixed(2)}`,
          'Totale': `€${(order.final_price * order.quantity).toFixed(2)}`,
        }))
      );

      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Ordini');

      // Add summary sheet
      const totalValue = ordersArray.reduce((sum, order) => sum + (order.final_price * order.quantity), 0);
      const totalItems = ordersArray.reduce((sum, order) => sum + order.quantity, 0);

      const summaryData = [
        { 'Campo': 'Drop', 'Valore': drop.name },
        { 'Campo': 'Fornitore', 'Valore': drop.supplier_lists?.profiles?.full_name || 'N/A' },
        { 'Campo': 'Email Fornitore', 'Valore': drop.supplier_lists?.profiles?.email || 'N/A' },
        { 'Campo': 'Punto di Ritiro', 'Valore': `${drop.pickup_points?.name} - ${drop.pickup_points?.city}` },
        { 'Campo': 'Sconto Finale', 'Valore': `${Math.floor(drop.current_discount)}%` },
        { 'Campo': 'Data Completamento', 'Valore': drop.completed_at ? new Date(drop.completed_at).toLocaleDateString('it-IT') : 'N/A' },
        { 'Campo': 'Totale Articoli', 'Valore': totalItems.toString() },
        { 'Campo': 'Valore Totale', 'Valore': `€${totalValue.toFixed(2)}` },
      ];

      const summarySheet = utils.json_to_sheet(summaryData);
      utils.book_append_sheet(workbook, summarySheet, 'Riepilogo');

      // Write to file
      const wbout = write(workbook, { type: 'base64', bookType: 'xlsx' });
      const fileName = `ordini_${drop.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('File created:', fileUri);

      // Share the file
      if (Platform.OS === 'web') {
        // For web, trigger download
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
        link.download = fileName;
        link.click();
        
        Alert.alert('Successo', 'File scaricato con successo!');
      } else {
        // For mobile, use sharing
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Esporta Ordini',
            UTI: 'com.microsoft.excel.xlsx',
          });
        } else {
          Alert.alert('Successo', `File salvato in: ${fileUri}`);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error exporting orders:', error);
      Alert.alert('Errore', 'Impossibile esportare gli ordini');
    } finally {
      setExporting(null);
    }
  };

  const renderDrop = (drop: DropData) => {
    const isExporting = exporting === drop.id;
    const supplierName = drop.supplier_lists?.profiles?.full_name || 'Fornitore Sconosciuto';
    const supplierEmail = drop.supplier_lists?.profiles?.email || 'N/A';
    const pickupPoint = `${drop.pickup_points?.name || 'N/A'} - ${drop.pickup_points?.city || 'N/A'}`;
    const completedDate = drop.completed_at 
      ? new Date(drop.completed_at).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'N/A';

    return (
      <View key={drop.id} style={styles.dropCard}>
        <View style={styles.dropHeader}>
          <View style={styles.dropInfo}>
            <Text style={styles.dropName}>{drop.name}</Text>
            <Text style={styles.dropDetail}>
              <IconSymbol 
                ios_icon_name="person.fill" 
                android_material_icon_name="person" 
                size={14} 
                color={colors.textSecondary} 
              />
              {' '}{supplierName}
            </Text>
            <Text style={styles.dropDetail}>
              <IconSymbol 
                ios_icon_name="envelope.fill" 
                android_material_icon_name="email" 
                size={14} 
                color={colors.textSecondary} 
              />
              {' '}{supplierEmail}
            </Text>
            <Text style={styles.dropDetail}>
              <IconSymbol 
                ios_icon_name="mappin.circle.fill" 
                android_material_icon_name="location_on" 
                size={14} 
                color={colors.textSecondary} 
              />
              {' '}{pickupPoint}
            </Text>
            <Text style={styles.dropDetail}>
              <IconSymbol 
                ios_icon_name="calendar" 
                android_material_icon_name="calendar_today" 
                size={14} 
                color={colors.textSecondary} 
              />
              {' '}Completato: {completedDate}
            </Text>
            <Text style={styles.dropDetail}>
              <IconSymbol 
                ios_icon_name="percent" 
                android_material_icon_name="percent" 
                size={14} 
                color={colors.success} 
              />
              {' '}Sconto finale: {Math.floor(drop.current_discount)}%
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
          onPress={() => exportDropOrders(drop)}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.exportButtonText}>Esportazione...</Text>
            </>
          ) : (
            <>
              <IconSymbol 
                ios_icon_name="square.and.arrow.down.fill" 
                android_material_icon_name="download" 
                size={20} 
                color="#FFF" 
              />
              <Text style={styles.exportButtonText}>Esporta Ordini Excel</Text>
            </>
          )}
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento drop completati...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Esporta Ordini Fornitori',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.infoCard}>
          <IconSymbol 
            ios_icon_name="info.circle.fill" 
            android_material_icon_name="info" 
            size={20} 
            color={colors.info} 
          />
          <Text style={styles.infoText}>
            Esporta gli ordini dei drop completati in formato Excel per inviarli ai fornitori.
            Il file include tutti i prodotti ordinati, le quantità, e i dettagli del drop.
          </Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {completedDrops.length > 0 ? (
            completedDrops.map(renderDrop)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol 
                ios_icon_name="tray" 
                android_material_icon_name="inbox" 
                size={64} 
                color={colors.textTertiary} 
              />
              <Text style={styles.emptyTitle}>Nessun Drop Completato</Text>
              <Text style={styles.emptyText}>
                I drop completati appariranno qui e potrai esportare gli ordini per i fornitori.
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  dropCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  dropHeader: {
    marginBottom: 16,
  },
  dropInfo: {
    gap: 8,
  },
  dropName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  dropDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
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
