
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

interface Member {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

interface ProfileResult {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export default function ChatGroupSettingsScreen() {
  const { groupId, groupName: initialGroupName } = useLocalSearchParams<{
    groupId: string;
    groupName: string;
  }>();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState(initialGroupName || '');
  const [description, setDescription] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [groupType, setGroupType] = useState<string>('private');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([]);
  const [searching, setSearching] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? '#000000' : '#F8F8F8';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? '#2C2C2E' : '#E5E5E5';
  const titleColor = isDark ? '#FFFFFF' : '#000000';
  const subColor = isDark ? '#8E8E93' : '#666666';
  const inputBg = isDark ? '#2C2C2E' : '#F8F8F8';
  const placeholderColor = isDark ? '#636366' : '#999999';

  const isCreator = createdBy === user?.id;

  const loadGroupData = useCallback(async () => {
    if (!groupId) return;
    console.log('[GroupSettings] Loading group data:', groupId);

    const { data: group, error: groupErr } = await supabase
      .from('chat_groups')
      .select('id, name, description, created_by, group_type')
      .eq('id', groupId)
      .single();

    if (groupErr || !group) {
      console.error('[GroupSettings] Error loading group:', groupErr);
      return;
    }

    setGroupName(group.name);
    setDescription(group.description || '');
    setCreatedBy(group.created_by);
    setGroupType(group.group_type || 'private');

    // Query via chat_groups join to avoid triggering the recursive RLS policy
    // on chat_group_members (code 42P17).
    const { data: groupWithMembers, error: memErr } = await supabase
      .from('chat_groups')
      .select('chat_group_members(user_id, status)')
      .eq('id', groupId)
      .single();

    if (memErr) {
      console.error('[GroupSettings] Error loading members:', memErr);
      return;
    }

    const memberRows = ((groupWithMembers as any)?.chat_group_members ?? []).filter((m: any) => m.status === 'active' || m.status == null);

    if (!memberRows || memberRows.length === 0) {
      setMembers([]);
      return;
    }

    const userIds = memberRows.map((m: any) => m.user_id);
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone')
      .in('user_id', userIds);

    if (profErr) {
      console.error('[GroupSettings] Error loading profiles:', profErr);
      return;
    }

    setMembers((profiles as Member[]) || []);
    console.log('[GroupSettings] Members loaded:', profiles?.length);
  }, [groupId]);

  useEffect(() => {
    setLoading(true);
    loadGroupData().finally(() => setLoading(false));
  }, [loadGroupData]);

  const handleSave = async () => {
    if (!groupName.trim() || !isCreator) return;
    console.log('[GroupSettings] Saving group info:', groupName);
    setSaving(true);

    const { error } = await supabase
      .from('chat_groups')
      .update({ name: groupName.trim(), description: description.trim() || null })
      .eq('id', groupId);

    if (error) {
      console.error('[GroupSettings] Error saving group:', error);
      Alert.alert('Errore', 'Impossibile salvare le modifiche.');
    } else {
      console.log('[GroupSettings] Group saved successfully');
      Alert.alert('Salvato', 'Le modifiche sono state salvate.');
    }
    setSaving(false);
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    const isSelf = memberId === user?.id;
    const title = isSelf ? 'Lascia gruppo' : 'Rimuovi membro';
    const message = isSelf
      ? 'Sei sicuro di voler lasciare questo gruppo?'
      : `Rimuovere ${memberName} dal gruppo?`;

    Alert.alert(title, message, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: isSelf ? 'Lascia' : 'Rimuovi',
        style: 'destructive',
        onPress: async () => {
          console.log('[GroupSettings] Removing member:', memberId);
          const { error } = await supabase
            .from('chat_group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', memberId);

          if (error) {
            console.error('[GroupSettings] Error removing member:', error);
            Alert.alert('Errore', 'Impossibile rimuovere il membro.');
          } else {
            setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
            if (isSelf) {
              console.log('[GroupSettings] Left group, navigating back');
              router.replace('/(tabs)/chat');
            }
          }
        },
      },
    ]);
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Elimina gruppo',
      'Sei sicuro di voler eliminare questo gruppo? Tutti i messaggi saranno persi.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            console.log('[GroupSettings] Deleting group:', groupId);
            const { error } = await supabase
              .from('chat_groups')
              .delete()
              .eq('id', groupId);

