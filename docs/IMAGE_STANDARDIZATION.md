
# Image Standardization Guide

## Overview

All product images in the app are now standardized to ensure consistent display across all feeds and views. This provides a uniform, professional appearance similar to platforms like Instagram.

## Standard Image Template

### Default Template: Portrait (4:5 Aspect Ratio)
- **Width**: 1080px
- **Height**: 1350px
- **Aspect Ratio**: 4:5 (0.8)
- **Example**: "Officina Artistica" product photos

This is the Instagram portrait format, which is ideal for mobile-first e-commerce applications.

### Why This Template?
- **Mobile-Optimized**: Perfect for vertical scrolling feeds
- **Professional**: Matches industry standards (Instagram, Pinterest)
- **Consistent**: All products look uniform regardless of original image dimensions
- **Space-Efficient**: Maximizes screen real estate on mobile devices

## How It Works

### 1. Image URL Transformation

When images are loaded, they are automatically processed through the `getStandardizedImageUri()` function which:

- Validates the image URL
- Adds transformation parameters for supported CDNs (e.g., Supabase Storage)
- Requests specific dimensions (1080x1350)
- Sets resize mode to "cover" (maintains aspect ratio, crops if needed)
- Optimizes quality (85% JPEG compression)

### 2. Display Standardization

All product cards use:
- **Resize Mode**: `cover` - Maintains aspect ratio and fills the container
- **Aspect Ratio**: 4:5 - Enforced in the Image component style
- **Container**: Fixed aspect ratio container to prevent layout shifts

### 3. Supported Image Sources

#### Supabase Storage (Automatic)
If your images are stored in Supabase Storage, transformation happens automatically via URL parameters:
```
https://your-project.supabase.co/storage/v1/object/public/images/product.jpg
  ?width=1080
  &height=1350
  &resize=cover
  &quality=85
```

#### Other CDNs
For other image sources, the original URL is used. Consider:
- Pre-processing images to 1080x1350 before upload
- Using a CDN that supports URL-based transformations
- Implementing server-side image processing

## Implementation Details

### Files Modified

1. **`utils/imageHelpers.ts`** (NEW)
   - Core image standardization utilities
   - Template definitions
   - URL transformation functions
   - Validation helpers

2. **`components/ProductCard.tsx`**
   - Uses standardized image URLs
   - Enforces aspect ratio in styles
   - Uses `cover` resize mode

3. **`components/EnhancedProductCard.tsx`**
   - Same standardization as ProductCard
   - Consistent display across all views

### Key Functions

#### `getStandardizedImageUri(imageUrl, template)`
Transforms a single image URL to use the standard template.

```typescript
const standardUrl = getStandardizedImageUri(
  'https://example.com/image.jpg',
  STANDARD_IMAGE_TEMPLATE
);
```

#### `getStandardizedImageUris(imageUrls, template)`
Transforms an array of image URLs.

```typescript
const standardUrls = getStandardizedImageUris(
  ['url1.jpg', 'url2.jpg'],
  STANDARD_IMAGE_TEMPLATE
);
```

#### `isValidImageUrl(url)`
Validates if a URL is a valid image URL.

```typescript
if (isValidImageUrl(imageUrl)) {
  // Process image
}
```

## Alternative Templates

The system supports multiple templates if needed:

### Square (1:1)
```typescript
import { IMAGE_TEMPLATES } from '@/utils/imageHelpers';

const squareUrl = getStandardizedImageUri(
  imageUrl,
  IMAGE_TEMPLATES.SQUARE
);
```

### Landscape (5:4)
```typescript
const landscapeUrl = getStandardizedImageUri(
  imageUrl,
  IMAGE_TEMPLATES.LANDSCAPE
);
```

## Best Practices

### For Suppliers Uploading Images

1. **Recommended Upload Size**: 1080x1350 pixels
2. **Minimum Size**: 800x1000 pixels
3. **Maximum Size**: 2160x2700 pixels (2x for retina displays)
4. **Format**: JPEG or PNG
5. **File Size**: Under 2MB per image
6. **Quality**: High quality, well-lit, clear product photos

