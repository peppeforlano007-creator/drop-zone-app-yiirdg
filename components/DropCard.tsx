
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Drop } from '@/types/Product';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface DropCardProps {
  drop: Drop;
}

export default function DropCard({ drop }: DropCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const end = drop.endTime.getTime();
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
  }, [drop.endTime]);

  const progressPercentage = ((drop.currentValue - drop.minValue) / (drop.maxValue - drop.minValue)) * 100;
  const discountProgress = ((drop.currentDiscount - drop.minDiscount) / (drop.maxDiscount - drop.minDiscount)) * 100;

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
          <IconSymbol name="location.fill" size={14} color={colors.text} />
          <Text style={styles.locationText}>{drop.pickupPoint}</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{timeRemaining}</Text>
        </View>
      </View>

      <Text style={styles.supplierName}>{drop.supplierName}</Text>
      <Text style={styles.productCount}>{drop.products.length} prodotti disponibili</Text>

      <View style={styles.discountContainer}>
        <View style={styles.discountRow}>
          <Text style={styles.discountLabel}>Sconto attuale</Text>
          <Text style={styles.discountValue}>{drop.currentDiscount}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(discountProgress, 100)}%` }]} />
        </View>
        <View style={styles.discountRange}>
          <Text style={styles.rangeText}>{drop.minDiscount}%</Text>
          <Text style={styles.rangeText}>{drop.maxDiscount}%</Text>
        </View>
      </View>

      <View style={styles.valueContainer}>
        <View style={styles.valueRow}>
          <Text style={styles.valueText}>
            €{drop.currentValue.toLocaleString()} / €{drop.maxValue.toLocaleString()}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(progressPercentage, 100)}%` }]} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Tocca per vedere i prodotti</Text>
        <IconSymbol name="arrow.right" size={16} color={colors.text} />
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
  productCount: {
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
    marginBottom: 8,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
