
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import * as Haptics from 'expo-haptics';

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
}

export default function DropCard({ drop }: DropCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(drop.end_time).getTime();
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
  }, [drop.end_time]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/drop-details',
      params: { dropId: drop.id },
    });
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

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={handlePress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.dropName} numberOfLines={1}>{drop.name}</Text>
          <View style={styles.locationRow}>
            <IconSymbol 
              ios_icon_name="mappin.circle.fill" 
              android_material_icon_name="location_on" 
              size={14} 
              color={colors.primary} 
            />
            <Text style={styles.locationText}>{drop.pickup_points?.city ?? 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.timerBadge}>
          <IconSymbol 
            ios_icon_name="clock.fill" 
            android_material_icon_name="schedule" 
            size={12} 
            color="#FFF" 
          />
          <Text style={styles.timerText}>{timeRemaining}</Text>
        </View>
      </View>

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
          <Text style={styles.statValue}>€{currentValue.toFixed(0)}</Text>
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
          <Text style={styles.progressText}>€{currentValue.toFixed(0)}</Text>
          <Text style={styles.progressText}>€{maxReservationValue.toFixed(0)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.supplierInfo}>
          <IconSymbol 
            ios_icon_name="list.bullet.rectangle" 
            android_material_icon_name="list" 
            size={14} 
            color={colors.textSecondary} 
          />
          <Text style={styles.supplierText} numberOfLines={1}>
            {drop.supplier_lists?.name ?? 'N/A'}
          </Text>
        </View>
        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>Visualizza</Text>
          <IconSymbol 
            ios_icon_name="chevron.right" 
            android_material_icon_name="chevron_right" 
            size={16} 
            color={colors.primary} 
          />
        </View>
      </View>
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
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
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
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
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
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  supplierText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'System',
    flex: 1,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    fontFamily: 'System',
  },
});
