
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { router } from 'expo-router';
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
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(drop.end_time).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeRemaining('Scaduto');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining(`${days}g ${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [drop.end_time]);

  // Safe value extraction with defaults
  const minValue = drop.supplier_lists?.min_reservation_value ?? 0;
  const maxValue = drop.supplier_lists?.max_reservation_value ?? 0;
  const minDiscount = drop.supplier_lists?.min_discount ?? 0;
  const maxDiscount = drop.supplier_lists?.max_discount ?? 0;
  const currentValue = drop.current_value ?? 0;
  const currentDiscount = drop.current_discount ?? 0;

  // Calculate progress percentages with safe division
  const progressPercentage = maxValue > minValue 
    ? ((currentValue - minValue) / (maxValue - minValue)) * 100 
    : 0;
  
  const discountProgress = maxDiscount > minDiscount 
    ? ((currentDiscount - minDiscount) / (maxDiscount - minDiscount)) * 100 
    : 0;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/drop-details',
      params: { dropId: drop.id },
    });
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.locationBadge}>
          <IconSymbol 
            ios_icon_name="location.fill" 
            android_material_icon_name="location_on" 
            size={14} 
            color={colors.text} 
          />
          <Text style={styles.locationText}>{drop.pickup_points?.city ?? 'N/A'}</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{timeRemaining}</Text>
        </View>
      </View>

      <Text style={styles.supplierName}>{drop.supplier_lists?.name ?? 'Fornitore'}</Text>
      <Text style={styles.dropName}>{drop.name}</Text>

      <View style={styles.discountContainer}>
        <View style={styles.discountRow}>
          <Text style={styles.discountLabel}>Sconto attuale</Text>
          <Text style={styles.discountValue}>{currentDiscount.toFixed(0)}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(Math.max(discountProgress, 0), 100)}%` }]} />
        </View>
        <View style={styles.discountRange}>
          <Text style={styles.rangeText}>{minDiscount.toFixed(0)}%</Text>
          <Text style={styles.rangeText}>{maxDiscount.toFixed(0)}%</Text>
        </View>
      </View>

      <View style={styles.valueContainer}>
        <View style={styles.valueRow}>
          <Text style={styles.valueLabel}>Valore prenotato</Text>
          <Text style={styles.valueText}>
            €{currentValue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(Math.max(progressPercentage, 0), 100)}%` }]} />
        </View>
        <View style={styles.valueRange}>
          <Text style={styles.rangeText}>
            €{minValue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
          <Text style={styles.rangeText}>
            €{maxValue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Tocca per vedere i prodotti</Text>
        <IconSymbol 
          ios_icon_name="arrow.right" 
          android_material_icon_name="arrow_forward" 
          size={16} 
          color={colors.text} 
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  timerBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  timerText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  supplierName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  dropName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  discountContainer: {
    marginBottom: 16,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  discountLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  discountValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.text,
  },
  discountRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  valueContainer: {
    marginBottom: 16,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  valueLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  valueRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
