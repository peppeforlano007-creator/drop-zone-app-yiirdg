
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
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { ProductCondition } from '@/types/Product';

const CONDITIONS: { value: ProductCondition; label: string }[] = [
  { value: 'nuovo', label: 'Nuovo' },
  { value: 'reso da cliente', label: 'Reso da Cliente' },
  { value: 'packaging rovinato', label: 'Packaging Rovinato' },
];

export default function AddProductScreen() {
  const { listId, supplierId } = useLocalSearchParams<{ listId: string; supplierId: string }>();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [sizes, setSizes] = useState('');
  const [colors, setColors] = useState('');
  const [condition, setCondition] = useState<ProductCondition>('nuovo');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [stock, setStock] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleAddProduct = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Validation
    if (!name.trim()) {
      Alert.alert('Errore', 'Inserisci il nome del prodotto');
      return;
    }

    if (!imageUrl.trim()) {
      Alert.alert('Errore', 'Inserisci l\'URL dell\'immagine');
      return;
    }

    const priceNum = parseFloat(originalPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Errore', 'Inserisci un prezzo valido');
      return;
    }

    const stockNum = parseInt(stock);
    if (isNaN(stockNum) || stockNum < 0) {
      Alert.alert('Errore', 'Inserisci una quantità valida');
      return;
    }

    setLoading(true);

    try {
      console.log('Adding product to list...');
      
      // Parse sizes and colors
      const sizesArray = sizes.trim() ? sizes.split(',').map(s => s.trim()).filter(s => s) : [];
      const colorsArray = colors.trim() ? colors.split(',').map(c => c.trim()).filter(c => c) : [];

      const { data, error } = await supabase
        .from('products')
        .insert({
          supplier_list_id: listId,
          supplier_id: supplierId,
          sku: sku.trim() || null,
          name: name.trim(),
          description: description.trim() || null,
          brand: brand.trim() || null,
          image_url: imageUrl.trim(),
          original_price: priceNum,
          available_sizes: sizesArray.length > 0 ? sizesArray : null,
          available_colors: colorsArray.length > 0 ? colorsArray : null,
          condition,
          category: category.trim() || null,
          stock: stockNum,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding product:', error);
        Alert.alert('Errore', `Impossibile aggiungere il prodotto: ${error.message}`);
        return;
      }

      console.log('Product added successfully:', data.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Prodotto Aggiunto!',
        `Il prodotto "${name}" è stato aggiunto con successo.${sku ? `\n\nSKU: ${sku}` : ''}`,
        [
          {
            text: 'Aggiungi Altro',
            onPress: () => {
              // Reset form but keep SKU if user wants to add variants
              setName('');
              setDescription('');
              setImageUrl('');
              setOriginalPrice('');
              setSizes('');
              setColors('');
              setCondition('nuovo');
              setCategory('');
              setBrand('');
              setStock('1');
              // Keep SKU for adding variants
            },
          },
          {
            text: 'Torna alla Lista',
            style: 'cancel',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Exception adding product:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Aggiungi Prodotto',
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
                  ios_icon_name="cube.box.fill" 
                  android_material_icon_name="inventory"
                  size={48} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.title}>Nuovo Prodotto</Text>
              <Text style={styles.subtitle}>
                Aggiungi un nuovo prodotto alla lista
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>SKU (Codice Articolo)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. NIKE-AM-001"
                  placeholderTextColor={colors.textTertiary}
                  value={sku}
                  onChangeText={setSku}
                  autoCapitalize="characters"
                  editable={!loading}
                />
                <Text style={styles.inputHint}>
                  Usa lo stesso SKU per raggruppare varianti (taglie/colori) dello stesso articolo
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nome Prodotto *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. Scarpe Nike Air Max"
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Brand</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. Nike, Adidas, Puma"
                  placeholderTextColor={colors.textTertiary}
                  value={brand}
                  onChangeText={setBrand}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Descrizione</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Descrizione del prodotto..."
                  placeholderTextColor={colors.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>URL Immagine *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://esempio.com/immagine.jpg"
                  placeholderTextColor={colors.textTertiary}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Prezzo Originale (€) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="99.99"
                  placeholderTextColor={colors.textTertiary}
                  value={originalPrice}
                  onChangeText={setOriginalPrice}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Taglie (separate da virgola)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="S, M, L, XL"
                  placeholderTextColor={colors.textTertiary}
                  value={sizes}
                  onChangeText={setSizes}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Colori (separati da virgola)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rosso, Blu, Nero"
                  placeholderTextColor={colors.textTertiary}
                  value={colors}
                  onChangeText={setColors}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Condizione *</Text>
                <View style={styles.conditionList}>
                  {CONDITIONS.map((cond) => (
                    <Pressable
                      key={cond.value}
                      style={({ pressed }) => [
                        styles.conditionCard,
                        condition === cond.value && styles.conditionCardSelected,
                        pressed && styles.conditionCardPressed,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCondition(cond.value);
                      }}
                      disabled={loading}
                    >
                      <IconSymbol
                        ios_icon_name={condition === cond.value ? "checkmark.circle.fill" : "circle"}
                        android_material_icon_name={condition === cond.value ? "check_circle" : "radio_button_unchecked"}
                        size={24}
                        color={condition === cond.value ? colors.primary : colors.textTertiary}
                      />
                      <Text style={[
                        styles.conditionCardText,
                        condition === cond.value && styles.conditionCardTextSelected,
                      ]}>
                        {cond.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Categoria</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. Scarpe, Abbigliamento, Accessori"
                  placeholderTextColor={colors.textTertiary}
                  value={category}
                  onChangeText={setCategory}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Quantità in Stock *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={colors.textTertiary}
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="number-pad"
                  editable={!loading}
                />
                <Text style={styles.inputHint}>
                  Quantità disponibile per questa specifica variante
                </Text>
              </View>

              <Text style={styles.requiredNote}>* Campi obbligatori</Text>

              <Pressable 
                style={({ pressed }) => [
                  styles.addButton,
                  (pressed || loading) && styles.addButtonPressed
                ]} 
                onPress={handleAddProduct}
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
                    <Text style={styles.addButtonText}>Aggiungi Prodotto</Text>
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
  inputHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  conditionList: {
    gap: 8,
  },
  conditionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  conditionCardSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  conditionCardPressed: {
    opacity: 0.7,
  },
  conditionCardText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  conditionCardTextSelected: {
    fontWeight: '600',
  },
  requiredNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  addButton: {
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
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonText: {
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
