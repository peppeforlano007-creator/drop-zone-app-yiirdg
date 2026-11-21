import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { CHAT_PAGE_SIZE, fetchChatPage, mergeChatMessages, type RawChatMessage } from '@/utils/chat-pagination';
import { previewText } from './chat';
import { formatChatDay, isSameChatDay } from '@/utils/chat-day';

// Every admin reply is signed with this name, in the app and in push notifications.
const ADMIN_NAME = 'Amministratore';

export default function AdminChatGroupScreen() {
  const { groupId, name } = useLocalSearchParams<{ groupId: string; name?: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<RawChatMessage[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [failed, setFailed] = useState(false);
  const [admins, setAdmins] = useState<Record<string, boolean>>({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<RawChatMessage | null>(null);
  const namesRef = useRef<Record<string, string>>({});

  const loadNames = useCallback(async (rows: RawChatMessage[]) => {
    const missing = [...new Set(rows.map(m => m.sender_id))].filter(id => !namesRef.current[id]);
    if (!missing.length) return;
    const { data } = await supabase.from('profiles').select('user_id, full_name, role').in('user_id', missing);
    const next = { ...namesRef.current };
    const nextAdmins: Record<string, boolean> = {};
    (data ?? []).forEach((p: any) => {
      const isAdmin = p.role === 'admin';
      nextAdmins[p.user_id] = isAdmin;
      next[p.user_id] = isAdmin ? ADMIN_NAME : p.full_name || 'Utente';
    });
    namesRef.current = next;
    setNames(next);
    setAdmins(prev => ({ ...prev, ...nextAdmins }));
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

  const send = async () => {
    const body = text.trim();
    if (!body || sending || !user?.id || !groupId) return;
    setSending(true);
    const replyTo = replyingTo;
    const { data, error } = await supabase.from('chat_messages').insert({
      group_id: groupId,
      sender_id: user.id,
      content: body,
      message_type: 'text',
      ...(replyTo ? { reply_to_id: replyTo.id } : {}),
    }).select('id, group_id, sender_id, content, message_type, drop_id, product_id, created_at, reply_to_id').single();
    setSending(false);
    if (error || !data) {
      console.error('[admin-chat] send failed:', error);
      Alert.alert('Messaggio non inviato', 'Controlla la connessione e riprova.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setText('');
    setReplyingTo(null);
    setMessages(prev => mergeChatMessages(prev, [data as RawChatMessage]));
    void loadNames([data as RawChatMessage]);
    void markRead();
    // Push to the group's members, same as a member's message (non-blocking).
    supabase.functions.invoke('send-chat-notification', {
      body: {
        groupId,
        senderId: user.id,
        senderName: ADMIN_NAME,
        groupName: name || 'Gruppo',
        messageContent: body,
        messageType: 'text',
      },
    }).catch(e => console.warn('[admin-chat] push failed (non-fatal):', e));
  };

  const renderItem = ({ item, index }: { item: RawChatMessage; index: number }) => {
    const older = messages[index + 1];
    const showDay = !older || !isSameChatDay(older.created_at, item.created_at);
    const d = new Date(item.created_at);
    const fromAdmin = !!admins[item.sender_id];
    const quoted = item.reply_to_id ? messages.find(m => m.id === item.reply_to_id) : undefined;
    return (
      <View>
        {showDay && (
          <Text style={styles.day}>{formatChatDay(item.created_at)}</Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Tocca per rispondere a questo messaggio"
          onPress={() => {
            void Haptics.selectionAsync();
            setReplyingTo(item);
          }}
          style={({ pressed }) => [styles.bubble, fromAdmin && styles.bubbleAdmin, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.bubbleHead}>
            <View style={styles.senderRow}>
              <Text style={[styles.sender, fromAdmin && styles.senderAdmin]}>{names[item.sender_id] ?? '…'}</Text>
              {fromAdmin && <View style={styles.staffBadge}><Text style={styles.staffBadgeText}>STAFF</Text></View>}
            </View>
            <Text style={styles.time}>{d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          {quoted && (
            <View style={styles.quote}>
              <Text style={styles.quoteName} numberOfLines={1}>{names[quoted.sender_id] ?? 'Messaggio'}</Text>
              <Text style={styles.quoteText} numberOfLines={2}>{previewText(quoted.message_type, quoted.content)}</Text>
            </View>
          )}
          <Text style={styles.content}>{previewText(item.message_type, item.content)}</Text>
          <Text style={styles.replyHint}>Rispondi</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: name || 'Chat' }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Rispondi come «{ADMIN_NAME}» · i membri del gruppo vedranno il tuo messaggio</Text>
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
        {!loading && !failed && (
          <View style={styles.composer}>
            {replyingTo && (
              <View style={styles.replyBar}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quoteName} numberOfLines={1}>Rispondi a {names[replyingTo.sender_id] ?? 'messaggio'}</Text>
                  <Text style={styles.quoteText} numberOfLines={1}>{previewText(replyingTo.message_type, replyingTo.content)}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Annulla risposta" hitSlop={10} onPress={() => setReplyingTo(null)} style={styles.replyClose}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            )}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder={`Scrivi come ${ADMIN_NAME}…`}
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={2000}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Invia"
                disabled={!text.trim() || sending}
                onPress={send}
                style={({ pressed }) => [styles.sendButton, (!text.trim() || sending) && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
              >
                {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                  <IconSymbol ios_icon_name="arrow.up" android_material_icon_name="send" size={20} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
        )}
        </KeyboardAvoidingView>
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
  day: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginVertical: 10 },
  bubble: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 4 },
  bubbleHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sender: { fontSize: 13, fontWeight: '700', color: colors.primary },
  time: { fontSize: 11, color: colors.textSecondary },
  content: { fontSize: 15, color: colors.text, lineHeight: 20 },
  bubbleAdmin: { borderColor: '#D97706', backgroundColor: '#FFFBEB' },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  senderAdmin: { color: '#B45309' },
  staffBadge: { backgroundColor: '#D97706', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  staffBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.border, paddingLeft: 8, paddingVertical: 2 },
  quoteName: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  quoteText: { fontSize: 13, color: colors.textSecondary },
  replyHint: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, alignSelf: 'flex-end' },
  composer: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 6 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#D97706', paddingVertical: 6, paddingLeft: 10, paddingRight: 4 },
  replyClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: colors.text, backgroundColor: colors.card },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D97706', alignItems: 'center', justifyContent: 'center' },
});
