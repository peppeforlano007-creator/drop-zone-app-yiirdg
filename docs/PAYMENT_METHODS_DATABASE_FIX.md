
# Payment Methods Database Fix

## Problem
The error "Could not find the card_brand column of payment_methods in the schema cache" indicates that the `payment_methods` table is missing required columns or the schema cache is out of sync.

## Solution

### Step 1: Verify Current Schema
First, check the current structure of the `payment_methods` table in your Supabase dashboard:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'payment_methods'
ORDER BY ordinal_position;
```

### Step 2: Apply Database Migration
Run the following SQL in your Supabase SQL Editor to ensure all required columns exist:

```sql
-- Ensure payment_methods table has all required columns
-- This migration is idempotent and will only add missing columns

-- Add card_brand column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_brand'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_brand TEXT;
    RAISE NOTICE 'Added card_brand column';
  ELSE
    RAISE NOTICE 'card_brand column already exists';
  END IF;
END $$;

-- Add card_last4 column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_last4'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_last4 TEXT;
    RAISE NOTICE 'Added card_last4 column';
  ELSE
    RAISE NOTICE 'card_last4 column already exists';
  END IF;
END $$;

-- Add card_exp_month column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_exp_month'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_exp_month INTEGER;
    RAISE NOTICE 'Added card_exp_month column';
  ELSE
    RAISE NOTICE 'card_exp_month column already exists';
  END IF;
END $$;

-- Add card_exp_year column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_exp_year'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_exp_year INTEGER;
    RAISE NOTICE 'Added card_exp_year column';
  ELSE
    RAISE NOTICE 'card_exp_year column already exists';
  END IF;
END $$;

-- Add stripe_payment_method_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'stripe_payment_method_id'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN stripe_payment_method_id TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added stripe_payment_method_id column';
  ELSE
    RAISE NOTICE 'stripe_payment_method_id column already exists';
  END IF;
END $$;

-- Add is_default column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN is_default BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_default column';
  ELSE
    RAISE NOTICE 'is_default column already exists';
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'status'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN status TEXT DEFAULT 'active';
    RAISE NOTICE 'Added status column';
  ELSE
    RAISE NOTICE 'status column already exists';
  END IF;
END $$;

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added user_id column';
  ELSE
    RAISE NOTICE 'user_id column already exists';
  END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added created_at column';
  ELSE
    RAISE NOTICE 'created_at column already exists';
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added updated_at column';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- Create unique constraint on user_id and stripe_payment_method_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_stripe_payment_method'
  ) THEN
    ALTER TABLE payment_methods 
    ADD CONSTRAINT unique_user_stripe_payment_method 
    UNIQUE (user_id, stripe_payment_method_id);
    RAISE NOTICE 'Added unique constraint';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END $$;

-- Create index on user_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_payment_methods_user_id'
  ) THEN
    CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
    RAISE NOTICE 'Added user_id index';
  ELSE
    RAISE NOTICE 'user_id index already exists';
  END IF;
END $$;

-- Create index on status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_payment_methods_status'
  ) THEN
    CREATE INDEX idx_payment_methods_status ON payment_methods(status);
    RAISE NOTICE 'Added status index';
  ELSE
    RAISE NOTICE 'status index already exists';
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can update their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON payment_methods;

-- Create RLS policies
CREATE POLICY "Users can view their own payment methods" 
ON payment_methods FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" 
ON payment_methods FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" 
ON payment_methods FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" 
ON payment_methods FOR DELETE 
USING (auth.uid() = user_id);
```

### Step 3: Clean Up Invalid Data
After ensuring the schema is correct, clean up any invalid payment methods:

```sql
-- Mark payment methods with missing required fields as inactive
UPDATE payment_methods
SET status = 'inactive'
WHERE 
  stripe_payment_method_id IS NULL 
  OR stripe_payment_method_id = ''
  OR card_last4 IS NULL 
  OR card_last4 = ''
  OR LENGTH(card_last4) < 4
  OR card_brand IS NULL 
  OR card_brand = ''
  OR card_exp_month IS NULL 
  OR card_exp_month < 1 
  OR card_exp_month > 12
  OR card_exp_year IS NULL;
```

### Step 4: Refresh Supabase Types
After applying the migration, regenerate your TypeScript types:

1. In Supabase Dashboard, go to Settings → API
2. Copy the TypeScript types
3. Replace the content of `app/integrations/supabase/types.ts` with the new types

Or use the Supabase CLI:
```bash
npx supabase gen types typescript --project-id sippdylyuzejudmzbwdn > app/integrations/supabase/types.ts
```

### Step 5: Test the Payment Flow
1. Clear the app cache and restart
2. Try adding a test card: 4242 4242 4242 4242
3. Check the console logs for detailed debugging information
4. Verify the card appears in the payment methods list

## Expected Table Structure
After applying the migration, your `payment_methods` table should have:

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | - |
| stripe_payment_method_id | text | NO | - |
| card_last4 | text | YES | - |
| card_brand | text | YES | - |
| card_exp_month | integer | YES | - |
| card_exp_year | integer | YES | - |
| is_default | boolean | YES | false |
| status | text | YES | 'active' |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

## Troubleshooting

### Error: "column does not exist"
- Run the migration SQL again
- Check for typos in column names
- Verify you're connected to the correct Supabase project

### Error: "PGRST204"
This error indicates a schema cache issue. Solutions:
1. Restart your Supabase project (Dashboard → Settings → General → Restart)
2. Wait a few minutes for the cache to refresh
3. Clear your app cache and restart

### Cards still not saving
1. Check the browser/app console for detailed error messages
2. Verify RLS policies are correctly set
3. Ensure the user is authenticated
4. Check that Stripe is returning card details correctly

## Code Changes Made

### Enhanced Error Handling
- Added comprehensive logging throughout the payment flow
- Better error messages with technical details
- Validation of all card data before database insertion

### Improved Data Extraction
- Multiple fallback paths for extracting card details from Stripe response
- Normalization of card data (last4, expiry dates)
- Validation of all required fields

### Better User Experience
- Clear error messages in Italian
- Detailed test card information
- Visual feedback during the process

## Next Steps
1. Apply the database migration
2. Test adding a card with the test number 4242 4242 4242 4242
3. Verify the card appears in the payment methods list
4. Check that you can set a default card
5. Test removing a card

If issues persist after following these steps, check the console logs for detailed error information and contact support with the error details.
