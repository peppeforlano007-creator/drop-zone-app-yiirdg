
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'drop_activated' | 'drop_ending' | 'order_ready' | 'order_shipped' | 'payment_captured' | 'general';
  related_id?: string;
  related_type?: 'drop' | 'order' | 'booking' | 'product';
  read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Exception loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();

    // Subscribe to real-time notifications
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload);
          setNotifications(prev => [payload.new as Notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Exception marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Exception marking all as read:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.related_type === 'drop' && notification.related_id) {
      router.push({
        pathname: '/drop-details',
        params: { dropId: notification.related_id },
      });
    } else if (notification.related_type === 'order' && notification.related_id) {
      router.push('/(tabs)/my-bookings');
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'drop_activated':
        return { ios: 'flame.fill', android: 'local_fire_department', color: '#FF6B35' };
      case 'drop_ending':
        return { ios: 'clock.fill', android: 'schedule', color: '#FFB800' };
      case 'order_ready':
        return { ios: 'checkmark.circle.fill', android: 'check_circle', color: '#34C759' };
      case 'order_shipped':
        return { ios: 'shippingbox.fill', android: 'local_shipping', color: '#007AFF' };
      case 'payment_captured':
        return { ios: 'creditcard.fill', android: 'payment', color: '#5856D6' };
      default:
        return { ios: 'bell.fill', android: 'notifications', color: colors.text };
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconConfig = getNotificationIcon(item.type);

    return (
      <Pressable
        style={[styles.notificationCard, !item.read && styles.notificationCardUnread]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${iconConfig.color}20` }]}>
          <IconSymbol
            ios_icon_name={iconConfig.ios}
            android_material_icon_name={iconConfig.android}
            size={24}
            color={iconConfig.color}
          />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !item.read && styles.notificationTitleUnread]}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          
          <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol
        ios_icon_name="bell.slash"
        android_material_icon_name="notifications_off"
        size={64}
        color={colors.textTertiary}
      />
      <Text style={styles.emptyTitle}>Nessuna Notifica</Text>
      <Text style={styles.emptyText}>
        Riceverai notifiche quando ci saranno aggiornamenti sui tuoi drop e ordini
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifiche',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerRight: () => (
            unreadCount > 0 ? (
              <Pressable onPress={markAllAsRead} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Segna tutte lette</Text>
              </Pressable>
            ) : null
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={styles.loadingText}>Caricamento notifiche...</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              notifications.length === 0 && styles.listContentEmpty,
              Platform.OS !== 'ios' && styles.listContentWithTabBar,
            ]}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.text}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  listContentEmpty: {
    flex: 1,
  },
  listContentWithTabBar: {
    paddingBottom: 120,
  },
  headerButton: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  notificationCardUnread: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.text,
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
