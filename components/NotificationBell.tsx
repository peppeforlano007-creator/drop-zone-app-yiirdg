import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { IconSymbol } from "@/components/IconSymbol";
import { useNotifications } from "@/contexts/NotificationContext";
import { colors } from "@/styles/commonStyles";

interface NotificationBellProps {
  size?: number;
  color?: string;
}

export function NotificationBell({ size = 24, color = colors.text }: NotificationBellProps) {
  const { isWeb, loading } = useNotifications();

  if (loading || isWeb) return null;

  const handlePress = () => {
    console.log("[NotificationBell] User tapped notification bell — navigating to preferences");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/notification-preferences");
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={handlePress}
      accessibilityLabel="Preferenze notifiche"
      accessibilityRole="button"
    >
      <View style={styles.iconContainer}>
        <IconSymbol
          ios_icon_name="bell.fill"
          android_material_icon_name="notifications"
          size={size}
          color={color}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  iconContainer: {
    position: "relative",
  },
});

export default NotificationBell;
