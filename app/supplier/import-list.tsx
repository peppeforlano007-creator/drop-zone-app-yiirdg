
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';

export default function ImportListScreen() {
  const [listName, setListName] = useState('');
  const [minDiscount, setMinDiscount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [maxOrderValue, setMaxOrderValue] = useState('');

  const handleImport = () => {
    if (!listName || !minDiscount || !maxDiscount || !minOrderValue || !maxOrderValue) {
      Alert.alert('Errore', 'Compila tutti i campi');
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
      'Lista importata con successo!',
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
                Configura i parametri della tua lista
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
            <Pressable style={styles.importButton} onPress={handleImport}>
              <Text style={styles.importButtonText}>Importa Lista</Text>
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
  importButton: {
    backgroundColor: colors.text,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  importButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
});
