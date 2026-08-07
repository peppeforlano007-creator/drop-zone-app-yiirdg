
import React, { useEffect } from 'react';
import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { UnreadChatProvider, useUnreadChat } from '@/contexts/UnreadChatContext';
import { IconSymbol } from '@/components/IconSymbol';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import * as Haptics from 'expo-haptics';

function ProfileHeaderRight() {
  const unreadCount = useUnreadNotifications();
  const { logout } = useAuth();
  const bellCountText = unreadCount > 99 ? '99+' : String(unreadCount);

  const handleBellPress = () => {
    console.log('[ProfileHeader] Bell icon pressed, navigating to notifications');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/notifications');
  };

  const handleLogout = async () => {
    console.log('[ProfileHeader] Logout button pressed');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace('/login');
  };

  return (
    <View style={headerStyles.row}>
      <Pressable onPress={handleBellPress} style={headerStyles.bellWrapper} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <IconSymbol
          ios_icon_name="bell.fill"
          android_material_icon_name="notifications"
          size={24}
          color={colors.text}
        />
        {unreadCount > 0 && (
          <View style={headerStyles.badge}>
            <Text style={headerStyles.badgeText}>{bellCountText}</Text>
          </View>
        )}
      </Pressable>
      <Pressable onPress={handleLogout} style={headerStyles.logoutWrapper} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <IconSymbol
          ios_icon_name="rectangle.portrait.and.arrow.right"
          android_material_icon_name="logout"
          size={24}
          color={colors.text}
        />
      </Pressable>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  bellWrapper: {
    position: 'relative',
  },
  logoutWrapper: {},
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
});

function TabLayoutInner() {
  const { user, isAuthenticated } = useAuth();
  const { totalUnread } = useUnreadChat();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'consumer') {
      console.log('Not authenticated or not a consumer, redirecting to login');
      router.replace('/login');
    }
  }, [isAuthenticated, user]);

  const tabs: TabBarItem[] = [
    {
      route: '/(tabs)/drops',
      label: 'Drop',
      icon: 'flame.fill',
    },
    {
      route: '/(tabs)/payment-methods',
      label: 'Punti di ritiro',
      icon: 'storefront.fill',
    },
    {
      route: '/(tabs)/chat',
      label: 'Gruppi',
      icon: 'message.fill',
      androidIcon: 'chat',
      badge: totalUnread,
    },
    {
      route: '/(tabs)/profile',
      label: 'Profilo',
      icon: 'person.fill',
    },
  ];

  const profileHeaderRight = () => <ProfileHeaderRight />;

  if (Platform.OS === 'ios') {
    return (
      <>
        <Stack screenOptions={{ headerShown: false }} />
        <FloatingTabBar tabs={tabs} />
      </>
    );
  }

  return (
    <>
      <Stack
        screenOptions={({ route }) => ({
          headerShown: route.name === 'drops' ? false : true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: route.name === 'profile' ? profileHeaderRight : undefined,
        })}
      />
      <FloatingTabBar tabs={tabs} />
    </>
  );
}

export default function TabLayout() {
  return (
    <UnreadChatProvider>
      <TabLayoutInner />
    </UnreadChatProvider>
  );
}
