
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'consumer') {
      console.log('Not authenticated or not a consumer, redirecting to login');
      router.replace('/login');
    }
  }, [isAuthenticated, user]);

  const tabs: TabBarItem[] = [
    {
      route: '/(tabs)/(home)',
      label: 'Feed',
      iosIcon: 'house.fill',
      androidIcon: 'home',
    },
    {
      route: '/(tabs)/drops',
      label: 'Drop',
      iosIcon: 'flame.fill',
      androidIcon: 'local-fire-department',
    },
    {
      route: '/(tabs)/payment-methods',
      label: 'Pagamenti',
      iosIcon: 'creditcard.fill',
      androidIcon: 'payment',
    },
    {
      route: '/(tabs)/profile',
      label: 'Profilo',
      iosIcon: 'person.fill',
      androidIcon: 'person',
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
