
import React, { useState } from 'react';
import { Image, ImageProps, View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  showPlaceholder?: boolean;
}

export default function CachedImage({ uri, showPlaceholder = true, style, ...props }: CachedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (e: any) => {
    console.error('Image load error:', uri, e.nativeEvent?.error);
    setError(true);
    setLoading(false);
  };

  return (
    <View style={[styles.container, style]}>
      <Image
        {...props}
        source={{ uri }}
        style={[styles.image, style]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        resizeMode={props.resizeMode || 'cover'}
      />
      
      {loading && !error && showPlaceholder && (
        <View style={styles.placeholder}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {error && showPlaceholder && (
        <View style={styles.placeholder}>
          <IconSymbol 
            ios_icon_name="photo" 
            android_material_icon_name="broken_image" 
            size={48} 
            color={colors.textTertiary} 
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: colors.backgroundSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
});