            if (error) {
              console.error('[GroupSettings] Error deleting group:', error);
              Alert.alert('Errore', 'Impossibile eliminare il gruppo.');
            } else {
              console.log('[GroupSettings] Group deleted, navigating to chat list');
              router.replace('/(tabs)/chat');
            }
          },
        },
      ]
    );
  };

  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q);
      if (q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      console.log('[GroupSettings] Searching profiles to add:', q);
      setSearching(true);

      const existingIds = members.map((m) => m.user_id);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .eq('role', 'consumer')
        .neq('user_id', user?.id ?? '')
        .limit(20);

      if (error) {
        console.error('[GroupSettings] Search error:', error);
      } else {
        const results: ProfileResult[] = (data || [])
          .map((p: any) => ({ id: p.user_id, full_name: p.full_name, phone: p.phone }))
          .filter((r: ProfileResult) => !existingIds.includes(r.id));
        setSearchResults(results);
      }
      setSearching(false);
    },
    [members, user?.id]
  );

  const handleAddMember = async (profile: ProfileResult) => {
    console.log('[GroupSettings] Adding member:', profile.id, profile.full_name);
    const { error } = await supabase
      .from('chat_group_members')
      .insert({ group_id: groupId, user_id: profile.id });

    if (error) {
      console.error('[GroupSettings] Error adding member:', error);
      Alert.alert('Errore', 'Impossibile aggiungere il membro.');
    } else {
      setMembers((prev) => [
        ...prev,
        { user_id: profile.id, full_name: profile.full_name, phone: profile.phone },
      ]);
      setSearchResults((prev) => prev.filter((r) => r.id !== profile.id));
      setSearchQuery('');

      // Notifica il nuovo membro (fire-and-forget)
      console.log('[GroupSettings] Sending push notification to new member:', profile.id);
      (async () => {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('push_token')
            .eq('user_id', profile.id)
            .single();

          if (profileData?.push_token) {
            console.log('[GroupSettings] Push token found, sending notification to:', profile.id);
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: profileData.push_token,
                title: 'Sei stato aggiunto a un gruppo',
                body: `Sei stato aggiunto al gruppo "${groupName}"`,
                data: { groupId, type: 'group_invite' },
                channelId: 'default',
              }),
            });
            console.log('[GroupSettings] Push notification sent to new member:', profile.id);
          } else {
            console.log('[GroupSettings] No push token for new member:', profile.id);
          }
        } catch (e) {
          console.warn('[GroupSettings] Notifica nuovo membro fallita (non-fatal):', e);
        }
      })();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => {
          console.log('[GroupSettings] Back pressed');
          router.back();
        }}>
          <Ionicons name="chevron-back" size={26} color={titleColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: titleColor }]}>Impostazioni</Text>
        {isCreator ? (
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.saveText, { color: titleColor }]}>Salva</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Group info */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionLabel, { color: subColor }]}>NOME GRUPPO</Text>
          <TextInput
            style={[styles.input, { color: titleColor, borderBottomColor: borderColor }]}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Nome del gruppo"
            placeholderTextColor={placeholderColor}
            editable={isCreator}
          />
          <Text style={[styles.sectionLabel, { color: subColor, marginTop: 16 }]}>DESCRIZIONE</Text>
          <TextInput
            style={[styles.input, { color: titleColor, borderBottomColor: 'transparent' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descrizione del gruppo"
            placeholderTextColor={placeholderColor}
            multiline
            editable={isCreator}
          />
        </View>

        {/* Members list */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionLabel, { color: subColor }]}>
            MEMBRI ({members.length})
          </Text>
          {members.map((member) => {
            const displayName = member.full_name || member.phone || 'Utente';
            const isSelf = member.user_id === user?.id;
            const isMemberCreator = member.user_id === createdBy;
            const canRemove = isCreator || isSelf;

            return (
              <View
                key={member.user_id}
                style={[styles.memberRow, { borderBottomColor: borderColor }]}
              >
                <View style={[styles.memberAvatar, { backgroundColor: inputBg }]}>
                  <Text style={[styles.memberAvatarText, { color: titleColor }]}>
                    {(displayName[0] || '?').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={[styles.memberName, { color: titleColor }]}>{displayName}</Text>
                    {isSelf && (
                      <View style={[styles.selfBadge, { backgroundColor: inputBg }]}>
                        <Text style={[styles.selfBadgeText, { color: subColor }]}>Tu</Text>
                      </View>
                    )}
                    {isMemberCreator && (
                      <View style={[styles.creatorBadge]}>
                        <Text style={styles.creatorBadgeText}>Admin</Text>
                      </View>
                    )}
                  </View>
                  {member.phone && member.full_name && (
                    <Text style={[styles.memberSub, { color: subColor }]}>{member.phone}</Text>
                  )}
                </View>
                {canRemove && !isMemberCreator && (
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(member.user_id, displayName)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="remove-circle-outline" size={22} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Add member search */}
        {isCreator && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionLabel, { color: subColor }]}>AGGIUNGI MEMBRO</Text>
            <View style={[styles.searchRow, { backgroundColor: inputBg, borderColor }]}>
              <Ionicons name="search" size={18} color={placeholderColor} />
              <TextInput
                style={[styles.searchInput, { color: titleColor }]}
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder="Cerca per nome o telefono"
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
              />
              {searching && <ActivityIndicator size="small" color={subColor} />}
            </View>

            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((profile) => {
                  const displayName = profile.full_name || profile.phone || 'Utente';
                  return (
                    <TouchableOpacity
                      key={profile.id}
                      style={[styles.searchResultRow, { borderBottomColor: borderColor }]}
                      onPress={() => handleAddMember(profile)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.resultAvatar, { backgroundColor: inputBg }]}>
                        <Text style={[styles.resultAvatarText, { color: titleColor }]}>
                          {(displayName[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={[styles.resultName, { color: titleColor }]}>{displayName}</Text>
                        {profile.full_name && profile.phone && (
                          <Text style={[styles.resultSub, { color: subColor }]}>{profile.phone}</Text>
                        )}
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color={colors.success} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searching && (
              <Text style={[styles.noResults, { color: subColor }]}>Nessun utente trovato</Text>
            )}
          </View>
        )}

        {/* Leave / Delete */}
        <View style={styles.dangerSection}>
          {!isCreator && groupType !== 'city' && (
            <TouchableOpacity
              style={[styles.dangerButton, { borderColor: colors.error + '44' }]}
              onPress={() => handleRemoveMember(user?.id || '', 'te stesso')}
            >
              <Ionicons name="exit-outline" size={20} color={colors.error} />
              <Text style={[styles.dangerButtonText, { color: colors.error }]}>
                Lascia gruppo
              </Text>
            </TouchableOpacity>
          )}
          {isCreator && (
            <TouchableOpacity
              style={[styles.dangerButton, { borderColor: colors.error + '44' }]}
              onPress={handleDeleteGroup}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.dangerButtonText, { color: colors.error }]}>
                Elimina gruppo
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'System',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    fontFamily: 'System',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
  },
  memberSub: {
    fontSize: 13,
    fontFamily: 'System',
  },
  selfBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selfBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
  },
  creatorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#000000',
  },
  creatorBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
    color: '#FFFFFF',
  },
  removeButton: {
    padding: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'System',
  },
  searchResults: {
    marginTop: 8,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
  },
  resultSub: {
    fontSize: 13,
    fontFamily: 'System',
  },
  noResults: {
    fontSize: 14,
    fontFamily: 'System',
    textAlign: 'center',
    paddingVertical: 12,
  },
  dangerSection: {
    gap: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});
