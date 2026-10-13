
# Subscription System with Stripe - Complete Guide

## Overview

This guide covers the complete subscription system implementation using Stripe test API. The system allows users to subscribe to different plans, manage their subscriptions, and handle recurring payments.

## Architecture

### Database Tables

#### `subscription_plans`
Stores subscription plan information synced with Stripe:
- `id`: UUID primary key
- `name`: Plan name (e.g., "Basic", "Pro", "Enterprise")
- `description`: Plan description
- `stripe_price_id`: Stripe Price ID (e.g., `price_xxx`)
- `stripe_product_id`: Stripe Product ID (e.g., `prod_xxx`)
- `amount`: Price amount in euros
- `currency`: Currency code (default: 'eur')
- `interval`: Billing interval ('month' or 'year')
- `features`: JSON array of features
- `is_active`: Whether the plan is active

#### `subscriptions`
Stores user subscription information:
- `id`: UUID primary key
- `user_id`: Reference to auth.users
- `subscription_plan_id`: Reference to subscription_plans
- `stripe_subscription_id`: Stripe Subscription ID
- `stripe_customer_id`: Stripe Customer ID
- `status`: Subscription status (active, canceled, past_due, unpaid, incomplete, trialing)
- `current_period_start`: Current billing period start
- `current_period_end`: Current billing period end
- `cancel_at_period_end`: Whether subscription will cancel at period end
- `canceled_at`: Cancellation timestamp
- `trial_start`: Trial period start
- `trial_end`: Trial period end

### Edge Functions

#### `create-subscription`
Creates a new subscription for a user.

**Endpoint**: `/functions/v1/create-subscription`

**Request**:
```json
{
  "priceId": "price_xxx",
  "paymentMethodId": "pm_xxx"
}
```

**Response**:
```json
{
  "subscriptionId": "sub_xxx",
  "clientSecret": "pi_xxx_secret_xxx",
  "status": "incomplete"
}
```

**Process**:
1. Validates user authentication
2. Creates or retrieves Stripe customer
3. Attaches payment method to customer
4. Creates subscription in Stripe
5. Saves subscription to database
6. Returns client secret for payment confirmation

#### `cancel-subscription`
Cancels a user's subscription.

**Endpoint**: `/functions/v1/cancel-subscription`

**Request**:
```json
{
  "subscriptionId": "uuid",
  "cancelImmediately": false
}
```

**Response**:
```json
{
  "success": true,
  "subscription": {
    "id": "sub_xxx",
    "status": "active",
    "cancel_at_period_end": true,
    "current_period_end": "2024-02-01T00:00:00Z"
  }
}
```

**Process**:
1. Validates user owns the subscription
2. Cancels subscription in Stripe (immediately or at period end)
3. Updates subscription in database
4. Returns updated subscription details

#### `stripe-webhook`
Handles Stripe webhook events to keep database in sync.

**Endpoint**: `/functions/v1/stripe-webhook`

**Supported Events**:
- `customer.subscription.created`: New subscription created
- `customer.subscription.updated`: Subscription updated
- `customer.subscription.deleted`: Subscription canceled
- `invoice.paid`: Payment successful
- `invoice.payment_failed`: Payment failed

**Process**:
1. Verifies webhook signature (if configured)
2. Processes event based on type
3. Updates database accordingly
4. Returns success response

### React Context

#### `SubscriptionContext`
Manages subscription state and operations throughout the app.

**Provided Values**:
- `subscriptions`: Array of user subscriptions
- `plans`: Array of available subscription plans
- `activeSubscription`: Current active subscription (if any)
- `loading`: Loading state
- `createSubscription(priceId, paymentMethodId)`: Create new subscription
- `cancelSubscription(subscriptionId, cancelImmediately)`: Cancel subscription
- `refreshSubscriptions()`: Reload subscriptions from database
- `hasActiveSubscription()`: Check if user has active subscription

### UI Screens

#### `/subscriptions` - My Subscriptions
Shows user's current and past subscriptions.

**Features**:
- Display active subscription with details
- Show subscription status and renewal date
- List subscription features
- Cancel subscription button
- View subscription history
- Link to view available plans

#### `/subscription-plans` - Available Plans
Shows all available subscription plans.

**Features**:
- Display all active plans
- Highlight featured/popular plan
- Show plan features and pricing
- Subscribe to plan button
- FAQ section
- Test mode indicator

## Setup Instructions

### 1. Stripe Configuration

#### Create Products and Prices in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Click "Add product"
3. Create your subscription plans:

**Example: Basic Plan**
- Name: "Basic"
- Description: "Perfect for individuals"
- Pricing: €9.99/month
- Copy the Price ID (e.g., `price_xxx`)
- Copy the Product ID (e.g., `prod_xxx`)

