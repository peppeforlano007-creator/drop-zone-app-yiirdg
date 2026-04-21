
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

interface ProfileResult {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export default function ChatCreateGroupScreen() {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<ProfileResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? '#000000' : '#F8F8F8';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? '#2C2C2E' : '#E5E5E5';
  const titleColor = isDark ? '#FFFFFF' : '#000000';
  const subColor = isDark ? '#8E8E93' : '#666666';
  const inputBg = isDark ? '#2C2C2E' : '#F8F8F8';
  const placeholderColor = isDark ? '#636366' : '#999999';

  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q);
      if (q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      console.log('[CreateGroup] Searching profiles:', q);
      setSearching(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .neq('user_id', user?.id ?? '')
        .limit(20);

      if (error) {
        console.error('[CreateGroup] Search error:', error);
      } else {
        const results: ProfileResult[] = (data || []).map((p: any) => ({
          id: p.user_id,
          full_name: p.full_name,
          phone: p.phone,
        }));
        const filtered = results.filter(
          (r) => !selectedMembers.some((m) => m.id === r.id)
        );
        setSearchResults(filtered);
      }
      setSearching(false);
    },
    [user?.id, selectedMembers]
  );

  const addMember = (profile: ProfileResult) => {
    console.log('[CreateGroup] Adding member:', profile.id, profile.full_name);
    setSelectedMembers((prev) => [...prev, profile]);
    setSearchResults((prev) => prev.filter((r) => r.id !== profile.id));
    setSearchQuery('');
  };

  const removeMember = (id: string) => {
    console.log('[CreateGroup] Removing member:', id);
    setSelectedMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Errore', 'Il nome del gruppo è obbligatorio.');
      return;
    }
    if (!user?.id) return;

    console.log('[CreateGroup] Creating group:', groupName, 'members:', selectedMembers.length);
    setCreating(true);

    try {
      const { data: newGroup, error: groupErr } = await supabase
        .from('chat_groups')
        .insert({
          name: groupName.trim(),
          description: description.trim() || null,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (groupErr || !newGroup) {
        console.error('[CreateGroup] Error creating group:', groupErr);
        Alert.alert('Errore', 'Impossibile creare il gruppo. Riprova.');
        setCreating(false);
        return;
      }

      const groupId = newGroup.id;
      console.log('[CreateGroup] Group created:', groupId);

      const memberInserts = [
        { group_id: groupId, user_id: user.id },
        ...selectedMembers.map((m) => ({ group_id: groupId, user_id: m.id })),
      ];

      const { error: membersErr } = await supabase
        .from('chat_group_members')
        .insert(memberInserts);

      if (membersErr) {
        console.error('[CreateGroup] Error adding members:', membersErr);
        Alert.alert('Attenzione', 'Gruppo creato ma alcuni membri non sono stati aggiunti.');
      } else {
        console.log('[CreateGroup] Members added successfully');
      }

      router.replace({
        pathname: '/(tabs)/chat/[groupId]',
        params: { groupId, groupName: groupName.trim() },
      });
    } catch (err) {
      console.error('[CreateGroup] Exception:', err);
      Alert.alert('Errore', 'Si è verificato un errore imprevisto.');
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => {
            console.log('[CreateGroup] Cancel pressed');
            router.back();
          }}>
            <Text style={[styles.cancelText, { color: subColor }]}>Annulla</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: titleColor }]}>Nuovo Gruppo</Text>
          <TouchableOpacity onPress={handleCreate} disabled={creating || !groupName.trim()}>
            {creating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.createText, { opacity: groupName.trim() ? 1 : 0.4 }]}>
                Crea
              </Text>
            )}
          </TouchableOpacity>
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
              maxLength={60}
              autoFocus
            />
            <Text style={[styles.sectionLabel, { color: subColor, marginTop: 16 }]}>DESCRIZIONE (opzionale)</Text>
            <TextInput
              style={[styles.input, { color: titleColor, borderBottomColor: 'transparent' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descrizione del gruppo"
              placeholderTextColor={placeholderColor}
              maxLength={200}
              multiline
            />
          </View>

          {/* Selected members chips */}
          {selectedMembers.length > 0 && (
            <View style={styles.chipsSection}>
              <Text style={[styles.sectionTitle, { color: subColor }]}>
                MEMBRI SELEZIONATI ({selectedMembers.length})
              </Text>
              <View style={styles.chipsRow}>
                {selectedMembers.map((m) => {
                  const displayName = m.full_name || m.phone || 'Utente';
                  return (
                    <View key={m.id} style={[styles.chip, { backgroundColor: cardBg, borderColor }]}>
                      <Text style={[styles.chipText, { color: titleColor }]} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <TouchableOpacity onPress={() => removeMember(m.id)}>
                        <Ionicons name="close-circle" size={18} color={subColor} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Search members */}
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionLabel, { color: subColor }]}>AGGIUNGI MEMBRI</Text>
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
                  const sub = profile.full_name && profile.phone ? profile.phone : '';
                  return (
                    <TouchableOpacity
                      key={profile.id}
                      style={[styles.searchResultRow, { borderBottomColor: borderColor }]}
                      onPress={() => addMember(profile)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.resultAvatar, { backgroundColor: inputBg }]}>
                        <Text style={[styles.resultAvatarText, { color: titleColor }]}>
                          {(displayName[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={[styles.resultName, { color: titleColor }]}>{displayName}</Text>
                        {sub !== '' && (
                          <Text style={[styles.resultSub, { color: subColor }]}>{sub}</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'System',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'System',
  },
  createText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
    color: '#000000',
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  input: {
    fontSize: 16,
    fontFamily: 'System',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chipsSection: {
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 160,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'System',
    flex: 1,
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
});
