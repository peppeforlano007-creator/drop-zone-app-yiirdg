
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface ChatGroup {
  group_id: string;
  chat_groups: {
    id: string;
    name: string;
  } | null;
}

interface ShareToGroupModalProps {
  visible: boolean;
  onClose: () => void;
  drop?: { id: string; name: string } | null;
  product?: { id: string; name: string } | null;
}

export default function ShareToGroupModal({ visible, onClose, drop, product }: ShareToGroupModalProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingGroupId, setSendingGroupId] = useState<string | null>(null);
  const [successGroupId, setSuccessGroupId] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    console.log('[ShareToGroupModal] Loading chat groups for user:', user.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_group_members')
        .select('group_id, chat_groups(id, name)')
        .eq('user_id', user.id);

      if (error) {
        console.error('[ShareToGroupModal] Error loading groups:', error);
      } else {
        console.log('[ShareToGroupModal] Groups loaded:', data?.length ?? 0);
        setGroups((data as ChatGroup[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible && user) {
      loadGroups();
    }
  }, [visible, user, loadGroups]);

  const handleSend = async (groupId: string, groupName: string) => {
    if (!user || (!drop && !product)) return;
    if (product) {
      console.log('[ShareToGroupModal] Sending product', product.id, 'to group', groupId, '(', groupName, ')');
    } else {
      console.log('[ShareToGroupModal] Sending drop', drop!.id, 'to group', groupId, '(', groupName, ')');
    }
    setSendingGroupId(groupId);
    try {
      const messagePayload = product
        ? {
            group_id: groupId,
            sender_id: user.id,
            content: `Ho condiviso l'articolo: ${product.name}`,
            message_type: 'product',
            product_id: product.id,
          }
        : {
            group_id: groupId,
            sender_id: user.id,
            content: `Ho condiviso il drop: ${drop!.name}`,
            message_type: 'drop',
            drop_id: drop!.id,
          };
      const { error } = await supabase.from('chat_messages').insert(messagePayload);

      if (error) {
        console.error('[ShareToGroupModal] Error sending message:', error);
      } else {
        console.log('[ShareToGroupModal]', product ? 'Product' : 'Drop', 'shared successfully to group:', groupId);
        setSuccessGroupId(groupId);
        setTimeout(() => {
          setSuccessGroupId(null);
          setSendingGroupId(null);
          onClose();
        }, 800);
        return;
      }
    } catch (err) {
      console.error('[ShareToGroupModal] Exception sending message:', err);
    }
    setSendingGroupId(null);
  };

  const handleClose = () => {
    console.log('[ShareToGroupModal] Modal closed');
    setGroups([]);
    setSuccessGroupId(null);
    setSendingGroupId(null);
    onClose();
  };

  const bg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#9CA3AF' : '#6B7280';
  const rowBg = isDark ? '#2C2C2E' : '#F9FAFB';
  const borderColor = isDark ? '#3A3A3C' : '#E5E7EB';
  const handleBg = isDark ? '#3A3A3C' : '#E5E7EB';

  const renderGroup = ({ item }: { item: ChatGroup }) => {
    const groupId = item.group_id;
    const groupName = item.chat_groups?.name ?? 'Gruppo';
    const isSending = sendingGroupId === groupId;
    const isSuccess = successGroupId === groupId;

    const buttonBg = isSuccess ? '#16A34A' : '#2563EB';
    const buttonLabel = isSuccess ? 'Inviato!' : 'Invia';

    return (
      <View style={[styles.groupRow, { backgroundColor: rowBg, borderColor }]}>
        <View style={styles.groupInfo}>
          <View style={[styles.groupAvatar, { backgroundColor: '#2563EB22' }]}>
            <Ionicons name="people" size={18} color="#2563EB" />
          </View>
          <Text style={[styles.groupName, { color: textColor }]} numberOfLines={1}>
            {groupName}
          </Text>
        </View>
        <Pressable
          style={[styles.sendButton, { backgroundColor: buttonBg, opacity: isSending ? 0.7 : 1 }]}
          onPress={() => {
            console.log('[ShareToGroupModal] Send button pressed for group:', groupId);
            handleSend(groupId, groupName);
          }}
          disabled={isSending || isSuccess}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.sendButtonText}>{buttonLabel}</Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.handle, { backgroundColor: handleBg }]} />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="share-social" size={22} color="#2563EB" />
            <Text style={[styles.title, { color: textColor }]}>Condividi nel gruppo</Text>
          </View>
          <Pressable
            style={[styles.closeButton, { backgroundColor: rowBg }]}
            onPress={handleClose}
          >
            <Ionicons name="close" size={18} color={subTextColor} />
          </Pressable>
        </View>

        {(product || drop) && (
          <View style={[styles.dropChip, { backgroundColor: '#2563EB15', borderColor: '#2563EB44' }]}>
            <Ionicons name={product ? 'shirt-outline' : 'pricetag'} size={14} color="#2563EB" />
            <Text style={[styles.dropChipText, { color: '#2563EB' }]} numberOfLines={1}>
              {product ? product.name : drop!.name}
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={[styles.loadingText, { color: subTextColor }]}>Caricamento gruppi...</Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={48} color={subTextColor} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>Nessun gruppo</Text>
            <Text style={[styles.emptySubtext, { color: subTextColor }]}>
              Non hai ancora nessun gruppo. Crea un gruppo nella sezione Chat.
            </Text>
          </View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) => item.group_id}
            renderItem={renderGroup}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  dropChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'System',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'System',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  list: {
    gap: 10,
    paddingBottom: 32,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  groupAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
    flex: 1,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'System',
  },
});
