
// This file provides necessary polyfills for React Native environment
// It must be imported before any code that uses URL or other web APIs

// URL polyfill for @supabase/supabase-js
// Using /auto to automatically polyfill global URL
import 'react-native-url-polyfill/auto';

// Log to confirm polyfills are loaded
console.log('✅ Polyfills loaded successfully');

// Export empty object to make this a valid module
export {};
