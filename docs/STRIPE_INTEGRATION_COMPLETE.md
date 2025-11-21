
# Stripe Payment Integration - Complete Guide

## Overview

The DropMarket app now has Stripe payment processing integrated in **test mode**. This allows users to add payment methods, authorize payments when booking products, and automatically charge the final amount when drops close.

## Configuration

### Stripe Test Keys

The app is configured with the following Stripe test publishable key:

```
pk_test_51SVuQlKzWSUQAh5P3T91A8guW6DgLWSTnGvlENlkzvFrUyEWs9MZNnGR0jY0By0n8WbWhoS7wdkpu7R87fNLZDGh00ESjWhShJ
```

This key is configured in `app/_layout.tsx` and wrapped around the entire app with `StripeProvider`.

### Database Schema

The `payment_methods` table stores user payment methods:

```sql
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  stripe_payment_method_id text UNIQUE NOT NULL,
  type text DEFAULT 'card' CHECK (type IN ('card', 'paypal', 'bank_transfer')),
  last4 text,
  brand text,
  exp_month integer,
  exp_year integer,
  is_default boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

Row Level Security (RLS) policies ensure users can only access their own payment methods.

## Features Implemented

### 1. Add Payment Method

**Location**: `app/add-payment-method.tsx`

Users can add credit/debit cards using Stripe's `CardField` component:

- **Stripe CardField**: Secure, PCI-compliant card input
- **Real-time validation**: Card details validated as user types
- **Cardholder name**: Required field for billing
- **Database storage**: Payment method saved to Supabase
- **Test mode indicator**: Clear indication that app is in test mode

**Test Cards**:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`

### 2. Manage Payment Methods

**Location**: `app/(tabs)/payment-methods.tsx`

Users can view and manage their saved payment methods:

- **List all cards**: Shows all active payment methods
- **Set default**: Mark a card as default for bookings
- **Remove cards**: Delete payment methods
- **Card details**: Display brand, last 4 digits, expiry
- **Default indicator**: Visual badge for default card

### 3. Payment Context

**Location**: `contexts/PaymentContext.tsx`

Centralized payment state management:

- **Load from database**: Fetches payment methods on app start
- **Real-time sync**: Updates when auth state changes
- **CRUD operations**: Add, remove, update payment methods
- **Authorization tracking**: Manages payment authorizations
- **Default selection**: Handles default payment method logic

## User Flow

### Adding a Payment Method

1. User navigates to "Profilo" → "Metodi di Pagamento"
2. Taps "Aggiungi Metodo di Pagamento"
3. Enters cardholder name
4. Enters card details in Stripe CardField
5. Taps "Aggiungi Carta"
6. Stripe creates payment method
7. Payment method saved to database
8. User redirected back to payment methods list

### Booking with Payment

1. User views product in active drop
2. Taps "PRENOTA CON CARTA"
3. System checks for default payment method
4. If no default, prompts to add payment method
5. Shows booking confirmation with price
6. Creates Stripe PaymentIntent (authorization)
7. Funds held on card (not charged yet)
8. Booking created with "authorized" status

### Payment Capture (Drop Closes)

1. Drop timer reaches zero or admin completes drop
2. System calculates final discount achieved
3. For each booking:
   - Calculate final price with discount
   - Capture authorized payment for final amount
   - Update booking status to "captured"
   - Create order for supplier
4. Users notified of final charge
5. Savings displayed (authorized vs. charged)

## Technical Implementation

### Stripe Provider Setup

```typescript
// app/_layout.tsx
import { StripeProvider } from '@stripe/stripe-react-native';

const STRIPE_PUBLISHABLE_KEY = "pk_test_51SVuQlKzWSUQAh5P3T91A8guW6DgLWSTnGvlENlkzvFrUyEWs9MZNnGR0jY0By0n8WbWhoS7wdkpu7R87fNLZDGh00ESjWhShJ";

<StripeProvider
  publishableKey={STRIPE_PUBLISHABLE_KEY}
  merchantIdentifier="merchant.com.dropmarket"
  urlScheme="dropmarket"
>
  {/* App content */}
</StripeProvider>
```

### Creating Payment Method

```typescript
// app/add-payment-method.tsx
import { CardField, useStripe } from '@stripe/stripe-react-native';

const { createPaymentMethod } = useStripe();

const { paymentMethod, error } = await createPaymentMethod({
  paymentMethodType: 'Card',
  billingDetails: {
    name: cardholderName,
  },
});

// Save to database
await supabase
  .from('payment_methods')
  .insert({
    user_id: user.id,
    stripe_payment_method_id: paymentMethod.id,
    type: 'card',
    last4: paymentMethod.card?.last4,
    brand: paymentMethod.card?.brand,
    exp_month: paymentMethod.card?.expMonth,
    exp_year: paymentMethod.card?.expYear,
    is_default: false,
  });
```

