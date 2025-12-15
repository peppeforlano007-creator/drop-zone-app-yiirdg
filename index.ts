
// CRITICAL: Load polyfills FIRST before anything else
// This must be a synchronous import to ensure URL is available
import './app/polyfills';

// Now we can safely import expo-router
import 'expo-router/entry';
