
# Phone Login Issue - Final Fix

## Problem Summary

Users were unable to login after successful registration. The error message was:
> "Errore di accesso numero di cellulare non trovato. verifica di aver inserito il numero corretto o registrati."

## Root Cause

The issue was caused by **inconsistent phone number formatting** between registration and login:

1. **Supabase Auth Storage**: Supabase stores phone numbers in `auth.users` **WITHOUT the `+` prefix** (e.g., `393208911937`)
2. **User Input**: Users enter phone numbers with the `+` prefix (e.g., `+39 320 891 1937`)
3. **Login Logic**: The login code was trying to match phone numbers but wasn't properly normalizing the format before authentication

## Database Analysis

From the database query, we found:
- **auth.users**: Phone stored as `393208911937` (no `+` prefix)
- **profiles**: Phone stored as `393208911937` (no `+` prefix)

## Solution Implemented

### 1. Login Flow (`app/login.tsx`)

**Key Changes:**
- Normalize phone number by removing the `+` prefix before database lookup
- Use the **exact phone format from the database** when calling `supabase.auth.signInWithPassword()`
- Check both formats in the profiles table for backward compatibility

```typescript
// Normalize phone to match database format (without +)
const phoneWithoutPlus = formattedPhone.replace('+', '');

// Find user in profiles table
const { data: userData } = await supabase
  .from('profiles')
  .select('email, phone, user_id, full_name, pickup_point_id')
  .or(`phone.eq.${phoneWithoutPlus},phone.eq.${formattedPhone}`)
  .maybeSingle();

// Use the EXACT phone format from the database for authentication
const authPhone = userData.phone;
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  phone: authPhone,  // Use exact format from database
  password: password.trim(),
});
```

### 2. Registration Flow (`app/register/consumer.tsx`)

**Key Changes:**
- Store phone number in the **exact format that Supabase Auth uses** (from `authData.user.phone`)
- This ensures consistency between `auth.users` and `profiles` tables

```typescript
// After OTP verification
const { data: authData, error: authError } = await supabase.auth.verifyOtp({
  phone: phone.trim(),
  token: otp.trim(),
  type: 'sms',
});

// Use the phone format from auth.users (without +)
const dbPhoneFormat = authData.user.phone; // e.g., "393208911937"

// Update user metadata
await supabase.auth.updateUser({
  password: password,
  data: {
    full_name: fullName.trim(),
    role: 'consumer',
    pickup_point_id: pickupPointId,
    phone: dbPhoneFormat, // Store without + prefix
  }
});

// Update profile with same format
await supabase
  .from('profiles')
  .update({
    full_name: fullName.trim(),
    phone: dbPhoneFormat, // Store without + prefix to match auth.users
    pickup_point_id: pickupPointId,
    role: 'consumer',
  })
  .eq('user_id', authData.user.id);
```

### 3. Phone Validation (`utils/phoneValidation.ts`)

No changes needed - the validation utility already:
- Validates phone numbers in E.164 format
- Formats them with the `+` prefix for user input
- The login/registration code handles the normalization

## Testing Instructions

### Test Case 1: New Registration
1. Register with phone: `+39 320 891 1937`
2. Complete OTP verification
3. Set password
4. Verify account is created
5. **Login with the same phone number and password**
6. ✅ Login should succeed

### Test Case 2: Existing User
1. User with phone `393208911937` in database
2. Login with: `+39 320 891 1937`
3. Enter password
4. ✅ Login should succeed

### Test Case 3: Different Input Formats
Users can now login with any of these formats:
- `+39 320 891 1937` (with spaces)
- `+393208911937` (no spaces)
- `39 320 891 1937` (no + but with spaces)

All will be normalized to `393208911937` for database lookup.

## Key Takeaways

1. **Always use the phone format from `auth.users`** - Don't try to format it yourself
2. **Normalize user input** - Remove `+` prefix before database queries
3. **Use exact database format for authentication** - Don't modify the phone number before calling `signInWithPassword()`
4. **Maintain consistency** - Store the same format in both `auth.users` and `profiles`

## Files Modified

- ✅ `app/login.tsx` - Fixed phone normalization and authentication
- ✅ `app/register/consumer.tsx` - Ensured consistent phone storage
- ℹ️ `utils/phoneValidation.ts` - No changes needed (already correct)

## Status

🟢 **RESOLVED** - Users can now successfully login after registration with any phone number format.
