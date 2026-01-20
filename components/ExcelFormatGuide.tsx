
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';

export default function ExcelFormatGuide() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol
          ios_icon_name="doc.text.fill"
          android_material_icon_name="description"
          size={24}
          color={colors.info}
        />
        <Text style={styles.title}>Formato File Excel</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Colonne Richieste:</Text>
        
        <View style={styles.column}>
          <Text style={styles.columnName}>• sku</Text>
          <Text style={styles.columnDesc}>(opzionale) Codice prodotto univoco</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnName}>• nome</Text>
          <Text style={styles.columnDesc}>(obbligatorio) Nome del prodotto</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnName}>• descrizione</Text>
          <Text style={styles.columnDesc}>(opzionale) Descrizione dettagliata</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnName}>• immagine_url</Text>
          <Text style={styles.columnDesc}>(obbligatorio) URL dell'immagine principale</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnName}>• immagini_aggiuntive</Text>
          <Text style={styles.columnDesc}>(opzionale) URL separate da virgola</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnName}>• prezzo</Text>
          <Text style={styles.columnDesc}>(obbligatorio) Prezzo originale in euro</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnName}>• taglia</Text>
          <Text style={styles.columnDesc}>(opzionale) Taglia del prodotto</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnName}>• colore</Text>
          <Text style={styles.columnDesc}>(opzionale) Colore del prodotto</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnName}>• condizione</Text>
          <Text style={styles.columnDesc}>(obbligatorio) nuovo / reso da cliente / packaging rovinato</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnName}>• categoria</Text>
          <Text style={styles.columnDesc}>(opzionale) Categoria del prodotto</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnName}>• brand</Text>
          <Text style={styles.columnDesc}>(opzionale) Marca del prodotto</Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.columnName}>• stock</Text>
          <Text style={styles.columnDesc}>(obbligatorio) Quantità disponibile</Text>
        </View>

        <View style={styles.noteBox}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={20}
            color={colors.info}
          />
          <Text style={styles.noteText}>
            I prodotti con lo stesso SKU verranno raggruppati come varianti dello stesso prodotto.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  column: {
    marginBottom: 12,
  },
  columnName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  columnDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 16,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    marginTop: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
