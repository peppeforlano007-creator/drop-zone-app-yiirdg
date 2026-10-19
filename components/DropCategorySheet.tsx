import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/styles/commonStyles';
import type { FeedCategory } from '@/utils/drop-feed';

interface Props {
  visible: boolean;
  categories: FeedCategory[];
  total: number;
  selected: string | null;
  onSelect: (key: string | null) => void;
  onClose: () => void;
}

export default function DropCategorySheet({ visible, categories, total, selected, onSelect, onClose }: Props) {
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  const options: { key: string | null; label: string; count: number }[] = [
    { key: null, label: 'Tutte', count: total }, ...categories,
  ];
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'slide'}
      statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi filtro categoria" />
        <SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={styles.title} accessibilityRole="header">Filtra per categoria</Text>
              <Text style={styles.subtitle}>Scegli quali articoli sfogliare</Text>
            </View>
            <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Chiudi">
              <MaterialCommunityIcons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <FlatList data={options} keyExtractor={item => item.key === null ? 'all' : `category:${item.key}`}
            style={styles.list} contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable onPress={() => onSelect(item.key)} accessibilityRole="radio"
                accessibilityState={{ checked: selected === item.key }}
                accessibilityLabel={`${item.label}, ${item.count} articoli`}
                style={({ pressed }) => [styles.row, selected === item.key && styles.selectedRow, pressed && styles.pressed]}>
                <Text style={[styles.label, selected === item.key && styles.selectedText]}>{item.label}</Text>
                <Text style={[styles.count, selected === item.key && styles.selectedText]}>{item.count}</Text>
                <MaterialCommunityIcons name={selected === item.key ? 'check-circle' : 'circle-outline'}
                  size={22} color={selected === item.key ? colors.primary : colors.textTertiary} />
              </Pressable>
            )} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { maxHeight: '70%', backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 12 },
  heading: { flex: 1 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, padding: 14, borderRadius: 12 },
  selectedRow: { backgroundColor: colors.backgroundSecondary },
  label: { flex: 1, fontSize: 16, color: colors.text },
  count: { fontSize: 14, fontVariant: ['tabular-nums'], color: colors.textSecondary },
  selectedText: { fontWeight: '700', color: colors.text },
  pressed: { opacity: 0.6 },
});
