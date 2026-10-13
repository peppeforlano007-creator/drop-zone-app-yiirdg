
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { isValidImageUrl } from '@/utils/imageHelpers';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  showPlaceholder?: boolean;
}

export default function CachedImage({ uri, showPlaceholder = true, style, ...props }: CachedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [validUri, setValidUri] = useState<string | null>(null);

  useEffect(() => {
    // Validate URI on mount and when it changes
    if (uri && isValidImageUrl(uri)) {
      setValidUri(uri);
      setError(false);
    } else {
      console.warn('Invalid image URI provided to CachedImage:', uri);
      setValidUri(null);
      setError(true);
      setLoading(false);
    }
  }, [uri]);

  const handleLoadStart = () => {
    console.log('📸 Image loading started:', validUri);
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    console.log('✅ Image loaded successfully:', validUri);
    setLoading(false);
  };

  const handleError = (e: any) => {
    console.error('❌ Image load error:', validUri, e.nativeEvent?.error);
    setError(true);
    setLoading(false);
  };

  // If no valid URI, show error placeholder immediately
  if (!validUri) {
    return (
      <View style={[styles.container, style]}>
        {showPlaceholder && (
          <View style={styles.placeholder}>
            <IconSymbol 
              ios_icon_name="photo" 
              android_material_icon_name="broken-image" 
              size={48} 
              color={colors.textTertiary} 
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        {...props}
        source={{ uri: validUri }}
        cachePolicy="memory-disk"
        priority="high"
        style={[styles.image, style]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        contentFit={(props as any).resizeMode || 'cover'}
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
            android_material_icon_name="broken-image" 
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
