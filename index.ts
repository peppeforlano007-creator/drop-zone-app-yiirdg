
// CRITICAL: Load polyfills FIRST before anything else
// This must be the very first import to ensure URL is available
import 'react-native-url-polyfill/auto';

// Verify polyfills loaded
if (typeof URL === 'undefined') {
  throw new Error('❌ CRITICAL: URL polyfill failed to load in index.ts!');
}

console.log('✅ [index.ts] URL polyfill loaded successfully');

// Now load Expo Router entry point
import 'expo-router/entry';
