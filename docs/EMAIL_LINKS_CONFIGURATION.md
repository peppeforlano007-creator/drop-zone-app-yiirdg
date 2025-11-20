
# Email Links Configuration Guide

## Issue
Email confirmation and password reset links are showing "404 this page could not be found" errors.

## Root Cause
The email redirect URLs need to be properly configured in the Supabase dashboard to match the app's deep linking setup.

## Solution

### 1. Configure Supabase Email Templates

Go to your Supabase Dashboard:
1. Navigate to **Authentication** → **Email Templates**
2. Update the following templates:

#### Confirm Signup Template
Replace the confirmation link with:
```
{{ .ConfirmationURL }}
```

Make sure the redirect URL is set to: `https://natively.dev/email-confirmed`

#### Reset Password Template
Replace the reset link with:
```
{{ .ConfirmationURL }}
```

Make sure the redirect URL is set to: `https://natively.dev/update-password`

### 2. Configure Site URL and Redirect URLs

In Supabase Dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://natively.dev`
3. Add to **Redirect URLs**:
   - `https://natively.dev/email-confirmed`
   - `https://natively.dev/update-password`
   - `exp://localhost:8081` (for development)
   - Your production app URL scheme

### 3. Deep Linking Setup

The app is already configured to handle these deep links:
- Email confirmation: `/email-confirmed` route
- Password reset: `/update-password` route

### 4. Testing

#### Email Confirmation
1. Register a new user
2. Check email for confirmation link
3. Click the link - should redirect to the app
4. User should be able to login after confirmation

#### Password Reset
1. Click "Forgot Password" on login screen
2. Enter email and submit
3. Check email for reset link
4. Click the link - should redirect to the app
5. Enter new password and submit

### 5. Code Implementation

The following files already implement the correct redirect URLs:

**Registration** (`app/register/consumer.tsx`):
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://natively.dev/email-confirmed'
  }
});
```

**Password Reset** (`app/forgot-password.tsx`):
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://natively.dev/update-password',
});
```

**Resend Confirmation** (`app/login.tsx`):
```typescript
await supabase.auth.resend({
  type: 'signup',
  email: email,
  options: {
    emailRedirectTo: 'https://natively.dev/email-confirmed'
  }
});
```

## Important Notes

1. **Production URLs**: When deploying to production, update the redirect URLs to match your production domain
2. **Custom Domain**: If using a custom domain, update all redirect URLs accordingly
3. **Testing**: Always test email flows in both development and production environments
4. **Email Provider**: Ensure your email provider (Supabase's default or custom SMTP) is properly configured

## Troubleshooting

### Links still showing 404
- Verify the redirect URLs are correctly added in Supabase dashboard
- Check that the Site URL matches your app's domain
- Clear browser cache and try again
- Check Supabase logs for any authentication errors

### Email not received
- Check spam folder
- Verify email provider configuration in Supabase
- Check Supabase logs for email sending errors
- Ensure the email address is valid

### Deep link not opening app
- Verify app scheme is registered in `app.json`
- Test with a simple deep link first
- Check device/OS permissions for opening links
- Ensure the app is installed on the device

## Related Files
- `app/register/consumer.tsx` - User registration with email confirmation
- `app/login.tsx` - Login with resend confirmation option
- `app/forgot-password.tsx` - Password reset flow
- `app/update-password.tsx` - Password update screen (needs to be created if not exists)
- `contexts/AuthContext.tsx` - Authentication context with email redirect URLs
