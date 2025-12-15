
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Use turborepo to restore the cache when possible
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
];

// Configure resolver to handle platform-specific modules
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Exclude Stripe from web builds
    if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
      return {
        type: 'empty',
      };
    }

    // Use default resolution for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

// CRITICAL: Ensure polyfills are loaded BEFORE the main module
// This is the key to fixing the Supabase initialization error
config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => {
    // Load the polyfill file before any other code runs
    // This ensures URL is available when @supabase/supabase-js is imported
    const polyfillPath = path.resolve(__dirname, 'app/polyfills.ts');
    console.log('📦 Metro: Loading polyfills from:', polyfillPath);
    return [polyfillPath];
  },
};

module.exports = config;
