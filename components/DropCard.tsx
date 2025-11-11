
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    <Pressable onPress={handlePress}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.locationBadge}>
            <IconSymbol name="location.fill" size={16} color={colors.card} />
            <Text style={styles.locationText}>{drop.pickupPoint}</Text>
          </View>
          <View style={styles.timerBadge}>
            <IconSymbol name="clock.fill" size={16} color={colors.accent} />
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
            <IconSymbol name="eurosign.circle.fill" size={20} color={colors.card} />
            <Text style={styles.valueText}>
              €{drop.currentValue.toLocaleString()} / €{drop.maxValue.toLocaleString()}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progressPercentage, 100)}%` }]} />
          </View>
        </View>

        <View style={styles.footer}>
          <IconSymbol name="arrow.right.circle.fill" size={24} color={colors.card} />
          <Text style={styles.footerText}>Tocca per vedere i prodotti</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 5,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  locationText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '600',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  timerText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  supplierName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.card,
    marginBottom: 4,
  },
  productCount: {
    fontSize: 14,
    color: colors.card,
    opacity: 0.9,
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
    fontSize: 14,
    color: colors.card,
    opacity: 0.9,
  },
  discountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.card,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  discountRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeText: {
    fontSize: 12,
    color: colors.card,
    opacity: 0.8,
  },
  valueContainer: {
    marginBottom: 16,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.card,
  },
});
