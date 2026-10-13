
# Phone Authentication Database Error Fix

## Problem

When users tried to register with phone-only authentication, they encountered the error:

```
database error saving new user
error sending OTP: AuthApiError: database error saving new user
```

The detailed error from Supabase logs was:

```
ERROR: null value in column "email" of relation "profiles" violates not-null constraint (SQLSTATE 23502)
```

## Root Cause

The issue occurred because:

1. **Phone-Only Authentication**: When using `supabase.auth.signInWithOtp()` with a phone number, Supabase creates a user in `auth.users` with **only a phone number** and **NO email**.

2. **NOT NULL Constraint**: The `profiles` table had a `NOT NULL` constraint on the `email` column.

3. **Trigger Failure**: When the database trigger (`handle_new_user` or `handle_phone_user_creation`) tried to create a profile for the new user, it attempted to insert a NULL email value, which violated the constraint and caused the transaction to fail.

## Solution

### 1. Made Email Column Nullable

Applied migration to make the `email` column nullable in the `profiles` table:

```sql
-- Make email column nullable to support phone-only authentication
ALTER TABLE public.profiles 
ALTER COLUMN email DROP NOT NULL;

-- Add check constraint to ensure at least one of email or phone is present
ALTER TABLE public.profiles 
ADD CONSTRAINT email_or_phone_required 
CHECK (email IS NOT NULL OR phone IS NOT NULL);
```

### 2. Updated Trigger Functions

Updated both `handle_new_user()` and `handle_phone_user_creation()` functions to:

- Properly handle NULL email values for phone-only authentication
- Extract phone number from both `auth.users.phone` and metadata
- Pass phone number correctly to the profile creation
- Include better error logging

Key changes:

```sql
-- Get phone from auth.users.phone or metadata
v_phone := COALESCE(new.phone, new.raw_user_meta_data->>'phone');

-- Insert profile with nullable email
INSERT INTO public.profiles (user_id, email, full_name, phone, role, pickup_point_id)
VALUES (
  new.id,
  new.email, -- Can be NULL for phone-only auth
  new.raw_user_meta_data->>'full_name',
  v_phone,
  v_role,
  v_pickup_point_id
);
```

### 3. Updated Registration Code

Modified `app/register/consumer.tsx` to:

- Include phone number in the metadata when calling `updateUser()`
- Provide better error messages for profile creation failures
- Handle edge cases where profile creation might fail

```typescript
const { error: updateError } = await supabase.auth.updateUser({
  password: password,
  data: {
    full_name: fullName.trim(),
    role: 'consumer',
    pickup_point_id: pickupPointId,
    phone: phone.trim(), // Include phone in metadata for the trigger
  }
});
```

## Testing

To test the fix:

1. **Register a New User**:
   - Go to the registration screen
   - Fill in all required fields (name, phone, password, pickup point)
   - Accept terms and privacy policy
   - Click "Invia Codice di Verifica"
   - Enter the OTP code received via SMS
   - Click "Completa Registrazione"

2. **Verify Profile Creation**:
   ```sql
   -- Check that profile was created with NULL email
   SELECT user_id, email, phone, full_name, role, pickup_point_id
   FROM profiles
   WHERE phone = '+39 YOUR_PHONE_NUMBER';
   ```

3. **Login with Phone and Password**:
   - Go to login screen
   - Enter phone number and password
   - Verify successful login

## Database Schema Changes

### Before
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  user_id uuid UNIQUE REFERENCES auth.users,
  email text NOT NULL,  -- ❌ NOT NULL constraint
  phone text,
  ...
);
```

### After
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  user_id uuid UNIQUE REFERENCES auth.users,
  email text,  -- ✅ Nullable for phone-only auth
  phone text,
  ...
  CONSTRAINT email_or_phone_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
```

## Benefits

1. **Phone-Only Authentication**: Users can now register and use the app with just a phone number, no email required
2. **Flexible Authentication**: System supports both email-based and phone-based authentication
3. **Data Integrity**: Check constraint ensures at least one contact method (email or phone) is always present
4. **Better Error Handling**: Improved error messages help diagnose issues during registration

## Related Files

- `app/register/consumer.tsx` - Registration screen
- `app/login.tsx` - Login screen
- Database triggers: `handle_new_user()`, `handle_phone_user_creation()`
- Migration: `make_profiles_email_nullable`
- Migration: `fix_phone_auth_trigger_functions`

## Notes

- The `email` column is now nullable, but the check constraint ensures data integrity
- Phone numbers are stored in both `auth.users.phone` and `profiles.phone` for consistency
- The system still supports email-based authentication for backward compatibility
- All existing users with email addresses are unaffected by this change
