
// This file provides necessary polyfills for React Native environment
// It must be imported FIRST before any other code

// URL polyfill for @supabase/supabase-js
// This MUST be imported before any code that uses URL or Supabase
import 'react-native-url-polyfill/auto';

// Additional polyfills for web APIs that might be needed
if (typeof global !== 'undefined') {
  // Ensure global.URL is set
  if (typeof global.URL === 'undefined' && typeof URL !== 'undefined') {
    global.URL = URL;
  }
  
  // Ensure global.URLSearchParams is set
  if (typeof global.URLSearchParams === 'undefined' && typeof URLSearchParams !== 'undefined') {
    global.URLSearchParams = URLSearchParams;
  }
}

// Verify that URL is now available globally
if (typeof URL === 'undefined') {
  console.error('❌ CRITICAL: URL polyfill failed to load!');
  console.error('This will cause Supabase initialization to fail.');
  throw new Error('URL polyfill failed to load. Supabase will not work.');
}

// Verify URLSearchParams is available
if (typeof URLSearchParams === 'undefined') {
  console.error('❌ WARNING: URLSearchParams is not available');
}

// Log to confirm polyfills are loaded
console.log('✅ Polyfills loaded successfully');
console.log('✅ URL is available:', typeof URL !== 'undefined');
console.log('✅ URLSearchParams is available:', typeof URLSearchParams !== 'undefined');
console.log('✅ global.URL is available:', typeof global?.URL !== 'undefined');

// Export empty object to make this a valid module
export {};
