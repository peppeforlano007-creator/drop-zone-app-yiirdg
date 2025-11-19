
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface UserData {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'consumer' | 'supplier' | 'pickup_point' | 'admin';
  pickup_point_id?: string;
  created_at: string;
  pickup_points?: {
    name: string;
    city: string;
  };
}

export default function UsersScreen() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'consumer' | 'supplier' | 'pickup_point' | 'admin'>('all');

  const filterUsers = useCallback(() => {
    let filtered = users;

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error loading users:', profilesError);
        Alert.alert('Errore', 'Impossibile caricare gli utenti');
        return;
      }

      // Then, fetch pickup points for users who have them
      const pickupPointIds = profilesData
        ?.filter(p => p.pickup_point_id)
        .map(p => p.pickup_point_id) || [];

      let pickupPointsMap: Record<string, any> = {};
      
      if (pickupPointIds.length > 0) {
        const { data: pickupPointsData, error: pickupPointsError } = await supabase
          .from('pickup_points')
          .select('id, name, city')
          .in('id', pickupPointIds);

        if (!pickupPointsError && pickupPointsData) {
          pickupPointsMap = pickupPointsData.reduce((acc, pp) => {
            acc[pp.id] = pp;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Merge the data
      const usersWithPickupPoints = profilesData?.map(profile => ({
        ...profile,
        pickup_points: profile.pickup_point_id ? pickupPointsMap[profile.pickup_point_id] : null
      })) || [];

      setUsers(usersWithPickupPoints);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Errore', 'Si è verificato un errore');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleViewUser = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/admin/user-details',
      params: { userId },
    });
  };

  const handleCreateUser = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/admin/create-user');
  };

  const handleDeleteUser = (user: UserData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Elimina Utente',
      `Sei sicuro di voler eliminare l'utente "${user.full_name}"?\n\nQuesta azione eliminerà anche tutti i dati associati.\n\nQuesta azione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete user bookings
              const { error: bookingsError } = await supabase
                .from('bookings')
                .delete()
                .eq('user_id', user.user_id);

              if (bookingsError) {
                console.error('Error deleting bookings:', bookingsError);
              }

              // Delete user interests
              const { error: interestsError } = await supabase
                .from('user_interests')
                .delete()
                .eq('user_id', user.user_id);

              if (interestsError) {
                console.error('Error deleting interests:', interestsError);
              }

              // Delete payment methods
              const { error: paymentError } = await supabase
                .from('payment_methods')
                .delete()
                .eq('user_id', user.user_id);

              if (paymentError) {
                console.error('Error deleting payment methods:', paymentError);
              }

              // Delete notifications
              const { error: notificationsError } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.user_id);

              if (notificationsError) {
                console.error('Error deleting notifications:', notificationsError);
              }

              // Delete profile
              const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('user_id', user.user_id);

              if (profileError) {
                console.error('Error deleting profile:', profileError);
                Alert.alert('Errore', 'Impossibile eliminare il profilo');
                return;
              }

              // Delete auth user (this will cascade delete everything else)
              const { error: authError } = await supabase.auth.admin.deleteUser(user.user_id);

              if (authError) {
                console.error('Error deleting auth user:', authError);
                // Don't show error if profile was already deleted
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Utente eliminato con successo');
              
              // Reload users
              loadUsers();
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Errore', 'Si è verificato un errore durante l\'eliminazione');
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return colors.error;
      case 'supplier':
        return colors.warning;
      case 'pickup_point':
        return colors.info;
      case 'consumer':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'supplier':
        return 'Fornitore';
      case 'pickup_point':
        return 'Punto Ritiro';
      case 'consumer':
        return 'Consumatore';
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return { ios: 'shield.fill', android: 'admin_panel_settings' };
      case 'supplier':
        return { ios: 'building.2.fill', android: 'store' };
      case 'pickup_point':
        return { ios: 'mappin.circle.fill', android: 'location_on' };
      case 'consumer':
        return { ios: 'person.fill', android: 'person' };
      default:
        return { ios: 'person', android: 'person' };
    }
  };

  const renderUser = (user: UserData) => {
    const roleIcon = getRoleIcon(user.role);
    
    return (
      <View
        key={user.id}
        style={styles.userCard}
      >
        <Pressable
          style={({ pressed }) => [
            styles.userCardContent,
            pressed && styles.userCardPressed,
          ]}
          onPress={() => handleViewUser(user.user_id)}
        >
          <View style={styles.userHeader}>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{user.full_name || 'N/A'}</Text>
                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                  <IconSymbol
                    ios_icon_name={roleIcon.ios}
                    android_material_icon_name={roleIcon.android}
                    size={12}
                    color={getRoleColor(user.role)}
                  />
                  <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                    {getRoleLabel(user.role)}
                  </Text>
                </View>
              </View>
              <Text style={styles.userEmail}>{user.email}</Text>
              {user.phone && (
                <Text style={styles.userPhone}>{user.phone}</Text>
              )}
              {user.pickup_points && (
                <Text style={styles.userPickupPoint}>
                  📍 {user.pickup_points.city} - {user.pickup_points.name}
                </Text>
              )}
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={20}
              color={colors.textTertiary}
            />
          </View>
          <View style={styles.userFooter}>
            <Text style={styles.userDate}>
              Registrato: {new Date(user.created_at).toLocaleDateString('it-IT')}
            </Text>
          </View>
        </Pressable>
        
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
          onPress={() => handleDeleteUser(user)}
        >
          <IconSymbol
            ios_icon_name="trash.fill"
            android_material_icon_name="delete"
            size={18}
            color="#FFF"
          />
          <Text style={styles.deleteButtonText}>Elimina</Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento utenti...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gestisci Utenti',
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={20}
              color={colors.textTertiary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca per nome, email o telefono..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {[
              { key: 'all', label: 'Tutti', count: users.length },
              { key: 'consumer', label: 'Consumatori', count: users.filter(u => u.role === 'consumer').length },
              { key: 'supplier', label: 'Fornitori', count: users.filter(u => u.role === 'supplier').length },
              { key: 'pickup_point', label: 'Punti Ritiro', count: users.filter(u => u.role === 'pickup_point').length },
              { key: 'admin', label: 'Admin', count: users.filter(u => u.role === 'admin').length },
            ].map((item) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.filterButton,
                  roleFilter === item.key && styles.filterButtonActive,
                  pressed && styles.filterButtonPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRoleFilter(item.key as any);
                }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    roleFilter === item.key && styles.filterButtonTextActive,
                  ]}
                >
                  {item.label} ({item.count})
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.headerRow}>
            <Text style={styles.statsText}>
              {filteredUsers.length} utent{filteredUsers.length === 1 ? 'e' : 'i'} trovat{filteredUsers.length === 1 ? 'o' : 'i'}
            </Text>
            
            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.createButtonPressed,
              ]}
              onPress={handleCreateUser}
            >
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add_circle"
                size={20}
                color="#FFF"
              />
              <Text style={styles.createButtonText}>Crea Utente</Text>
            </Pressable>
          </View>

          {filteredUsers.length > 0 ? (
            filteredUsers.map(renderUser)
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="person.slash"
                android_material_icon_name="person_off"
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>Nessun utente trovato</Text>
              <Text style={styles.emptyText}>
                Prova a modificare i filtri di ricerca
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  filterContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonPressed: {
    opacity: 0.7,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  headerRow: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  createButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  userCardContent: {
    padding: 16,
  },
  userCardPressed: {
    opacity: 0.7,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  userPickupPoint: {
    fontSize: 13,
    color: colors.info,
    marginTop: 4,
  },
  userFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteButtonPressed: {
    opacity: 0.7,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
