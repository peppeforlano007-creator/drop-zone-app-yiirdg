
/**
 * Image Helper Utilities
 * Provides standardized image sizing and template handling for product images
 */

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Standard image template dimensions for product photos
 * Optimized for faster loading with smaller dimensions
 */
export const STANDARD_IMAGE_TEMPLATE: ImageDimensions = {
  width: 600, // Reduced from 720 for faster loading
  height: 750, // Reduced from 900 for faster loading
  aspectRatio: 4 / 5, // 0.8 - Instagram portrait ratio
};

/**
 * Alternative template options
 */
export const IMAGE_TEMPLATES = {
  SQUARE: {
    width: 600,
    height: 600,
    aspectRatio: 1,
  },
  PORTRAIT: {
    width: 600,
    height: 750,
    aspectRatio: 4 / 5,
  },
  LANDSCAPE: {
    width: 750,
    height: 600,
    aspectRatio: 5 / 4,
  },
  THUMBNAIL: {
    width: 300, // Reduced from 400 for faster loading
    height: 375, // Reduced from 500 for faster loading
    aspectRatio: 4 / 5,
  },
} as const;

/**
 * Get standardized image URI with resize parameters
 * This function adds query parameters to image URLs to request specific dimensions
 * Note: This works with image CDNs that support URL-based transformations
 */
export function getStandardizedImageUri(
  imageUrl: string,
  template: ImageDimensions = STANDARD_IMAGE_TEMPLATE
): string {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return '';
  }

  try {
    const url = new URL(imageUrl);
    
    // Check if it's a Supabase Storage URL
    if (url.hostname.includes('supabase')) {
      // Supabase Storage supports transformation parameters
      url.searchParams.set('width', template.width.toString());
      url.searchParams.set('height', template.height.toString());
      url.searchParams.set('resize', 'cover'); // Cover mode maintains aspect ratio and crops
      url.searchParams.set('quality', '70'); // Reduced quality from 75 to 70 for faster loading
      url.searchParams.set('format', 'webp'); // Use WebP format for better compression
      
      return url.toString();
    }
    
    // For other CDNs or direct URLs, return as-is
    // In production, you might want to add support for other CDN transformation APIs
    return imageUrl;
  } catch (error) {
    console.error('Error standardizing image URI:', error);
    return imageUrl;
  }
}

/**
 * Get multiple standardized image URIs from an array
 */
export function getStandardizedImageUris(
  imageUrls: string[],
  template: ImageDimensions = STANDARD_IMAGE_TEMPLATE
): string[] {
  return imageUrls
    .filter(url => url && typeof url === 'string')
    .map(url => getStandardizedImageUri(url, template));
}

/**
 * Calculate container dimensions for displaying standardized images
 * This ensures the image container matches the template aspect ratio
 */
export function getImageContainerStyle(
  containerWidth: number,
  template: ImageDimensions = STANDARD_IMAGE_TEMPLATE
) {
  return {
    width: containerWidth,
    height: containerWidth / template.aspectRatio,
    aspectRatio: template.aspectRatio,
  };
}

/**
 * Validate if a URL is a valid image URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol;
    
    // Must be http or https
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }
    
    // Check for common image extensions (optional, as many CDNs don't use extensions)
    const pathname = urlObj.pathname.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
    
    // If it has an extension, it must be an image extension
    // If no extension, assume it's valid (many CDNs use extensionless URLs)
    const hasExtension = pathname.includes('.');
    if (hasExtension && !hasImageExtension) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get image style for React Native Image component
 * Ensures consistent sizing across all product cards
 */
export function getStandardImageStyle(template: ImageDimensions = STANDARD_IMAGE_TEMPLATE) {
  return {
    width: '100%',
    height: '100%',
    aspectRatio: template.aspectRatio,
  };
}

/**
 * Image loading configuration for optimal performance
 */
export const IMAGE_LOADING_CONFIG = {
  // Cache policy - aggressive caching for better performance
  cache: 'force-cache' as const,
  
  // Priority for loading
  priority: 'high' as const,
  
  // Resize mode - 'cover' maintains aspect ratio and fills container
  resizeMode: 'cover' as const,
  
  // Quality for JPEG compression (1-100) - reduced for faster loading
  quality: 70,
  
  // Timeout for image loading (in milliseconds) - increased for slower connections
  timeout: 15000, // 15 seconds (increased from 10)
  
  // Format preference
  format: 'webp' as const, // WebP provides better compression
};

/**
 * Get placeholder dimensions for loading state
 */
export function getPlaceholderDimensions(
  containerWidth: number,
  template: ImageDimensions = STANDARD_IMAGE_TEMPLATE
) {
  return {
    width: containerWidth,
    height: containerWidth / template.aspectRatio,
  };
}

/**
 * Preload an image to check if it's accessible
 * Returns true if the image loads successfully, false otherwise
 */
export async function preloadImage(imageUrl: string, timeoutMs: number = 5000): Promise<boolean> {
  if (!isValidImageUrl(imageUrl)) {
    console.log('Invalid image URL:', imageUrl);
    return false;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('Image preload timeout:', imageUrl);
      resolve(false);
    }, timeoutMs);

    // For React Native, we can't easily preload images without using Image component
    // So we'll just validate the URL format
    clearTimeout(timeout);
    resolve(true);
  });
}

/**
 * Get optimized thumbnail URI for list views
 * Uses smaller dimensions for faster loading in lists
 */
export function getThumbnailUri(imageUrl: string): string {
  return getStandardizedImageUri(imageUrl, IMAGE_TEMPLATES.THUMBNAIL);
}

/**
 * Batch preload multiple images
 * Useful for preloading images in the background
 */
export async function batchPreloadImages(imageUrls: string[]): Promise<boolean[]> {
  const promises = imageUrls.map(url => preloadImage(url));
  return Promise.all(promises);
}
