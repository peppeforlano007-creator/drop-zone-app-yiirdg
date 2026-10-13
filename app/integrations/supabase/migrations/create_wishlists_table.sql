-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id, drop_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_drop_id ON wishlists(drop_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_created_at ON wishlists(created_at DESC);

-- Enable Row Level Security
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own wishlist items
CREATE POLICY "Users can view their own wishlist items"
  ON wishlists
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add items to their own wishlist
CREATE POLICY "Users can add items to their own wishlist"
  ON wishlists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove items from their own wishlist
CREATE POLICY "Users can remove items from their own wishlist"
  ON wishlists
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all wishlist items
CREATE POLICY "Admins can view all wishlist items"
  ON wishlists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
