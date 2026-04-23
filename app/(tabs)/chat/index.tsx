
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors, layout } from '@/styles/commonStyles';
import IconSymbol from '@/components/IconSymbol';

interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  memberCount: number;
  lastMessage: {
    content: string;
    senderName: string;
    created_at: string;
  } | null;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Ieri';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('it-IT', { weekday: 'short' });
  }
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

function GroupRow({ group, onPress }: { group: ChatGroup; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const cardBorder = isDark ? '#2C2C2E' : '#E5E5E5';
  const titleColor = isDark ? '#FFFFFF' : '#000000';
  const subtitleColor = isDark ? '#8E8E93' : '#666666';
  const timeColor = isDark ? '#8E8E93' : '#999999';
  const avatarBg = isDark ? '#2C2C2E' : '#F0F0F0';

  const initials = group.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const lastMsgText = group.lastMessage
    ? `${group.lastMessage.senderName}: ${group.lastMessage.content}`
    : 'Nessun messaggio ancora';

  const timeText = group.lastMessage ? formatTime(group.lastMessage.created_at) : '';

  return (
    <TouchableOpacity
      style={[styles.groupRow, { backgroundColor: cardBg, borderColor: cardBorder }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={[styles.avatarText, { color: titleColor }]}>{initials}</Text>
      </View>
      <View style={styles.groupInfo}>
        <View style={styles.groupRowTop}>
          <Text style={[styles.groupName, { color: titleColor }]} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={[styles.timeText, { color: timeColor }]}>{timeText}</Text>
        </View>
        <View style={styles.groupRowBottom}>
          <Text style={[styles.lastMessage, { color: subtitleColor }]} numberOfLines={1}>
            {lastMsgText}
          </Text>
          <Text style={[styles.memberCount, { color: subtitleColor }]}>
            {group.memberCount}
          </Text>
          <Ionicons name="people-outline" size={13} color={subtitleColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatIndexScreen() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? '#000000' : '#F8F8F8';
  const headerBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const headerBorder = isDark ? '#2C2C2E' : '#E5E5E5';
  const titleColor = isDark ? '#FFFFFF' : '#000000';

  const loadGroups = useCallback(async () => {
    if (!user?.id) return;
    console.log('[Chat] Loading groups for user:', user.id);

    try {
      // Query chat_groups with an inner join on chat_group_members to avoid
      // triggering the recursive RLS SELECT policy on chat_group_members.
      // Querying chat_groups as the primary table bypasses the self-referencing
      // subquery in the chat_group_members policy (code 42P17).
      const { data: rawGroups, error: groupErr } = await supabase
        .from('chat_groups')
        .select('id, name, description, created_by, created_at, chat_group_members!inner(user_id)')
        .eq('chat_group_members.user_id', user.id)
        .order('created_at', { ascending: false });

      if (groupErr) {
        console.error('[Chat] Error loading groups:', groupErr);
        return;
      }

      if (!rawGroups || rawGroups.length === 0) {
        console.log('[Chat] No group memberships found');
        setGroups([]);
        return;
      }

      console.log('[Chat] Found groups:', rawGroups.length);

      const enriched: ChatGroup[] = await Promise.all(
        rawGroups.map(async (g: any) => {
          // Get member count via chat_groups join to avoid recursive policy
          const { data: memberRows } = await supabase
            .from('chat_groups')
            .select('chat_group_members(user_id)')
            .eq('id', g.id)
            .single();

          const memberCount = (memberRows as any)?.chat_group_members?.length ?? 0;

          const { data: lastMsgs } = await supabase
            .from('chat_messages')
            .select('content, message_type, created_at, sender_id')
            .eq('group_id', g.id)
            .order('created_at', { ascending: false })
            .limit(1);

          let lastMessage: ChatGroup['lastMessage'] = null;
          if (lastMsgs && lastMsgs.length > 0) {
            const msg = lastMsgs[0];
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', msg.sender_id)
              .single();

            const senderName = senderProfile?.full_name || 'Utente';
            const content =
              msg.message_type === 'drop' ? '📦 Drop condiviso' : msg.content;
            lastMessage = { content, senderName, created_at: msg.created_at };
          }

          return {
            id: g.id,
            name: g.name,
            description: g.description,
            created_by: g.created_by,
            created_at: g.created_at,
            memberCount,
            lastMessage,
          };
        })
      );

      console.log('[Chat] Groups loaded:', enriched.length);
      setGroups(enriched);
    } catch (err) {
      console.error('[Chat] Exception loading groups:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    loadGroups().finally(() => setLoading(false));
  }, [loadGroups]);

  const onRefresh = useCallback(async () => {
    console.log('[Chat] Pull-to-refresh triggered');
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  }, [loadGroups]);

  const handleCreateGroup = () => {
    console.log('[Chat] Create group button pressed');
    router.push('/chat-create-group');
  };

  const handleInviteFriends = async () => {
    console.log('[Chat] Invite friends button pressed');
    try {
      const result = await Share.share({
        message: 'Scarica Drop Zone e unisciti ai miei gruppi! 🔥 Prenota articoli scontati con amici e parenti.',
        url: 'https://dropzone.app',
      });
      console.log('[Chat] Share result:', result.action);
    } catch (err) {
      console.error('[Chat] Share error:', err);
    }
  };

  const inviteBannerBg = isDark ? '#1A1A1A' : '#000000';
  const inviteBannerBorder = isDark ? '#2C2C2E' : '#222222';

  const InviteBanner = (
    <TouchableOpacity
      style={[styles.inviteBanner, { backgroundColor: inviteBannerBg, borderColor: inviteBannerBorder }]}
      onPress={handleInviteFriends}
      activeOpacity={0.8}
    >
      <View style={styles.inviteIconWrap}>
        <IconSymbol name="person.badge.plus" size={26} color="#FFFFFF" />
      </View>
      <View style={styles.inviteTextWrap}>
        <Text style={styles.inviteTitle}>Invita amici e parenti</Text>
        <Text style={styles.inviteSubtitle}>Aggiungi persone ai tuoi gruppi</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
    </TouchableOpacity>
  );

  const handleGroupPress = (groupId: string, groupName: string) => {
    console.log('[Chat] Group pressed:', groupId, groupName);
    router.push({ pathname: '/(tabs)/chat/[groupId]', params: { groupId, groupName } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        <Text style={[styles.headerTitle, { color: titleColor }]}>Gruppi</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateGroup}>
          <Ionicons name="add" size={26} color={titleColor} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GroupRow
              group={item}
              onPress={() => handleGroupPress(item.id, item.name)}
            />
          )}
          ListHeaderComponent={InviteBanner}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={[
            styles.listContent,
            groups.length === 0 && styles.emptyContainer,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color={isDark ? '#3A3A3C' : '#D1D5DB'} />
              <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Nessun gruppo ancora
              </Text>
              <Text style={[styles.emptySubtitle, { color: isDark ? '#8E8E93' : '#666666' }]}>
                Crea il primo gruppo e inizia a chattare!
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleCreateGroup}>
                <Text style={styles.emptyButtonText}>Crea gruppo</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'System',
  },
  addButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: layout.contentPaddingBottom,
  },
  emptyContainer: {
    flex: 1,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
  },
  groupInfo: {
    flex: 1,
    gap: 4,
  },
  groupRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'System',
  },
  groupRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: 'System',
    flex: 1,
  },
  memberCount: {
    fontSize: 12,
    fontFamily: 'System',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'System',
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 8,
    backgroundColor: '#000000',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  inviteIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTextWrap: {
    flex: 1,
    gap: 3,
  },
  inviteTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'System',
  },
  inviteSubtitle: {
    color: '#AEAEB2',
    fontSize: 13,
    fontFamily: 'System',
  },
});
