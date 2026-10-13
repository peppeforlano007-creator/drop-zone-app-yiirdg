
# Email Links Configuration Guide

## Issue
Email confirmation and password reset links need to be properly configured to work with the app's deep linking system.

## Solution

### 1. Configure Supabase URL Settings

Go to your Supabase Dashboard:
1. Navigate to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `dropzone://`
3. Add to **Redirect URLs**:
   - `dropzone://email-confirmed`
   - `dropzone://update-password`
   - `exp://localhost:8081` (for development)
   - Any other development or production URLs you need

### 2. Deep Linking Setup

The app uses the custom URL scheme `dropzone://` as defined in `app.json`:

```json
{
  "expo": {
    "scheme": "dropzone"
  }
}
```

### 3. Email Templates Configuration

In Supabase Dashboard → **Authentication** → **Email Templates**:

#### Confirm Signup Template
The template should use:
```
{{ .ConfirmationURL }}
```

This will automatically redirect to `dropzone://email-confirmed` after confirmation.

#### Reset Password Template
The template should use:
```
{{ .ConfirmationURL }}
```

This will automatically redirect to `dropzone://update-password` after clicking the link.

### 4. Code Implementation

The following files implement the correct redirect URLs:

**Registration** (`app/register/consumer.tsx`):
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'dropzone://email-confirmed'
  }
});
```

**Password Reset** (`app/forgot-password.tsx`):
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'dropzone://update-password',
});
```

**Resend Confirmation** (`app/login.tsx`):
```typescript
await supabase.auth.resend({
  type: 'signup',
  email: email,
  options: {
    emailRedirectTo: 'dropzone://email-confirmed'
  }
});
```

### 5. Testing

#### Email Confirmation
1. Register a new user
2. Check email for confirmation link
3. Click the link - should open the app automatically
4. User should be able to login after confirmation

#### Password Reset
1. Click "Forgot Password" on login screen
2. Enter email and submit
3. Check email for reset link
4. Click the link - should open the app automatically
5. Enter new password and submit

### 6. Important Notes

1. **Deep Links**: The app uses `dropzone://` as its URL scheme
2. **Site URL**: Must be set to `dropzone://` in Supabase dashboard (NOT `https://natively.dev/*`)
3. **Redirect URLs**: All redirect URLs must be added to the allowed list in Supabase
4. **Testing**: Test on actual devices as deep links may not work properly in simulators/emulators
5. **Production**: When deploying to production, ensure the app's URL scheme is properly registered with the OS

### 7. Troubleshooting

#### Links showing 404 or not working
- Verify the Site URL is set to `dropzone://` in Supabase dashboard
- Check that redirect URLs are correctly added to the allowed list
- Ensure the app is installed on the device
- Try uninstalling and reinstalling the app

#### Deep link not opening app
- Verify app scheme is registered in `app.json`
- Check device/OS permissions for opening links
- Test with a simple deep link first: `dropzone://test`
- Ensure the app is installed and not just running in Expo Go

#### Email not received
- Check spam folder
- Verify email provider configuration in Supabase
- Check Supabase logs for email sending errors
- Ensure the email address is valid

### 8. WhatsApp Support Configuration

The app also includes a WhatsApp support button on the login screen. To configure it:

1. Go to **Admin** → **Settings**
2. Find the "Supporto Clienti WhatsApp" section
3. Enter the WhatsApp number in international format without + or spaces
   - Example: `393123456789` for +39 312 345 6789
4. Click "Salva Impostazioni"

The number is stored in the `app_settings` table with the key `whatsapp_support_number`.

## Related Files
- `app/register/consumer.tsx` - User registration with email confirmation
- `app/login.tsx` - Login with resend confirmation option and WhatsApp support
- `app/forgot-password.tsx` - Password reset flow
- `app/update-password.tsx` - Password update screen
- `app/admin/settings.tsx` - Admin settings for WhatsApp support number
- `contexts/AuthContext.tsx` - Authentication context with email redirect URLs
- `app.json` - App configuration with URL scheme
