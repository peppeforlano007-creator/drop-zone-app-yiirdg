
import React, { useState, useEffect } from 'react';
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
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';

interface Supplier {
  user_id: string;
  full_name: string;
  email: string;
}

interface ExcelProduct {
  nome: string;
  descrizione?: string;
  immagine_url: string;
  prezzo: number;
  taglie?: string;
  colori?: string;
  condizione: 'nuovo' | 'reso da cliente' | 'packaging rovinato';
  categoria?: string;
  stock: number;
}

export default function CreateListScreen() {
  const { supplierId: paramSupplierId } = useLocalSearchParams<{ supplierId?: string }>();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(paramSupplierId || '');
  const [listName, setListName] = useState('');
  const [minDiscount, setMinDiscount] = useState('30');
  const [maxDiscount, setMaxDiscount] = useState('80');
  const [minReservationValue, setMinReservationValue] = useState('5000');
  const [maxReservationValue, setMaxReservationValue] = useState('30000');
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [importMode, setImportMode] = useState<'manual' | 'excel'>('manual');
  const [excelProducts, setExcelProducts] = useState<ExcelProduct[]>([]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('role', 'supplier')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error loading suppliers:', error);
        Alert.alert('Errore', 'Impossibile caricare i fornitori');
        return;
      }

      setSuppliers(data || []);
    } catch (error) {
      console.error('Exception loading suppliers:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handlePickExcelFile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      console.log('Selected file:', file);

      // Read the file
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      console.log('Parsed Excel data:', jsonData);

      if (jsonData.length === 0) {
        Alert.alert('Errore', 'Il file Excel è vuoto');
        return;
      }

      // Validate and transform data
      const products: ExcelProduct[] = [];
      const errors: string[] = [];

      jsonData.forEach((row, index) => {
        const rowNum = index + 2; // +2 because Excel rows start at 1 and we have a header
        
        // Required fields
        if (!row.nome || !row.immagine_url || !row.prezzo) {
          errors.push(`Riga ${rowNum}: Campi obbligatori mancanti (nome, immagine_url, prezzo)`);
          return;
        }

        const price = parseFloat(row.prezzo);
        if (isNaN(price) || price <= 0) {
          errors.push(`Riga ${rowNum}: Prezzo non valido`);
          return;
        }

        const stock = parseInt(row.stock || '1');
        if (isNaN(stock) || stock < 0) {
          errors.push(`Riga ${rowNum}: Stock non valido`);
          return;
        }

        const condition = row.condizione || 'nuovo';
        if (!['nuovo', 'reso da cliente', 'packaging rovinato'].includes(condition)) {
          errors.push(`Riga ${rowNum}: Condizione non valida (deve essere: nuovo, reso da cliente, o packaging rovinato)`);
          return;
        }

        products.push({
          nome: row.nome,
          descrizione: row.descrizione || '',
          immagine_url: row.immagine_url,
          prezzo: price,
          taglie: row.taglie || '',
          colori: row.colori || '',
          condizione: condition as 'nuovo' | 'reso da cliente' | 'packaging rovinato',
          categoria: row.categoria || '',
          stock: stock,
        });
      });

      if (errors.length > 0) {
        Alert.alert(
          'Errori nel File',
          `Trovati ${errors.length} errori:\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`,
          [
            { text: 'OK' }
          ]
        );
        return;
      }

      if (products.length === 0) {
        Alert.alert('Errore', 'Nessun prodotto valido trovato nel file');
        return;
      }

      setExcelProducts(products);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'File Caricato',
        `${products.length} prodott${products.length === 1 ? 'o' : 'i'} caricato con successo!\n\nCompila i campi della lista e clicca "Crea Lista con Prodotti" per procedere.`
      );
    } catch (error) {
      console.error('Error reading Excel file:', error);
      Alert.alert('Errore', 'Impossibile leggere il file Excel. Assicurati che sia un file .xlsx o .xls valido.');
    }
  };

  const handleCreateList = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Validation
    if (!selectedSupplierId) {
      Alert.alert('Errore', 'Seleziona un fornitore');
      return;
    }

    if (!listName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome della lista');
      return;
    }

    const minDiscountNum = parseFloat(minDiscount);
    const maxDiscountNum = parseFloat(maxDiscount);
    const minValueNum = parseFloat(minReservationValue);
    const maxValueNum = parseFloat(maxReservationValue);

    if (isNaN(minDiscountNum) || minDiscountNum < 0 || minDiscountNum > 100) {
      Alert.alert('Errore', 'Lo sconto minimo deve essere tra 0 e 100');
      return;
    }

    if (isNaN(maxDiscountNum) || maxDiscountNum < 0 || maxDiscountNum > 100) {
      Alert.alert('Errore', 'Lo sconto massimo deve essere tra 0 e 100');
      return;
    }

    if (minDiscountNum >= maxDiscountNum) {
      Alert.alert('Errore', 'Lo sconto minimo deve essere inferiore allo sconto massimo');
      return;
    }

    if (isNaN(minValueNum) || minValueNum <= 0) {
      Alert.alert('Errore', 'Il valore minimo deve essere maggiore di 0');
      return;
    }

    if (isNaN(maxValueNum) || maxValueNum <= 0) {
      Alert.alert('Errore', 'Il valore massimo deve essere maggiore di 0');
      return;
    }

    if (minValueNum >= maxValueNum) {
      Alert.alert('Errore', 'Il valore minimo deve essere inferiore al valore massimo');
      return;
    }

    setLoading(true);

    try {
      console.log('Creating supplier list...');
      
      const { data, error } = await supabase
        .from('supplier_lists')
        .insert({
          supplier_id: selectedSupplierId,
          name: listName.trim(),
          min_discount: minDiscountNum,
          max_discount: maxDiscountNum,
          min_reservation_value: minValueNum,
          max_reservation_value: maxValueNum,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating list:', error);
        Alert.alert('Errore', `Impossibile creare la lista: ${error.message}`);
        return;
      }

      console.log('List created successfully:', data.id);

      // If we have Excel products, import them
      if (importMode === 'excel' && excelProducts.length > 0) {
        console.log(`Importing ${excelProducts.length} products from Excel...`);
        
        const productsToInsert = excelProducts.map(product => ({
          supplier_list_id: data.id,
          supplier_id: selectedSupplierId,
          name: product.nome,
          description: product.descrizione || null,
          image_url: product.immagine_url,
          original_price: product.prezzo,
          available_sizes: product.taglie ? product.taglie.split(',').map(s => s.trim()).filter(s => s) : null,
          available_colors: product.colori ? product.colori.split(',').map(c => c.trim()).filter(c => c) : null,
          condition: product.condizione,
          category: product.categoria || null,
          stock: product.stock,
          status: 'active',
        }));

        const { error: productsError } = await supabase
          .from('products')
          .insert(productsToInsert);

        if (productsError) {
          console.error('Error importing products:', productsError);
          Alert.alert(
            'Attenzione',
            `Lista creata ma errore nell'importazione dei prodotti: ${productsError.message}\n\nPuoi aggiungere i prodotti manualmente.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  router.replace({
                    pathname: '/admin/list-details',
                    params: { listId: data.id },
                  });
                },
              },
            ]
          );
          return;
        }

        console.log('Products imported successfully');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (importMode === 'excel' && excelProducts.length > 0) {
        Alert.alert(
          'Lista Creata!',
          `La lista "${listName}" è stata creata con successo con ${excelProducts.length} prodott${excelProducts.length === 1 ? 'o' : 'i'}!`,
          [
            {
              text: 'Visualizza Lista',
              onPress: () => {
                router.replace({
                  pathname: '/admin/list-details',
                  params: { listId: data.id },
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Lista Creata!',
          `La lista "${listName}" è stata creata con successo.\n\nPuoi ora aggiungere prodotti a questa lista.`,
          [
            {
              text: 'Aggiungi Prodotti',
              onPress: () => {
                router.replace({
                  pathname: '/admin/list-details',
                  params: { listId: data.id },
                });
              },
            },
            {
              text: 'Torna Indietro',
              style: 'cancel',
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Exception creating list:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto');
    } finally {
      setLoading(false);
    }
  };

  if (loadingSuppliers) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento fornitori...</Text>
      </View>
    );
  }

  if (suppliers.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Crea Nuova Lista',
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="building.2"
              android_material_icon_name="store"
              size={64}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>Nessun Fornitore Trovato</Text>
            <Text style={styles.emptyText}>
              Devi prima creare almeno un fornitore prima di poter creare una lista.
            </Text>
            <Pressable
              style={styles.createSupplierButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/admin/create-supplier');
              }}
            >
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add_circle"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.createSupplierButtonText}>Crea Fornitore</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Crea Nuova Lista',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <IconSymbol 
                  ios_icon_name="list.bullet.rectangle.fill" 
                  android_material_icon_name="list_alt"
                  size={48} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.title}>Nuova Lista Prodotti</Text>
              <Text style={styles.subtitle}>
                Crea una nuova lista di prodotti per un fornitore
              </Text>
            </View>

            <View style={styles.form}>
              {/* Import Mode Selection */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Modalità Importazione</Text>
                <View style={styles.modeSelector}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modeButton,
                      importMode === 'manual' && styles.modeButtonSelected,
                      pressed && styles.modeButtonPressed,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setImportMode('manual');
                      setExcelProducts([]);
                    }}
                    disabled={loading}
                  >
                    <IconSymbol
                      ios_icon_name="hand.draw.fill"
                      android_material_icon_name="edit"
                      size={20}
                      color={importMode === 'manual' ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                      styles.modeButtonText,
                      importMode === 'manual' && styles.modeButtonTextSelected,
                    ]}>
                      Manuale
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    style={({ pressed }) => [
                      styles.modeButton,
                      importMode === 'excel' && styles.modeButtonSelected,
                      pressed && styles.modeButtonPressed,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setImportMode('excel');
                    }}
                    disabled={loading}
                  >
                    <IconSymbol
                      ios_icon_name="doc.fill"
                      android_material_icon_name="description"
                      size={20}
                      color={importMode === 'excel' ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                      styles.modeButtonText,
                      importMode === 'excel' && styles.modeButtonTextSelected,
                    ]}>
                      Excel
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Excel Import Section */}
              {importMode === 'excel' && (
                <View style={styles.excelSection}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.excelButton,
                      pressed && styles.excelButtonPressed,
                    ]}
                    onPress={handlePickExcelFile}
                    disabled={loading}
                  >
                    <IconSymbol
                      ios_icon_name="arrow.down.doc.fill"
                      android_material_icon_name="file_download"
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.excelButtonText}>
                      {excelProducts.length > 0 
                        ? `${excelProducts.length} Prodotti Caricati` 
                        : 'Carica File Excel'}
                    </Text>
                  </Pressable>
                  
                  <Text style={styles.excelHint}>
                    Il file Excel deve contenere le colonne:{'\n'}
                    nome, immagine_url, prezzo (obbligatori){'\n'}
                    descrizione, taglie, colori, condizione, categoria, stock (opzionali)
                  </Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Fornitore *</Text>
                <ScrollView 
                  style={styles.supplierList}
                  contentContainerStyle={styles.supplierListContent}
                >
                  {suppliers.map((supplier) => (
                    <Pressable
                      key={supplier.user_id}
                      style={({ pressed }) => [
                        styles.supplierCard,
                        selectedSupplierId === supplier.user_id && styles.supplierCardSelected,
                        pressed && styles.supplierCardPressed,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedSupplierId(supplier.user_id);
                      }}
                      disabled={loading}
                    >
                      <View style={styles.supplierCardIcon}>
                        <IconSymbol
                          ios_icon_name={selectedSupplierId === supplier.user_id ? "checkmark.circle.fill" : "circle"}
                          android_material_icon_name={selectedSupplierId === supplier.user_id ? "check_circle" : "radio_button_unchecked"}
                          size={24}
                          color={selectedSupplierId === supplier.user_id ? colors.primary : colors.textTertiary}
                        />
                      </View>
                      <View style={styles.supplierCardContent}>
                        <Text style={styles.supplierCardName}>{supplier.full_name}</Text>
                        <Text style={styles.supplierCardEmail}>{supplier.email}</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nome Lista *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. Fashion Primavera 2024"
                  placeholderTextColor={colors.textTertiary}
                  value={listName}
                  onChangeText={setListName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Sconto Min (%) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30"
                    placeholderTextColor={colors.textTertiary}
                    value={minDiscount}
                    onChangeText={setMinDiscount}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>

                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Sconto Max (%) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="80"
                    placeholderTextColor={colors.textTertiary}
                    value={maxDiscount}
                    onChangeText={setMaxDiscount}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Valore Min (€) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="5000"
                    placeholderTextColor={colors.textTertiary}
                    value={minReservationValue}
                    onChangeText={setMinReservationValue}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>

                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Valore Max (€) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30000"
                    placeholderTextColor={colors.textTertiary}
                    value={maxReservationValue}
                    onChangeText={setMaxReservationValue}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>
              </View>

              <Text style={styles.requiredNote}>* Campi obbligatori</Text>

              <Pressable 
                style={({ pressed }) => [
                  styles.createButton,
                  (pressed || loading) && styles.createButtonPressed
                ]} 
                onPress={handleCreateList}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="plus.circle.fill"
                      android_material_icon_name="add_circle"
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.createButtonText}>
                      {importMode === 'excel' && excelProducts.length > 0 
                        ? 'Crea Lista con Prodotti' 
                        : 'Crea Lista'}
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelLink}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.back();
                }}
                disabled={loading}
              >
                <Text style={styles.cancelLinkText}>Annulla</Text>
              </Pressable>
            </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createSupplierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  createSupplierButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
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
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
  },
  modeButtonSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  modeButtonPressed: {
    opacity: 0.7,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeButtonTextSelected: {
    color: colors.primary,
  },
  excelSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  excelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  excelButtonPressed: {
    opacity: 0.7,
  },
  excelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  excelHint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  supplierList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  supplierListContent: {
    padding: 8,
  },
  supplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  supplierCardSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  supplierCardPressed: {
    opacity: 0.7,
  },
  supplierCardIcon: {
    marginRight: 12,
  },
  supplierCardContent: {
    flex: 1,
  },
  supplierCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  supplierCardEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  requiredNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 8,
    marginBottom: 16,
    minHeight: 56,
    gap: 8,
  },
  createButtonPressed: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
