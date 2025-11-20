
# Email Links Fix Implementation

## Overview
This document explains the implementation of email confirmation and password reset link fixes for the DropMarket app.

## Issues Addressed

### 1. Email Confirmation Links
**Problem:** Email confirmation links were not working, showing "Safari cannot connect to server" error.

**Solution:**
- All email confirmation links now use the redirect URL: `https://natively.dev/email-confirmed`
- This URL is configured in Supabase Auth settings
- The app handles the redirect and automatically logs in the user after email confirmation

**Implementation:**
```typescript
// In registration
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://natively.dev/email-confirmed'
  }
});

// In resend confirmation
await supabase.auth.resend({
  type: 'signup',
  email: email,
  options: {
    emailRedirectTo: 'https://natively.dev/email-confirmed'
  }
});
```

### 2. Password Reset Links
**Problem:** Password reset links were not working, showing "Safari cannot connect to server" error.

**Solution:**
- All password reset links now use the redirect URL: `https://natively.dev/update-password`
- The app validates the session and allows users to set a new password
- After password update, users are automatically logged out and redirected to login

**Implementation:**
```typescript
// In forgot password
await supabase.auth.resetPasswordForEmail(
  email,
  {
    redirectTo: 'https://natively.dev/update-password',
  }
);
```

## Supabase Configuration Required

### Email Templates
The following redirect URLs must be configured in your Supabase project:

1. **Email Confirmation:**
   - Redirect URL: `https://natively.dev/email-confirmed`
   - Template: Confirmation email template

2. **Password Reset:**
   - Redirect URL: `https://natively.dev/update-password`
   - Template: Password reset email template

### Steps to Configure in Supabase Dashboard:

1. Go to Authentication → Email Templates
2. For "Confirm signup" template:
   - Ensure the confirmation link uses: `{{ .ConfirmationURL }}`
   - The app will handle the redirect to `https://natively.dev/email-confirmed`

3. For "Reset password" template:
   - Ensure the reset link uses: `{{ .ConfirmationURL }}`
   - The app will handle the redirect to `https://natively.dev/update-password`

4. Go to Authentication → URL Configuration
   - Add `https://natively.dev/*` to the list of allowed redirect URLs

## User Flow

### Email Confirmation Flow:
1. User registers → Email sent with confirmation link
2. User clicks link → Redirected to `https://natively.dev/email-confirmed`
3. App validates the session → User is logged in automatically
4. User is redirected to their dashboard based on role

### Password Reset Flow:
1. User requests password reset → Email sent with reset link
2. User clicks link → Redirected to `https://natively.dev/update-password`
3. App validates the session → User can set new password
4. After password update → User is logged out and redirected to login
5. User logs in with new password

## Error Handling

### Email Confirmation Errors:
- **Email not confirmed:** Shows user-friendly message with option to resend
- **Invalid/expired link:** Redirects to login with error message
- **Network errors:** Shows retry option

### Password Reset Errors:
- **Invalid/expired session:** Redirects to forgot password page
- **Weak password:** Shows password requirements
- **Same as old password:** Shows error message
- **Network errors:** Shows retry option

## Testing

### Test Email Confirmation:
1. Register a new user
2. Check email inbox (and spam folder)
3. Click confirmation link
4. Verify redirect to app and automatic login

### Test Password Reset:
1. Click "Forgot Password" on login screen
2. Enter email and submit
3. Check email inbox (and spam folder)
4. Click reset link
5. Enter new password
6. Verify redirect to login
7. Login with new password

## Notes

- All email operations include proper error handling and user feedback
- Users can resend confirmation emails if not received
- Password requirements are clearly displayed during reset
- Session validation ensures security
- Automatic logout after password change forces re-authentication

## Related Files

- `app/login.tsx` - Login screen with email confirmation handling
- `app/register/consumer.tsx` - Registration with email confirmation
- `app/forgot-password.tsx` - Password reset request
- `app/update-password.tsx` - Password update screen
- `contexts/AuthContext.tsx` - Authentication context with email handling
