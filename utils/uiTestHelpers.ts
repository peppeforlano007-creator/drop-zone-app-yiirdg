
/**
 * UI/UX Testing Helpers
 * 
 * This file contains utilities for testing UI/UX aspects of the app.
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';

/**
 * Get device information for testing
 */
export function getDeviceInfo() {
  const { width, height } = Dimensions.get('window');
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
  
  return {
    platform: Platform.OS,
    platformVersion: Platform.Version,
    windowWidth: width,
    windowHeight: height,
    screenWidth,
    screenHeight,
    pixelRatio: PixelRatio.get(),
    fontScale: PixelRatio.getFontScale(),
    isTablet: width >= 768,
    isSmallDevice: width < 375,
    orientation: width > height ? 'landscape' : 'portrait',
  };
}

/**
 * Check if element is within safe touch area (not in bottom 20%)
 */
export function isInSafeTouchArea(elementY: number, elementHeight: number): boolean {
  const { height } = Dimensions.get('window');
  const bottomThreshold = height * 0.8; // 80% from top
  
  const elementBottom = elementY + elementHeight;
  
  return elementBottom <= bottomThreshold;
}

/**
 * Calculate responsive font size
 */
export function getResponsiveFontSize(baseFontSize: number): number {
  const { width } = Dimensions.get('window');
  const scale = width / 375; // Base width (iPhone X)
  
  const newSize = baseFontSize * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Calculate responsive spacing
 */
export function getResponsiveSpacing(baseSpacing: number): number {
  const { width } = Dimensions.get('window');
  const scale = width / 375;
  
  return Math.round(baseSpacing * scale);
}

/**
 * Check if color has sufficient contrast
 */
export function hasGoodContrast(foreground: string, background: string): boolean {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  };

  // Calculate relative luminance
  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) return false;

  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);

  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  // WCAG AA standard requires 4.5:1 for normal text
  return ratio >= 4.5;
}

/**
 * Test touch target size (minimum 44x44 points)
 */
export function hasValidTouchTargetSize(width: number, height: number): boolean {
  const minSize = 44;
  return width >= minSize && height >= minSize;
}

/**
 * Simulate network conditions
 */
export class NetworkSimulator {
  private delays: Map<string, number> = new Map();

  /**
   * Set network delay for testing
   */
  setDelay(condition: 'fast' | 'slow' | '3g' | '4g' | 'offline') {
    const delays = {
      fast: 50,
      '4g': 200,
      '3g': 1000,
      slow: 3000,
      offline: Infinity,
    };

    this.delays.set('default', delays[condition]);
  }

  /**
   * Simulate network request with delay
   */
  async simulateRequest<T>(request: () => Promise<T>): Promise<T> {
    const delay = this.delays.get('default') || 0;
    
    if (delay === Infinity) {
      throw new Error('Network offline');
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    return request();
  }
}

export const networkSimulator = new NetworkSimulator();

/**
 * Test accessibility features
 */
export function testAccessibility(element: {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
}): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!element.accessibilityLabel) {
    issues.push('Missing accessibilityLabel');
  }

  if (!element.accessibilityRole) {
    issues.push('Missing accessibilityRole');
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Log UI metrics for analysis
 */
export function logUIMetrics(componentName: string, metrics: {
  renderTime?: number;
  interactionTime?: number;
  loadTime?: number;
}) {
  console.log(`📊 UI Metrics for ${componentName}:`, {
    ...metrics,
    timestamp: new Date().toISOString(),
    deviceInfo: getDeviceInfo(),
  });
}

/**
 * Test responsive layout
 */
export function testResponsiveLayout(breakpoints: {
  small: number;
  medium: number;
  large: number;
}): 'small' | 'medium' | 'large' {
  const { width } = Dimensions.get('window');

  if (width < breakpoints.small) return 'small';
  if (width < breakpoints.medium) return 'medium';
  return 'large';
}

/**
 * Validate image dimensions
 */
export function validateImageDimensions(
  width: number,
  height: number,
  requirements: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    aspectRatio?: number;
  }
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (requirements.minWidth && width < requirements.minWidth) {
    issues.push(`Width ${width} is less than minimum ${requirements.minWidth}`);
  }

  if (requirements.minHeight && height < requirements.minHeight) {
    issues.push(`Height ${height} is less than minimum ${requirements.minHeight}`);
  }

  if (requirements.maxWidth && width > requirements.maxWidth) {
    issues.push(`Width ${width} exceeds maximum ${requirements.maxWidth}`);
  }

  if (requirements.maxHeight && height > requirements.maxHeight) {
    issues.push(`Height ${height} exceeds maximum ${requirements.maxHeight}`);
  }

  if (requirements.aspectRatio) {
    const actualRatio = width / height;
    const tolerance = 0.1;
    if (Math.abs(actualRatio - requirements.aspectRatio) > tolerance) {
      issues.push(`Aspect ratio ${actualRatio.toFixed(2)} differs from required ${requirements.aspectRatio}`);
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
