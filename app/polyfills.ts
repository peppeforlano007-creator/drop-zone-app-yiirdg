
// This file MUST be loaded first via Metro's getModulesRunBeforeMainModule
// DO NOT import this file directly - let Metro handle it

// Import the URL polyfill - this adds URL and URLSearchParams to the global scope
import 'react-native-url-polyfill/auto';

// Verify polyfills loaded successfully
console.log('🔧 Polyfills module loaded');
console.log('✅ URL available:', typeof URL !== 'undefined');
console.log('✅ URLSearchParams available:', typeof URLSearchParams !== 'undefined');

// Ensure global scope has URL (for some environments)
if (typeof global !== 'undefined') {
  if (typeof global.URL === 'undefined' && typeof URL !== 'undefined') {
    global.URL = URL;
  }
  if (typeof global.URLSearchParams === 'undefined' && typeof URLSearchParams !== 'undefined') {
    global.URLSearchParams = URLSearchParams;
  }
}

export {};
