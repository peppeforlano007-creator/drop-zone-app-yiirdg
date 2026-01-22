
import { IconSymbol } from '@/components/IconSymbol';
import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { colors } from '@/styles/commonStyles';

export interface TabBarItem {
  route: string;
  label: string;
  icon: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FloatingTabBar({
  tabs,
  containerWidth = SCREEN_WIDTH - 40,
  borderRadius = 8,
  bottomMargin = 20,
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const animatedIndex = useSharedValue(0);

  const handleTabPress = (route: string, index: number) => {
    animatedIndex.value = withSpring(index, {
      damping: 15,
      stiffness: 150,
    });
    router.push(route as any);
  };

  const currentIndex = tabs.findIndex((tab) => {
    if (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/(home)') {
      return tab.route === '/(tabs)/(home)';
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
    <SafeAreaView
      edges={['bottom']}
      style={[styles.safeArea, { marginBottom: bottomMargin }]}
    >
      <View style={[styles.container, { width: containerWidth, borderRadius }]}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />
        <View style={styles.tabsContainer}>
          {tabs.map((tab, index) => {
            const isActive = currentIndex === index;
            return (
              <TouchableOpacity
                key={tab.route}
                style={styles.tab}
                onPress={() => handleTabPress(tab.route, index)}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name={tab.icon as any}
                  size={22}
                  color={isActive ? colors.text : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.label,
                    { color: isActive ? colors.text : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  indicator: {
    position: 'absolute',
    height: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
});
