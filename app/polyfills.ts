
// CRITICAL: Load polyfills for Supabase
// This file should be imported at the top of _layout.tsx
import 'react-native-url-polyfill/auto';

// Verify polyfills loaded
if (typeof URL === 'undefined') {
  console.error('❌ CRITICAL: URL polyfill failed to load!');
} else {
  console.log('✅ URL polyfill loaded successfully');
}
