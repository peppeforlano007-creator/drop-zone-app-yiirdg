
# SKU-Based Product Variant Aggregation Implementation

## Overview
This document describes the implementation of SKU-based product variant aggregation, allowing suppliers to import products with multiple size/color combinations that are grouped under a single SKU.

## Database Changes

### New Table: `product_variants`
```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  size TEXT,
  color TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(product_id, size, color)
);
```

### Updated Table: `bookings`
- Added `variant_id UUID` column to reference specific product variants

## Import Process

### Excel File Format
The Excel file now supports:
- **sku**: Optional field to group products as variants
- **taglia** or **taglie**: Single size or comma-separated sizes
- **colore** or **colori**: Single color or comma-separated colors
- **stock**: Required field for each variant

### Aggregation Logic
1. **Products with SKU**: Grouped together as variants
   - Same SKU → Single product card
   - Different size/color combinations → Individual variants
   - Stock tracked per variant

2. **Products without SKU**: Treated as standalone products
   - No variant grouping
   - Stock tracked at product level

### Example Import
```
SKU          | Nome         | Taglia | Colore | Stock
NIKE-AM-001  | Nike Air Max | 38     | Nero   | 5
NIKE-AM-001  | Nike Air Max | 39     | Nero   | 3
NIKE-AM-001  | Nike Air Max | 40     | Bianco | 7
```

Results in:
- 1 product card "Nike Air Max"
- 3 variants (38/Nero, 39/Nero, 40/Bianco)
- Total stock: 15 units

## UI Changes

### Product Cards
- Display single card for products with same SKU
- Show size/color selectors for products with variants
- Display availability per variant (e.g., "5 disponibili" for selected size/color)
- Disable booking if selected variant is out of stock

### Variant Selection
- Size selector: Buttons showing available sizes
- Color selector: Color circles or text labels
- Real-time stock display based on selection
- Visual feedback for selected variant

## Stock Management

### Inventory Tracking
- **With Variants**: Stock tracked in `product_variants` table
  - Each size/color combination has its own stock
  - Product-level stock is sum of all variants
  
- **Without Variants**: Stock tracked in `products` table
  - Single stock value for the entire product

### Booking Process
1. User selects size and/or color (if applicable)
2. System checks variant stock availability
3. Booking created with `variant_id` reference
4. Variant stock decremented on booking
5. Product-level stock updated automatically

### Real-time Updates
- Stock changes broadcast via Supabase Realtime
- Product cards update immediately when stock changes
- Products removed from feed when all variants are sold out

## Benefits

### For Suppliers
- Easier product management
- Single SKU for multiple variants
- Accurate inventory tracking per variant
- Simplified import process

### For Users
- Better product browsing experience
- Clear variant selection
- Accurate availability information
- Single product card instead of multiple listings

### For Platform
- Reduced database clutter
- Better data organization
- Improved performance
- Easier analytics and reporting

## Migration Notes

### Existing Products
- Products without SKU continue to work as before
- No data migration required for existing products
- New import format is backward compatible

### Future Enhancements
- Variant-specific images
- Variant-specific pricing
- Bulk variant management UI
- Advanced filtering by size/color
