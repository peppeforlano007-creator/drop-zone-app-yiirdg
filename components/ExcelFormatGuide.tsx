
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

export default function ExcelFormatGuide() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <IconSymbol name="doc.text.magnifyingglass" size={32} color={colors.text} />
        <Text style={styles.title}>Formato File Excel</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Colonne Richieste</Text>
        <Text style={styles.description}>
          Il file Excel deve contenere le seguenti colonne (l&apos;ordine non è importante):
        </Text>

        <View style={styles.columnList}>
          <View style={styles.columnItem}>
            <View style={styles.columnBadge}>
              <Text style={styles.columnBadgeText}>nome</Text>
            </View>
            <Text style={styles.columnDescription}>Nome del prodotto</Text>
          </View>

          <View style={styles.columnItem}>
            <View style={styles.columnBadge}>
              <Text style={styles.columnBadgeText}>foto</Text>
            </View>
            <Text style={styles.columnDescription}>URL dell&apos;immagine del prodotto</Text>
          </View>

          <View style={styles.columnItem}>
            <View style={styles.columnBadge}>
              <Text style={styles.columnBadgeText}>prezzoListino</Text>
            </View>
            <Text style={styles.columnDescription}>Prezzo di listino (numero)</Text>
          </View>

          <View style={styles.columnItem}>
            <View style={styles.columnBadge}>
              <Text style={styles.columnBadgeText}>taglie</Text>
            </View>
            <Text style={styles.columnDescription}>Taglie disponibili (es. S, M, L, XL)</Text>
          </View>

          <View style={styles.columnItem}>
            <View style={styles.columnBadge}>
              <Text style={styles.columnBadgeText}>condizione</Text>
            </View>
            <Text style={styles.columnDescription}>Condizione del prodotto</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Colonne Opzionali</Text>
        
        <View style={styles.columnList}>
          <View style={styles.columnItem}>
            <View style={[styles.columnBadge, styles.optionalBadge]}>
              <Text style={styles.columnBadgeText}>descrizione</Text>
            </View>
            <Text style={styles.columnDescription}>Descrizione del prodotto</Text>
          </View>

          <View style={styles.columnItem}>
            <View style={[styles.columnBadge, styles.optionalBadge]}>
              <Text style={styles.columnBadgeText}>categoria</Text>
            </View>
            <Text style={styles.columnDescription}>Categoria del prodotto</Text>
          </View>

          <View style={styles.columnItem}>
            <View style={[styles.columnBadge, styles.optionalBadge]}>
              <Text style={styles.columnBadgeText}>stock</Text>
            </View>
            <Text style={styles.columnDescription}>Quantità disponibile</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Valori Condizione</Text>
        <Text style={styles.description}>
          La colonna &quot;condizione&quot; deve contenere uno dei seguenti valori:
        </Text>

        <View style={styles.conditionList}>
          <View style={styles.conditionItem}>
            <IconSymbol name="sparkles" size={16} color="#4CAF50" />
            <Text style={[styles.conditionText, { color: '#4CAF50' }]}>nuovo</Text>
          </View>

          <View style={styles.conditionItem}>
            <IconSymbol name="arrow.uturn.backward" size={16} color="#FF9800" />
            <Text style={[styles.conditionText, { color: '#FF9800' }]}>reso da cliente</Text>
          </View>

          <View style={styles.conditionItem}>
            <IconSymbol name="exclamationmark.triangle" size={16} color="#F44336" />
            <Text style={[styles.conditionText, { color: '#F44336' }]}>packaging rovinato</Text>
          </View>
        </View>
      </View>

      <View style={styles.exampleSection}>
        <Text style={styles.sectionTitle}>Esempio</Text>
        <View style={styles.exampleTable}>
          <View style={styles.exampleHeader}>
            <Text style={styles.exampleHeaderText}>nome</Text>
            <Text style={styles.exampleHeaderText}>foto</Text>
            <Text style={styles.exampleHeaderText}>prezzo</Text>
            <Text style={styles.exampleHeaderText}>taglie</Text>
            <Text style={styles.exampleHeaderText}>condizione</Text>
          </View>
          <View style={styles.exampleRow}>
            <Text style={styles.exampleCell}>Giacca Pelle</Text>
            <Text style={styles.exampleCell}>https://...</Text>
            <Text style={styles.exampleCell}>450</Text>
            <Text style={styles.exampleCell}>M, L, XL</Text>
            <Text style={styles.exampleCell}>nuovo</Text>
          </View>
          <View style={styles.exampleRow}>
            <Text style={styles.exampleCell}>Borsa Designer</Text>
            <Text style={styles.exampleCell}>https://...</Text>
            <Text style={styles.exampleCell}>320</Text>
            <Text style={styles.exampleCell}>Unica</Text>
            <Text style={styles.exampleCell}>reso da cliente</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  columnList: {
    gap: 12,
  },
  columnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  columnBadge: {
    backgroundColor: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 120,
  },
  optionalBadge: {
    backgroundColor: colors.textSecondary,
  },
  columnBadgeText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  columnDescription: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  conditionList: {
    gap: 12,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exampleSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exampleTable: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    overflow: 'hidden',
  },
  exampleHeader: {
    flexDirection: 'row',
    backgroundColor: colors.text,
    padding: 8,
  },
  exampleHeaderText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.background,
    textAlign: 'center',
  },
  exampleRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exampleCell: {
    flex: 1,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
