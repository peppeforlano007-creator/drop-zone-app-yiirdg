import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface AdminChatGroup {
  group_id: string;
  name: string;
  group_type: string | null;
  pickup_point_name: string | null;
  member_count: number;
  last_message_at: string | null;
  last_message_type: string | null;
  last_message_content: string | null;
  last_sender_name: string | null;
  unread_count: number;
}

export function previewText(type: string | null, content: string | null): string {
  if (!content && !type) return 'Nessun messaggio';
  if (type && type !== 'text') {
    if (type.includes('drop')) return '📦 Drop condiviso';
    if (type.includes('product')) return '🛍️ Articolo condiviso';
    if (type.includes('image')) return '🖼️ Immagine';
  }
  return content ?? '';
}

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export default function AdminChatScreen() {
  const [groups, setGroups] = useState<AdminChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('admin_chat_overview');
    if (rpcError) {
      console.error('[admin-chat] overview failed:', rpcError);
      setError(true);
    } else {
      setError(false);
      setGroups(((data ?? []) as any[]).map(g => ({
        ...g,
        member_count: Number(g.member_count),
        unread_count: Number(g.unread_count),
      })));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Live: any new message refreshes the counters (debounced).
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-monitor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => { void load(); }, 600);
      })
      .subscribe();
    return () => { clearTimeout(timer.current); supabase.removeChannel(channel); };
  }, [load]);

  const totalUnread = groups.reduce((s, g) => s + g.unread_count, 0);
  const visible = onlyUnread ? groups.filter(g => g.unread_count > 0) : groups;

  const renderGroup = ({ item }: { item: AdminChatGroup }) => (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/admin/chat-group', params: { groupId: item.group_id, name: item.name } } as any);
      }}
    >
      <View style={styles.rowTop}>
        <Text style={[styles.name, item.unread_count > 0 && styles.nameUnread]} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.when}>{formatWhen(item.last_message_at)}</Text>
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {[item.pickup_point_name, `${item.member_count} membri`].filter(Boolean).join(' · ')}
      </Text>
      <View style={styles.rowBottom}>
        <Text style={styles.preview} numberOfLines={1}>
          {item.last_message_at
            ? `${item.last_sender_name ? item.last_sender_name + ': ' : ''}${previewText(item.last_message_type, item.last_message_content)}`
            : 'Nessun messaggio'}
        </Text>
        {item.unread_count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Chat' }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.filters}>
          {[{ k: false, l: `Tutti (${groups.length})` }, { k: true, l: `Da leggere (${totalUnread})` }].map(f => (
            <Pressable
              key={String(f.k)}
              onPress={() => setOnlyUnread(f.k)}
              style={[styles.chip, onlyUnread === f.k && styles.chipActive]}
            >
              <Text style={[styles.chipText, onlyUnread === f.k && styles.chipTextActive]}>{f.l}</Text>
            </Pressable>
          ))}
        </View>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : error && groups.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Impossibile caricare le chat</Text>
            <Text style={styles.emptyText}>Trascina verso il basso per riprovare.</Text>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={g => g.group_id}
            renderItem={renderGroup}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <IconSymbol ios_icon_name="bubble.left.and.bubble.right" android_material_icon_name="chat" size={56} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>{onlyUnread ? 'Nessun messaggio da leggere' : 'Nessun gruppo'}</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  row: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  nameUnread: { fontWeight: '800' },
  when: { fontSize: 12, color: colors.textSecondary },
  meta: { fontSize: 12, color: colors.textSecondary },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  preview: { flex: 1, fontSize: 14, color: colors.textSecondary },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: '#E11D48', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
