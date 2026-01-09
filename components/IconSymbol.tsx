
// This file is a fallback for using MaterialIcons on Android and web.

import React from "react";
import { SymbolWeight } from "expo-symbols";
import {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
  ViewStyle,
  Platform,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Fallback icon if the requested icon is not found
const FALLBACK_ICON = "help-outline";

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  ios_icon_name = undefined,
  android_material_icon_name,
  size = 24,
  color,
  style,
  weight,
}: {
  ios_icon_name?: string | undefined;
  android_material_icon_name: keyof typeof MaterialIcons.glyphMap;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  // Verify that the icon exists in MaterialIcons glyphMap
  const iconExists = android_material_icon_name && MaterialIcons.glyphMap[android_material_icon_name];
  const iconName = iconExists 
    ? android_material_icon_name 
    : (FALLBACK_ICON as keyof typeof MaterialIcons.glyphMap);

  // Log warning in development mode
  if (__DEV__ && !iconExists) {
    console.warn(
      `⚠️ IconSymbol: Icon "${android_material_icon_name}" not found in MaterialIcons.`,
      `\nUsing fallback icon "${FALLBACK_ICON}".`,
      `\nValid icon names: home, person, settings, delete, notifications, search, menu, close, favorite, etc.`,
      `\nSee: https://fonts.google.com/icons for valid Material Icons names.`
    );
  }

  return (
    <MaterialIcons
      color={color}
      size={size}
      name={iconName}
      style={style as StyleProp<TextStyle>}
    />
  );
}
