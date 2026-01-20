
import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ActivityIndicator, View, StyleSheet } from 'react-native';
import { useImageCache } from '@/hooks/useImageCache';
import { colors } from '@/styles/commonStyles';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
}

export default function CachedImage({ uri, style, ...props }: CachedImageProps) {
  const { getCachedImage } = useImageCache();
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        const cached = await getCachedImage(uri);
        if (mounted) {
          setCachedUri(cached);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading cached image:', err);
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [uri]);

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error || !cachedUri) {
    return (
      <View style={[styles.container, style]}>
        <Image
          source={{ uri }}
          style={style}
          {...props}
          onError={() => setError(true)}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: cachedUri }}
      style={style}
      {...props}
      onError={() => setError(true)}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
});
