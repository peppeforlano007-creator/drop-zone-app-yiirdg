
import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import ExcelFormatGuide from '@/components/ExcelFormatGuide';
import { getPlatformSettings } from '@/utils/dropHelpers';

interface Supplier {
  user_id: string;
  full_name: string;
  email: string;
}

interface ExcelProduct {
  sku?: string;
  nome: string;
  descrizione?: string;
  immagine_url: string;
  immagini_aggiuntive?: string;
  prezzo: number;
  taglia?: string;
  colore?: string;
  condizione: 'nuovo' | 'reso da cliente' | 'packaging rovinato';
  categoria?: string;
  brand?: string;
  stock: number;
  asin?: string;
  ean?: string;
}

interface ProductGroup {
  sku: string;
  nome: string;
  descrizione?: string;
  immagine_url: string;
  immagini_aggiuntive?: string;
  prezzo: number;
  condizione: 'nuovo' | 'reso da cliente' | 'packaging rovinato';
  categoria?: string;
  brand?: string;
  variants: {
    taglia?: string;
    colore?: string;
    stock: number;
  }[];
  totalStock: number;
  availableSizes: string[];
  availableColors: string[];
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
  const [deliveryMinDays, setDeliveryMinDays] = useState('');
  const [deliveryMaxDays, setDeliveryMaxDays] = useState('');
  const [bannerLocalUri, setBannerLocalUri] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerOffset, setBannerOffset] = useState({ x: 0, y: 0 });
  const bannerOffsetRef = useRef({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [importMode, setImportMode] = useState<'manual' | 'excel'>('manual');
  const [excelProducts, setExcelProducts] = useState<ExcelProduct[]>([]);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');

  useEffect(() => {
    loadSuppliers();
    loadPlatformSettings();
  }, []);

  const loadPlatformSettings = async () => {
    try {
      const settings = await getPlatformSettings();
      
      setMinReservationValue(settings.minDropValue.toString());
      setMaxReservationValue(settings.maxDropValue.toString());
      
      console.log('Platform settings loaded:', {
        minDropValue: settings.minDropValue,
        maxDropValue: settings.maxDropValue,
      });
    } catch (error) {
      console.error('Error loading platform settings:', error);
    }
  };

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

      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellFormula: true, cellNF: true });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Build a map of cell address -> hyperlink URL for cells with hyperlinks
      const hyperlinkMap: { [cellAddress: string]: string } = {};
      Object.keys(worksheet).forEach(cellAddr => {
        if (cellAddr.startsWith('!')) return;
        const cell = worksheet[cellAddr];
        if (cell && cell.l && cell.l.Target) {
          hyperlinkMap[cellAddr] = cell.l.Target;
        }
      });
      console.log('[ExcelImport] Hyperlink map built, entries:', Object.keys(hyperlinkMap).length);

      // Find the column letter for 'immagine_url' by reading the header row
      let immagineUrlColLetter: string | null = null;
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
        if (headerCell && (headerCell.v === 'immagine_url' || headerCell.v === 'immagine url')) {
          immagineUrlColLetter = XLSX.utils.encode_col(col);
          break;
        }
      }
      console.log('[ExcelImport] immagine_url column letter:', immagineUrlColLetter);

      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      console.log('Parsed Excel data:', jsonData);
      console.log('Sample row:', jsonData[0]);

      if (jsonData.length === 0) {
        Alert.alert('Errore', 'Il file Excel è vuoto');
        return;
      }

      const products: ExcelProduct[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      const skuGroups: { [sku: string]: number } = {};

      jsonData.forEach((row, index) => {
        const rowNum = index + 2;

        // Extract hyperlink URL for immagine_url column if the cell value is a display text like "link"
        if (immagineUrlColLetter) {
          const cellAddr = `${immagineUrlColLetter}${rowNum}`;
          const hyperlinkUrl = hyperlinkMap[cellAddr];
          if (hyperlinkUrl && (!row.immagine_url || row.immagine_url === 'link' || !String(row.immagine_url).startsWith('http'))) {
            console.log(`[ExcelImport] Row ${rowNum}: resolved hyperlink URL from cell ${cellAddr}:`, hyperlinkUrl);
            row.immagine_url = hyperlinkUrl;
          }
        }

        // Check mandatory fields: nome, immagine_url (or asin/ean), prezzo, stock
        const hasImage = row.immagine_url && String(row.immagine_url).startsWith('http');
        const hasAsinOrEan = row.asin || row.ean || row.ASIN || row.EAN;
        if (!row.nome || (!hasImage && !hasAsinOrEan) || !row.prezzo || !row.stock) {
          const missingFields = [];
          if (!row.nome) missingFields.push('nome');
          if (!hasImage && !hasAsinOrEan) missingFields.push('immagine_url (o asin/ean)');
          if (!row.prezzo) missingFields.push('prezzo');
          if (!row.stock) missingFields.push('stock');
          errors.push(`Riga ${rowNum}: Campi obbligatori mancanti (${missingFields.join(', ')})`);
          return;
        }

        const price = parseFloat(row.prezzo);
        if (isNaN(price) || price <= 0) {
          errors.push(`Riga ${rowNum}: Prezzo non valido`);
          return;
        }

        const stock = parseInt(row.stock);
        if (isNaN(stock) || stock < 1) {
          errors.push(`Riga ${rowNum}: Stock non valido (deve essere almeno 1)`);
          return;
        }

        const condition = row.condizione || 'nuovo';

        // Read SKU from Excel - this is the key fix!
        const sku = row.sku || row.SKU || row.codice || row.codice_articolo || null;

        if (sku) {
          skuGroups[sku] = (skuGroups[sku] || 0) + 1;
        }

        if (!row.descrizione) {
          warnings.push(`Riga ${rowNum}: Descrizione mancante`);
        }
        if (!row.categoria) {
          warnings.push(`Riga ${rowNum}: Categoria mancante`);
        }
        if (!sku) {
          warnings.push(`Riga ${rowNum}: SKU mancante - consigliato per raggruppare varianti`);
        }

        products.push({
          sku: sku,
          nome: row.nome,
          descrizione: row.descrizione || '',
          immagine_url: row.immagine_url || '',
          immagini_aggiuntive: row.immagini_aggiuntive || '',
          prezzo: price,
          taglia: row.taglia || row.taglie || '',
          colore: row.colore || row.colori || '',
          condizione: condition as 'nuovo' | 'reso da cliente' | 'packaging rovinato',
          categoria: row.categoria || '',
          brand: row.brand || '',
          stock: stock,
          asin: row.asin || row.ASIN || '',
          ean: row.ean || row.EAN || '',
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
      
      const uniqueSkus = Object.keys(skuGroups).length;
      const productsWithSku = products.filter(p => p.sku).length;
      
      let message = `${products.length} prodott${products.length === 1 ? 'o' : 'i'} caricato con successo!`;
      
      if (uniqueSkus > 0) {
        message += `\n\n📦 ${uniqueSkus} SKU unici trovati`;
        message += `\n${productsWithSku} prodotti con SKU (verranno raggruppati come varianti)`;
        
        const topSkus = Object.entries(skuGroups)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        
        if (topSkus.length > 0) {
          message += '\n\nEsempi di raggruppamento:';
          topSkus.forEach(([sku, count]) => {
            message += `\n• ${sku}: ${count} varianti`;
          });
        }
      }
      
      if (warnings.length > 0 && warnings.length <= 5) {
        message += `\n\n⚠️ Avvisi:\n${warnings.slice(0, 3).join('\n')}${warnings.length > 3 ? `\n...e altri ${warnings.length - 3}` : ''}`;
      }
      
      message += '\n\nCompila i campi della lista e clicca "Crea Lista con Prodotti" per procedere.';
      
      Alert.alert('File Caricato', message);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      Alert.alert('Errore', 'Impossibile leggere il file Excel. Assicurati che sia un file .xlsx o .xls valido.');
    }
  };

  const gestureStartOffset = useRef({ x: 0, y: 0 });

  const bannerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        gestureStartOffset.current = { ...bannerOffsetRef.current };
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(-40, Math.min(40, gestureStartOffset.current.x + gestureState.dx));
        const newY = Math.max(-40, Math.min(40, gestureStartOffset.current.y + gestureState.dy));
        setBannerOffset({ x: newX, y: newY });
      },
      onPanResponderRelease: (_, gestureState) => {
        const newX = Math.max(-40, Math.min(40, gestureStartOffset.current.x + gestureState.dx));
        const newY = Math.max(-40, Math.min(40, gestureStartOffset.current.y + gestureState.dy));
        bannerOffsetRef.current = { x: newX, y: newY };
        setBannerOffset({ x: newX, y: newY });
      },
    })
  ).current;

  const handlePickBanner = async () => {
    try {
      console.log('[CreateList] handlePickBanner pressed');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });
      if (result.canceled) {
        console.log('[CreateList] Banner picker canceled');
        return;
      }
      const asset = result.assets[0];
      console.log('[CreateList] Banner image selected:', asset.uri);
      setBannerLocalUri(asset.uri);
      setBannerOffset({ x: 0, y: 0 });
      bannerOffsetRef.current = { x: 0, y: 0 };
    } catch (err) {
      console.error('[CreateList] Error picking banner:', err);
      Alert.alert('Errore', "Impossibile selezionare l'immagine");
    }
  };

  const uploadBanner = async (uri: string): Promise<string | null> => {
    try {
      const fileName = `banner_${Date.now()}.jpg`;
      let uploadData: Uint8Array;

      try {
        // SDK 54 new API
        const file = new FileSystem.File(uri);
        const buffer = await file.arrayBuffer();
        uploadData = new Uint8Array(buffer);
      } catch (e) {
        // Fallback to legacy API
        const FileSystemLegacy = await import('expo-file-system/legacy');
        const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
          encoding: FileSystemLegacy.EncodingType.Base64,
        });
        const binary = atob(base64);
        uploadData = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          uploadData[i] = binary.charCodeAt(i);
        }
      }

      const { data, error } = await supabase.storage
        .from('banners')
        .upload(fileName, uploadData, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Banner upload error:', error);
        Alert.alert('Errore', `Impossibile caricare il banner: ${error.message}`);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('banners')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (e) {
      console.error('Create list banner upload exception:', e);
      Alert.alert('Errore', 'Errore durante il caricamento del banner.');
      return null;
    }
  };

  const handleCreateList = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
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
    setImportProgress('Creazione lista...');

    try {
      console.log('Creating supplier list...');

      let finalBannerUrl: string | null = null;
      if (bannerLocalUri) {
        console.log('[CreateList] Uploading banner before creating list...');
        setImportProgress('Caricamento banner...');
        finalBannerUrl = await uploadBanner(bannerLocalUri);
        if (!finalBannerUrl) return; // upload failed, error already shown
      }

      console.log('[CreateList] creating list with delivery days:', { deliveryMinDays, deliveryMaxDays });
      const { data, error } = await supabase
        .from('supplier_lists')
        .insert({
          supplier_id: selectedSupplierId,
          name: listName.trim(),
          min_discount: minDiscountNum,
          max_discount: maxDiscountNum,
          min_reservation_value: minValueNum,
          max_reservation_value: maxValueNum,
          delivery_min_days: deliveryMinDays ? parseInt(deliveryMinDays) : null,
          delivery_max_days: deliveryMaxDays ? parseInt(deliveryMaxDays) : null,
          banner_url: finalBannerUrl,
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

      if (importMode === 'excel' && excelProducts.length > 0) {
        console.log(`⚡ OPTIMIZED IMPORT: Processing ${excelProducts.length} products with batch inserts...`);
        setImportProgress(`Elaborazione ${excelProducts.length} prodotti...`);
        
        // Group products by SKU
        const productGroups = new Map<string, ProductGroup>();
        const productsWithoutSku: ExcelProduct[] = [];
        
        excelProducts.forEach((product) => {
          if (product.sku) {
            // Product has SKU - group it
            if (!productGroups.has(product.sku)) {
              // Create new product group
              productGroups.set(product.sku, {
                sku: product.sku,
                nome: product.nome,
                descrizione: product.descrizione,
                immagine_url: product.immagine_url,
                immagini_aggiuntive: product.immagini_aggiuntive,
                prezzo: product.prezzo,
                condizione: product.condizione,
                categoria: product.categoria,
                brand: product.brand,
                variants: [],
                totalStock: 0,
                availableSizes: [],
                availableColors: [],
              });
            }
            
            const group = productGroups.get(product.sku)!;
            
            // Add variant
            group.variants.push({
              taglia: product.taglia,
              colore: product.colore,
              stock: product.stock,
            });
            
            group.totalStock += product.stock;
            
            // Collect unique sizes and colors
            if (product.taglia && !group.availableSizes.includes(product.taglia)) {
              group.availableSizes.push(product.taglia);
            }
            if (product.colore && !group.availableColors.includes(product.colore)) {
              group.availableColors.push(product.colore);
            }
          } else {
            // Product without SKU - treat as standalone
            productsWithoutSku.push(product);
          }
        });
        
        console.log(`✓ Grouped into ${productGroups.size} SKU groups and ${productsWithoutSku.length} standalone products`);
        
        // OPTIMIZATION 1: Prepare all products for batch insert
        setImportProgress(`Preparazione ${productGroups.size + productsWithoutSku.length} prodotti...`);
        
        // Create a mapping structure to track which product corresponds to which SKU/standalone
        interface ProductInsertMapping {
          type: 'grouped' | 'standalone';
          sku?: string;
          standaloneIndex?: number;
          data: any;
        }
        
        const productsToInsert: ProductInsertMapping[] = [];
        
        // Add grouped products
        for (const [sku, group] of productGroups.entries()) {
          const additionalImagesStr = group.immagini_aggiuntive || '';
          const additionalImages = additionalImagesStr && typeof additionalImagesStr === 'string'
            ? additionalImagesStr.split(',').map(url => url.trim()).filter(url => url)
            : [];
          
          productsToInsert.push({
            type: 'grouped',
            sku: sku,
            data: {
              supplier_list_id: data.id,
              supplier_id: selectedSupplierId,
              sku: sku,
              name: group.nome || '',
              description: group.descrizione || null,
              image_url: group.immagine_url || '',
              additional_images: additionalImages.length > 0 ? additionalImages : null,
              original_price: group.prezzo || 0,
              available_sizes: group.availableSizes.length > 0 ? group.availableSizes : null,
              available_colors: group.availableColors.length > 0 ? group.availableColors : null,
              condition: group.condizione || 'nuovo',
              category: group.categoria || null,
              brand: group.brand || null,
              stock: group.totalStock,
              status: 'active',
            }
          });
        }
        
        // Add standalone products
        productsWithoutSku.forEach((product, index) => {
          const additionalImagesStr = product.immagini_aggiuntive || '';
          const additionalImages = additionalImagesStr && typeof additionalImagesStr === 'string'
            ? additionalImagesStr.split(',').map(url => url.trim()).filter(url => url)
            : [];
          
          const sizes = product.taglia ? [product.taglia] : [];
          const colors = product.colore ? [product.colore] : [];

          productsToInsert.push({
            type: 'standalone',
            standaloneIndex: index,
            data: {
              supplier_list_id: data.id,
              supplier_id: selectedSupplierId,
              sku: product.sku || null,
              name: product.nome || '',
              description: product.descrizione || null,
              image_url: product.immagine_url || '',
              additional_images: additionalImages.length > 0 ? additionalImages : null,
              original_price: product.prezzo || 0,
              available_sizes: sizes.length > 0 ? sizes : null,
              available_colors: colors.length > 0 ? colors : null,
              condition: product.condizione || 'nuovo',
              category: product.categoria || null,
              brand: product.brand || null,
              stock: product.stock || 1,
              status: 'active',
            }
          });
        });
        
        // OPTIMIZATION 2: Batch insert all products at once
        console.log(`⚡ Batch inserting ${productsToInsert.length} products...`);
        setImportProgress(`Inserimento ${productsToInsert.length} prodotti...`);
        
        const BATCH_SIZE = 500; // Supabase can handle large batches
        const insertedProductsWithMapping: { id: string; sku: string | null; mapping: ProductInsertMapping }[] = [];
        
        for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
          const batch = productsToInsert.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(productsToInsert.length / BATCH_SIZE);
          
          console.log(`→ Inserting batch ${batchNum}/${totalBatches} (${batch.length} products)`);
          setImportProgress(`Inserimento prodotti: ${batchNum}/${totalBatches} batch...`);
          
          const { data: batchData, error: batchError } = await supabase
            .from('products')
            .insert(batch.map(p => p.data))
            .select('id, sku');
          
          if (batchError) {
            console.error('Error inserting product batch:', batchError);
            throw batchError;
          }
          
          // Map the returned products to their original mapping
          if (batchData) {
            batchData.forEach((insertedProduct, batchIndex) => {
              const originalMapping = batch[batchIndex];
              insertedProductsWithMapping.push({
                id: insertedProduct.id,
                sku: insertedProduct.sku,
                mapping: originalMapping
              });
            });
          }
          
          console.log(`✓ Batch ${batchNum}/${totalBatches} inserted successfully`);
        }
        
        console.log(`✓ All ${insertedProductsWithMapping.length} products inserted`);
        
        // OPTIMIZATION 3: Prepare all variants for batch insert with CORRECT mapping
        setImportProgress('Preparazione varianti...');
        const variantsToInsert: any[] = [];
        
        // Create a map of SKU to product ID for quick lookup
        const skuToProductId = new Map<string, string>();
        const standaloneProductIds: { index: number; productId: string }[] = [];
        
        insertedProductsWithMapping.forEach(item => {
          if (item.mapping.type === 'grouped' && item.mapping.sku) {
            skuToProductId.set(item.mapping.sku, item.id);
          } else if (item.mapping.type === 'standalone' && item.mapping.standaloneIndex !== undefined) {
            standaloneProductIds.push({
              index: item.mapping.standaloneIndex,
              productId: item.id
            });
          }
        });
        
        console.log(`✓ Mapped ${skuToProductId.size} SKUs to product IDs`);
        console.log(`✓ Mapped ${standaloneProductIds.length} standalone products`);
        
        // Add variants for grouped products
        let variantsCreated = 0;
        for (const [sku, group] of productGroups.entries()) {
          const productId = skuToProductId.get(sku);
          
          if (!productId) {
            console.error(`⚠️ Could not find product ID for SKU: ${sku}`);
            continue;
          }
          
          // Deduplicate variants before insertion
          const uniqueVariants = new Map<string, { taglia?: string; colore?: string; stock: number }>();
          
          group.variants.forEach(variant => {
            const key = `${variant.taglia || 'null'}_${variant.colore || 'null'}`;
            
            if (uniqueVariants.has(key)) {
              const existing = uniqueVariants.get(key)!;
              existing.stock += variant.stock;
            } else {
              uniqueVariants.set(key, { ...variant });
            }
          });
          
          // Add to batch
          uniqueVariants.forEach(variant => {
            variantsToInsert.push({
              product_id: productId,
              size: variant.taglia || null,
              color: variant.colore || null,
              stock: variant.stock,
              status: 'active',
            });
            variantsCreated++;
          });
        }
        
        console.log(`✓ Created ${variantsCreated} variants for grouped products`);
        
        // Add variants for standalone products (products without SKU)
        for (const { index, productId } of standaloneProductIds) {
          const product = productsWithoutSku[index];
          
          if (!product) {
            console.error(`⚠️ Could not find standalone product at index ${index}`);
            continue;
          }
          
          variantsToInsert.push({
            product_id: productId,
            size: product.taglia || null,
            color: product.colore || null,
            stock: product.stock,
            status: 'active',
          });
          variantsCreated++;
        }
        
        console.log(`✓ Total variants to insert: ${variantsToInsert.length}`);
        
        // OPTIMIZATION 4: Batch insert all variants at once
        console.log(`⚡ Batch inserting ${variantsToInsert.length} variants...`);
        setImportProgress(`Inserimento ${variantsToInsert.length} varianti...`);
        
        const VARIANT_BATCH_SIZE = 1000; // Variants are smaller, can use larger batches
        let variantsInserted = 0;
        
        for (let i = 0; i < variantsToInsert.length; i += VARIANT_BATCH_SIZE) {
          const batch = variantsToInsert.slice(i, i + VARIANT_BATCH_SIZE);
          const batchNum = Math.floor(i / VARIANT_BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(variantsToInsert.length / VARIANT_BATCH_SIZE);
          
          console.log(`→ Inserting variant batch ${batchNum}/${totalBatches} (${batch.length} variants)`);
          setImportProgress(`Inserimento varianti: ${batchNum}/${totalBatches} batch...`);
          
          const { data: variantData, error: variantError } = await supabase
            .from('product_variants')
            .upsert(batch, {
              onConflict: 'product_id,size,color',
              ignoreDuplicates: false,
            })
            .select('id');
          
          if (variantError) {
            console.error('Error inserting variant batch:', variantError);
            throw variantError;
          }
          
          variantsInserted += (variantData?.length || 0);
          console.log(`✓ Variant batch ${batchNum}/${totalBatches} inserted successfully (${variantData?.length || 0} variants)`);
        }

        console.log(`✅ All products and variants imported successfully`);
        console.log(`📊 Summary: ${insertedProductsWithMapping.length} products, ${variantsInserted} variants`);
        setImportProgress('Completato!');
        
        const uniqueSkus = productGroups.size;
        const totalVariants = variantsInserted;
        const skuMessage = uniqueSkus > 0 
          ? `\n\n📦 ${uniqueSkus} articoli unici con ${totalVariants} varianti (raggruppati per SKU)` 
          : '';
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Lista Creata!',
          `La lista "${listName}" è stata creata con successo!${skuMessage}\n\n${productsWithoutSku.length} prodotti senza SKU\n\n⚡ Importazione completata in modo ottimizzato!\n\n✅ ${insertedProductsWithMapping.length} prodotti e ${variantsInserted} varianti create`,
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      console.error('Exception details:', JSON.stringify(error, null, 2));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', `Si è verificato un errore imprevisto: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setLoading(false);
      setImportProgress('');
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
                  
                  <Pressable
                    style={({ pressed }) => [
                      styles.formatGuideButton,
                      pressed && styles.formatGuideButtonPressed,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowFormatGuide(true);
                    }}
                    disabled={loading}
                  >
                    <IconSymbol
                      ios_icon_name="info.circle.fill"
                      android_material_icon_name="info"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.formatGuideButtonText}>
                      Visualizza Formato Excel
                    </Text>
                  </Pressable>
                  
                  <Text style={styles.excelHint}>
                    <Text style={styles.excelHintBold}>Colonne obbligatorie:</Text>{'\n'}
                    • nome, immagine_url, prezzo, <Text style={styles.excelHintBold}>stock</Text>{'\n\n'}
                    <Text style={styles.excelHintBold}>Colonne opzionali:</Text>{'\n'}
                    • <Text style={styles.excelHintBold}>sku</Text> (per raggruppare varianti){'\n'}
                    • <Text style={styles.excelHintBold}>taglia, colore</Text> (per varianti){'\n'}
                    • descrizione, brand, immagini_aggiuntive{'\n'}
                    • condizione, categoria{'\n\n'}
                    <Text style={styles.excelHintBold}>💡 Varianti:</Text> Prodotti con lo stesso SKU verranno raggruppati. Le colonne taglia e colore definiranno le varianti disponibili.
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
                  contextMenuHidden={false}
                  selectTextOnFocus={false}
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
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
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
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
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
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
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
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Consegna Da (giorni)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Es. 3"
                    placeholderTextColor={colors.textTertiary}
                    value={deliveryMinDays}
                    onChangeText={(v) => {
                      console.log('[CreateList] deliveryMinDays changed:', v);
                      setDeliveryMinDays(v);
                    }}
                    keyboardType="numeric"
                    editable={!loading}
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
                  />
                </View>

                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Consegna A (giorni)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Es. 5"
                    placeholderTextColor={colors.textTertiary}
                    value={deliveryMaxDays}
                    onChangeText={(v) => {
                      console.log('[CreateList] deliveryMaxDays changed:', v);
                      setDeliveryMaxDays(v);
                    }}
                    keyboardType="numeric"
                    editable={!loading}
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Banner (opzionale)</Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.bannerPickerButton,
                    pressed && styles.bannerPickerButtonPressed,
                  ]}
                  onPress={handlePickBanner}
                  disabled={loading}
                >
                  <IconSymbol
                    ios_icon_name="photo.fill"
                    android_material_icon_name="image"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.bannerPickerButtonText}>
                    {bannerLocalUri ? 'Cambia Immagine' : 'Scegli dal Dispositivo'}
                  </Text>
                </Pressable>

                {bannerLocalUri && (
                  <View style={styles.bannerPreviewContainer}>
                    <Text style={styles.bannerPreviewLabel}>Anteprima banner nella card drop:</Text>
                    <View style={styles.bannerPreviewCard}>
                      <View style={styles.bannerPreviewImageContainer} {...bannerPanResponder.panHandlers}>
                        <Image
                          source={{ uri: bannerLocalUri }}
                          style={[
                            styles.bannerPreviewImage,
                            { transform: [{ translateX: bannerOffset.x }, { translateY: bannerOffset.y }] },
                          ]}
                          resizeMode="cover"
                        />
                      </View>
                      <View style={styles.bannerPreviewOverlay}>
                        <Text style={styles.bannerPreviewCardTitle}>Nome Lista</Text>
                        <Text style={styles.bannerPreviewCardSub}>📍 Città</Text>
                      </View>
                      <View style={styles.bannerDragHint}>
                        <Text style={styles.bannerDragHintText}>✋ Trascina per riposizionare</Text>
                      </View>
                    </View>
                    <Pressable
                      style={styles.bannerRemoveButton}
                      onPress={() => {
                        console.log('[CreateList] Banner removed');
                        setBannerLocalUri(null);
                      }}
                      disabled={loading}
                    >
                      <IconSymbol
                        ios_icon_name="xmark.circle.fill"
                        android_material_icon_name="cancel"
                        size={16}
                        color="#DC2626"
                      />
                      <Text style={styles.bannerRemoveText}>Rimuovi banner</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={styles.settingsHintBox}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={16}
                  color={colors.info}
                />
                <Text style={styles.settingsHintText}>
                  I valori predefiniti provengono dalle impostazioni della piattaforma. Puoi modificarli per questa lista specifica.
                </Text>
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
                  <View style={styles.loadingButtonContent}>
                    <ActivityIndicator color="#FFFFFF" />
                    {importProgress && (
                      <Text style={styles.createButtonText}>{importProgress}</Text>
                    )}
                  </View>
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

      <Modal
        visible={showFormatGuide}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFormatGuide(false)}
      >
        <ExcelFormatGuide onClose={() => setShowFormatGuide(false)} />
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
  formatGuideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  formatGuideButtonPressed: {
    opacity: 0.7,
  },
  formatGuideButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  excelHint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  excelHintBold: {
    fontWeight: '700',
    color: colors.text,
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
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  settingsHintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '15',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  settingsHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  bannerPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  bannerPickerButtonPressed: {
    opacity: 0.8,
  },
  bannerPickerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bannerPreviewContainer: {
    marginTop: 12,
    gap: 8,
  },
  bannerPreviewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bannerPreviewCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    height: 140,
    position: 'relative',
  },
  bannerPreviewImageContainer: {
    position: 'absolute',
    // extend 40px beyond each edge so the image has room to pan without showing white
    top: -40,
    left: -40,
    right: -40,
    bottom: -40,
    overflow: 'hidden',
  },
  bannerPreviewImage: {
    width: '100%',
    height: '100%',
  },
  bannerDragHint: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bannerDragHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'System',
  },
  bannerPreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerPreviewCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bannerPreviewCardSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  bannerRemoveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  bannerRemoveText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
});
