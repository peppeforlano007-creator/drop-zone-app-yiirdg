
import React, { useState, useEffect } from 'react';
import { Image, ImageProps, View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { useImageCache } from '@/hooks/useImageCache';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  showPlaceholder?: boolean;
}

export default function CachedImage({ uri, showPlaceholder = true, style, ...props }: CachedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUri, setImageUri] = useState<string>(uri);
  const { getCachedImage, cacheImage } = useImageCache();

  useEffect(() => {
    loadImage();
  }, [uri]);

  const loadImage = async () => {
    try {
      setLoading(true);
      setError(false);

      // Check cache first
      const cachedUri = await getCachedImage(uri);
      if (cachedUri) {
        setImageUri(cachedUri);
        setLoading(false);
        return;
      }

      // Use original URI and cache it
      setImageUri(uri);
      await cacheImage(uri);
    } catch (err) {
      console.error('Error loading image:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    console.error('Image load error:', uri);
    setError(true);
    setLoading(false);
  };

  return (
    <View style={[styles.container, style]}>
      <Image
        {...props}
        source={{ uri: imageUri }}
        style={[styles.image, style]}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
      
      {loading && showPlaceholder && (
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
