
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, layout } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import {
  getLoyaltyDiscount,
  getLoyaltyLevelColor,
  type LoyaltyLevel,
} from '@/utils/loyaltyHelpers';

const LEVELS: { name: LoyaltyLevel; range: string }[] = [
  { name: 'Nuovo', range: '0–99' },
  { name: 'Fedele', range: '100–299' },
  { name: 'VIP', range: '300–699' },
  { name: 'Top', range: '700+' },
];

const BENEFIT_CARDS: { level: LoyaltyLevel; bg: string; border: string; range: string }[] = [
  { level: 'Fedele', bg: '#E3F2FD', border: '#2196F3', range: '100–299 punti' },
  { level: 'VIP', bg: '#F3E5F5', border: '#9C27B0', range: '300–699 punti' },
  { level: 'Top', bg: '#FFFDE7', border: '#FFD700', range: '700+ punti' },
];

export default function LoyaltyProgramScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Programma Fedeltà',
          headerBackTitle: '',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <IconSymbol
                ios_icon_name="star.circle.fill"
                android_material_icon_name="stars"
                size={64}
                color="#FFD700"
              />
            </View>
            <Text style={styles.heroTitle}>Programma Fedeltà</Text>
            <Text style={styles.heroSubtitle}>
              Accumula punti e ottieni sconti automatici su ogni ordine
            </Text>
          </View>

          {/* Come Funziona */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Come Funziona</Text>

            {/* Card 1: Guadagna Punti */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="eurosign.circle.fill"
                  android_material_icon_name="euro"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.cardTitle}>Guadagna Punti</Text>
              </View>
              <Text style={styles.cardText}>
                Per ogni €1 speso in un ordine ritirato guadagni 1 punto. Se fai un reso, perdi tanti punti quanti ne hai guadagnati con quell'ordine (es. reso da €50 = −50 punti). Il tuo saldo determina il tuo livello e lo sconto automatico applicato su ogni ordine — senza dover fare nulla.
              </Text>
              <View style={styles.exampleBox}>
                <Text style={styles.exampleText}>Ritiri ordine da €50 → +50 punti</Text>
                <Text style={styles.exampleText}>Reso ordine da €50 → −50 punti</Text>
              </View>
            </View>

            {/* Card 2: Sali di Livello */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="chart.bar.fill"
                  android_material_icon_name="bar-chart"
                  size={24}
                  color="#9C27B0"
                />
                <Text style={styles.cardTitle}>Sali di Livello</Text>
              </View>
              <Text style={styles.cardText}>
                Il tuo livello dipende dal saldo punti attuale. Più punti hai, più alto è il livello e maggiore lo sconto automatico. I resi riducono il saldo e possono abbassare il livello.
              </Text>
              <View style={styles.levelsTable}>
                {LEVELS.map((level) => {
                  const discount = getLoyaltyDiscount(level.name);
                  const color = getLoyaltyLevelColor(level.name);
                  const discountText = discount > 0 ? `−${discount}% su ogni ordine` : 'Nessuno sconto';
                  return (
                    <View key={level.name} style={styles.levelRow}>
                      <View style={[styles.levelBadge, { backgroundColor: color }]}>
                        <Text style={styles.levelBadgeText}>{level.name}</Text>
                      </View>
                      <View style={styles.levelInfo}>
                        <Text style={styles.levelRange}>{level.range} punti</Text>
                        <Text style={styles.levelBenefit}>{discountText}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* I Tuoi Vantaggi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>I Tuoi Vantaggi</Text>
            {BENEFIT_CARDS.map((item) => {
              const discount = getLoyaltyDiscount(item.level);
              const discountLabel = `Ogni ordine ha uno sconto automatico del ${discount}%`;
              return (
                <View
                  key={item.level}
                  style={[styles.benefitCard, { backgroundColor: item.bg, borderColor: item.border }]}
                >
                  <View style={styles.benefitHeader}>
                    <View style={[styles.benefitBadge, { backgroundColor: item.border }]}>
                      <Text style={styles.benefitBadgeText}>{item.level}</Text>
                    </View>
                    <Text style={styles.benefitRange}>{item.range}</Text>
                  </View>
                  <Text style={styles.benefitDescription}>{discountLabel}</Text>
                </View>
              );
            })}
          </View>

          {/* Regole Importanti */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Regole Importanti</Text>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={24}
                  color={colors.error}
                />
                <Text style={styles.cardTitle}>Penalità e Warning</Text>
              </View>
              <Text style={styles.cardText}>
                Dopo 5 ordini non ritirati l&apos;account viene bloccato. Contatta l&apos;assistenza per sbloccare il profilo.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="arrow.uturn.backward"
                  android_material_icon_name="undo"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.cardTitle}>Resi</Text>
              </View>
              <Text style={styles.cardText}>
                Ogni reso scala dal saldo l'intero valore in punti dell'ordine restituito: se hai guadagnato 80 punti su un ordine da €80, restituirlo ti costa −80 punti. Se il saldo scende sotto la soglia del tuo livello attuale, il livello viene ridotto automaticamente.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.cardTitle}>Lo Sconto Non Costa Punti</Text>
              </View>
              <Text style={styles.cardText}>
                Lo sconto fedeltà è un beneficio automatico legato al tuo livello. Non devi spendere o riscattare nulla — viene applicato direttamente alla chiusura di ogni drop.
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
    paddingBottom: layout.contentPaddingBottom,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  cardText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  exampleBox: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  exampleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  levelsTable: {
    marginTop: 16,
    gap: 10,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  levelBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelInfo: {
    flex: 1,
  },
  levelRange: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  levelBenefit: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  benefitCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
  },
  benefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  benefitBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  benefitBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  benefitRange: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  benefitDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
