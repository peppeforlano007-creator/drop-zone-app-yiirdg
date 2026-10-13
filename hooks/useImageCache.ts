
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry {
  uri: string;
  timestamp: number;
}

const CACHE_PREFIX = '@image_cache_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useImageCache() {
  const [cacheReady, setCacheReady] = useState(false);

  useEffect(() => {
    cleanExpiredCache();
  }, []);

  const cleanExpiredCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      const now = Date.now();

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const entry: CacheEntry = JSON.parse(value);
          if (now - entry.timestamp > CACHE_EXPIRY) {
            await AsyncStorage.removeItem(key);
            console.log('Removed expired cache:', key);
          }
        }
      }
      setCacheReady(true);
    } catch (error) {
      console.error('Error cleaning cache:', error);
      setCacheReady(true);
    }
  };

  const getCachedImage = async (uri: string): Promise<string | null> => {
    try {
      const key = CACHE_PREFIX + uri;
      const value = await AsyncStorage.getItem(key);
      if (value) {
        const entry: CacheEntry = JSON.parse(value);
        const now = Date.now();
        if (now - entry.timestamp < CACHE_EXPIRY) {
          return entry.uri;
        } else {
          await AsyncStorage.removeItem(key);
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached image:', error);
      return null;
    }
  };

  const cacheImage = async (uri: string): Promise<void> => {
    try {
      const key = CACHE_PREFIX + uri;
      const entry: CacheEntry = {
        uri,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(entry));
      console.log('Cached image:', uri);
    } catch (error) {
      console.error('Error caching image:', error);
    }
  };

  const clearCache = async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  return {
    cacheReady,
    getCachedImage,
    cacheImage,
    clearCache,
  };
}
