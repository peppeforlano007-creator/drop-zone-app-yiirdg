
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { computeDropDiscount } from '@/utils/dropHelpers';
import ShareToGroupModal from '@/components/ShareToGroupModal';
import { useAuth } from '@/contexts/AuthContext';
import { useDropInterest } from '@/contexts/DropInterestContext';

interface DropCardProps {
  drop: {
    id: string;
    name: string;
    current_discount: number;
    current_value: number;
    target_value: number;
    start_time: string;
    end_time: string;
    status: string;
    final_discount_percentage?: number;
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
  };
  deliveryMinDays?: number | null;
  deliveryMaxDays?: number | null;
}

function formatEuro(value: number): string {
  const rounded = Math.round(value);
  return '€ ' + rounded.toLocaleString('it-IT');
}

export default function DropCard({ drop, deliveryMinDays, deliveryMaxDays }: DropCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = useAuth();
  const { isInterested, isLoading, loadInterest, toggleInterest } = useDropInterest();

  useEffect(() => {
    if (drop.status !== 'approved' || !user) return;
    loadInterest(drop.id);
  }, [drop.id, drop.status, user, loadInterest]);

  const handleInterest = async (e: any) => {
    e.stopPropagation();
    if (!user) {
      console.log('[DropCard] Interest pressed but user not logged in, drop:', drop.id);
      Alert.alert('Accesso richiesto', 'Devi effettuare l\'accesso per mostrare interesse.');
      return;
    }
    console.log('[DropCard] Interest button pressed — drop:', drop.id, 'currently interested:', isInterested(drop.id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleInterest(drop.id);
    if (!isInterested(drop.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  useEffect(() => {
    const updateTimer = () => {
      const nonActiveStatuses = ['pending_approval', 'inactive', 'approved'];
      if (nonActiveStatuses.includes(drop.status)) {
        setTimeRemaining('A breve');
        return;
      }

      if (drop.status === 'completed') {
        setTimeRemaining('Terminato');
        return;
      }

      if (!drop.end_time) {
        setTimeRemaining('—');
        return;
      }

      const now = new Date().getTime();
      const endTime = new Date(drop.end_time).getTime();
      if (isNaN(endTime)) {
        setTimeRemaining('—');
        return;
      }
      const distance = endTime - now;

      if (distance < 0) {
        setTimeRemaining('Terminato');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      const parts = [];
      if (days > 0) parts.push(`${days}g`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);

      setTimeRemaining(parts.join(' ') || 'Meno di 1m');
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [drop.end_time, drop.status]);

  const handlePress = () => {
    console.log('[DropCard] pressed drop:', drop.id, 'name:', drop.name, 'status:', drop.status);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/drop-details',
      params: { dropId: drop.id },
    });
  };

  const handleShare = (e: any) => {
    e.stopPropagation();
    console.log('[DropCard] Share button pressed for drop:', drop.id, 'name:', drop.supplier_lists?.name ?? drop.name);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowShareModal(true);
  };

  const currentDiscount = Number(drop.current_discount ?? 0);
  const currentValue = Number(drop.current_value ?? 0);
  const minReservationValue = Number(drop.supplier_lists?.min_reservation_value ?? 0);
  const maxReservationValue = Number(drop.supplier_lists?.max_reservation_value ?? 0);
  const minDiscount = Number(drop.supplier_lists?.min_discount ?? 0);
  const maxDiscount = Number(drop.supplier_lists?.max_discount ?? 0);

  const valueProgress = maxReservationValue > 0 
    ? Math.min((currentValue / maxReservationValue) * 100, 100) 
    : 0;

  const discountRemaining = maxDiscount - currentDiscount;
  const discountRemainingText = discountRemaining > 0 
    ? `Mancano ${Math.floor(discountRemaining)}% per lo sconto massimo!` 
    : 'Sconto massimo raggiunto!';

  const supplierListName = drop.supplier_lists?.name ?? 'N/A';
  const cityName = drop.pickup_points?.city ?? 'N/A';

  const isNonActive = drop.status === 'approved' || drop.status === 'pending_approval' || drop.status === 'inactive';
  const isCompleted = drop.status === 'completed';
  const canParticipate = drop.status === 'approved' || drop.status === 'inactive';

  // Completed drop stats — euro value based
  const completedValue = Number(drop.current_value ?? 0);
  const completedTarget = Number(drop.supplier_lists?.max_reservation_value ?? 0);
  const completedValueText = formatEuro(completedValue);
  const completedTargetText = formatEuro(completedTarget);
  const completedProgress = completedTarget > 0
    ? Math.min((completedValue / completedTarget) * 100, 100)
    : 0;
  const completedProgressPct = Math.floor(completedProgress);

  // Achieved discount: prefer final_discount_percentage, then shared computeDropDiscount helper
  let achievedDiscountRaw: number | null = null;
  const finalDiscPct = Number(drop.final_discount_percentage ?? 0);
  if (drop.final_discount_percentage != null && finalDiscPct > 0) {
    achievedDiscountRaw = finalDiscPct;
  } else if (isCompleted) {
    const minVal = Number(drop.supplier_lists?.min_reservation_value ?? 0);
    const maxVal = Number(drop.supplier_lists?.max_reservation_value ?? 0);
    const minDisc = Number(drop.supplier_lists?.min_discount ?? 0);
    const maxDisc = Number(drop.supplier_lists?.max_discount ?? 0);
    if (completedValue > 0 && maxVal > minVal) {
      achievedDiscountRaw = computeDropDiscount({
        current_value: completedValue,
        min_reservation_value: minVal,
        max_reservation_value: maxVal,
        min_discount: minDisc,
        max_discount: maxDisc,
      });
    } else {
      const fallback = Number(drop.current_discount ?? 0);
      achievedDiscountRaw = fallback > 0 ? fallback : null;
    }
  }
  const achievedDiscountFloor = achievedDiscountRaw != null ? Math.floor(achievedDiscountRaw) : null;

  // Always show the stats block for completed drops — even if value data is zero
  const hasValueData = true;
  const hasDiscountData = achievedDiscountFloor != null;

  const statusBadgeMap: Record<string, { text: string; color: string }> = {
    active: { text: 'Attivo', color: '#16A34A' },
    approved: { text: 'Potrebbero Attivarsi', color: '#2563EB' },
    pending_approval: { text: 'A Breve', color: '#F59E0B' },
    inactive: { text: 'Potrebbero Attivarsi', color: '#6B7280' },
    draft: { text: 'In Preparazione', color: '#6B7280' },
    scheduled: { text: 'Programmato', color: '#7C3AED' },
    created: { text: 'In Preparazione', color: '#6B7280' },
    completed: { text: 'Completato', color: '#374151' },
    expired: { text: 'Scaduto', color: '#374151' },
    cancelled: { text: 'Annullato', color: '#DC2626' },
    underfunded: { text: 'Non Finanziato', color: '#DC2626' },
  };
  // Fall back to a generic grey badge for any unknown status
  const statusBadge = statusBadgeMap[drop.status] ?? { text: String(drop.status ?? ''), color: '#6B7280' };
  const badgeText = statusBadge?.text ?? '';
  const badgeColor = statusBadge?.color ?? '#6B7280';

  const timerBadgeStyle = isCompleted ? styles.timerBadgeCompleted : styles.timerBadge;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        (isNonActive || isCompleted) && styles.cardDimmed,
        isCompleted && styles.cardCompleted,
        pressed && styles.cardPressed,
      ]}
      onPress={handlePress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.dropName} numberOfLines={1}>{supplierListName}</Text>
          <View style={styles.locationRow}>
            <IconSymbol 
              ios_icon_name="mappin.circle.fill" 
              android_material_icon_name="location_on" 
              size={16} 
              color={isCompleted ? colors.textSecondary : colors.primary} 
            />
            <Text style={styles.locationText}>{cityName}</Text>
          </View>
        </View>
        <View style={timerBadgeStyle}>
          <IconSymbol 
            ios_icon_name="clock.fill" 
            android_material_icon_name="schedule" 
            size={12} 
            color="#FFF" 
          />
          <Text style={styles.timerText}>{timeRemaining}</Text>
        </View>
      </View>

      <View style={[styles.statusBadgeRow]}>
        <View style={[styles.statusBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor + '66' }]}>
          <View style={[styles.statusDot, { backgroundColor: badgeColor }]} />
          <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{badgeText}</Text>
        </View>
      </View>

      {!isCompleted && (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Sconto Attuale</Text>
              <Text style={styles.statValue}>{Math.floor(currentDiscount)}%</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Sconto Max</Text>
              <Text style={styles.statValue}>{Math.floor(maxDiscount)}%</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Valore Attuale</Text>
              <Text style={styles.statValue}>{formatEuro(currentValue)}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progresso Obiettivo</Text>
              <Text style={styles.progressPercentage}>{Math.floor(valueProgress)}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${valueProgress}%` }]} />
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressText}>{formatEuro(currentValue)}</Text>
              <Text style={styles.progressText}>{formatEuro(maxReservationValue)}</Text>
            </View>
          </View>
        </>
      )}

      {isCompleted && (
        <View style={styles.completedStats}>
          <View style={styles.completedSectionTitleRow}>
            <Text style={styles.completedSectionTitle}>📊 Risultati finali</Text>
          </View>

          <View style={styles.completedProgressSection}>
            <View style={styles.completedProgressHeader}>
              <Text style={styles.completedProgressLabel}>
                {completedValueText}
              </Text>
              <Text style={styles.completedProgressSeparator}>/</Text>
              <Text style={styles.completedProgressTarget}>
                {completedTargetText}
              </Text>
              <Text style={styles.completedProgressPct}>
                {completedProgressPct}%
              </Text>
            </View>
            <View style={styles.completedProgressBar}>
              <View
                style={[
                  styles.completedProgressFill,
                  { width: `${completedProgress}%` as any },
                ]}
              />
            </View>
          </View>

          {hasDiscountData ? (
            <View style={[styles.completedStatsRow, styles.completedDiscountRow]}>
              <View style={styles.completedStatItem}>
                <MaterialCommunityIcons name="bullseye-arrow" size={14} color="#6B7280" />
                <Text style={styles.completedStatLabel}>Sconto raggiunto</Text>
              </View>
              <View style={styles.completedDiscountValueRow}>
                <Text style={styles.completedDiscountValue}>{achievedDiscountFloor}%</Text>
                <Text style={styles.completedDiscountMax}>(max: {Math.floor(maxDiscount)}%)</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.completedStatsRow, styles.completedDiscountRow]}>
              <View style={styles.completedStatItem}>
                <MaterialCommunityIcons name="bullseye-arrow" size={14} color="#9CA3AF" />
                <Text style={styles.completedStatLabel}>Sconto finale non disponibile</Text>
              </View>
              <Text style={styles.completedDiscountMax}>(max: {Math.floor(maxDiscount)}%)</Text>
            </View>
          )}
        </View>
      )}

      {!isCompleted && (
        <View style={styles.shareCallout}>
          <IconSymbol 
            ios_icon_name="person.3.fill" 
            android_material_icon_name="group" 
            size={16} 
            color={colors.success} 
          />
          <Text style={styles.shareCalloutText}>{discountRemainingText}</Text>
        </View>
      )}

      {drop.status === 'active' && (deliveryMinDays != null || deliveryMaxDays != null) && (
        <View style={styles.deliveryRow}>
          <Ionicons name="car-outline" size={14} color="#666" />
          <Text style={styles.deliveryText}>
            {deliveryMinDays != null && deliveryMaxDays != null
              ? `Consegna: ${deliveryMinDays}–${deliveryMaxDays} giorni`
              : deliveryMinDays != null
              ? `Consegna: da ${deliveryMinDays} giorni`
              : `Consegna: entro ${deliveryMaxDays} giorni`}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.supplierInfo}>
          <MaterialCommunityIcons name="bullseye-arrow" size={14} color={colors.textSecondary} />
          <Text style={styles.supplierText} numberOfLines={1}>
            {supplierListName}
          </Text>
        </View>
        <View style={styles.footerButtons}>
          {!isNonActive && !isCompleted && (
            <Pressable 
              style={styles.shareButton}
              onPress={handleShare}
            >
              <IconSymbol 
                ios_icon_name="square.and.arrow.up.fill" 
                android_material_icon_name="share" 
                size={14} 
                color="#FFF" 
              />
              <Text style={styles.shareButtonText}>Raggiungi {Math.floor(maxDiscount)}%</Text>
            </Pressable>
          )}
          {drop.status === 'approved' && (
            <Pressable
              style={[styles.interestButton, isInterested(drop.id) && styles.interestButtonActive]}
              onPress={handleInterest}
              disabled={isLoading(drop.id)}
            >
              <IconSymbol
                ios_icon_name={isInterested(drop.id) ? 'heart.fill' : 'heart'}
                android_material_icon_name={isInterested(drop.id) ? 'favorite' : 'favorite_border'}
                size={14}
                color="#E11D48"
              />
              <Text style={[styles.interestButtonText, isInterested(drop.id) && styles.interestButtonTextActive]}>
                {isInterested(drop.id) ? 'Parteciperò!' : 'Mi Interessa'}
              </Text>
            </Pressable>
          )}
          <View style={[styles.viewButton, (isNonActive || isCompleted) && styles.viewButtonFull, isCompleted && styles.viewButtonCompleted]}>
            <Text style={styles.viewButtonText}>Sfoglia</Text>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron_right" 
              size={16} 
              color="#FFF" 
            />
          </View>
        </View>
      </View>
      <ShareToGroupModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        drop={{ id: drop.id, name: drop.supplier_lists?.name ?? drop.name ?? 'Drop' }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardDimmed: {
    opacity: 0.85,
    borderColor: colors.border,
  },
  cardCompleted: {
    opacity: 0.7,
    borderColor: '#9CA3AF',
    backgroundColor: colors.backgroundSecondary,
  },
  timerBadgeCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6B7280',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  statusBadgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  dropName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    fontFamily: 'System',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: 'System',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'System',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
    fontFamily: 'System',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'System',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: 'System',
  },
  progressPercentage: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    fontFamily: 'System',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#D1D5DB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#111827',
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: 'System',
  },
  shareCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  shareCalloutText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    fontFamily: 'System',
  },
  footer: {
    flexDirection: 'column',
    gap: 12,
  },
  supplierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supplierText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'System',
    flex: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.success,
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '700',
    fontFamily: 'System',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  viewButtonFull: {
    flex: 1,
  },
  viewButtonCompleted: {
    backgroundColor: '#6B7280',
  },
  viewButtonText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '700',
    fontFamily: 'System',
  },
  participateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  participateButtonText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '700',
    fontFamily: 'System',
  },
  completedStats: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  completedSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    fontFamily: 'System',
    letterSpacing: 0.2,
  },
  completedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedDiscountRow: {
    marginTop: 2,
  },
  completedStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  completedStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'System',
  },
  completedStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    fontFamily: 'System',
  },
  completedDiscountValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedDiscountValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    fontFamily: 'System',
  },
  completedDiscountMax: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    fontFamily: 'System',
  },
  completedProgressSection: {
    gap: 6,
  },
  completedProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedProgressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    fontFamily: 'System',
  },
  completedProgressSeparator: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'System',
  },
  completedProgressTarget: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    fontFamily: 'System',
    flex: 1,
  },
  completedProgressBar: {
    height: 6,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  completedProgressFill: {
    height: '100%',
    backgroundColor: '#9CA3AF',
    borderRadius: 3,
  },
  completedProgressPct: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: 'System',
    minWidth: 30,
    textAlign: 'right',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  deliveryText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System',
  },
  interestButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E11D48',
    backgroundColor: 'transparent',
  },
  interestButtonActive: {
    backgroundColor: '#FFF1F2',
    borderColor: '#E11D48',
  },
  interestButtonText: {
    fontSize: 13,
    color: '#E11D48',
    fontWeight: '700',
    fontFamily: 'System',
  },
  interestButtonTextActive: {
    color: '#E11D48',
  },
});
