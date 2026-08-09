
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  useColorScheme,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { useUnreadChat } from '@/contexts/UnreadChatContext';

interface Profile {
  full_name: string | null;
  phone: string | null;
}

interface Drop {
  id: string;
  name: string;
  current_discount: number | null;
  current_value?: number | null;
  status: string | null;
}

interface Product {
  id: string;
  name: string;
  image_url?: string | null;
}

interface ChatMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  drop_id: string | null;
  product_id: string | null;
  created_at: string;
  senderName: string;
  drop?: Drop | null;
  product?: Product | null;
}

function formatMsgTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function getDropDisplayName(drop: Drop): string {
  return drop.name || 'Drop';
}

function DropShareCard({
  drop,
  isOwn,
  isDark,
}: {
  drop: Drop;
  isOwn: boolean;
  isDark: boolean;
}) {
  const cardBg = isDark ? '#2C2C2E' : '#F0F0F0';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subColor = isDark ? '#8E8E93' : '#666666';
  const dropName = getDropDisplayName(drop);
  const discount = Number(drop.current_discount ?? drop.current_value ?? 0);
  const discountText = discount > 0 ? `${Math.floor(discount)}%` : '';

  const statusMap: Record<string, { text: string; color: string }> = {
    active: { text: 'Attivo', color: '#16A34A' },
    pending: { text: 'In attesa', color: '#F59E0B' },
    completed: { text: 'Completato', color: '#6B7280' },
    expired: { text: 'Scaduto', color: '#EF4444' },
  };
  const statusKey = drop.status ?? '';
  const badge = statusMap[statusKey] ?? { text: statusKey, color: '#6B7280' };

  const handlePress = () => {
    console.log('[Chat] Drop card pressed, navigating to drop:', drop.id);
    router.push({ pathname: '/drop-details', params: { dropId: drop.id } });
  };

  return (
    <TouchableOpacity
      style={[styles.dropCard, { backgroundColor: cardBg }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={[styles.dropCardImagePlaceholder, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5E5' }]}>
        <Ionicons name="cube-outline" size={28} color={subColor} />
      </View>
      <View style={styles.dropCardInfo}>
        <Text style={[styles.dropCardName, { color: textColor }]} numberOfLines={2}>
          {dropName}
        </Text>
        <View style={styles.dropCardBadgeRow}>
          {discountText !== '' && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{discountText}</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: badge.color + '22', borderColor: badge.color + '66' }]}>
            <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        </View>
        <Text style={[styles.dropCardCta, { color: colors.info }]}>Vedi drop →</Text>
      </View>
    </TouchableOpacity>
  );
}

function ProductShareCard({
  product,
  isOwn,
  isDark,
}: {
  product: Product;
  isOwn: boolean;
  isDark: boolean;
}) {
  const cardBg = isDark ? '#2C2C2E' : '#F0F0F0';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subColor = isDark ? '#8E8E93' : '#666666';
  const [navigating, setNavigating] = useState(false);

  const handlePress = async () => {
    if (navigating) return;
    console.log('[Chat] Product card pressed, product_id:', product.id);
    setNavigating(true);
    try {
      const { data: productRow } = await supabase
        .from('products')
        .select('supplier_list_id')
        .eq('id', product.id)
        .single();
      if (productRow?.supplier_list_id) {
        const { data: drop } = await supabase
          .from('drops')
          .select('id')
          .eq('supplier_list_id', productRow.supplier_list_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (drop?.id) {
          console.log('[Chat] Navigating to drop for product:', product.id, 'drop_id:', drop.id);
          router.push({ pathname: '/drop-details', params: { dropId: drop.id, scrollToProductId: product.id } });
          return;
        }
      }
      console.warn('[Chat] No drop found for product:', product.id);
      Alert.alert('Articolo non disponibile', 'Non è stato possibile trovare il drop associato a questo articolo.');
    } catch (err) {
      console.error('[Chat] Error navigating to product drop:', err);
    } finally {
      setNavigating(false);
    }
  };

  const hasImage = !!product.image_url;

  return (
    <TouchableOpacity
      style={[styles.dropCard, { backgroundColor: cardBg }]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={navigating}
    >
      {hasImage ? (
        <Image
          source={{ uri: product.image_url! }}
          style={styles.dropCardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.dropCardImagePlaceholder, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5E5' }]}>
          <Ionicons name="shirt-outline" size={28} color={subColor} />
        </View>
      )}
      <View style={styles.dropCardInfo}>
        <Text style={[styles.dropCardName, { color: textColor }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.dropCardCta, { color: colors.info }]}>Vedi articolo →</Text>
      </View>
    </TouchableOpacity>
  );
}

function MessageBubble({
  message,
  isOwn,
  isDark,
}: {
  message: ChatMessage;
  isOwn: boolean;
  isDark: boolean;
}) {
  const ownBg = '#000000';
  const otherBg = isDark ? '#2C2C2E' : '#F0F0F0';
  const ownText = '#FFFFFF';
  const otherText = isDark ? '#FFFFFF' : '#000000';
  const senderColor = isDark ? '#8E8E93' : '#666666';
  const timeColor = isOwn ? 'rgba(255,255,255,0.6)' : isDark ? '#636366' : '#999999';

  const isCardType = (message.message_type === 'drop' && !!message.drop) || (message.message_type === 'product' && !!message.product);

  return (
    <View style={[styles.bubbleWrapper, isOwn ? styles.bubbleWrapperOwn : styles.bubbleWrapperOther]}>
      {!isOwn && (
        <Text style={[styles.senderName, { color: senderColor }]}>{message.senderName}</Text>
      )}
      <View
        style={[
          styles.bubble,
          isOwn ? [styles.bubbleOwn, { backgroundColor: ownBg }] : [styles.bubbleOther, { backgroundColor: otherBg }],
          isCardType && styles.bubbleDrop,
        ]}
      >
        {message.message_type === 'drop' && message.drop ? (
          <DropShareCard drop={message.drop} isOwn={isOwn} isDark={isDark} />
        ) : message.message_type === 'product' && message.product ? (
          <ProductShareCard product={message.product} isOwn={isOwn} isDark={isDark} />
        ) : (
          <Text style={[styles.bubbleText, { color: isOwn ? ownText : otherText }]}>
            {message.content}
          </Text>
        )}
        <Text style={[styles.bubbleTime, { color: timeColor }]}>
          {formatMsgTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

function DropPickerModal({
  visible,
  onClose,
  onSelect,
  isDark,
  pickupPointId,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (drop: Drop) => void;
  isDark: boolean;
  pickupPointId: string | null;
}) {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    console.log('[Chat] Loading active drops for sharing, pickupPointId:', pickupPointId);
    setLoading(true);
    let query = supabase
      .from('drops')
      .select('id, name, current_discount, current_value, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);
    if (pickupPointId !== null) {
      query = query.eq('pickup_point_id', pickupPointId);
    }
    query.then(({ data, error }) => {
        if (error) {
          console.error('[Chat] Error loading drops:', error);
        } else {
          setDrops((data as Drop[]) || []);
        }
        setLoading(false);
      });
  }, [visible, pickupPointId]);

  const modalBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const titleColor = isDark ? '#FFFFFF' : '#000000';
  const borderColor = isDark ? '#2C2C2E' : '#E5E5E5';
  const subColor = isDark ? '#8E8E93' : '#666666';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: modalBg }]} edges={['top', 'bottom']}>
        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
          <Text style={[styles.modalTitle, { color: titleColor }]}>Condividi Drop</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={titleColor} />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : drops.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: subColor }]}>Nessun drop attivo nella tua città</Text>
          </View>
        ) : (
          <FlatList
            data={drops}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => {
              const dropName = getDropDisplayName(item);
              const discount = Number(item.current_discount ?? item.current_value ?? 0);
              const discountText = discount > 0 ? `${Math.floor(discount)}%` : '';
              return (
                <TouchableOpacity
                  style={[styles.dropPickerRow, { borderColor }]}
                  onPress={() => {
                    console.log('[Chat] Drop selected for sharing:', item.id, dropName);
                    onSelect(item);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dropPickerImagePlaceholder, { backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0' }]}>
                    <Ionicons name="cube-outline" size={22} color={subColor} />
                  </View>
                  <View style={styles.dropPickerInfo}>
                    <Text style={[styles.dropPickerName, { color: titleColor }]} numberOfLines={2}>
                      {dropName}
                    </Text>
                    {discountText !== '' && (
                      <Text style={[styles.dropPickerDiscount, { color: colors.success }]}>
                        {discountText} sconto
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={subColor} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

export default function GroupChatScreen() {
  const { groupId, groupName } = useLocalSearchParams<{ groupId: string; groupName: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showDropPicker, setShowDropPicker] = useState(false);
  const [userPickupPointId, setUserPickupPointId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { markGroupAsRead } = useUnreadChat();

  useEffect(() => {
    if (!user?.id) return;
    console.log('[Chat] Fetching pickup_point_id for user:', user.id);
    supabase
      .from('profiles')
      .select('pickup_point_id')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[Chat] Could not fetch user pickup_point_id:', error.message);
        }
        setUserPickupPointId(data?.pickup_point_id ?? null);
        console.log('[Chat] User pickup_point_id:', data?.pickup_point_id ?? null);
      });
  }, [user?.id]);

  const insets = useSafeAreaInsets();

  const bgColor = isDark ? '#000000' : '#F8F8F8';
  const headerBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const headerBorder = isDark ? '#2C2C2E' : '#E5E5E5';
  const titleColor = isDark ? '#FFFFFF' : '#000000';
  const inputBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBorder = isDark ? '#2C2C2E' : '#E5E5E5';
  const inputText2 = isDark ? '#FFFFFF' : '#000000';
  const inputBarBg = isDark ? '#000000' : '#F8F8F8';

  const buildMessage = useCallback(
    async (raw: any): Promise<ChatMessage> => {
      let senderName = 'Utente';
      if (raw.sender_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', raw.sender_id)
          .single();
        senderName = profile?.full_name || 'Utente';
      }

      let drop: Drop | null = null;
      if (raw.message_type === 'drop' && raw.drop_id) {
        const { data: dropData } = await supabase
          .from('drops')
          .select('id, name, current_discount, current_value, status')
          .eq('id', raw.drop_id)
          .single();
        drop = dropData as Drop | null;
      }

      let product: Product | null = null;
      if (raw.message_type === 'product' && raw.product_id) {
        console.log('[Chat] Fetching product data for message, product_id:', raw.product_id);
        const { data: productData } = await supabase
          .from('products')
          .select('id, name, image_url')
          .eq('id', raw.product_id)
          .single();
        product = productData as Product | null;
      }

      return {
        id: raw.id,
        group_id: raw.group_id,
        sender_id: raw.sender_id,
        content: raw.content,
        message_type: raw.message_type,
        drop_id: raw.drop_id,
        product_id: raw.product_id ?? null,
        created_at: raw.created_at,
        senderName,
        drop,
        product,
      };
    },
    []
  );

  const loadMessages = useCallback(async () => {
    if (!groupId) return;
    console.log('[Chat] Loading messages for group:', groupId);

    const { data: rawMessages, error } = await supabase
      .from('chat_messages')
      .select('id, group_id, sender_id, content, message_type, drop_id, product_id, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[Chat] Error loading messages:', error);
      return;
    }

    if (!rawMessages) {
      setMessages([]);
      return;
    }

    const built = await Promise.all(rawMessages.map(buildMessage));
    console.log('[Chat] Messages loaded:', built.length);
    setMessages(built);
  }, [groupId, buildMessage]);

  useEffect(() => {
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
  }, [loadMessages]);

  // Verify the group still exists before doing anything else.
  // If it has been deleted, show an alert and go back immediately.
  useEffect(() => {
    if (!groupId) return;
    console.log('[Chat] Verifying group exists:', groupId);

    supabase
      .from('chat_groups')
      .select('id, deleted_at')
      .eq('id', groupId)
      .is('deleted_at', null)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.warn('[Chat] Group not found or deleted, going back:', groupId, error?.message);
          Alert.alert('Gruppo non disponibile', 'Questo gruppo è stato eliminato.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        } else {
          console.log('[Chat] Group exists and is active, proceeding:', groupId);
        }
      });
  }, [groupId]);

  // Mark group as read when screen opens
  useEffect(() => {
    if (!groupId) return;
    console.log('[Chat] Marking group as read on open:', groupId);
    markGroupAsRead(groupId);
  }, [groupId, markGroupAsRead]);

  // Realtime subscription
  useEffect(() => {
    if (!groupId) return;
    console.log('[Chat] Subscribing to realtime messages for group:', groupId);

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(`chat_messages:group_id=eq.${groupId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `group_id=eq.${groupId}`,
          },
          async (payload) => {
            console.log('[Chat] Realtime new message received:', payload.new?.id);
            const newMsg = await buildMessage(payload.new);
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
            // User is already in the chat — mark as read immediately
            if (groupId) {
              console.log('[Chat] Auto-marking group as read after realtime message:', groupId);
              markGroupAsRead(groupId);
            }
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn('[Chat] Realtime subscribe error (non-fatal):', err);
          } else {
            console.log('[Chat] Realtime subscription status:', status);
          }
        });
    } catch (err) {
      console.warn('[Chat] Failed to set up realtime subscription (non-fatal):', err);
    }

    return () => {
      console.log('[Chat] Unsubscribing from realtime channel');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [groupId, buildMessage, markGroupAsRead]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !user?.id || !groupId) return;
    console.log('[Chat] Sending text message to group:', groupId);
    setSending(true);
    setInputText('');

    const { error } = await supabase.from('chat_messages').insert({
      group_id: groupId,
      sender_id: user.id,
      content: text,
      message_type: 'text',
    });

    if (error) {
      console.error('[Chat] Error sending message:', error);
      Alert.alert('Errore', 'Impossibile inviare il messaggio. Riprova.');
      setInputText(text);
      setSending(false);
      return;
    }

    // Fire-and-forget: invia notifiche push agli altri membri
    console.log('[Chat] Invoking send-chat-notification for group:', groupId);
    (async () => {
      try {
        const senderProfile = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        await supabase.functions.invoke('send-chat-notification', {
          body: {
            groupId,
            senderId: user.id,
            senderName: senderProfile.data?.full_name || 'Utente',
            groupName: groupName || 'Gruppo',
            messageContent: text,
            messageType: 'text',
          },
        });
        console.log('[Chat] send-chat-notification invoked successfully');
      } catch (e) {
        console.warn('[Chat] send-chat-notification error (non-fatal):', e);
      }
    })();

    setSending(false);
  };

  const sendDropMessage = async (drop: Drop) => {
    if (!user?.id || !groupId) return;
    const dropName = getDropDisplayName(drop);
    console.log('[Chat] Sending drop message:', drop.id, dropName);
    setShowDropPicker(false);

    const { error } = await supabase.from('chat_messages').insert({
      group_id: groupId,
      sender_id: user.id,
      content: `Ho condiviso il drop: ${dropName}`,
      message_type: 'drop',
      drop_id: drop.id,
    });

    if (error) {
      console.error('[Chat] Error sending drop message:', error);
      Alert.alert('Errore', 'Impossibile condividere il drop. Riprova.');
      return;
    }

    // Fire-and-forget: invia notifiche push agli altri membri
    console.log('[Chat] Invoking send-chat-notification (drop) for group:', groupId);
    (async () => {
      try {
        const senderProfile = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        await supabase.functions.invoke('send-chat-notification', {
          body: {
            groupId,
            senderId: user.id,
            senderName: senderProfile.data?.full_name || 'Utente',
            groupName: groupName || 'Gruppo',
            messageContent: 'Drop condiviso',
            messageType: 'drop',
          },
        });
        console.log('[Chat] send-chat-notification (drop) invoked successfully');
      } catch (e) {
        console.warn('[Chat] send-chat-notification error (non-fatal):', e);
      }
    })();
  };

  const handleSettingsPress = () => {
    console.log('[Chat] Settings button pressed for group:', groupId);
    router.push({ pathname: '/chat-group-settings', params: { groupId, groupName } });
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.chatHeader, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={titleColor} />
        </TouchableOpacity>
        <Text style={[styles.chatHeaderTitle, { color: titleColor }]} numberOfLines={1}>
          {groupName || 'Gruppo'}
        </Text>
        <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
          <Ionicons name="settings-outline" size={22} color={titleColor} />
        </TouchableOpacity>
      </View>

      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={60}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  isOwn={item.sender_id === user?.id}
                  isDark={isDark}
                />
              )}
              contentContainerStyle={[styles.messagesList, { paddingBottom: 16 }]}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              keyboardDismissMode="interactive"
              ListEmptyComponent={
                <View style={styles.emptyMessages}>
                  <Ionicons name="chatbubble-outline" size={48} color={isDark ? '#3A3A3C' : '#D1D5DB'} />
                  <Text style={[styles.emptyMessagesText, { color: isDark ? '#8E8E93' : '#999999' }]}>
                    Nessun messaggio ancora.{'\n'}Inizia la conversazione!
                  </Text>
                </View>
              }
            />
          )}

          {/* Input bar */}
          <View style={[styles.inputBar, { backgroundColor: inputBarBg, borderTopColor: inputBorder, paddingBottom: insets.bottom + 8, marginBottom: 0 }]}>
            <TouchableOpacity
              style={[styles.dropShareButton, { borderColor: inputBorder }]}
              onPress={() => {
                console.log('[Chat] Open drop picker pressed');
                setShowDropPicker(true);
              }}
            >
              <Text style={styles.dropShareIcon}>📦</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: inputText2 }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Scrivi un messaggio..."
              placeholderTextColor={isDark ? '#636366' : '#999999'}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.4 }]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior="height" keyboardVerticalOffset={0}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  isOwn={item.sender_id === user?.id}
                  isDark={isDark}
                />
              )}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              keyboardDismissMode="interactive"
              ListEmptyComponent={
                <View style={styles.emptyMessages}>
                  <Ionicons name="chatbubble-outline" size={48} color={isDark ? '#3A3A3C' : '#D1D5DB'} />
                  <Text style={[styles.emptyMessagesText, { color: isDark ? '#8E8E93' : '#999999' }]}>
                    Nessun messaggio ancora.{'\n'}Inizia la conversazione!
                  </Text>
                </View>
              }
            />
          )}

          {/* Input bar */}
          <View style={[styles.inputBar, { backgroundColor: inputBarBg, borderTopColor: inputBorder, paddingBottom: 12, marginBottom: insets.bottom + 110 }]}>
            <TouchableOpacity
              style={[styles.dropShareButton, { borderColor: inputBorder }]}
              onPress={() => {
                console.log('[Chat] Open drop picker pressed');
                setShowDropPicker(true);
              }}
            >
              <Text style={styles.dropShareIcon}>📦</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: inputText2 }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Scrivi un messaggio..."
              placeholderTextColor={isDark ? '#636366' : '#999999'}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.4 }]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <DropPickerModal
        visible={showDropPicker}
        onClose={() => setShowDropPicker(false)}
        onSelect={sendDropMessage}
        isDark={isDark}
        pickupPointId={userPickupPointId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'System',
    textAlign: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: 12,
    gap: 4,
  },
  bubbleWrapper: {
    marginVertical: 3,
    maxWidth: '80%',
  },
  bubbleWrapperOwn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleWrapperOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleOwn: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  bubbleDrop: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: 'System',
    lineHeight: 21,
  },
  bubbleTime: {
    fontSize: 11,
    fontFamily: 'System',
    alignSelf: 'flex-end',
  },
  dropCard: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 220,
  },
  dropCardImage: {
    width: '100%',
    height: 110,
  },
  dropCardImagePlaceholder: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropCardInfo: {
    padding: 10,
    gap: 6,
  },
  dropCardName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  dropCardBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  discountBadge: {
    backgroundColor: '#16A34A22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#16A34A66',
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    fontFamily: 'System',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  dropCardCta: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  dropShareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropShareIcon: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'System',
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyMessagesText: {
    fontSize: 15,
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'System',
    textAlign: 'center',
  },
  dropPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  dropPickerImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  dropPickerImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropPickerInfo: {
    flex: 1,
    gap: 4,
  },
  dropPickerName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
  },
  dropPickerDiscount: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
  },
});
