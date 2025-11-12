
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

export default function ExcelFormatGuide() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <IconSymbol 
          ios_icon_name="doc.text.magnifyingglass" 
          android_material_icon_name="description" 
          size={32} 
          color={colors.text} 
        />
        <Text style={styles.title}>Guida Formato File Excel</Text>
        <Text style={styles.subtitle}>
          Segui questa guida per creare il file Excel perfetto per l&apos;importazione
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Colonne Richieste</Text>
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
            <Text style={styles.columnDescription}>Taglie disponibili separate da virgola (es. S, M, L, XL)</Text>
          </View>

          <View style={styles.columnItem}>
            <View style={styles.columnBadge}>
              <Text style={styles.columnBadgeText}>colori</Text>
            </View>
            <Text style={styles.columnDescription}>Colori disponibili separati da virgola (es. Nero, Bianco, Rosso)</Text>
          </View>

          <View style={styles.columnItem}>
            <View style={styles.columnBadge}>
              <Text style={styles.columnBadgeText}>condizione</Text>
            </View>
            <Text style={styles.columnDescription}>Condizione del prodotto (vedi sotto)</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Colonne Opzionali</Text>
        
        <View style={styles.columnList}>
          <View style={styles.columnItem}>
            <View style={[styles.columnBadge, styles.optionalBadge]}>
              <Text style={styles.columnBadgeText}>descrizione</Text>
            </View>
            <Text style={styles.columnDescription}>Descrizione dettagliata del prodotto</Text>
          </View>

          <View style={styles.columnItem}>
            <View style={[styles.columnBadge, styles.optionalBadge]}>
              <Text style={styles.columnBadgeText}>categoria</Text>
            </View>
            <Text style={styles.columnDescription}>Categoria del prodotto (es. Fashion, Electronics)</Text>
          </View>

          <View style={styles.columnItem}>
            <View style={[styles.columnBadge, styles.optionalBadge]}>
              <Text style={styles.columnBadgeText}>stock</Text>
            </View>
            <Text style={styles.columnDescription}>Quantità disponibile in magazzino</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Valori Condizione</Text>
        <Text style={styles.description}>
          La colonna &quot;condizione&quot; deve contenere uno dei seguenti valori:
        </Text>

        <View style={styles.conditionList}>
          <View style={styles.conditionItem}>
            <IconSymbol 
              ios_icon_name="sparkles" 
              android_material_icon_name="star" 
              size={16} 
              color="#4CAF50" 
            />
            <Text style={[styles.conditionText, { color: '#4CAF50' }]}>nuovo</Text>
            <Text style={styles.conditionDescription}>Prodotto nuovo di zecca</Text>
          </View>

          <View style={styles.conditionItem}>
            <IconSymbol 
              ios_icon_name="arrow.uturn.backward" 
              android_material_icon_name="keyboard_return" 
              size={16} 
              color="#FF9800" 
            />
            <Text style={[styles.conditionText, { color: '#FF9800' }]}>reso da cliente</Text>
            <Text style={styles.conditionDescription}>Prodotto restituito dal cliente</Text>
          </View>

          <View style={styles.conditionItem}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle" 
              android_material_icon_name="warning" 
              size={16} 
              color="#F44336" 
            />
            <Text style={[styles.conditionText, { color: '#F44336' }]}>packaging rovinato</Text>
            <Text style={styles.conditionDescription}>Confezione danneggiata</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Come Specificare Taglie e Colori</Text>
        
        <View style={styles.tipBox}>
          <IconSymbol 
            ios_icon_name="lightbulb.fill" 
            android_material_icon_name="lightbulb" 
            size={20} 
            color="#FFC107" 
          />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Taglie</Text>
            <Text style={styles.tipText}>
              Inserisci le taglie separate da virgola. Esempi:{'\n'}
              • S, M, L, XL{'\n'}
              • 38, 40, 42, 44{'\n'}
              • Unica
            </Text>
          </View>
        </View>

        <View style={styles.tipBox}>
          <IconSymbol 
            ios_icon_name="paintpalette.fill" 
            android_material_icon_name="palette" 
            size={20} 
            color="#2196F3" 
          />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Colori</Text>
            <Text style={styles.tipText}>
              Inserisci i colori separati da virgola. Esempi:{'\n'}
              • Nero, Bianco, Rosso{'\n'}
              • Blu Navy, Grigio, Beige{'\n'}
              • Multicolore
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.exampleSection}>
        <Text style={styles.sectionTitle}>📊 Esempio Completo</Text>
        <Text style={styles.description}>
          Ecco come dovrebbe apparire il tuo file Excel:
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
          <View style={styles.exampleTable}>
            <View style={styles.exampleHeader}>
              <Text style={[styles.exampleHeaderText, styles.col1]}>nome</Text>
              <Text style={[styles.exampleHeaderText, styles.col2]}>foto</Text>
              <Text style={[styles.exampleHeaderText, styles.col3]}>prezzoListino</Text>
              <Text style={[styles.exampleHeaderText, styles.col4]}>taglie</Text>
              <Text style={[styles.exampleHeaderText, styles.col5]}>colori</Text>
              <Text style={[styles.exampleHeaderText, styles.col6]}>condizione</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={[styles.exampleCell, styles.col1]}>Giacca Pelle</Text>
              <Text style={[styles.exampleCell, styles.col2]}>https://...</Text>
              <Text style={[styles.exampleCell, styles.col3]}>450</Text>
              <Text style={[styles.exampleCell, styles.col4]}>M, L, XL</Text>
              <Text style={[styles.exampleCell, styles.col5]}>Nero, Marrone</Text>
              <Text style={[styles.exampleCell, styles.col6]}>nuovo</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={[styles.exampleCell, styles.col1]}>Borsa Designer</Text>
              <Text style={[styles.exampleCell, styles.col2]}>https://...</Text>
              <Text style={[styles.exampleCell, styles.col3]}>320</Text>
              <Text style={[styles.exampleCell, styles.col4]}>Unica</Text>
              <Text style={[styles.exampleCell, styles.col5]}>Beige, Nero</Text>
              <Text style={[styles.exampleCell, styles.col6]}>reso da cliente</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={[styles.exampleCell, styles.col1]}>Sneakers Sport</Text>
              <Text style={[styles.exampleCell, styles.col2]}>https://...</Text>
              <Text style={[styles.exampleCell, styles.col3]}>180</Text>
              <Text style={[styles.exampleCell, styles.col4]}>40, 41, 42, 43</Text>
              <Text style={[styles.exampleCell, styles.col5]}>Bianco, Nero</Text>
              <Text style={[styles.exampleCell, styles.col6]}>packaging rovinato</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={styles.notesSection}>
        <IconSymbol 
          ios_icon_name="exclamationmark.circle.fill" 
          android_material_icon_name="info" 
          size={24} 
          color={colors.text} 
        />
        <Text style={styles.notesTitle}>Note Importanti</Text>
        <View style={styles.notesList}>
          <Text style={styles.noteItem}>
            • I nomi delle colonne non sono case-sensitive (puoi usare &quot;Nome&quot; o &quot;nome&quot;)
          </Text>
          <Text style={styles.noteItem}>
            • Le URL delle foto devono essere complete e accessibili
          </Text>
          <Text style={styles.noteItem}>
            • Il prezzo deve essere un numero senza simboli (es. 450, non €450)
          </Text>
          <Text style={styles.noteItem}>
            • Se un prodotto non ha taglie o colori, lascia la cella vuota
          </Text>
          <Text style={styles.noteItem}>
            • La condizione è obbligatoria per ogni prodotto
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Seguendo questa guida, il tuo file Excel sarà perfettamente compatibile con il sistema di importazione! 🎉
        </Text>
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
    backgroundColor: colors.backgroundSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    lineHeight: 18,
  },
  conditionList: {
    gap: 12,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.backgroundSecondary,
    padding: 14,
    borderRadius: 8,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 140,
  },
  conditionDescription: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  tipBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  exampleSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableScroll: {
    marginTop: 12,
  },
  exampleTable: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  exampleHeader: {
    flexDirection: 'row',
    backgroundColor: colors.text,
    padding: 10,
  },
  exampleHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background,
    paddingHorizontal: 8,
  },
  exampleRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exampleCell: {
    fontSize: 11,
    color: colors.textSecondary,
    paddingHorizontal: 8,
  },
  col1: { width: 100 },
  col2: { width: 80 },
  col3: { width: 80 },
  col4: { width: 100 },
  col5: { width: 100 },
  col6: { width: 120 },
  notesSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 16,
  },
  notesList: {
    gap: 10,
    width: '100%',
  },
  noteItem: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
  },
});
