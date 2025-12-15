
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

// Ensure polyfills are loaded first by configuring serializer
config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => {
    // This ensures polyfills are loaded before the main module
    return [
      require.resolve('./app/polyfills.ts'),
    ];
  },
};

module.exports = config;