**Example: Pro Plan**
- Name: "Pro"
- Description: "Best for professionals"
- Pricing: €29.99/month
- Copy the Price ID
- Copy the Product ID

**Example: Enterprise Plan**
- Name: "Enterprise"
- Description: "For large teams"
- Pricing: €99.99/month
- Copy the Price ID
- Copy the Product ID

#### Configure Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://[your-project-ref].supabase.co/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the webhook signing secret (starts with `whsec_`)

#### Set Environment Variables

In your Supabase project, add these secrets:

```bash
# Stripe Secret Key (from Stripe Dashboard > Developers > API keys)
STRIPE_SECRET_KEY=sk_test_xxx

# Stripe Webhook Secret (from webhook configuration)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 2. Database Setup

The migration has already been applied. Now insert your subscription plans:

```sql
-- Insert Basic Plan
INSERT INTO subscription_plans (
  name,
  description,
  stripe_price_id,
  stripe_product_id,
  amount,
  currency,
  interval,
  features,
  is_active
) VALUES (
  'Basic',
  'Perfect for individuals getting started',
  'price_xxx', -- Replace with your Stripe Price ID
  'prod_xxx', -- Replace with your Stripe Product ID
  9.99,
  'eur',
  'month',
  '["Accesso a tutti i drop", "Notifiche in tempo reale", "Supporto via email"]'::jsonb,
  true
);

-- Insert Pro Plan
INSERT INTO subscription_plans (
  name,
  description,
  stripe_price_id,
  stripe_product_id,
  amount,
  currency,
  interval,
  features,
  is_active
) VALUES (
  'Pro',
  'Best for professionals and power users',
  'price_yyy', -- Replace with your Stripe Price ID
  'prod_yyy', -- Replace with your Stripe Product ID
  29.99,
  'eur',
  'month',
  '["Tutto del piano Basic", "Accesso anticipato ai drop", "Sconti esclusivi", "Supporto prioritario"]'::jsonb,
  true
);

-- Insert Enterprise Plan
INSERT INTO subscription_plans (
  name,
  description,
  stripe_price_id,
  stripe_product_id,
  amount,
  currency,
  interval,
  features,
  is_active
) VALUES (
  'Enterprise',
  'For large teams and organizations',
  'price_zzz', -- Replace with your Stripe Price ID
  'prod_zzz', -- Replace with your Stripe Product ID
  99.99,
  'eur',
  'month',
  '["Tutto del piano Pro", "Account manager dedicato", "Fatturazione personalizzata", "Supporto 24/7", "API access"]'::jsonb,
  true
);
```

### 3. Testing

#### Test Cards

Use these test cards in Stripe test mode:

**Successful Payment**:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Payment Requires Authentication**:
- Card: `4000 0025 0000 3155`

**Payment Declined**:
- Card: `4000 0000 0000 9995`

**Insufficient Funds**:
- Card: `4000 0000 0000 9995`

#### Testing Flow

1. **Add Payment Method**:
   - Go to Profile > Metodi di Pagamento
   - Click "Aggiungi Metodo di Pagamento"
   - Enter test card details
   - Save payment method

2. **Subscribe to Plan**:
   - Go to Profile > I Miei Abbonamenti
   - Click "Scopri i Piani"
   - Select a plan
   - Confirm subscription
   - Payment will be processed

3. **View Subscription**:
   - Go to Profile > I Miei Abbonamenti
   - See active subscription details
   - View features and renewal date

4. **Cancel Subscription**:
   - Click "Annulla Abbonamento"
   - Confirm cancellation
   - Subscription will remain active until period end

5. **Test Webhooks**:
   - Use Stripe CLI to forward webhooks:
     ```bash
     stripe listen --forward-to https://[your-project-ref].supabase.co/functions/v1/stripe-webhook
     ```
   - Trigger test events:
     ```bash
     stripe trigger customer.subscription.created
     stripe trigger invoice.paid
     ```

## Usage in App

### Check Subscription Status

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function MyComponent() {
  const { activeSubscription, hasActiveSubscription } = useSubscription();

  if (hasActiveSubscription()) {
    // User has active subscription
    console.log('Plan:', activeSubscription?.plan?.name);
  } else {
    // User doesn't have subscription
    // Show upgrade prompt
  }
}
```

### Restrict Features by Subscription

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function PremiumFeature() {
  const { activeSubscription } = useSubscription();

  if (!activeSubscription) {
    return (
      <View>
        <Text>This feature requires a subscription</Text>
        <Button onPress={() => router.push('/subscription-plans')}>
          Subscribe Now
        </Button>
      </View>
    );
  }

  return <PremiumContent />;
}
```

### Check Specific Plan

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function EnterpriseFeature() {
  const { activeSubscription } = useSubscription();

  const hasEnterprisePlan = activeSubscription?.plan?.name === 'Enterprise';

  if (!hasEnterprisePlan) {
    return <UpgradePrompt />;
  }

  return <EnterpriseContent />;
}
```

