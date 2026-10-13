
# Automatic Data Export Feature

## Overview

The automatic data export feature allows users to request and receive their personal data via email immediately, in compliance with GDPR Article 15 (Right of Access) and Article 20 (Right to Data Portability).

## How It Works

### User Flow

1. User navigates to **Profile → I Miei Dati** (My Data)
2. User taps on **"Esporta i Tuoi Dati"** (Export Your Data)
3. A confirmation dialog appears explaining the process
4. User confirms the export request
5. The system immediately processes the request and sends an email
6. User receives a success message
7. User receives an email with all their data in JSON format

### Technical Implementation

#### Frontend (`app/(tabs)/my-data.tsx`)

The frontend calls the Supabase Edge Function `export-user-data`:

```typescript
const { data, error } = await supabase.functions.invoke('export-user-data', {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});
```

#### Backend (Edge Function)

The Edge Function (`supabase/functions/export-user-data/index.ts`) performs the following steps:

1. **Authentication**: Verifies the user's JWT token
2. **Create Request Record**: Creates a record in `data_requests` table with status `processing`
3. **Data Collection**: Collects all user data from multiple tables:
   - Profile information
   - Bookings
   - User interests
   - Payment methods (excluding sensitive data)
   - Notifications
   - Consents
   - Data requests history
4. **Data Formatting**: Formats the data as JSON with metadata
5. **Email Generation**: Creates an HTML email with:
   - Summary of exported data
   - Explanation of what's included
   - Privacy notes
   - Timestamp
6. **Email Sending**: Sends the email to the user
7. **Status Update**: Updates the request status to `completed`

## Data Included in Export

### Profile Data
- User ID
- Email
- Full name
- Phone number
- Role
- Pickup point association
- Account creation date
- Deletion request status (if any)

### Bookings
- All booking records
- Product details
- Drop information
- Payment status
- Pricing information

### User Interests
- Products marked as "interested"
- Associated supplier lists
- Pickup point preferences

### Payment Methods
- Card brand (Visa, Mastercard, etc.)
- Last 4 digits of card
- Expiration date
- Default payment method flag
- Status

**Note**: Full card numbers and CVV are NEVER included for security reasons.

### Notifications
- All notifications received
- Notification types
- Read/unread status
- Related entities

### Consents
- Terms and conditions acceptance
- Privacy policy acceptance
- Marketing consent
- Consent timestamps
- IP address and user agent (if recorded)

### Data Requests
- History of all data export and deletion requests
- Request status
- Timestamps

## Database Schema

### `data_requests` Table

```sql
CREATE TABLE data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  request_type TEXT CHECK (request_type IN ('export', 'deletion')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Email Template

The email includes:

- **Header**: Branded header with title
- **Greeting**: Personalized with user's name
- **Data Summary**: Table showing what data was exported
- **Explanation**: Clear explanation of what's included
- **Privacy Note**: Information about excluded sensitive data
- **Footer**: Timestamp and security notice

## Security Considerations

### Data Protection
- ✅ Full card numbers are NEVER included
- ✅ Only last 4 digits of cards are exported
- ✅ CVV codes are NEVER stored or exported
- ✅ Passwords are NEVER included (handled by Supabase Auth)
- ✅ JWT tokens are validated before processing

### Access Control
- ✅ Users can only export their own data
- ✅ Authentication required via JWT
- ✅ Row Level Security (RLS) policies enforced

### Audit Trail
- ✅ All export requests are logged in `data_requests` table
- ✅ Timestamps recorded for compliance
- ✅ Status tracking for monitoring

## GDPR Compliance

This feature ensures compliance with:

### Article 15 - Right of Access
Users can obtain confirmation of data processing and receive a copy of their personal data.

### Article 20 - Right to Data Portability
Users receive their data in a structured, commonly used, and machine-readable format (JSON).

### Article 12 - Transparent Information
Users are informed about:
- What data is collected
- How to access their data
- How to request deletion
- Their rights under GDPR

## Testing

### Manual Testing

1. **Test Export Request**:
   ```
   - Login as a consumer user
   - Navigate to Profile → I Miei Dati
   - Tap "Esporta i Tuoi Dati"
   - Confirm the dialog
   - Verify success message
   - Check email inbox
   ```

2. **Verify Data Completeness**:
   ```
   - Check that all sections are included in the JSON
   - Verify no sensitive data (full card numbers) is present
   - Confirm timestamps are correct
   ```

3. **Test Error Handling**:
   ```
   - Test with invalid session
   - Test with network errors
   - Verify appropriate error messages
   ```

### Database Verification

Check the `data_requests` table:

```sql
SELECT * FROM data_requests 
WHERE request_type = 'export' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Admin Panel Integration

Admins can view data export requests in the admin panel:

1. Navigate to **Admin → Users**
2. Select a user
3. View their data request history
4. Monitor request status

## Future Enhancements

### Planned Improvements

1. **Email Service Integration**
   - Integrate with SendGrid, Resend, or AWS SES
   - Add email delivery tracking
   - Implement retry logic for failed emails

2. **Data Format Options**
   - Add CSV export option
   - Add PDF export option
   - Allow users to select specific data categories

3. **Scheduled Exports**
   - Allow users to schedule periodic exports
   - Automatic monthly data backups

4. **Enhanced Security**
   - Add password verification before export
   - Implement rate limiting
   - Add CAPTCHA for additional security

5. **Compression**
   - Compress large data exports
   - Add ZIP file support for attachments

## Troubleshooting

### Common Issues

**Issue**: User doesn't receive email
- **Solution**: Check spam folder, verify email address in profile

**Issue**: Export fails with error
- **Solution**: Check Edge Function logs, verify database permissions

**Issue**: Incomplete data in export
- **Solution**: Verify RLS policies, check user permissions

### Logs

Check Edge Function logs:
```bash
supabase functions logs export-user-data
```

## Support

For issues or questions:
- Check the logs in Supabase Dashboard
- Review the `data_requests` table for request status
- Contact technical support with the request ID

## Compliance Notes

- Data exports are provided within seconds (immediate processing)
- GDPR requires response within 30 days - we exceed this requirement
- All exports are logged for audit purposes
- Users can request multiple exports without restriction
- No fees are charged for data exports (GDPR requirement)

## Related Documentation

- [LEGAL_COMPLIANCE_GUIDE.md](./LEGAL_COMPLIANCE_GUIDE.md)
- [GDPR Implementation](./LEGAL_COMPLIANCE_SUMMARY.md)
- [Privacy Policy](../app/legal/privacy-policy.tsx)
