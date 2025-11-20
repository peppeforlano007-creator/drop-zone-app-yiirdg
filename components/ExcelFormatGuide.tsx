
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import * as Haptics from 'expo-haptics';

interface ExcelFormatGuideProps {
  onClose: () => void;
}

export default function ExcelFormatGuide({ onClose }: ExcelFormatGuideProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Formato File Excel</Text>
        <Pressable
          style={styles.closeButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClose();
          }}
        >
          <IconSymbol
            ios_icon_name="xmark.circle.fill"
            android_material_icon_name="cancel"
            size={28}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol
              ios_icon_name="exclamationmark.circle.fill"
              android_material_icon_name="error"
              size={20}
              color={colors.error}
            />
            <Text style={styles.sectionTitle}>Colonne Obbligatorie</Text>
          </View>
          <View style={styles.fieldList}>
            <View style={styles.field}>
              <Text style={styles.fieldName}>nome</Text>
              <Text style={styles.fieldDescription}>Nome del prodotto</Text>
              <Text style={styles.fieldExample}>Es: Scarpe Nike Air Max</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldName}>immagine_url</Text>
              <Text style={styles.fieldDescription}>URL dell&apos;immagine principale</Text>
              <Text style={styles.fieldExample}>Es: https://example.com/image.jpg</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldName}>prezzo</Text>
              <Text style={styles.fieldDescription}>Prezzo di listino in euro</Text>
              <Text style={styles.fieldExample}>Es: 129.99</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.sectionTitle}>Colonne Opzionali</Text>
          </View>
          <View style={styles.fieldList}>
            <View style={styles.field}>
              <Text style={styles.fieldName}>sku</Text>
              <Text style={styles.fieldDescription}>Codice articolo SKU - usato per raggruppare varianti dello stesso prodotto</Text>
              <Text style={styles.fieldExample}>Es: NIKE-AM-001 (stesso SKU per tutte le taglie/colori dello stesso articolo)</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldName}>descrizione</Text>
              <Text style={styles.fieldDescription}>Descrizione dettagliata del prodotto</Text>
              <Text style={styles.fieldExample}>Es: Scarpe sportive con suola ammortizzata</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldName}>brand</Text>
              <Text style={styles.fieldDescription}>Marca o brand del prodotto</Text>
              <Text style={styles.fieldExample}>Es: Nike, Adidas, Puma</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldName}>immagini_aggiuntive</Text>
              <Text style={styles.fieldDescription}>URL di immagini aggiuntive (separate da virgola)</Text>
              <Text style={styles.fieldExample}>Es: https://ex.com/img1.jpg, https://ex.com/img2.jpg</Text>
            </View>
            <View style={[styles.field, styles.highlightedField]}>
              <Text style={styles.fieldName}>taglie</Text>
              <Text style={styles.fieldDescription}>
                Taglie disponibili (separate da virgola){'\n'}
                <Text style={styles.fieldBold}>✓ Supporta sia lettere che numeri!</Text>
              </Text>
              <Text style={styles.fieldExample}>
                <Text style={styles.fieldBold}>Abbigliamento:</Text> S, M, L, XL, XXL{'\n'}
                <Text style={styles.fieldBold}>Pantaloni:</Text> 42, 44, 46, 48, 50{'\n'}
                <Text style={styles.fieldBold}>Scarpe:</Text> 38, 39, 40, 41, 42, 43, 44{'\n'}
                <Text style={styles.fieldBold}>Misto:</Text> S, M, L, 42, 44, 46
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldName}>colori</Text>
              <Text style={styles.fieldDescription}>Colori disponibili (separate da virgola)</Text>
              <Text style={styles.fieldExample}>Es: Nero, Bianco, Rosso</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldName}>condizione</Text>
              <Text style={styles.fieldDescription}>Condizione del prodotto (campo libero)</Text>
              <Text style={styles.fieldExample}>Es: nuovo, usato, leggermente graffiato, packaging rovinato, reso da cliente, come nuovo, ricondizionato, ecc.</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldName}>categoria</Text>
              <Text style={styles.fieldDescription}>Categoria del prodotto</Text>
              <Text style={styles.fieldExample}>Es: Fashion, Elettronica, Casa</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldName}>stock</Text>
              <Text style={styles.fieldDescription}>Quantità disponibile per questa specifica variante</Text>
              <Text style={styles.fieldExample}>Es: 10 (default: 1)</Text>
            </View>
          </View>
        </View>

        <View style={styles.sizesExampleSection}>
          <View style={styles.sectionHeader}>
            <IconSymbol
              ios_icon_name="ruler.fill"
              android_material_icon_name="straighten"
              size={20}
              color="#4CAF50"
            />
            <Text style={styles.sectionTitle}>Esempi di Taglie</Text>
          </View>
          <Text style={styles.sizesDescription}>
            Il campo <Text style={styles.fieldBold}>taglie</Text> accetta qualsiasi formato: lettere (S, M, L, XL) o numeri (42, 44, 46).
            {'\n\n'}
            <Text style={styles.fieldBold}>Esempi per categoria:</Text>
          </Text>
          
          <View style={styles.sizesExampleCard}>
            <View style={styles.sizesExampleHeader}>
              <IconSymbol
                ios_icon_name="tshirt.fill"
                android_material_icon_name="checkroom"
                size={16}
                color="#2196F3"
              />
              <Text style={styles.sizesExampleTitle}>Abbigliamento (T-shirt, Felpe, Giacche)</Text>
            </View>
            <Text style={styles.sizesExampleText}>
              <Text style={styles.fieldBold}>taglie:</Text> XS, S, M, L, XL, XXL
            </Text>
          </View>

          <View style={styles.sizesExampleCard}>
            <View style={styles.sizesExampleHeader}>
              <IconSymbol
                ios_icon_name="figure.walk"
                android_material_icon_name="directions_walk"
                size={16}
                color="#FF9800"
              />
              <Text style={styles.sizesExampleTitle}>Pantaloni e Jeans</Text>
            </View>
            <Text style={styles.sizesExampleText}>
              <Text style={styles.fieldBold}>taglie:</Text> 38, 40, 42, 44, 46, 48, 50, 52
            </Text>
          </View>

          <View style={styles.sizesExampleCard}>
            <View style={styles.sizesExampleHeader}>
              <IconSymbol
                ios_icon_name="shoe.fill"
                android_material_icon_name="shopping_bag"
                size={16}
                color="#9C27B0"
              />
              <Text style={styles.sizesExampleTitle}>Scarpe e Calzature</Text>
            </View>
            <Text style={styles.sizesExampleText}>
              <Text style={styles.fieldBold}>taglie:</Text> 36, 37, 38, 39, 40, 41, 42, 43, 44, 45
            </Text>
          </View>

          <View style={styles.sizesExampleCard}>
            <View style={styles.sizesExampleHeader}>
              <IconSymbol
                ios_icon_name="bag.fill"
                android_material_icon_name="shopping_bag"
                size={16}
                color="#F44336"
              />
              <Text style={styles.sizesExampleTitle}>Accessori (Cinture, Guanti)</Text>
            </View>
            <Text style={styles.sizesExampleText}>
              <Text style={styles.fieldBold}>taglie:</Text> 75, 80, 85, 90, 95, 100
            </Text>
          </View>

          <View style={[styles.sizesExampleCard, styles.mixedSizesCard]}>
            <View style={styles.sizesExampleHeader}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={16}
                color="#FFD700"
              />
              <Text style={styles.sizesExampleTitle}>Formato Misto (Supportato!)</Text>
            </View>
            <Text style={styles.sizesExampleText}>
              <Text style={styles.fieldBold}>taglie:</Text> S, M, L, 42, 44, 46{'\n'}
              <Text style={styles.sizesNote}>✓ Puoi mescolare lettere e numeri nella stessa lista</Text>
            </Text>
          </View>
        </View>

        <View style={styles.skuSection}>
          <View style={styles.sectionHeader}>
            <IconSymbol
              ios_icon_name="square.grid.3x3.fill"
              android_material_icon_name="grid_view"
              size={20}
              color="#FFA500"
            />
            <Text style={styles.sectionTitle}>Raggruppamento per SKU</Text>
          </View>
          <Text style={styles.skuDescription}>
            Il campo <Text style={styles.skuBold}>sku</Text> permette di raggruppare prodotti con diverse taglie e colori come varianti dello stesso articolo.
            {'\n\n'}
            <Text style={styles.skuBold}>Esempio:</Text> Se hai lo stesso modello di scarpe in diverse taglie e colori, usa lo stesso SKU per tutte le righe:
          </Text>
          <View style={styles.skuExampleTable}>
            <View style={styles.skuExampleRow}>
              <Text style={styles.skuExampleHeader}>SKU</Text>
              <Text style={styles.skuExampleHeader}>Nome</Text>
              <Text style={styles.skuExampleHeader}>Taglia</Text>
              <Text style={styles.skuExampleHeader}>Colore</Text>
              <Text style={styles.skuExampleHeader}>Stock</Text>
            </View>
            <View style={styles.skuExampleRow}>
              <Text style={styles.skuExampleCell}>NIKE-AM-001</Text>
              <Text style={styles.skuExampleCell}>Nike Air Max</Text>
              <Text style={styles.skuExampleCell}>38</Text>
              <Text style={styles.skuExampleCell}>Nero</Text>
              <Text style={styles.skuExampleCell}>5</Text>
            </View>
            <View style={styles.skuExampleRow}>
              <Text style={styles.skuExampleCell}>NIKE-AM-001</Text>
              <Text style={styles.skuExampleCell}>Nike Air Max</Text>
              <Text style={styles.skuExampleCell}>39</Text>
              <Text style={styles.skuExampleCell}>Nero</Text>
              <Text style={styles.skuExampleCell}>3</Text>
            </View>
            <View style={styles.skuExampleRow}>
              <Text style={styles.skuExampleCell}>NIKE-AM-001</Text>
              <Text style={styles.skuExampleCell}>Nike Air Max</Text>
              <Text style={styles.skuExampleCell}>40</Text>
              <Text style={styles.skuExampleCell}>Bianco</Text>
              <Text style={styles.skuExampleCell}>7</Text>
            </View>
          </View>
          <Text style={styles.skuNote}>
            ℹ️ Tutte le righe con lo stesso SKU verranno raggruppate nel feed come un unico prodotto con varianti selezionabili.
          </Text>
        </View>

        <View style={styles.exampleSection}>
          <Text style={styles.exampleTitle}>Esempio Completo - Pantalone:</Text>
          <View style={styles.exampleTable}>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>sku</Text>
              <Text style={styles.exampleCell}>PANT-DENIM-001</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>nome</Text>
              <Text style={styles.exampleCell}>Jeans Slim Fit</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>descrizione</Text>
              <Text style={styles.exampleCell}>Jeans elasticizzati comfort</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>brand</Text>
              <Text style={styles.exampleCell}>Levi&apos;s</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>immagine_url</Text>
              <Text style={styles.exampleCell}>https://example.com/jeans.jpg</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>prezzo</Text>
              <Text style={styles.exampleCell}>89.99</Text>
            </View>
            <View style={[styles.exampleRow, styles.highlightedRow]}>
              <Text style={styles.exampleCell}>taglie</Text>
              <Text style={[styles.exampleCell, styles.exampleCellBold]}>42, 44, 46, 48</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>colori</Text>
              <Text style={styles.exampleCell}>Blu Scuro</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>condizione</Text>
              <Text style={styles.exampleCell}>nuovo</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>categoria</Text>
              <Text style={styles.exampleCell}>Fashion</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>stock</Text>
              <Text style={styles.exampleCell}>8</Text>
            </View>
          </View>
        </View>

        <View style={styles.exampleSection}>
          <Text style={styles.exampleTitle}>Esempio Completo - Scarpe:</Text>
          <View style={styles.exampleTable}>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>sku</Text>
              <Text style={styles.exampleCell}>SHOE-SPORT-001</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>nome</Text>
              <Text style={styles.exampleCell}>Scarpe Running Pro</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>descrizione</Text>
              <Text style={styles.exampleCell}>Scarpe da corsa professionali</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>brand</Text>
              <Text style={styles.exampleCell}>Nike</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>immagine_url</Text>
              <Text style={styles.exampleCell}>https://example.com/shoes.jpg</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>prezzo</Text>
              <Text style={styles.exampleCell}>129.99</Text>
            </View>
            <View style={[styles.exampleRow, styles.highlightedRow]}>
              <Text style={styles.exampleCell}>taglie</Text>
              <Text style={[styles.exampleCell, styles.exampleCellBold]}>38, 39, 40, 41, 42, 43</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>colori</Text>
              <Text style={styles.exampleCell}>Nero, Bianco</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>condizione</Text>
              <Text style={styles.exampleCell}>nuovo</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>categoria</Text>
              <Text style={styles.exampleCell}>Fashion</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleCell}>stock</Text>
              <Text style={styles.exampleCell}>12</Text>
            </View>
          </View>
        </View>

        <View style={styles.tipsSection}>
          <View style={styles.sectionHeader}>
            <IconSymbol
              ios_icon_name="lightbulb.fill"
              android_material_icon_name="lightbulb"
              size={20}
              color="#FFA500"
            />
            <Text style={styles.sectionTitle}>Suggerimenti</Text>
          </View>
          <View style={styles.tipsList}>
            <Text style={styles.tip}>- La prima riga deve contenere i nomi delle colonne</Text>
            <Text style={styles.tip}>- Usa il punto (.) come separatore decimale per i prezzi</Text>
            <Text style={styles.tip}>- Gli URL delle immagini devono essere completi e accessibili</Text>
            <Text style={styles.tip}>- Per liste multiple (taglie, colori, immagini), usa la virgola come separatore</Text>
            <Text style={styles.tip}>- <Text style={styles.fieldBold}>Le taglie possono essere lettere (S, M, L) o numeri (42, 44, 46)</Text></Text>
            <Text style={styles.tip}>- Se una colonna opzionale è vuota, verrà ignorata</Text>
            <Text style={styles.tip}>- Il campo SKU è opzionale ma fortemente consigliato per raggruppare varianti</Text>
            <Text style={styles.tip}>- Usa lo stesso SKU per tutte le varianti (taglie/colori) dello stesso articolo</Text>
            <Text style={styles.tip}>- Ogni riga con lo stesso SKU può avere quantità diverse per taglia/colore</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  fieldList: {
    gap: 16,
  },
  field: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  highlightedField: {
    backgroundColor: '#E8F5E9',
    borderLeftColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  fieldName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  fieldDescription: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  fieldExample: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  fieldBold: {
    fontWeight: '700',
    color: colors.text,
  },
  sizesExampleSection: {
    marginBottom: 24,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  sizesDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  sizesExampleCard: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  mixedSizesCard: {
    backgroundColor: '#FFFBF0',
    borderLeftColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  sizesExampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sizesExampleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  sizesExampleText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  sizesNote: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  skuSection: {
    marginBottom: 24,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  skuDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  skuBold: {
    fontWeight: '700',
    color: colors.primary,
  },
  skuExampleTable: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  skuExampleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  skuExampleHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'monospace',
  },
  skuExampleCell: {
    flex: 1,
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  skuNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  exampleSection: {
    marginBottom: 24,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  exampleTable: {
    gap: 8,
  },
  exampleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  highlightedRow: {
    backgroundColor: '#E8F5E9',
  },
  exampleCell: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontFamily: 'monospace',
  },
  exampleCellBold: {
    fontWeight: '700',
    color: '#4CAF50',
  },
  tipsSection: {
    marginBottom: 24,
  },
  tipsList: {
    gap: 8,
  },
  tip: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
