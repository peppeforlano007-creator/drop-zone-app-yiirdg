
import React, { useEffect } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { useAuth } from '@/contexts/AuthContext';
import { UnreadChatProvider, useUnreadChat } from '@/contexts/UnreadChatContext';
import { colors } from '@/styles/commonStyles';

function TabLayoutInner() {
  const { user, isAuthenticated } = useAuth();
  const { totalUnread } = useUnreadChat();
  const pathname = usePathname();

  const TAB_ROUTES = ['/drops', '/payment-methods', '/chat', '/profile', '/notifications'];
  const isTabRoute = TAB_ROUTES.some(
    route => pathname === route || pathname.endsWith(route)
  );

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'consumer') {
      console.log('Not authenticated or not a consumer, redirecting to login');
      router.replace('/login');
    }
  }, [isAuthenticated, user]);

  const tabs: TabBarItem[] = [
    { route: '/(tabs)/drops', label: 'Drop', icon: 'flame.fill' },
    { route: '/(tabs)/payment-methods', label: 'Punti di ritiro', icon: 'storefront.fill' },
    { route: '/(tabs)/chat', label: 'Gruppi', icon: 'message.fill', androidIcon: 'chat', badge: totalUnread },
    { route: '/(tabs)/profile', label: 'Profilo', icon: 'person.fill' },
  ];

  return (
    <>
      <Stack
        screenOptions={({ route }) => ({
          headerShown: !['drops', 'profile', 'chat', 'payment-methods', 'notifications', 'index', 'my-data'].includes(route.name),
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        })}
      />
      {isTabRoute && <FloatingTabBar tabs={tabs} />}
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
