
import React from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';

export interface TabBarItem {
  route: string;
  label: string;
  icon: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
}

export default function FloatingTabBar({ tabs }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const handleTabPress = (route: string) => {
    console.log('User tapped tab:', route);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  const isActive = (route: string) => {
    // Check if current path starts with the route
    return pathname.startsWith(route);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom || 16,
        },
      ]}
    >
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = isActive(tab.route);
          
          // Map icon names to Material Icons
          let materialIconName = tab.icon;
          if (tab.icon === 'house.fill') materialIconName = 'home';
          if (tab.icon === 'flame.fill') materialIconName = 'local_fire_department';
          if (tab.icon === 'person.fill') materialIconName = 'person';
          
          return (
            <Pressable
              key={tab.route}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.tabPressed,
              ]}
              onPress={() => handleTabPress(tab.route)}
            >
              <View style={[styles.iconContainer, active && styles.iconContainerActive]}>
                <IconSymbol
                  ios_icon_name={tab.icon}
                  android_material_icon_name={materialIconName}
                  size={24}
                  color={active ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  active && styles.labelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  tabPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  iconContainer: {
    marginBottom: 4,
  },
  iconContainerActive: {
    // Active state styling handled by icon color
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
