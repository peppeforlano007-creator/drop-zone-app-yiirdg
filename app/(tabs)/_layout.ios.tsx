import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger key="home" name="(home)">
        <Icon sf="house.fill" />
        <Label>Feed</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="drops" name="drops">
        <Icon sf="flame.fill" />
        <Label>Drop</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="payment-methods" name="payment-methods">
        <Icon sf="shippingbox.fill" />
        <Label>Ritiro</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="profile" name="profile">
        <Icon sf="person.fill" />
        <Label>Profilo</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
