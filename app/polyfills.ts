
// This file MUST be loaded first via Metro's getModulesRunBeforeMainModule
// DO NOT import this file directly - let Metro handle it

// Import the URL polyfill synchronously - this adds URL and URLSearchParams to the global scope
import 'react-native-url-polyfill/auto';

// Verify polyfills loaded successfully
if (typeof URL === 'undefined') {
  throw new Error('❌ CRITICAL: URL polyfill failed to load!');
}

if (typeof URLSearchParams === 'undefined') {
  throw new Error('❌ CRITICAL: URLSearchParams polyfill failed to load!');
}

console.log('✅ Polyfills loaded successfully');
console.log('✅ URL available:', typeof URL !== 'undefined');
console.log('✅ URLSearchParams available:', typeof URLSearchParams !== 'undefined');

// Ensure global scope has URL (for some environments)
if (typeof global !== 'undefined') {
  if (typeof global.URL === 'undefined') {
    global.URL = URL;
  }
  if (typeof global.URLSearchParams === 'undefined') {
    global.URLSearchParams = URLSearchParams;
  }
}

// Mark polyfills as loaded
if (typeof global !== 'undefined') {
  (global as any).__POLYFILLS_LOADED__ = true;
}

export {};
