
# Fix: "Error loading variants: message: Bad Request"

## Problem

When importing a supplier list with many products and then viewing the list details, users encountered the error:
```
Error loading variants: message: Bad Request
```

## Root Cause

The error occurred because the variant loading query was using `.in('product_id', productIds)` with a large array of product IDs. When there are many products (e.g., 1000+), the URL length exceeds the maximum allowed by the server (typically ~2048 characters for GET requests), resulting in a "Bad Request" (HTTP 400) error.

## Solution

Implemented **batch loading** for product variants to split large queries into smaller chunks:

### Changes Made

#### 1. `app/admin/list-details.tsx`
- **Before**: Single query loading all variants at once
- **After**: Batch loading with configurable batch size (50 products per batch)

```typescript
// BATCH SIZE: Split into smaller chunks to avoid "Bad Request" error
const BATCH_SIZE = 50; // Reduced from 100 to be safer
const allVariants: ProductVariant[] = [];

for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
  const batch = productIds.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(productIds.length / BATCH_SIZE);
  
  console.log(`→ Loading variant batch ${batchNum}/${totalBatches} (${batch.length} products)`);
  
  try {
    const { data: variantsData, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .in('product_id', batch)
      .order('size', { ascending: true });

    if (variantsError) {
      console.error(`Error loading variant batch ${batchNum}:`, variantsError);
      // Continue with other batches instead of failing completely
      continue;
    }

    if (variantsData) {
      allVariants.push(...variantsData);
      console.log(`✓ Batch ${batchNum}/${totalBatches} loaded: ${variantsData.length} variants`);
    }
  } catch (batchError) {
    console.error(`Exception loading variant batch ${batchNum}:`, batchError);
    // Continue with other batches
    continue;
  }
}
```

### Key Features

1. **Batch Processing**: Splits product IDs into chunks of 50
2. **Error Resilience**: If one batch fails, others continue processing
3. **Progress Logging**: Detailed console logs for debugging
4. **Graceful Degradation**: Products display even if variant loading partially fails

### Batch Size Selection

- **50 products per batch**: Conservative size to ensure URL stays well under limits
- Each product ID is a UUID (36 characters)
- 50 UUIDs ≈ 1800 characters (well under 2048 limit)
- Leaves room for other query parameters

## Testing

To verify the fix:

1. Import a large supplier list (1000+ products)
2. Navigate to "Visualizza Articoli" for that list
3. Variants should load successfully in batches
4. Check console logs for batch loading progress

## Related Files

- `app/admin/list-details.tsx` - Fixed variant loading
- `app/(tabs)/(home)/index.tsx` - Already had batch loading implemented
- `app/admin/create-list.tsx` - Product/variant import logic

## Performance Impact

- **Before**: Single query, fails with many products
- **After**: Multiple smaller queries, succeeds with any number of products
- **Trade-off**: Slightly slower for large lists, but reliable

## Future Improvements

Consider implementing:
1. Parallel batch loading (Promise.all with batches)
2. Caching variant data
3. Pagination for very large lists
4. Server-side aggregation endpoint

## Related Issues

This fix also addresses:
- "Could not find product ID for SKU" errors (fixed in create-list.tsx)
- Variant deduplication during import
- SKU-based product grouping

## Summary

The "Bad Request" error when loading variants has been fixed by implementing batch loading with a conservative batch size of 50 products. This ensures the URL length stays within server limits while maintaining reliability and providing detailed logging for debugging.
