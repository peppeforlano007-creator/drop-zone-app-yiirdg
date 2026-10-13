
import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Responsive design utilities for cross-platform compatibility
 */

// Get safe screen dimensions accounting for notches and system UI
export const getScreenDimensions = () => {
  const width = SCREEN_WIDTH;
  const height = SCREEN_HEIGHT;
  
  // Account for Android status bar
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  
  return {
    width,
    height,
    statusBarHeight,
    usableHeight: height - statusBarHeight,
  };
};

// Calculate responsive size based on screen width
export const wp = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

// Calculate responsive size based on screen height
export const hp = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Get responsive font size
export const getFontSize = (size: number): number => {
  const scale = SCREEN_WIDTH / 375; // Base on iPhone X width
  const newSize = size * scale;
  return Math.round(newSize);
};

// Get platform-specific padding for safe areas
export const getSafeAreaPadding = () => {
  return {
    top: Platform.select({
      ios: 0, // SafeAreaView handles this
      android: 48, // Extra padding for Android notch/status bar
      default: 0,
    }),
    bottom: Platform.select({
      ios: 0, // SafeAreaView handles this
      android: 16, // Extra padding for Android navigation
      default: 0,
    }),
  };
};

// Get responsive spacing
export const getSpacing = (multiplier: number = 1): number => {
  const baseSpacing = 8;
  return baseSpacing * multiplier;
};

// Check if device is small (< 375px width)
export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

// Check if device is large (> 414px width)
export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH > 414;
};

// Get responsive card height for product cards
export const getProductCardHeight = (): number => {
  // Ensure product card fits within screen with space for tab bar
  const tabBarHeight = 80;
  const safeAreaBottom = Platform.OS === 'android' ? 16 : 0;
  return SCREEN_HEIGHT - tabBarHeight - safeAreaBottom;
};

// BLUE CIRCLE FIX: Reduced image height from 55% to 50% to give more space for content
export const getProductImageHeight = (): number => {
  // Image should take 50% of screen height (reduced from 55%)
  return SCREEN_HEIGHT * 0.50;
};

// BLUE CIRCLE FIX: Increased overlay height to accommodate all content
export const getProductOverlayHeight = (): number => {
  // Overlay should take remaining space with extra padding for tab bar
  const imageHeight = getProductImageHeight();
  const tabBarHeight = 80;
  const extraPadding = 20; // Extra padding to ensure button is visible
  return SCREEN_HEIGHT - imageHeight - tabBarHeight - extraPadding;
};

// Get responsive button padding
export const getButtonPadding = () => {
  return {
    vertical: isSmallDevice() ? 10 : 13,
    horizontal: isSmallDevice() ? 12 : 16,
  };
};

// Get responsive icon size
export const getIconSize = (baseSize: number): number => {
  if (isSmallDevice()) return baseSize * 0.9;
  if (isLargeDevice()) return baseSize * 1.1;
  return baseSize;
};

// Get responsive border radius
export const getBorderRadius = (baseRadius: number): number => {
  return baseRadius;
};

// Get responsive tab bar height
export const getTabBarHeight = (): number => {
  return Platform.select({
    ios: 80,
    android: 70,
    default: 80,
  });
};

// BLUE CIRCLE FIX: Increased padding to ensure content is not covered by tab bar
export const getContentPaddingBottom = (): number => {
  const tabBarHeight = getTabBarHeight();
  const extraPadding = Platform.OS === 'android' ? 30 : 20; // Increased from 20/10
  return tabBarHeight + extraPadding;
};

export default {
  getScreenDimensions,
  wp,
  hp,
  getFontSize,
  getSafeAreaPadding,
  getSpacing,
  isSmallDevice,
  isLargeDevice,
  getProductCardHeight,
  getProductImageHeight,
  getProductOverlayHeight,
  getButtonPadding,
  getIconSize,
  getBorderRadius,
  getTabBarHeight,
  getContentPaddingBottom,
};
