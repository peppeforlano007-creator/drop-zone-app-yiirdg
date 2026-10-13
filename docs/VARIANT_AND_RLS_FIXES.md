
# Variant Loading and RLS Policy Fixes

## Issues Resolved

### 1. "Error loading variant" in Feed
**Problem:** The feed was failing to load variants properly, causing errors when displaying products.

**Solution:**
- Added proper error handling in variant loading to prevent complete failure
- Added null checks and validation for variant data
- Ensured variants are loaded in batches along with products
- Created a proper mapping of variants to products using `variantsMap`

**Changes Made:**
- `app/(tabs)/(home)/index.tsx`: Enhanced variant loading with better error handling
- Added validation for variant data before processing
- Ensured empty array fallback if variants fail to load

### 2. RLS Policy Violation for supplier_lists
**Problem:** When an admin tried to create a supplier list, they received:
```
Errore impossibile creare la lista: new row violates row-level security policy for table "supplier_lists"
```

**Root Cause:** The existing RLS policy only allowed suppliers to insert lists where `supplier_id = auth.uid()`. When an admin created a list for a supplier, the admin's ID didn't match the supplier's ID.

**Solution:**
- Created a separate RLS policy for admins to insert supplier lists
- Admins can now create lists for any supplier
- Suppliers can still only create their own lists

**Migration Applied:**
```sql
-- Allow suppliers to insert their own lists
CREATE POLICY "Suppliers can insert their own lists"
ON supplier_lists
FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) = supplier_id
);

-- Allow admins to insert lists for any supplier
CREATE POLICY "Admins can insert supplier lists"
ON supplier_lists
FOR INSERT
WITH CHECK (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);
```

### 3. SKU-Based Variant Aggregation in Feeds
**Problem:** Products with the same SKU were not being properly aggregated and displayed as a single card with variant options.

**Solution:**
- Enhanced the feed loading logic to group products by SKU
- Products with the same SKU are now aggregated into a single product with multiple variants
- Variant selection UI (size/color pickers) is displayed when variants are available
- Stock is tracked per variant

**Implementation Details:**

#### Feed Loading (index.tsx)
1. Load all products with stock > 0
2. Load all variants for those products
3. Group products by SKU:
   - Products with same SKU → Single product card with variants
   - Products without SKU → Individual product cards
4. Aggregate stock, sizes, and colors from all variants
5. Display single card per SKU with variant selection

#### Drop Details (drop-details.tsx)
- Added variant loading for drop products
- Pass variants to EnhancedProductCard
- Variants are properly mapped with size, color, and stock information

#### Product Cards (EnhancedProductCard.tsx & ProductCard.tsx)
- Display variant selection UI when `hasVariants` is true
- Show available sizes and colors from variants
- Track selected variant and display its stock
- Pass `variant_id` to booking function when variant is selected

## Database Schema

### Products Table
- `sku` column: Groups products as variants of the same article
- Products with same SKU are treated as variants

### Product Variants Table
- `product_id`: Links to parent product
- `size`: Variant size (e.g., S, M, L, XL)
- `color`: Variant color
- `stock`: Individual stock per variant
- `status`: active/inactive/sold_out

### Indexes Added
```sql
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_stock ON product_variants(stock) WHERE stock > 0;
CREATE INDEX idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
```

## Excel Import Process

When importing products via Excel:

1. **Products with SKU:**
   - Grouped by SKU code
   - First product becomes the "parent"
   - Other products with same SKU become variants
   - Variants are stored in `product_variants` table
   - Total stock is sum of all variant stocks

2. **Products without SKU:**
   - Treated as standalone products
   - No variants created

3. **Variant Fields:**
   - `taglia` (size) column → variant size
   - `colore` (color) column → variant color
   - `stock` column → variant stock

## User Experience

### Feed Display
- Single card per SKU showing the product
- Size and color selectors visible when variants exist
- Stock display updates based on selected variant
- "X disponibili" shows stock for selected variant

### Booking Process
1. User selects size/color (if variants exist)
2. System validates variant availability
3. Booking includes `variant_id`
4. Variant stock is decremented (not product stock)
5. Product removed from feed when all variants are sold out

## Testing Checklist

- [x] Admin can create supplier lists
- [x] Suppliers can create their own lists
- [x] Feed loads without "error loading variant"
- [x] Products with same SKU show as single card
- [x] Variant selection UI displays correctly
- [x] Stock updates per variant
- [x] Booking works with variant selection
- [x] Drop details loads variants properly

## Performance Optimizations

1. **Batch Loading:** Products and variants loaded in batches of 1000
2. **Indexed Queries:** Added indexes on frequently queried columns
3. **Efficient Grouping:** SKU grouping done in-memory after loading
4. **Lazy Loading:** Variants only loaded when products exist

## Error Handling

- Graceful fallback if variants fail to load
- Validation of variant data before processing
- User-friendly error messages
- Console logging for debugging

## Future Improvements

1. Add variant images (different image per color)
2. Implement variant-specific pricing
3. Add bulk variant management in admin
4. Support for more variant types (material, pattern, etc.)
