
import React from 'react';
import { Stack } from 'expo-router';

export default function PickupPointLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="register" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="orders" />
    </Stack>
  );
}
