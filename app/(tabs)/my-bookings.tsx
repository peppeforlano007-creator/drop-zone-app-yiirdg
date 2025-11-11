
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { usePayment } from '@/contexts/PaymentContext';
import { mockProducts, mockDrops } from '@/data/mockData';
import * as Haptics from 'expo-haptics';

export default function MyBookingsScreen() {
  const { authorizations, capturePayment, cancelAuthorization } = usePayment();

  const getProductById = (productId: string) => {
    return mockProducts.find(p => p.id === productId);
  };

  const getDropForProduct = (productId: string) => {
    return mockDrops.find(drop => 
      drop.products.some(p => p.id === productId)
    );
  };

  const handleCancelBooking = (authId: string, productName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Annulla Prenotazione',
      `Sei sicuro di voler annullare la prenotazione per ${productName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sì, Annulla',
          style: 'destructive',
          onPress: async () => {
            await cancelAuthorization(authId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authorized':
        return '#FF9800';
      case 'captured':
        return '#4CAF50';
      case 'cancelled':
        return '#9E9E9E';
      case 'failed':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'authorized':
        return 'In Attesa';
      case 'captured':
        return 'Pagato';
      case 'cancelled':
        return 'Annullato';
      case 'failed':
        return 'Fallito';
      default:
        return status;
    }
  };

  const activeBookings = authorizations.filter(
    auth => auth.status === 'authorized'
  );
  const completedBookings = authorizations.filter(
    auth => auth.status === 'captured' || auth.status === 'cancelled'
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Le Mie Prenotazioni',
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
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Le Mie Prenotazioni</Text>
            <Text style={styles.headerSubtitle}>
              Gestisci le tue prenotazioni attive
            </Text>
          </View>

          {activeBookings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prenotazioni Attive</Text>
              {activeBookings.map(auth => {
                const product = getProductById(auth.productId);
                const drop = getDropForProduct(auth.productId);
                if (!product || !drop) return null;

                const timeRemaining = drop.endTime.getTime() - Date.now();
                const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));

                return (
                  <View key={auth.id} style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      <View style={styles.bookingInfo}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.supplierName}>{product.supplierName}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(auth.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(auth.status) },
                          ]}
                        >
                          {getStatusText(auth.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bookingDetails}>
                      <View style={styles.detailRow}>
                        <IconSymbol name="clock" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>
                          {daysRemaining > 0
                            ? `${daysRemaining} giorni rimanenti`
                            : 'Drop terminato'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <IconSymbol name="percent" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>
                          Sconto attuale: {drop.currentDiscount}%
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <IconSymbol name="lock.fill" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>
                          Bloccato: €{auth.authorizedAmount.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.priceInfo}>
                      <View>
                        <Text style={styles.priceLabel}>Prezzo Attuale</Text>
                        <Text style={styles.currentPrice}>
                          €{(product.originalPrice * (1 - drop.currentDiscount / 100)).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.priceRange}>
                        <Text style={styles.priceRangeLabel}>Range</Text>
                        <Text style={styles.priceRangeText}>
                          €{(product.originalPrice * (1 - drop.maxDiscount / 100)).toFixed(2)} - €
                          {(product.originalPrice * (1 - drop.minDiscount / 100)).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => handleCancelBooking(auth.id, product.name)}
                    >
                      <IconSymbol name="xmark.circle" size={20} color="#ef4444" />
                      <Text style={styles.cancelButtonText}>Annulla Prenotazione</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {completedBookings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Storico</Text>
              {completedBookings.map(auth => {
                const product = getProductById(auth.productId);
                if (!product) return null;

                return (
                  <View key={auth.id} style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      <View style={styles.bookingInfo}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.supplierName}>{product.supplierName}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(auth.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(auth.status) },
                          ]}
                        >
                          {getStatusText(auth.status)}
                        </Text>
                      </View>
                    </View>

                    {auth.status === 'captured' && auth.finalAmount && (
                      <View style={styles.finalPriceInfo}>
                        <Text style={styles.finalPriceLabel}>Importo Pagato</Text>
                        <Text style={styles.finalPrice}>
                          €{auth.finalAmount.toFixed(2)}
                        </Text>
                        <Text style={styles.finalDiscount}>
                          Sconto finale: {auth.finalDiscount}%
                        </Text>
                      </View>
                    )}

                    <Text style={styles.dateText}>
                      {auth.capturedAt
                        ? `Pagato il ${auth.capturedAt.toLocaleDateString('it-IT')}`
                        : `Prenotato il ${auth.createdAt.toLocaleDateString('it-IT')}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {authorizations.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol name="cart" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nessuna Prenotazione</Text>
              <Text style={styles.emptyText}>
                Le tue prenotazioni appariranno qui quando prenoti prodotti nei drop attivi
              </Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Come funziona il pagamento?</Text>
            <View style={styles.infoList}>
              <Text style={styles.infoText}>
                - Quando prenoti, blocchiamo l&apos;importo massimo sulla tua carta
              </Text>
              <Text style={styles.infoText}>
                - Durante il drop, lo sconto aumenta man mano che più persone prenotano
              </Text>
              <Text style={styles.infoText}>
                - Alla fine del drop, addebitiamo solo l&apos;importo finale con lo sconto raggiunto
              </Text>
              <Text style={styles.infoText}>
                - Puoi annullare la prenotazione in qualsiasi momento prima della fine del drop
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
    paddingVertical: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bookingInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  supplierName: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 16,
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
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  priceRange: {
    alignItems: 'flex-end',
  },
  priceRangeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  priceRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  finalPriceInfo: {
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  finalPriceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  finalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  finalDiscount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
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
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 12,
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
