
# Payment Integration Guide

This document explains how the payment system works in the DropMarket app and how to integrate it with a real payment backend.

## Overview

The payment system allows users to:
1. Add and manage payment methods (credit cards)
2. Book products in active drops with payment authorization
3. Automatically charge the final amount when drops end

## Current Implementation (Mock)

The current implementation uses mock data and simulates payment operations. All payment logic is contained in:
- `contexts/PaymentContext.tsx` - Payment state management
- `hooks/useDropPaymentCapture.ts` - Automatic payment capture
- `app/(tabs)/payment-methods.tsx` - Payment methods management
- `app/add-payment-method.tsx` - Add new payment method
- `app/(tabs)/my-bookings.tsx` - View and manage bookings

## Payment Flow

### 1. Adding a Payment Method

**User Flow:**
1. User navigates to "Pagamenti" tab
2. Clicks "Aggiungi Metodo di Pagamento"
3. Enters card details (number, name, expiry, CVV)
4. Card is validated and added to their account

**Technical Implementation:**
```typescript
// Current: Mock implementation
const paymentMethod = {
  id: `pm_${Date.now()}`,
  type: 'card',
  last4: cardNumber.slice(-4),
  brand: getCardBrand(cardNumber),
  expiryMonth: month,
  expiryYear: 2000 + year,
  isDefault: false,
  stripePaymentMethodId: `pm_stripe_${Date.now()}`,
};

// Production: Use Stripe SDK
import { useStripe } from '@stripe/stripe-react-native';
const { createPaymentMethod } = useStripe();

const { paymentMethod, error } = await createPaymentMethod({
  paymentMethodType: 'Card',
  card: {
    number: cardNumber,
    expMonth: month,
    expYear: year,
    cvc: cvv,
  },
  billingDetails: {
    name: cardholderName,
  },
});

// Then send to your backend to attach to customer
await fetch('/api/payment-methods', {
  method: 'POST',
  body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
});
```

### 2. Booking a Product (Payment Authorization)

**User Flow:**
1. User views a product in an active drop
2. Clicks "PRENOTA CON CARTA"
3. System checks for default payment method
4. Shows confirmation with price details
5. Authorizes payment (holds funds on card)
6. Product is booked

**Technical Implementation:**
```typescript
// Current: Mock implementation
const authorization = {
  id: `auth_${Date.now()}`,
  productId,
  amount,
  authorizedAmount: amount,
  paymentMethodId,
  status: 'authorized',
  createdAt: new Date(),
};

// Production: Use Stripe PaymentIntent with manual capture
await fetch('/api/authorize-payment', {
  method: 'POST',
  body: JSON.stringify({
    amount: product.originalPrice * 100, // Stripe uses cents
    currency: 'eur',
    paymentMethodId: defaultPaymentMethod.stripePaymentMethodId,
    captureMethod: 'manual', // Important: manual capture
    metadata: {
      productId: product.id,
      dropId: drop.id,
      userId: user.id,
    },
  }),
});

// Backend creates PaymentIntent:
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount * 100,
  currency: 'eur',
  payment_method: paymentMethodId,
  capture_method: 'manual',
  confirm: true,
  metadata: metadata,
});
```

### 3. Payment Capture (When Drop Ends)

**Automatic Flow:**
1. Drop countdown reaches zero
2. System calculates final discount and price
3. Captures authorized payment for final amount
4. Notifies user of successful payment
5. Sends order to supplier

**Technical Implementation:**
```typescript
// Current: Mock implementation (useDropPaymentCapture hook)
const finalDiscount = drop.currentDiscount;
const finalAmount = product.originalPrice * (1 - finalDiscount / 100);

await capturePayment(auth.id, finalAmount, finalDiscount);

// Production: Capture PaymentIntent
await fetch('/api/capture-payment', {
  method: 'POST',
  body: JSON.stringify({
    authorizationId: auth.id,
    amount: finalAmount * 100, // Can be less than authorized amount
  }),
});

// Backend captures PaymentIntent:
const paymentIntent = await stripe.paymentIntents.capture(
  paymentIntentId,
  { amount_to_capture: finalAmount * 100 }
);
```

## Integration with Stripe

### Step 1: Setup Stripe Account

1. Create a Stripe account at https://stripe.com
2. Get your API keys (publishable and secret)
3. Configure webhook endpoints

### Step 2: Install and Configure Stripe SDK

Already installed: `@stripe/stripe-react-native`

Add to your app config (`app.json`):
```json
{
  "expo": {
    "plugins": [
      [
        "@stripe/stripe-react-native",
        {
          "merchantIdentifier": "merchant.com.yourapp",
          "enableGooglePay": true
        }
      ]
    ]
  }
}
```

### Step 3: Wrap App with StripeProvider

Update `app/_layout.tsx`:
```typescript
import { StripeProvider } from '@stripe/stripe-react-native';

// Inside your component
<StripeProvider publishableKey="pk_test_...">
  <AuthProvider>
    <PaymentProvider>
      {/* rest of your app */}
    </PaymentProvider>
  </AuthProvider>
</StripeProvider>
```

### Step 4: Create Backend API

You need a backend server (Node.js, Python, etc.) with these endpoints:

#### POST /api/payment-methods
```typescript
// Attach payment method to customer
const customer = await stripe.customers.retrieve(userId);
await stripe.paymentMethods.attach(paymentMethodId, {
  customer: customer.id,
});
```

#### POST /api/authorize-payment
```typescript
// Create PaymentIntent with manual capture
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount,
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

#### POST /api/capture-payment
```typescript
// Capture the authorized payment
const paymentIntent = await stripe.paymentIntents.capture(
  paymentIntentId,
  { amount_to_capture: finalAmount }
);
```

#### POST /api/cancel-authorization
```typescript
// Cancel the authorization
await stripe.paymentIntents.cancel(paymentIntentId);
```

### Step 5: Handle Webhooks

Set up webhook handlers for:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

### Step 6: Update Frontend Code

Replace mock implementations in:
1. `contexts/PaymentContext.tsx` - Replace setTimeout with real API calls
2. `app/add-payment-method.tsx` - Use Stripe SDK to create payment method
3. `hooks/useDropPaymentCapture.ts` - Call backend API to capture payments

## Security Considerations

1. **Never store card details** - Use Stripe's tokenization
2. **Use HTTPS** - All API calls must be over HTTPS
3. **Validate on backend** - Never trust client-side validation alone
4. **PCI Compliance** - Stripe handles PCI compliance for you
5. **Webhook signatures** - Verify webhook signatures from Stripe
6. **Authorization holds** - Stripe holds funds for 7 days max, capture before then

## Testing

### Test Cards (Stripe)

- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Insufficient funds: 4000 0000 0000 9995
- 3D Secure: 4000 0027 6000 3184

Use any future expiry date and any 3-digit CVC.

## Error Handling

Handle these common errors:
- Card declined
- Insufficient funds
- Expired card
- Network errors
- Authorization expired (7 days)

## Monitoring

Monitor these metrics:
- Authorization success rate
- Capture success rate
- Average time to capture
- Failed payments
- Refund requests

## Support

For Stripe integration help:
- Stripe Documentation: https://stripe.com/docs
- Stripe React Native: https://github.com/stripe/stripe-react-native
- Stripe Support: https://support.stripe.com
