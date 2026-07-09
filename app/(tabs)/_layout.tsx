
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { UnreadChatProvider, useUnreadChat } from '@/contexts/UnreadChatContext';

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
      <Stack screenOptions={{ headerShown: true }} />
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
