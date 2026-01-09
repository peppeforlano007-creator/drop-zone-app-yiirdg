
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Clear cache directory path
const cacheDir = path.join(__dirname, 'node_modules', '.cache', 'metro');

// Use file-based cache with proper configuration
config.cacheStores = [
  new FileStore({ 
    root: cacheDir,
  }),
];

// Increase cache version to force rebuild if needed
config.cacheVersion = '1.0.1';

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
  // Add source extensions to help Metro resolve files faster
  sourceExts: [...(config.resolver?.sourceExts || []), 'jsx', 'js', 'ts', 'tsx', 'json'],
};

// Configure transformer for better performance
config.transformer = {
  ...config.transformer,
  // Reduce memory usage
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
    mangle: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
  // Enable faster transforms
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Add watchman configuration to prevent file watching issues
config.watchFolders = [__dirname];

module.exports = config;
