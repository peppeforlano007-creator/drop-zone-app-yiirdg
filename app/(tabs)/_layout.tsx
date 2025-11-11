
import React from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      route: '/(tabs)/(home)',
      label: 'Feed',
      icon: 'house.fill',
    },
    {
      route: '/(tabs)/drops',
      label: 'Drop',
      icon: 'flame.fill',
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