## Webhook Security

### Production Setup

In production, always verify webhook signatures:

1. Set `STRIPE_WEBHOOK_SECRET` environment variable
2. The webhook handler will automatically verify signatures
3. Invalid signatures will be rejected with 400 error

### Testing Without Signature Verification

For local testing, you can skip signature verification by not setting `STRIPE_WEBHOOK_SECRET`. However, this should NEVER be done in production.

## Monitoring

### Check Subscription Status

```sql
-- View all active subscriptions
SELECT 
  s.id,
  p.email,
  sp.name as plan_name,
  s.status,
  s.current_period_end
FROM subscriptions s
JOIN profiles p ON s.user_id = p.user_id
JOIN subscription_plans sp ON s.subscription_plan_id = sp.id
WHERE s.status = 'active'
ORDER BY s.created_at DESC;
```

### Check Failed Payments

```sql
-- View subscriptions with payment issues
SELECT 
  s.id,
  p.email,
  sp.name as plan_name,
  s.status,
  s.current_period_end
FROM subscriptions s
JOIN profiles p ON s.user_id = p.user_id
JOIN subscription_plans sp ON s.subscription_plan_id = sp.id
WHERE s.status IN ('past_due', 'unpaid')
ORDER BY s.updated_at DESC;
```

### Revenue Analytics

```sql
-- Calculate monthly recurring revenue
SELECT 
  sp.name as plan_name,
  COUNT(*) as subscriber_count,
  SUM(sp.amount) as monthly_revenue
FROM subscriptions s
JOIN subscription_plans sp ON s.subscription_plan_id = sp.id
WHERE s.status IN ('active', 'trialing')
  AND sp.interval = 'month'
GROUP BY sp.name, sp.amount
ORDER BY monthly_revenue DESC;
```

## Troubleshooting

### Subscription Not Created

**Problem**: Subscription created in Stripe but not in database

**Solution**:
1. Check Edge Function logs
2. Verify database permissions
3. Ensure subscription_plan exists for the price_id
4. Check webhook is configured correctly

### Payment Fails

**Problem**: Payment fails during subscription creation

**Solution**:
1. Verify payment method is valid
2. Check Stripe Dashboard for error details
3. Ensure sufficient funds on test card
4. Try different test card

### Webhook Not Received

**Problem**: Stripe events not updating database

**Solution**:
1. Verify webhook endpoint URL is correct
2. Check webhook signing secret is set
3. View webhook logs in Stripe Dashboard
4. Test webhook with Stripe CLI
5. Check Edge Function logs

### Subscription Status Not Updating

**Problem**: Subscription status in app doesn't match Stripe

**Solution**:
1. Call `refreshSubscriptions()` to reload from database
2. Check webhook is processing events correctly
3. Manually trigger webhook event from Stripe Dashboard
4. Verify RLS policies allow updates

## Best Practices

1. **Always verify webhook signatures in production**
2. **Handle failed payments gracefully** - notify users and provide retry options
3. **Implement grace periods** - don't immediately revoke access on payment failure
4. **Log all subscription events** - for debugging and analytics
5. **Test thoroughly** - use all test cards and scenarios
6. **Monitor subscription metrics** - track MRR, churn, failed payments
7. **Provide clear cancellation flow** - make it easy for users to cancel
8. **Communicate clearly** - send emails for subscription events
9. **Handle edge cases** - expired cards, insufficient funds, etc.
10. **Keep Stripe and database in sync** - rely on webhooks for updates

## Next Steps

1. **Add Email Notifications**: Send emails for subscription events
2. **Implement Proration**: Handle plan upgrades/downgrades with proration
3. **Add Coupons**: Support discount codes and promotions
4. **Usage-Based Billing**: Track usage and bill accordingly
5. **Team Subscriptions**: Allow multiple users per subscription
6. **Annual Plans**: Add yearly billing options with discounts
7. **Trial Periods**: Implement free trial periods
8. **Dunning Management**: Automated retry logic for failed payments
9. **Analytics Dashboard**: Build admin dashboard for subscription metrics
10. **Customer Portal**: Stripe Customer Portal for self-service management

## Support

For issues or questions:
- Check Stripe Dashboard for payment details
- Review Edge Function logs in Supabase
- Test webhooks with Stripe CLI
- Consult Stripe documentation: https://stripe.com/docs/billing/subscriptions/overview
