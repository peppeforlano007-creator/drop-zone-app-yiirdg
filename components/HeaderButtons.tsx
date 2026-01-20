
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';

interface HeaderButtonsProps {
  onNotificationPress?: () => void;
  onLogoutPress?: () => void;
  notificationCount?: number;
}

export default function HeaderButtons({
  onNotificationPress,
  onLogoutPress,
  notificationCount = 0,
}: HeaderButtonsProps) {
  const handleNotificationPress = () => {
    console.log('User tapped notification button');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNotificationPress?.();
  };

  const handleLogoutPress = () => {
    console.log('User tapped logout button');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLogoutPress?.();
  };

  return (
    <View style={styles.container}>
      {onNotificationPress && (
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
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <View style={styles.badgeInner} />
            </View>
          )}
        </Pressable>
      )}
      
      {onLogoutPress && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    padding: 8,
    position: 'relative',
  },
  buttonPressed: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
});
