import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { CHAT_PAGE_SIZE, fetchChatPage, mergeChatMessages, type RawChatMessage } from '@/utils/chat-pagination';
import { previewText } from './chat';

export default function AdminChatGroupScreen() {
  const { groupId, name } = useLocalSearchParams<{ groupId: string; name?: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<RawChatMessage[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [failed, setFailed] = useState(false);
  const namesRef = useRef<Record<string, string>>({});

  const loadNames = useCallback(async (rows: RawChatMessage[]) => {
    const missing = [...new Set(rows.map(m => m.sender_id))].filter(id => !namesRef.current[id]);
    if (!missing.length) return;
    const { data } = await supabase.from('profiles').select('user_id, full_name').in('user_id', missing);
    const next = { ...namesRef.current };
    (data ?? []).forEach((p: any) => { next[p.user_id] = p.full_name || 'Utente'; });
    namesRef.current = next;
    setNames(next);
  }, []);

  // Mark the group as read up to "now" (called on open and when new messages arrive while open).
  const markRead = useCallback(async () => {
    if (!user?.id || !groupId) return;
    const { error } = await supabase.from('admin_chat_reads').upsert(
      { admin_id: user.id, group_id: groupId, last_read_at: new Date().toISOString() },
      { onConflict: 'admin_id,group_id' },
    );
    if (error) console.warn('[admin-chat] markRead failed:', error);
  }, [user?.id, groupId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const page = await fetchChatPage(supabase as any, groupId);
        if (!active) return;
        setMessages(page);
        setHasMore(page.length === CHAT_PAGE_SIZE);
        await loadNames(page);
        void markRead();
      } catch (e) {
        console.error('[admin-chat] load failed:', e);
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`admin-chat-${groupId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const m = payload.new as RawChatMessage;
          setMessages(prev => mergeChatMessages(prev, [m]));
          void loadNames([m]);
          void markRead();
        })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [groupId, loadNames, markRead]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || !messages.length) return;
    setLoadingMore(true);
    try {
      const oldest = messages[messages.length - 1];
      const page = await fetchChatPage(supabase as any, groupId, { id: oldest.id, created_at: oldest.created_at });
      setMessages(prev => mergeChatMessages(prev, page));
      setHasMore(page.length === CHAT_PAGE_SIZE);
      await loadNames(page);
    } catch (e) {
      console.warn('[admin-chat] load more failed:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderItem = ({ item, index }: { item: RawChatMessage; index: number }) => {
    const older = messages[index + 1];
    const showDay = !older || new Date(older.created_at).toDateString() !== new Date(item.created_at).toDateString();
    const d = new Date(item.created_at);
    return (
      <View>
        {showDay && (
          <Text style={styles.day}>{d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        )}
        <View style={styles.bubble}>
          <View style={styles.bubbleHead}>
            <Text style={styles.sender}>{names[item.sender_id] ?? '…'}</Text>
            <Text style={styles.time}>{d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <Text style={styles.content}>{previewText(item.message_type, item.content)}</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: name || 'Chat' }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Sola lettura · stai monitorando questo gruppo</Text>
        </View>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : failed ? (
          <View style={styles.center}><Text style={styles.empty}>Impossibile caricare i messaggi. Torna indietro e riprova.</Text></View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={m => m.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} /> : null}
            ListEmptyComponent={<Text style={[styles.empty, { transform: [{ scaleY: -1 }] }]}>Nessun messaggio in questo gruppo</Text>}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  banner: { backgroundColor: '#FEF3C7', paddingVertical: 6, paddingHorizontal: 16 },
  bannerText: { fontSize: 12, color: '#92400E', textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  day: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginVertical: 10, textTransform: 'capitalize' },
  bubble: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 4 },
  bubbleHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sender: { fontSize: 13, fontWeight: '700', color: colors.primary },
  time: { fontSize: 11, color: colors.textSecondary },
  content: { fontSize: 15, color: colors.text, lineHeight: 20 },
});
