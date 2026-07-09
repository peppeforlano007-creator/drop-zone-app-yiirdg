
import { IconSymbol } from '@/components/IconSymbol';
import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { BlurView } from 'expo-blur';

export interface TabBarItem {
  route: string;
  label: string;
  icon: string;
  androidIcon?: string;
  badge?: number;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mapping for SF Symbols to Material Icons
const iconMapping: Record<string, string> = {
  'star.fill': 'star',
  'flame.fill': 'local-fire-department',
  'location.fill': 'location_on',
  'person.fill': 'person',
  'creditcard.fill': 'credit_card',
  'storefront.fill': 'store',
};

export default function FloatingTabBar({
  tabs,
  containerWidth = SCREEN_WIDTH - 40,
  borderRadius = 28,
  bottomMargin = 20,
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const animatedIndex = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'web' ? 0 : insets.bottom;

  const handleTabPress = (route: string, index: number) => {
    console.log('FloatingTabBar: Tab pressed:', route);
    animatedIndex.value = withSpring(index, {
      damping: 15,
      stiffness: 150,
    });
    router.push(route as any);
  };

  const currentIndex = tabs.findIndex((tab) => {
    if (pathname === '/' || pathname === '/(tabs)') {
      return tab.route === '/(tabs)/drops';
    }
    return pathname.includes(tab.route);
  });

  React.useEffect(() => {
    if (currentIndex !== -1) {
      animatedIndex.value = withSpring(currentIndex, {
        damping: 15,
        stiffness: 150,
      });
    }
  }, [currentIndex, animatedIndex]);

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = containerWidth / tabs.length;
    return {
      transform: [
        {
          translateX: interpolate(
            animatedIndex.value,
            tabs.map((_, i) => i),
            tabs.map((_, i) => i * tabWidth)
          ),
        },
      ],
      width: tabWidth,
    };
  });

  return (
    <View
      style={[
        styles.safeArea,
        { paddingBottom: bottomInset + bottomMargin },
      ]}
    >
      <View style={[styles.container, { width: containerWidth, borderRadius }]}>
        <Animated.View style={[styles.indicator, indicatorStyle, { borderRadius: borderRadius - 4 }]} />
        <View style={styles.tabsContainer}>
          {tabs.map((tab, index) => {
            const isActive = currentIndex === index;
            const androidIconName = tab.androidIcon || iconMapping[tab.icon] || tab.icon;
            
            const badgeCount = tab.badge ?? 0;
            const badgeLabel = badgeCount > 99 ? '99+' : String(badgeCount);
            const showBadge = badgeCount > 0;

            return (
              <TouchableOpacity
                key={tab.route}
                style={styles.tab}
                onPress={() => handleTabPress(tab.route, index)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <IconSymbol
                    ios_icon_name={tab.icon}
                    android_material_icon_name={androidIconName}
                    size={26}
                    color={isActive ? colors.text : colors.textSecondary}
                  />
                  {showBadge && (
                    <View style={[styles.badge, badgeLabel.length > 2 && styles.badgeWide]}>
                      <Text style={styles.badgeText}>{badgeLabel}</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    { 
                      color: isActive ? colors.text : colors.textSecondary,
                      fontWeight: isActive ? '700' : '600',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  container: {
    overflow: 'hidden',
    backgroundColor: Platform.select({
      ios: 'rgba(255, 255, 255, 0.95)',
      android: colors.card,
      default: colors.card,
    }),
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  indicator: {
    position: 'absolute',
    height: '100%',
    backgroundColor: colors.backgroundSecondary,
    margin: 4,
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeWide: {
    minWidth: 22,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'System',
    lineHeight: 12,
  },
});
