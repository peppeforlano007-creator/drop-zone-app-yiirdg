
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { ProductCondition } from '@/types/Product';
import ExcelFormatGuide from '@/components/ExcelFormatGuide';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExcelProduct {
  nome: string;
  descrizione?: string;
  foto: string;
  prezzoListino: number;
  taglie?: string;
  colori?: string;
  condizione: ProductCondition;
  categoria?: string;
  stock?: number;
}

interface ManualProduct {
  name: string;
  description: string;
  imageUrl: string;
  originalPrice: string;
  sizes: string;
  colors: string;
  condition: ProductCondition;
  category: string;
  stock: string;
}

export default function ImportListScreen() {
  const { user } = useAuth();
  const [importMode, setImportMode] = useState<'excel' | 'manual' | null>(null);
  
  // Common fields
  const [listName, setListName] = useState('');
  const [minDiscount, setMinDiscount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [maxOrderValue, setMaxOrderValue] = useState('');
  
  // Excel import fields
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [products, setProducts] = useState<ExcelProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  // Manual entry fields
  const [manualProducts, setManualProducts] = useState<ManualProduct[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<ManualProduct>({
    name: '',
    description: '',
    imageUrl: '',
    originalPrice: '',
    sizes: '',
    colors: '',
    condition: 'nuovo',
    category: '',
    stock: '1',
  });

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
      
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      console.log('Parsed Excel data:', jsonData);
      
      const parsedProducts: ExcelProduct[] = jsonData.map((row, index) => {
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
          colori: row.colori || row.Colori || row.colors || row.color || '',
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

  const handleAddManualProduct = () => {
    if (!currentProduct.name || !currentProduct.imageUrl || !currentProduct.originalPrice) {
      Alert.alert('Errore', 'Compila almeno nome, foto e prezzo');
      return;
    }

    const price = parseFloat(currentProduct.originalPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Errore', 'Inserisci un prezzo valido');
      return;
    }

    const stock = parseInt(currentProduct.stock);
    if (isNaN(stock) || stock < 1) {
      Alert.alert('Errore', 'Inserisci una quantità valida');
      return;
    }

    setManualProducts([...manualProducts, { ...currentProduct }]);
    
    // Reset form
    setCurrentProduct({
      name: '',
      description: '',
      imageUrl: '',
      originalPrice: '',
      sizes: '',
      colors: '',
      condition: 'nuovo',
      category: '',
      stock: '1',
    });
    
    setShowManualForm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRemoveManualProduct = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newProducts = [...manualProducts];
    newProducts.splice(index, 1);
    setManualProducts(newProducts);
  };

  const handleImport = async () => {
    if (!listName || !minDiscount || !maxDiscount || !minOrderValue || !maxOrderValue) {
      Alert.alert('Errore', 'Compila tutti i campi della lista');
      return;
    }

    const productCount = importMode === 'excel' ? products.length : manualProducts.length;
    if (productCount === 0) {
      Alert.alert('Errore', 'Aggiungi almeno un prodotto');
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

    if (!user) {
      Alert.alert('Errore', 'Utente non autenticato');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Starting import process...');
      console.log('User ID:', user.id);
      console.log('List name:', listName);
      console.log('Product count:', productCount);

      // Create supplier list
      const { data: listData, error: listError } = await supabase
        .from('supplier_lists')
        .insert({
          supplier_id: user.id,
          name: listName,
          min_discount: minDiscountNum,
          max_discount: maxDiscountNum,
          min_reservation_value: minOrderValueNum,
          max_reservation_value: maxOrderValueNum,
          status: 'active',
        })
        .select()
        .single();

      if (listError) {
        console.error('Error creating supplier list:', listError);
        throw new Error(`Impossibile creare la lista: ${listError.message}`);
      }

      console.log('Supplier list created successfully:', listData.id);

      // Prepare products for insertion
      const productsToInsert = importMode === 'excel'
        ? products.map(p => ({
            supplier_list_id: listData.id,
            supplier_id: user.id,
            name: p.nome,
            description: p.descrizione || '',
            image_url: p.foto,
            original_price: p.prezzoListino,
            available_sizes: p.taglie ? p.taglie.split(',').map(s => s.trim()) : [],
            available_colors: p.colori ? p.colori.split(',').map(c => c.trim()) : [],
            condition: p.condizione,
            category: p.categoria || 'Generale',
            stock: p.stock || 1,
            status: 'active',
          }))
        : manualProducts.map(p => ({
            supplier_list_id: listData.id,
            supplier_id: user.id,
            name: p.name,
            description: p.description,
            image_url: p.imageUrl,
            original_price: parseFloat(p.originalPrice),
            available_sizes: p.sizes ? p.sizes.split(',').map(s => s.trim()) : [],
            available_colors: p.colors ? p.colors.split(',').map(c => c.trim()) : [],
            condition: p.condition,
            category: p.category || 'Generale',
            stock: parseInt(p.stock),
            status: 'active',
          }));

      console.log('Inserting products:', productsToInsert.length);

      // Insert products
      const { data: insertedProducts, error: productsError } = await supabase
        .from('products')
        .insert(productsToInsert)
        .select();

      if (productsError) {
        console.error('Error creating products:', productsError);
        throw new Error(`Impossibile creare i prodotti: ${productsError.message}`);
      }

      console.log('Products inserted successfully:', insertedProducts?.length);

      // Success!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        '✅ Import Completato!',
        `La lista "${listName}" è stata creata con successo!\n\n` +
        `📦 ${productCount} prodotti aggiunti\n` +
        `💰 Sconto: ${minDiscountNum}% - ${maxDiscountNum}%\n` +
        `🎯 Valore ordine: €${minOrderValueNum.toLocaleString()} - €${maxOrderValueNum.toLocaleString()}\n\n` +
        `I tuoi prodotti sono ora visibili ai consumatori nel feed principale!`,
        [
          {
            text: 'Perfetto!',
            onPress: () => {
              console.log('Import completed successfully, navigating back');
              router.back();
            },
          },
        ]
      );

    } catch (error) {
      console.error('Error importing list:', error);
      Alert.alert(
        'Errore Import',
        error instanceof Error ? error.message : 'Impossibile importare la lista. Riprova.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectExcelMode = () => {
    console.log('Excel mode button pressed - setting importMode to excel');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImportMode('excel');
  };

  const handleSelectManualMode = () => {
    console.log('Manual mode button pressed - setting importMode to manual');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImportMode('manual');
  };

  // Mode selection screen
  if (!importMode) {
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
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.modeSelectionContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <IconSymbol 
                ios_icon_name="doc.badge.plus" 
                android_material_icon_name="note_add" 
                size={48} 
                color={colors.text} 
              />
              <Text style={styles.headerTitle}>Nuova Lista Prodotti</Text>
              <Text style={styles.headerSubtitle}>
                Scegli come vuoi aggiungere i tuoi prodotti
              </Text>
            </View>

            <View style={styles.modeOptions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modeCard,
                  pressed && styles.modeCardPressed
                ]}
                onPress={handleSelectExcelMode}
                onPressIn={() => console.log('Excel button press started')}
                onPressOut={() => console.log('Excel button press ended')}
              >
                <View style={styles.modeIconContainer}>
                  <IconSymbol 
                    ios_icon_name="doc.text" 
                    android_material_icon_name="description" 
                    size={40} 
                    color={colors.text} 
                  />
                </View>
                <Text style={styles.modeTitle}>Importa da Excel</Text>
                <Text style={styles.modeDescription}>
                  Carica un file Excel con tutti i tuoi prodotti in una volta
                </Text>
                <View style={styles.modeBadge}>
                  <Text style={styles.modeBadgeText}>Veloce</Text>
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modeCard,
                  pressed && styles.modeCardPressed
                ]}
                onPress={handleSelectManualMode}
                onPressIn={() => console.log('Manual button press started')}
                onPressOut={() => console.log('Manual button press ended')}
              >
                <View style={styles.modeIconContainer}>
                  <IconSymbol 
                    ios_icon_name="square.and.pencil" 
                    android_material_icon_name="edit" 
                    size={40} 
                    color={colors.text} 
                  />
                </View>
                <Text style={styles.modeTitle}>Inserimento Manuale</Text>
                <Text style={styles.modeDescription}>
                  Aggiungi i prodotti uno alla volta compilando un modulo
                </Text>
                <View style={[styles.modeBadge, styles.modeBadgeManual]}>
                  <Text style={styles.modeBadgeText}>Preciso</Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  // Excel or Manual import screen
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: importMode === 'excel' ? 'Importa da Excel' : 'Inserimento Manuale',
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
            {/* Back to mode selection */}
            <Pressable
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setImportMode(null);
              }}
            >
              <IconSymbol 
                ios_icon_name="chevron.left" 
                android_material_icon_name="arrow_back" 
                size={20} 
                color={colors.text} 
              />
              <Text style={styles.backButtonText}>Cambia Metodo</Text>
            </Pressable>

            <View style={styles.header}>
              <IconSymbol 
                ios_icon_name={importMode === 'excel' ? "doc.text" : "square.and.pencil"} 
                android_material_icon_name={importMode === 'excel' ? "description" : "edit"} 
                size={48} 
                color={colors.text} 
              />
              <Text style={styles.headerTitle}>
                {importMode === 'excel' ? 'Importa da Excel' : 'Inserimento Manuale'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {importMode === 'excel' 
                  ? 'Carica un file Excel con i tuoi prodotti'
                  : 'Aggiungi i prodotti uno alla volta'}
              </Text>
            </View>

            {/* Excel Import Section */}
            {importMode === 'excel' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <IconSymbol 
                    ios_icon_name="doc.text" 
                    android_material_icon_name="description" 
                    size={20} 
                    color={colors.text} 
                  />
                  <Text style={styles.sectionTitle}>File Excel</Text>
                </View>

                <Pressable 
                  style={styles.uploadButton} 
                  onPress={handlePickDocument}
                  disabled={isLoading}
                >
                  <IconSymbol 
                    ios_icon_name={selectedFile ? "checkmark.circle.fill" : "arrow.up.doc"} 
                    android_material_icon_name={selectedFile ? "check_circle" : "upload_file"} 
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

                <Pressable 
                  style={styles.guideButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowGuide(true);
                  }}
                >
                  <IconSymbol 
                    ios_icon_name="doc.text.magnifyingglass" 
                    android_material_icon_name="help_outline" 
                    size={20} 
                    color={colors.text} 
                  />
                  <Text style={styles.guideButtonText}>
                    Visualizza Guida Formato Excel
                  </Text>
                  <IconSymbol 
                    ios_icon_name="chevron.right" 
                    android_material_icon_name="chevron_right" 
                    size={18} 
                    color={colors.textSecondary} 
                  />
                </Pressable>

                <View style={styles.infoBox}>
                  <IconSymbol 
                    ios_icon_name="info.circle" 
                    android_material_icon_name="info" 
                    size={16} 
                    color={colors.textSecondary} 
                  />
                  <Text style={styles.infoText}>
                    Il file Excel deve contenere le colonne: nome, foto, prezzoListino, taglie, colori, condizione
                  </Text>
                </View>
              </View>
            )}

            {/* Manual Entry Section */}
            {importMode === 'manual' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <IconSymbol 
                    ios_icon_name="list.bullet" 
                    android_material_icon_name="list" 
                    size={20} 
                    color={colors.text} 
                  />
                  <Text style={styles.sectionTitle}>Prodotti Aggiunti</Text>
                  <Text style={styles.productCount}>({manualProducts.length})</Text>
                </View>

                {manualProducts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <IconSymbol 
                      ios_icon_name="tray" 
                      android_material_icon_name="inbox" 
                      size={48} 
                      color={colors.textTertiary} 
                    />
                    <Text style={styles.emptyStateText}>
                      Nessun prodotto aggiunto
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                      Clicca il pulsante sotto per aggiungere il primo prodotto
                    </Text>
                  </View>
                ) : (
                  <View style={styles.productsList}>
                    {manualProducts.map((product, index) => (
                      <View key={index} style={styles.productItem}>
                        <View style={styles.productItemContent}>
                          <Text style={styles.productItemName}>{product.name}</Text>
                          <Text style={styles.productItemPrice}>€{product.originalPrice}</Text>
                          <Text style={styles.productItemDetails}>
                            Stock: {product.stock} • {product.condition}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.removeButton}
                          onPress={() => handleRemoveManualProduct(index)}
                        >
                          <IconSymbol 
                            ios_icon_name="trash" 
                            android_material_icon_name="delete" 
                            size={20} 
                            color="#FF3B30" 
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                <Pressable
                  style={styles.addProductButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowManualForm(true);
                  }}
                >
                  <IconSymbol 
                    ios_icon_name="plus.circle.fill" 
                    android_material_icon_name="add_circle" 
                    size={24} 
                    color={colors.text} 
                  />
                  <Text style={styles.addProductButtonText}>Aggiungi Prodotto</Text>
                </Pressable>
              </View>
            )}

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
                <IconSymbol 
                  ios_icon_name="percent" 
                  android_material_icon_name="percent" 
                  size={20} 
                  color={colors.text} 
                />
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
                <IconSymbol 
                  ios_icon_name="eurosign.circle" 
                  android_material_icon_name="euro" 
                  size={20} 
                  color={colors.text} 
                />
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
                ((importMode === 'excel' && products.length === 0) || 
                 (importMode === 'manual' && manualProducts.length === 0) || 
                 isLoading) && styles.importButtonDisabled
              ]} 
              onPress={handleImport}
              disabled={
                (importMode === 'excel' && products.length === 0) || 
                (importMode === 'manual' && manualProducts.length === 0) || 
                isLoading
              }
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.importButtonText}>Crea Lista</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Excel Format Guide Modal */}
      <Modal
        visible={showGuide}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGuide(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Guida Formato Excel</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowGuide(false);
              }}
            >
              <IconSymbol 
                ios_icon_name="xmark.circle.fill" 
                android_material_icon_name="close" 
                size={28} 
                color={colors.textSecondary} 
              />
            </Pressable>
          </View>
          <ExcelFormatGuide />
        </SafeAreaView>
      </Modal>

      {/* Manual Product Form Modal */}
      <Modal
        visible={showManualForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowManualForm(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Aggiungi Prodotto</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowManualForm(false);
              }}
            >
              <IconSymbol 
                ios_icon_name="xmark.circle.fill" 
                android_material_icon_name="close" 
                size={28} 
                color={colors.textSecondary} 
              />
            </Pressable>
          </View>
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Prodotto *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="es. Giacca in Pelle"
                  placeholderTextColor={colors.textTertiary}
                  value={currentProduct.name}
                  onChangeText={(text) => setCurrentProduct({ ...currentProduct, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Descrizione</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Descrizione del prodotto..."
                  placeholderTextColor={colors.textTertiary}
                  value={currentProduct.description}
                  onChangeText={(text) => setCurrentProduct({ ...currentProduct, description: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>URL Foto *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor={colors.textTertiary}
                  value={currentProduct.imageUrl}
                  onChangeText={(text) => setCurrentProduct({ ...currentProduct, imageUrl: text })}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Prezzo di Listino (€) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="450"
                  placeholderTextColor={colors.textTertiary}
                  value={currentProduct.originalPrice}
                  onChangeText={(text) => setCurrentProduct({ ...currentProduct, originalPrice: text })}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Taglie Disponibili</Text>
                <TextInput
                  style={styles.input}
                  placeholder="S, M, L, XL"
                  placeholderTextColor={colors.textTertiary}
                  value={currentProduct.sizes}
                  onChangeText={(text) => setCurrentProduct({ ...currentProduct, sizes: text })}
                />
                <Text style={styles.helperText}>Separa le taglie con virgole</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Colori Disponibili</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nero, Marrone, Blu"
                  placeholderTextColor={colors.textTertiary}
                  value={currentProduct.colors}
                  onChangeText={(text) => setCurrentProduct({ ...currentProduct, colors: text })}
                />
                <Text style={styles.helperText}>Separa i colori con virgole</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Condizione</Text>
                <View style={styles.conditionButtons}>
                  <Pressable
                    style={[
                      styles.conditionButton,
                      currentProduct.condition === 'nuovo' && styles.conditionButtonActive
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCurrentProduct({ ...currentProduct, condition: 'nuovo' });
                    }}
                  >
                    <Text style={[
                      styles.conditionButtonText,
                      currentProduct.condition === 'nuovo' && styles.conditionButtonTextActive
                    ]}>
                      Nuovo
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.conditionButton,
                      currentProduct.condition === 'reso da cliente' && styles.conditionButtonActive
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCurrentProduct({ ...currentProduct, condition: 'reso da cliente' });
                    }}
                  >
                    <Text style={[
                      styles.conditionButtonText,
                      currentProduct.condition === 'reso da cliente' && styles.conditionButtonTextActive
                    ]}>
                      Reso da Cliente
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.conditionButton,
                      currentProduct.condition === 'packaging rovinato' && styles.conditionButtonActive
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCurrentProduct({ ...currentProduct, condition: 'packaging rovinato' });
                    }}
                  >
                    <Text style={[
                      styles.conditionButtonText,
                      currentProduct.condition === 'packaging rovinato' && styles.conditionButtonTextActive
                    ]}>
                      Packaging Rovinato
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Categoria</Text>
                <TextInput
                  style={styles.input}
                  placeholder="es. Abbigliamento, Accessori..."
                  placeholderTextColor={colors.textTertiary}
                  value={currentProduct.category}
                  onChangeText={(text) => setCurrentProduct({ ...currentProduct, category: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantità in Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={colors.textTertiary}
                  value={currentProduct.stock}
                  onChangeText={(text) => setCurrentProduct({ ...currentProduct, stock: text })}
                  keyboardType="number-pad"
                />
              </View>

              <Pressable
                style={styles.saveProductButton}
                onPress={handleAddManualProduct}
              >
                <IconSymbol 
                  ios_icon_name="checkmark.circle.fill" 
                  android_material_icon_name="check_circle" 
                  size={24} 
                  color={colors.background} 
                />
                <Text style={styles.saveProductButtonText}>Aggiungi Prodotto</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
    paddingBottom: 100,
  },
  modeSelectionContainer: {
    padding: 24,
    paddingBottom: 100,
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
  modeOptions: {
    gap: 16,
  },
  modeCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modeCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  modeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  modeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modeBadgeManual: {
    backgroundColor: '#2196F3',
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  productCount: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 4,
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
    marginTop: 8,
    lineHeight: 18,
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
  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  guideButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  productsList: {
    gap: 12,
    marginBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  productItemContent: {
    flex: 1,
  },
  productItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  productItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  productItemDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeButton: {
    padding: 8,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  addProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  conditionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  conditionButtonActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  conditionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  conditionButtonTextActive: {
    color: colors.background,
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
  saveProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    paddingVertical: 18,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  saveProductButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
});