### For Developers

1. **Always use standardized URLs**: Use `getStandardizedImageUri()` or `getStandardizedImageUris()`
2. **Validate URLs**: Use `isValidImageUrl()` before processing
3. **Handle errors**: Always provide fallback UI for failed images
4. **Test with various sources**: Test with different image sizes and aspect ratios
5. **Monitor performance**: Check image loading times and optimize if needed

## Image Upload Guidelines

When creating the image upload feature for suppliers:

1. **Client-Side Validation**
   - Check file type (JPEG, PNG, WebP)
   - Check file size (max 5MB)
   - Check dimensions (min 800x1000)

2. **Server-Side Processing**
   - Resize to 1080x1350 if larger
   - Compress to 85% quality
   - Convert to JPEG if needed
   - Generate thumbnail (270x338)

3. **Storage**
   - Store in Supabase Storage
   - Use organized folder structure: `products/{supplier_id}/{list_id}/{product_id}/`
   - Keep original if needed: `{filename}_original.jpg`
   - Store processed: `{filename}.jpg`

## Performance Considerations

### Image Loading
- **Lazy Loading**: Images load as they appear in viewport
- **Caching**: Browser/app caches standardized images
- **Progressive Loading**: Show placeholder → low-res → high-res

### Optimization
- **CDN**: Use CDN for faster global delivery
- **Compression**: 85% JPEG quality balances size and quality
- **Format**: Consider WebP for better compression (with JPEG fallback)

## Troubleshooting

### Images Not Displaying Correctly

1. **Check URL validity**: Use `isValidImageUrl()`
2. **Verify CDN support**: Ensure your CDN supports transformation parameters
3. **Check aspect ratio**: Verify container has correct aspect ratio
4. **Review console logs**: Check for image load errors

### Images Look Stretched or Cropped

1. **Verify resize mode**: Should be `cover` not `contain` or `stretch`
2. **Check aspect ratio**: Container should match template aspect ratio
3. **Review original image**: May need better source image

### Performance Issues

1. **Reduce image quality**: Lower from 85% to 75%
2. **Implement lazy loading**: Load images as needed
3. **Use thumbnails**: Show smaller images in lists, full size on detail view
4. **Enable caching**: Ensure proper cache headers

## Future Enhancements

### Planned Features

1. **Multiple Templates**: Allow suppliers to choose template per product category
2. **Smart Cropping**: AI-powered cropping to focus on product
3. **Background Removal**: Automatic background removal for clean product shots
4. **Watermarking**: Optional watermark for brand protection
5. **Image Filters**: Apply consistent color grading/filters
6. **Batch Processing**: Upload and process multiple images at once

### Advanced Features

1. **360° Views**: Support for product rotation images
2. **Video Support**: Short product videos in feed
3. **AR Preview**: Augmented reality product preview
4. **Size Comparison**: Show product with size reference

## Migration Guide

If you have existing products with non-standardized images:

### Option 1: Automatic (Recommended)
The system automatically standardizes images on display. No migration needed.

### Option 2: Batch Processing
For better performance, pre-process all existing images:

1. Create a migration script
2. Fetch all product images
3. Download, resize, and re-upload
4. Update database URLs
5. Delete old images

### Option 3: Gradual Migration
Process images as they're viewed:
1. Check if standardized version exists
2. If not, create it on-the-fly
3. Cache for future use
4. Eventually all images will be standardized

## Support

For questions or issues with image standardization:
- Check console logs for detailed error messages
- Verify image URLs are accessible
- Test with different image sources
- Review this documentation

## Summary

✅ **All product images now display with consistent 4:5 aspect ratio**
✅ **Automatic URL transformation for supported CDNs**
✅ **Optimized for mobile viewing**
✅ **Professional, uniform appearance across all feeds**
✅ **Easy to extend with alternative templates**

The standardization ensures that whether you're viewing the main feed, drops, or product details, all images maintain the same professional appearance and dimensions, just like the "Officina Artistica" example.
