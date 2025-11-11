
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { ProductCondition } from '@/types/Product';

interface ExcelProduct {
  nome: string;
  descrizione?: string;
  foto: string;
  prezzoListino: number;
  taglie?: string;
  condizione: ProductCondition;
  categoria?: string;
  stock?: number;
}

export default function ImportListScreen() {
  const [listName, setListName] = useState('');
  const [minDiscount, setMinDiscount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [maxOrderValue, setMaxOrderValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [products, setProducts] = useState<ExcelProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handlePickDocument = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel.sheet.macroEnabled.12',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('Document picker canceled');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('File selected:', file.name);
        setSelectedFile(file.name);
        await parseExcelFile(file.uri);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Errore', 'Impossibile selezionare il file');
    }
  };

  const parseExcelFile = async (uri: string) => {
    try {
      setIsLoading(true);
      
      // Read the file
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Parse Excel file
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      console.log('Parsed Excel data:', jsonData);
      
      // Map to product structure
      const parsedProducts: ExcelProduct[] = jsonData.map((row, index) => {
        // Normalize condition value
        let condition: ProductCondition = 'nuovo';
        const conditionValue = String(row.condizione || row.Condizione || '').toLowerCase().trim();
        
        if (conditionValue.includes('reso') || conditionValue.includes('cliente')) {
          condition = 'reso da cliente';
        } else if (conditionValue.includes('packaging') || conditionValue.includes('rovinato')) {
          condition = 'packaging rovinato';
        }
        
        return {
          nome: row.nome || row.Nome || row.name || `Prodotto ${index + 1}`,
          descrizione: row.descrizione || row.Descrizione || row.description || '',
          foto: row.foto || row.Foto || row.photo || row.image || '',
          prezzoListino: parseFloat(row.prezzoListino || row.PrezzoListino || row.prezzo || row.Prezzo || row.price || 0),
          taglie: row.taglie || row.Taglie || row.sizes || row.size || '',
          condizione: condition,
          categoria: row.categoria || row.Categoria || row.category || 'Generale',
          stock: parseInt(row.stock || row.Stock || row.quantita || row.Quantita || '1'),
        };
      });
      
      setProducts(parsedProducts);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Successo',
        `${parsedProducts.length} prodotti caricati dal file Excel`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      Alert.alert(
        'Errore',
        'Impossibile leggere il file Excel. Assicurati che il formato sia corretto.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (!listName || !minDiscount || !maxDiscount || !minOrderValue || !maxOrderValue) {
      Alert.alert('Errore', 'Compila tutti i campi');
      return;
    }

    if (products.length === 0) {
      Alert.alert('Errore', 'Importa un file Excel con i prodotti');
      return;
    }

    const minDiscountNum = parseFloat(minDiscount);
    const maxDiscountNum = parseFloat(maxDiscount);
    const minOrderValueNum = parseFloat(minOrderValue);
    const maxOrderValueNum = parseFloat(maxOrderValue);

    if (minDiscountNum >= maxDiscountNum) {
      Alert.alert('Errore', 'Lo sconto minimo deve essere inferiore allo sconto massimo');
      return;
    }

    if (minOrderValueNum >= maxOrderValueNum) {
      Alert.alert('Errore', 'Il valore minimo ordine deve essere inferiore al valore massimo');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Successo',
      `Lista "${listName}" importata con successo!\n\n${products.length} prodotti aggiunti.`,
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
    
    console.log('List imported:', {
      listName,
      minDiscount: minDiscountNum,
      maxDiscount: maxDiscountNum,
      minOrderValue: minOrderValueNum,
      maxOrderValue: maxOrderValueNum,
      products,
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Importa Lista',
          presentation: 'modal',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <IconSymbol name="doc.badge.plus" size={48} color={colors.text} />
              <Text style={styles.headerTitle}>Nuova Lista Prodotti</Text>
              <Text style={styles.headerSubtitle}>
                Importa un file Excel con i tuoi prodotti
              </Text>
            </View>

            {/* Excel File Upload */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="doc.text" size={20} color={colors.text} />
                <Text style={styles.sectionTitle}>File Excel</Text>
              </View>

              <Pressable 
                style={styles.uploadButton} 
                onPress={handlePickDocument}
                disabled={isLoading}
              >
                <IconSymbol 
                  name={selectedFile ? "checkmark.circle.fill" : "arrow.up.doc"} 
                  size={24} 
                  color={selectedFile ? '#4CAF50' : colors.text} 
                />
                <View style={styles.uploadTextContainer}>
                  <Text style={styles.uploadButtonText}>
                    {selectedFile || 'Seleziona File Excel'}
                  </Text>
                  {selectedFile && (
                    <Text style={styles.uploadSubtext}>
                      {products.length} prodotti caricati
                    </Text>
                  )}
                </View>
              </Pressable>

              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.text} />
                  <Text style={styles.loadingText}>Caricamento file...</Text>
                </View>
              )}

              <View style={styles.infoBox}>
                <IconSymbol name="info.circle" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  Il file Excel deve contenere le colonne: nome, foto, prezzoListino, taglie, condizione
                </Text>
              </View>

              <Text style={styles.helperText}>
                <Text style={styles.boldText}>Condizioni valide:</Text> nuovo, reso da cliente, packaging rovinato
              </Text>
            </View>

            {/* List Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Lista</Text>
              <TextInput
                style={styles.input}
                placeholder="es. Lista Fashion Primavera 2024"
                placeholderTextColor={colors.textTertiary}
                value={listName}
                onChangeText={setListName}
              />
            </View>

            {/* Discount Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="percent" size={20} color={colors.text} />
                <Text style={styles.sectionTitle}>Percentuale Sconto</Text>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Sconto Minimo (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30"
                    placeholderTextColor={colors.textTertiary}
                    value={minDiscount}
                    onChangeText={setMinDiscount}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.halfInput}>
                  <Text style={styles.label}>Sconto Massimo (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="80"
                    placeholderTextColor={colors.textTertiary}
                    value={maxDiscount}
                    onChangeText={setMaxDiscount}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={styles.helperText}>
                Lo sconto parte dal minimo e aumenta man mano che crescono le prenotazioni
              </Text>
            </View>

            {/* Order Value Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol name="eurosign.circle" size={20} color={colors.text} />
                <Text style={styles.sectionTitle}>Valore Ordine</Text>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Valore Minimo (€)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="5000"
                    placeholderTextColor={colors.textTertiary}
                    value={minOrderValue}
                    onChangeText={setMinOrderValue}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.halfInput}>
                  <Text style={styles.label}>Valore Massimo (€)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30000"
                    placeholderTextColor={colors.textTertiary}
                    value={maxOrderValue}
                    onChangeText={setMaxOrderValue}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={styles.helperText}>
                Il drop si attiva quando si raggiunge il valore minimo di prenotazioni
              </Text>
            </View>

            {/* Import Button */}
            <Pressable 
              style={[
                styles.importButton,
                (products.length === 0 || isLoading) && styles.importButtonDisabled
              ]} 
              onPress={handleImport}
              disabled={products.length === 0 || isLoading}
            >
              <Text style={styles.importButtonText}>
                {isLoading ? 'Caricamento...' : 'Importa Lista'}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 12,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    gap: 12,
    marginBottom: 12,
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  importButton: {
    backgroundColor: colors.text,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
});
