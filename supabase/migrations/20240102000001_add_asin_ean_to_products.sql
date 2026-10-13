-- Add asin and ean columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS asin TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ean TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_asin ON products(asin) WHERE asin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean) WHERE ean IS NOT NULL;
