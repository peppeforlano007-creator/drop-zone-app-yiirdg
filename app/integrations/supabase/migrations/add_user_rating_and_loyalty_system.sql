
-- Add rating and loyalty fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rating_stars INTEGER DEFAULT 5 CHECK (rating_stars >= 1 AND rating_stars <= 5),
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
ADD COLUMN IF NOT EXISTS orders_picked_up INTEGER DEFAULT 0 CHECK (orders_picked_up >= 0),
ADD COLUMN IF NOT EXISTS orders_returned INTEGER DEFAULT 0 CHECK (orders_returned >= 0),
ADD COLUMN IF NOT EXISTS account_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Create coupons table for admin-managed discount coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- RLS policies for coupons
CREATE POLICY "Anyone can view active coupons" ON coupons
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage coupons" ON coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create user_coupons table to track redeemed coupons
CREATE TABLE IF NOT EXISTS user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL UNIQUE,
  discount_percentage INTEGER NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on user_coupons
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_coupons
CREATE POLICY "Users can view their own coupons" ON user_coupons
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own coupons" ON user_coupons
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all coupons" ON user_coupons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create user_activity_log table to track user engagement
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'feed_scroll', 'drop_interest', 'drop_share', 'product_booking'
  activity_data JSONB,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_activity_log
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_activity_log
CREATE POLICY "Users can view their own activity" ON user_activity_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert activity" ON user_activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all activity" ON user_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add order tracking fields to order_items
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS customer_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS returned_to_sender BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS return_reason TEXT;

-- Add payment method to bookings (COD)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cod' CHECK (payment_method IN ('cod', 'card'));

-- Update existing bookings to use COD
UPDATE bookings SET payment_method = 'cod' WHERE payment_method IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_rating_stars ON profiles(rating_stars);
CREATE INDEX IF NOT EXISTS idx_profiles_loyalty_points ON profiles(loyalty_points);
CREATE INDEX IF NOT EXISTS idx_profiles_account_blocked ON profiles(account_blocked);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_is_used ON user_coupons(is_used);

-- Create function to update user rating based on order history
CREATE OR REPLACE FUNCTION update_user_rating(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_picked_up INTEGER;
  v_returned INTEGER;
  v_total INTEGER;
  v_new_rating INTEGER;
BEGIN
  -- Get order counts
  SELECT 
    COALESCE(orders_picked_up, 0),
    COALESCE(orders_returned, 0)
  INTO v_picked_up, v_returned
  FROM profiles
  WHERE user_id = p_user_id;

  v_total := v_picked_up + v_returned;

  -- Calculate rating (5 stars if all picked up, decrease for returns)
  IF v_total = 0 THEN
    v_new_rating := 5; -- New users start with 5 stars
  ELSIF v_returned = 0 THEN
    v_new_rating := 5; -- Perfect record
  ELSIF v_returned >= 5 THEN
    v_new_rating := 1; -- Will be blocked
  ELSE
    -- Calculate rating: 5 stars - (returns / 2) rounded down
    v_new_rating := GREATEST(1, 5 - (v_returned / 2));
  END IF;

  -- Update rating
  UPDATE profiles
  SET rating_stars = v_new_rating
  WHERE user_id = p_user_id;

  -- Block account if 5 or more returns
  IF v_returned >= 5 THEN
    UPDATE profiles
    SET 
      account_blocked = TRUE,
      blocked_at = NOW(),
      blocked_reason = 'Account bloccato per 5 o più ordini rispediti al mittente'
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to award loyalty points
CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_user_id UUID,
  p_amount_spent NUMERIC
)
RETURNS VOID AS $$
DECLARE
  v_rating INTEGER;
  v_points_to_award INTEGER;
BEGIN
  -- Get user rating
  SELECT rating_stars INTO v_rating
  FROM profiles
  WHERE user_id = p_user_id;

  -- Only award points to 5-star users
  IF v_rating = 5 THEN
    -- 1 point per euro spent
    v_points_to_award := FLOOR(p_amount_spent);
    
    -- Update loyalty points
    UPDATE profiles
    SET loyalty_points = loyalty_points + v_points_to_award
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default coupons
INSERT INTO coupons (name, description, discount_percentage, points_required) VALUES
  ('Sconto 10%', 'Riscatta 1000 punti per uno sconto del 10%', 10, 1000),
  ('Sconto 20%', 'Riscatta 2000 punti per uno sconto del 20%', 20, 2000),
  ('Sconto 30%', 'Riscatta 5000 punti per uno sconto del 30%', 30, 5000)
ON CONFLICT DO NOTHING;
