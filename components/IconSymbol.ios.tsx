
import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle, OpaqueColorValue } from "react-native";

/**
 * iOS-specific IconSymbol component using native SF Symbols
 * Supports both legacy 'name' prop and cross-platform 'ios_icon_name' prop
 */
export function IconSymbol({
  name,
  ios_icon_name,
  android_material_icon_name,
  size = 24,
  color,
  style,
  weight = "regular",
}: {
  name?: SymbolViewProps["name"];
  ios_icon_name?: string;
  android_material_icon_name?: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  // Support both naming conventions - prefer ios_icon_name for cross-platform code
  const iconName = (ios_icon_name || name) as SymbolViewProps["name"];

  if (!iconName) {
    console.warn('IconSymbol: No icon name provided');
    return null;
  }

  return (
    <SymbolView
      weight={weight}
      tintColor={color as string}
      resizeMode="scaleAspectFit"
      name={iconName}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
