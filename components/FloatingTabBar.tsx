
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
import { getTabBarHeight, getFontSize, getIconSize } from '@/utils/responsiveHelpers';

export interface TabBarItem {
  route: string;
  label: string;
  iosIcon: string;
  androidIcon: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = getTabBarHeight();

export default function FloatingTabBar({
  tabs,
  containerWidth = SCREEN_WIDTH - 40,
  borderRadius = 8,
  bottomMargin = Platform.OS === 'android' ? 16 : 20,
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
      <View style={[styles.container, { width: containerWidth, borderRadius, height: TAB_BAR_HEIGHT }]}>
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
                  ios_icon_name={tab.iosIcon}
                  android_material_icon_name={tab.androidIcon as any}
                  size={getIconSize(22)}
                  color={isActive ? colors.text : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.label,
                    { 
                      color: isActive ? colors.text : colors.textSecondary,
                      fontSize: getFontSize(10),
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
    zIndex: 1000,
  },
  container: {
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      android: {
        elevation: 12,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
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
