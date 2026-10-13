
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

export function HeaderRightButton() {
  const handleNotificationPress = () => {
    console.log('User tapped notification button');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/notifications');
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      onPress={handleNotificationPress}
    >
      <IconSymbol
        ios_icon_name="bell.fill"
        android_material_icon_name="notifications"
        size={24}
        color={colors.text}
      />
    </Pressable>
  );
}

export function HeaderLeftButton() {
  const handleLogoutPress = () => {
    console.log('User tapped logout button');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Logout functionality would go here
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      onPress={handleLogoutPress}
    >
      <IconSymbol
        ios_icon_name="rectangle.portrait.and.arrow.right"
        android_material_icon_name="logout"
        size={24}
        color={colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
  buttonPressed: {
    opacity: 0.6,
  },
});
