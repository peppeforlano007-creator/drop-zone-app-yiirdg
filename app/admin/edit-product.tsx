
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { logProductActivity } from '@/utils/activityLogger';

interface ProductData {
  id: string;
  name: string;
  description: string;
  image_url: string;
  additional_images: string[];
  original_price: number;
  condition: string;
  category: string;
  stock: number;
  status: string;
  brand?: string;
  sku?: string;
  available_sizes: string[];
  available_colors: string[];
}

export default function EditProductScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [additionalImages, setAdditionalImages] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [condition, setCondition] = useState('nuovo');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState('active');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [availableSizes, setAvailableSizes] = useState('');
  const [availableColors, setAvailableColors] = useState('');

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error loading product:', error);
        Alert.alert('Errore', 'Impossibile caricare il prodotto');
        return;
      }

      setProduct(data);
      setName(data.name || '');
      setDescription(data.description || '');
      setImageUrl(data.image_url || '');
      setAdditionalImages(data.additional_images ? data.additional_images.join(', ') : '');
      setOriginalPrice(data.original_price?.toString() || '');
      setCondition(data.condition || 'nuovo');
      setCategory(data.category || '');
      setStock(data.stock?.toString() || '');
      setStatus(data.status || 'active');
      setBrand(data.brand || '');
      setSku(data.sku || '');
      setAvailableSizes(data.available_sizes ? data.available_sizes.join(', ') : '');
      setAvailableColors(data.available_colors ? data.available_colors.join(', ') : '');
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Errore', 'Inserisci il nome del prodotto');
      return;
    }

    if (!originalPrice || parseFloat(originalPrice) <= 0) {
      Alert.alert('Errore', 'Inserisci un prezzo valido');
      return;
    }

    if (!stock || parseInt(stock) < 0) {
      Alert.alert('Errore', 'Inserisci una quantità valida');
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Parse additional images
      const additionalImagesArray = additionalImages
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      // Parse sizes
      const sizesArray = availableSizes
        .split(',')
        .map(size => size.trim())
        .filter(size => size.length > 0);

      // Parse colors
      const colorsArray = availableColors
        .split(',')
        .map(color => color.trim())
        .filter(color => color.length > 0);

      const { error } = await supabase
        .from('products')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          image_url: imageUrl.trim(),
          additional_images: additionalImagesArray.length > 0 ? additionalImagesArray : null,
          original_price: parseFloat(originalPrice),
          condition,
          category: category.trim() || null,
          stock: parseInt(stock),
          status,
          brand: brand.trim() || null,
          sku: sku.trim() || null,
          available_sizes: sizesArray.length > 0 ? sizesArray : null,
          available_colors: colorsArray.length > 0 ? colorsArray : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product:', error);
        Alert.alert('Errore', 'Impossibile aggiornare il prodotto');
        return;
      }

      // Log activity
      await logProductActivity.updated(name, productId);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Successo', 'Prodotto aggiornato con successo', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <>
        <Stack.Screen options={{ title: 'Modifica Prodotto' }} />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={64}
            color="#FF3B30"
          />
          <Text style={styles.errorText}>Prodotto non trovato</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Torna Indietro</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Modifica Prodotto' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Prodotto *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Es. Nike Air Max 90"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrizione</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descrizione del prodotto..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>URL Immagine Principale *</Text>
            <TextInput
              style={styles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Immagini Aggiuntive</Text>
            <Text style={styles.helperText}>
              Inserisci URL separati da virgola (es: url1, url2, url3)
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={additionalImages}
              onChangeText={setAdditionalImages}
              placeholder="https://image1.jpg, https://image2.jpg, https://image3.jpg"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Prezzo (€) *</Text>
              <TextInput
                style={styles.input}
                value={originalPrice}
                onChangeText={setOriginalPrice}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Stock *</Text>
              <TextInput
                style={styles.input}
                value={stock}
                onChangeText={setStock}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Condizione *</Text>
            <Text style={styles.helperText}>
              Puoi inserire qualsiasi condizione (es: nuovo, usato, leggermente graffiato, packaging rovinato, reso da cliente, ecc.)
            </Text>
            <TextInput
              style={styles.input}
              value={condition}
              onChangeText={setCondition}
              placeholder="Es: nuovo, usato, leggermente graffiato"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoria</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Es. Scarpe, Abbigliamento, Elettronica"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand</Text>
            <TextInput
              style={styles.input}
              value={brand}
              onChangeText={setBrand}
              placeholder="Es. Nike, Adidas, Samsung"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SKU</Text>
            <Text style={styles.helperText}>
              Codice articolo per raggruppare varianti (es. stesso prodotto con taglie/colori diversi)
            </Text>
            <TextInput
              style={styles.input}
              value={sku}
              onChangeText={setSku}
              placeholder="Codice articolo"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Taglie Disponibili</Text>
            <Text style={styles.helperText}>
              Inserisci taglie separate da virgola (es: S, M, L, XL o 38, 39, 40, 41)
            </Text>
            <TextInput
              style={styles.input}
              value={availableSizes}
              onChangeText={setAvailableSizes}
              placeholder="S, M, L, XL"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Colori Disponibili</Text>
            <Text style={styles.helperText}>
              Inserisci colori separati da virgola (es: Nero, Bianco, Rosso)
            </Text>
            <TextInput
              style={styles.input}
              value={availableColors}
              onChangeText={setAvailableColors}
              placeholder="Nero, Bianco, Rosso, Blu"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stato *</Text>
            <View style={styles.radioGroup}>
              {[
                { key: 'active', label: 'Attivo' },
                { key: 'inactive', label: 'Inattivo' },
                { key: 'sold_out', label: 'Esaurito' },
              ].map((stat) => (
                <Pressable
                  key={stat.key}
                  style={[styles.radioButton, status === stat.key && styles.radioButtonActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setStatus(stat.key);
                  }}
                >
                  <Text style={[styles.radioText, status === stat.key && styles.radioTextActive]}>
                    {stat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              saving && styles.saveButtonDisabled,
              pressed && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.saveButtonText}>Salva Modifiche</Text>
              </>
            )}
          </Pressable>
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
    padding: 16,
    paddingBottom: 40,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radioButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  radioTextActive: {
    color: '#FFF',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
