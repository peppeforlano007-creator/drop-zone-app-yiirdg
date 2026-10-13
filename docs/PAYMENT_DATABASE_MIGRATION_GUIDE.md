
# Payment Database Migration Guide

## 🚨 ISSUE

Errors when adding payment cards:
- **Error PGRST204**: "Could not find the card_brand column of payment_methods in the schema cache"
- **TypeError**: "Network request failed"

## 🔍 ROOT CAUSE

The `payment_methods` table in the Supabase database is missing required columns for storing card payment details.

## ✅ SOLUTION

### STEP 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select project: **sippdylyuzejudmzbwdn**
3. Click on **"SQL Editor"** in the sidebar

### STEP 2: Run the SQL Migration

Copy and paste this complete SQL into the editor and click **"Run"**:

```sql
-- ============================================
-- COMPLETE PAYMENT_METHODS MIGRATION
-- This migration is idempotent and can be run multiple times
-- ============================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL,
  card_last4 TEXT,
  card_brand TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add card_brand if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_brand'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_brand TEXT;
    RAISE NOTICE '✅ Added card_brand column';
  ELSE
    RAISE NOTICE '⏭️  card_brand already exists';
  END IF;
END $$;

-- Add card_last4 if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_last4'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_last4 TEXT;
    RAISE NOTICE '✅ Added card_last4 column';
  ELSE
    RAISE NOTICE '⏭️  card_last4 already exists';
  END IF;
END $$;

-- Add card_exp_month if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_exp_month'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_exp_month INTEGER;
    RAISE NOTICE '✅ Added card_exp_month column';
  ELSE
    RAISE NOTICE '⏭️  card_exp_month already exists';
  END IF;
END $$;

-- Add card_exp_year if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'card_exp_year'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_exp_year INTEGER;
    RAISE NOTICE '✅ Added card_exp_year column';
  ELSE
    RAISE NOTICE '⏭️  card_exp_year already exists';
  END IF;
END $$;

-- Add stripe_payment_method_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'stripe_payment_method_id'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN stripe_payment_method_id TEXT NOT NULL DEFAULT '';
    RAISE NOTICE '✅ Added stripe_payment_method_id column';
  ELSE
    RAISE NOTICE '⏭️  stripe_payment_method_id already exists';
  END IF;
END $$;

-- Add is_default if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN is_default BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_default column';
  ELSE
    RAISE NOTICE '⏭️  is_default already exists';
  END IF;
END $$;

-- Add status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'status'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN status TEXT DEFAULT 'active';
    RAISE NOTICE '✅ Added status column';
  ELSE
    RAISE NOTICE '⏭️  status already exists';
  END IF;
END $$;

-- Add user_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added user_id column';
  ELSE
    RAISE NOTICE '⏭️  user_id already exists';
  END IF;
END $$;

-- Add created_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE '✅ Added created_at column';
  ELSE
    RAISE NOTICE '⏭️  created_at already exists';
  END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE '✅ Added updated_at column';
  ELSE
    RAISE NOTICE '⏭️  updated_at already exists';
  END IF;
END $$;

-- Create unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_stripe_payment_method'
  ) THEN
    ALTER TABLE payment_methods 
    ADD CONSTRAINT unique_user_stripe_payment_method 
    UNIQUE (user_id, stripe_payment_method_id);
    RAISE NOTICE '✅ Added unique constraint';
  ELSE
    RAISE NOTICE '⏭️  Unique constraint already exists';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '⚠️  Could not add unique constraint (may already exist)';
END $$;

-- Create index on user_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_payment_methods_user_id'
  ) THEN
    CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
    RAISE NOTICE '✅ Added user_id index';
  ELSE
    RAISE NOTICE '⏭️  user_id index already exists';
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
    RAISE NOTICE '✅ Added status index';
  ELSE
    RAISE NOTICE '⏭️  status index already exists';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
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

-- Clean up invalid data
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

-- Final message
DO $$ 
BEGIN
  RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '📊 Verify schema with: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ''payment_methods'';';
END $$;
```

### STEP 3: Verify Schema

After running the migration, verify all columns were created:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'payment_methods'
ORDER BY ordinal_position;
```

### STEP 4: Restart Supabase Project

**IMPORTANT**: After applying the migration, restart the project to update the schema cache.

1. In Supabase dashboard, go to **Settings** → **General**
2. Scroll to **"Restart project"** section
3. Click **"Restart project"** and confirm
4. Wait 2-3 minutes for the project to fully restart

### STEP 5: Test the App

1. **Completely close the app** (don't just minimize)
2. **Reopen the app**
3. Go to **"Payment Methods"**
4. Click **"Add Payment Method"**
5. Enter test card details:
   - **Card Number**: `4242 4242 4242 4242`
   - **Cardholder Name**: `John Doe` (or any name)
   - **Expiry Date**: `12/25` (or any future date)
   - **CVC**: `123` (or any 3 digits)
6. Click **"Add Card"**

## 🔧 CODE IMPROVEMENTS

### 1. Enhanced Connection Checking

The app now verifies:
- ✅ Active internet connection
- ✅ Supabase server connection
- ✅ Correct database schema

### 2. Advanced Error Handling

- ✅ Clear error messages
- ✅ Technical details for debugging
- ✅ Suggestions for problem resolution
- ✅ Automatic PGRST204 error detection

### 3. Visual Feedback

- ✅ Connection status indicator
- ✅ "Retry" button to recheck connection
- ✅ Automatic field disabling when disconnected

## 📊 FINAL VERIFICATION

Before considering the issue resolved, verify:

- [ ] SQL migration executed without errors
- [ ] All columns present in the table
- [ ] Supabase project restarted
- [ ] App shows "Connection OK"
- [ ] Can add test card (4242 4242 4242 4242)
- [ ] Card appears in payment methods list
- [ ] Can set a card as default
- [ ] Can remove a card
- [ ] No errors in app console

## 🎉 SUCCESS!

If all checklist items are verified, the payment system is working correctly!

---

**Created**: 2024
**Last Modified**: 2024
**Version**: 2.0
