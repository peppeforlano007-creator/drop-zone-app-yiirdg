
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface StyledBackButtonProps {
  onPress?: () => void;
  color?: string;
  backgroundColor?: string;
  size?: number;
}

export default function StyledBackButton({ 
  onPress, 
  color = '#FFF', 
  backgroundColor = 'rgba(0, 0, 0, 0.5)',
  size = 40 
}: StyledBackButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Pressable
      style={[
        styles.backButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
      onPress={handlePress}
    >
      <IconSymbol 
        ios_icon_name="chevron.left" 
        android_material_icon_name="arrow_back" 
        size={size * 0.6} 
        color={color} 
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
