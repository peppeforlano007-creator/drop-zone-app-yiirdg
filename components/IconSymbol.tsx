
import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Platform } from 'react-native';
import { SymbolView, SymbolViewProps } from 'expo-symbols';

interface IconSymbolProps {
  ios_icon_name: string;
  android_material_icon_name: string;
  size?: number;
  color?: string;
  style?: any;
}

export function IconSymbol({
  ios_icon_name,
  android_material_icon_name,
  size = 24,
  color = '#000',
  style,
}: IconSymbolProps) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={ios_icon_name}
        size={size}
        tintColor={color}
        style={style}
        type="hierarchical"
        animationSpec={{
          effect: {
            type: 'bounce',
          },
        }}
      />
    );
  }

  // Android and Web use Material Icons
  return (
    <MaterialIcons
      name={android_material_icon_name as any}
      size={size}
      color={color}
      style={style}
    />
  );
}