### Loading Payment Methods

```typescript
// contexts/PaymentContext.tsx
const loadPaymentMethods = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const methods = data.map(pm => ({
    id: pm.id,
    type: pm.type,
    last4: pm.last4,
    brand: pm.brand,
    expiryMonth: pm.exp_month,
    expiryYear: pm.exp_year,
    isDefault: pm.is_default,
    stripePaymentMethodId: pm.stripe_payment_method_id,
  }));

  setPaymentMethods(methods);
};
```

## Next Steps for Production

### 1. Backend API (Required)

Create Supabase Edge Functions for:

**authorize-payment**
```typescript
// Create PaymentIntent with manual capture
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount * 100, // Convert to cents
  currency: 'eur',
  payment_method: paymentMethodId,
  customer: customerId,
  capture_method: 'manual',
  confirm: true,
  metadata: {
    productId,
    dropId,
    userId,
  },
});
```

**capture-payment**
```typescript
// Capture the authorized payment
const paymentIntent = await stripe.paymentIntents.capture(
  paymentIntentId,
  { amount_to_capture: finalAmount * 100 }
);
```

**cancel-authorization**
```typescript
// Cancel the authorization
await stripe.paymentIntents.cancel(paymentIntentId);
```

### 2. Stripe Secret Key

Add to Supabase Edge Function secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

### 3. Webhook Handling

Set up webhooks for:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `payment_method.detached`

### 4. Customer Management

Create Stripe customers for users:

```typescript
const customer = await stripe.customers.create({
  email: user.email,
  metadata: {
    supabase_user_id: user.id,
  },
});

// Store customer ID in profiles table
await supabase
  .from('profiles')
  .update({ stripe_customer_id: customer.id })
  .eq('user_id', user.id);
```

### 5. Production Keys

Replace test keys with production keys:
- Publishable key: `pk_live_...`
- Secret key: `sk_live_...`

### 6. 3D Secure (SCA)

Implement Strong Customer Authentication:

```typescript
const { paymentIntent, error } = await confirmPayment(clientSecret, {
  paymentMethodType: 'Card',
});
```

### 7. Error Handling

Implement comprehensive error handling:
- Card declined
- Insufficient funds
- Expired card
- Network errors
- Authorization expired (7 days max)

### 8. Monitoring

Set up monitoring for:
- Authorization success rate
- Capture success rate
- Failed payments
- Refund requests
- Average time to capture

## Security Considerations

1. **Never store card details**: Stripe handles all sensitive data
2. **Use HTTPS**: All API calls over secure connections
3. **Validate on backend**: Never trust client-side validation
4. **PCI Compliance**: Stripe handles PCI compliance
5. **Webhook signatures**: Verify all webhook signatures
6. **Authorization holds**: Capture within 7 days
7. **RLS policies**: Strict database access control

## Testing

### Test Cards

**Success**:
- Visa: `4242 4242 4242 4242`
- Mastercard: `5555 5555 5555 4444`
- Amex: `3782 822463 10005`

**Errors**:
- Decline: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`
- Expired: `4000 0000 0000 0069`
- Incorrect CVC: `4000 0000 0000 0127`

**3D Secure**:
- Required: `4000 0027 6000 3184`
- Optional: `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC (4 for Amex).

### Test Scenarios

1. **Add card successfully**
2. **Add card with decline**
3. **Set default payment method**
4. **Remove payment method**
5. **Book product with payment**
6. **Complete drop and capture payment**
7. **Cancel booking and release authorization**
8. **Handle underfunded drop**

## Troubleshooting

### Card Not Accepted

- Verify test mode is active
- Check card number is correct
- Use future expiry date
- Verify CVC is 3 digits (4 for Amex)

### Payment Method Not Saving

- Check Supabase connection
- Verify RLS policies
- Check user authentication
- Review console logs

### Authorization Failed

- Verify payment method exists
- Check drop is active
- Verify product availability
- Review Stripe dashboard

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe React Native](https://github.com/stripe/stripe-react-native)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Dashboard](https://dashboard.stripe.com/test)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Support

For issues or questions:
1. Check console logs
2. Review Stripe dashboard
3. Verify Supabase configuration
4. Test with different cards
5. Check network connectivity

---

**Status**: ✅ Test mode integration complete
**Next**: Implement backend Edge Functions for production
