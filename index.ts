
// CRITICAL: Polyfills must be imported FIRST, before expo-router
// This ensures URL polyfills are available for @supabase/supabase-js
import 'react-native-url-polyfill/auto';

// Now we can safely import expo-router
import 'expo-router/entry';
