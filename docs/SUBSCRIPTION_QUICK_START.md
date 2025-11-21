
# Subscription System - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Stripe Products (2 minutes)

1. Go to [Stripe Test Dashboard](https://dashboard.stripe.com/test/products)
2. Click **"+ Add product"**
3. Create three products:

#### Basic Plan
- **Name**: Basic
- **Description**: Perfect for individuals
- **Pricing model**: Standard pricing
- **Price**: €9.99
- **Billing period**: Monthly
- **Click "Save product"**
- **Copy the Price ID** (starts with `price_`)

#### Pro Plan
- **Name**: Pro
- **Description**: Best for professionals
- **Pricing model**: Standard pricing
- **Price**: €29.99
- **Billing period**: Monthly
- **Click "Save product"**
- **Copy the Price ID**

#### Enterprise Plan
- **Name**: Enterprise
- **Description**: For large teams
- **Pricing model**: Standard pricing
- **Price**: €99.99
- **Billing period**: Monthly
- **Click "Save product"**
- **Copy the Price ID**

### Step 2: Add Plans to Database (1 minute)

Run this SQL in your Supabase SQL Editor (replace the price IDs):

```sql
-- Basic Plan
INSERT INTO subscription_plans (name, description, stripe_price_id, stripe_product_id, amount, currency, interval, features, is_active)
VALUES (
  'Basic',
  'Perfect for individuals getting started',
  'price_YOUR_BASIC_PRICE_ID', -- Replace this
  'prod_YOUR_BASIC_PRODUCT_ID', -- Replace this
  9.99,
  'eur',
  'month',
  '["Accesso a tutti i drop", "Notifiche in tempo reale", "Supporto via email"]'::jsonb,
  true
);

-- Pro Plan
INSERT INTO subscription_plans (name, description, stripe_price_id, stripe_product_id, amount, currency, interval, features, is_active)
VALUES (
  'Pro',
  'Best for professionals and power users',
  'price_YOUR_PRO_PRICE_ID', -- Replace this
  'prod_YOUR_PRO_PRODUCT_ID', -- Replace this
  29.99,
  'eur',
  'month',
  '["Tutto del piano Basic", "Accesso anticipato ai drop", "Sconti esclusivi", "Supporto prioritario"]'::jsonb,
  true
);

-- Enterprise Plan
INSERT INTO subscription_plans (name, description, stripe_price_id, stripe_product_id, amount, currency, interval, features, is_active)
VALUES (
  'Enterprise',
  'For large teams and organizations',
  'price_YOUR_ENTERPRISE_PRICE_ID', -- Replace this
  'prod_YOUR_ENTERPRISE_PRODUCT_ID', -- Replace this
  99.99,
  'eur',
  'month',
  '["Tutto del piano Pro", "Account manager dedicato", "Fatturazione personalizzata", "Supporto 24/7", "API access"]'::jsonb,
  true
);
```

### Step 3: Configure Webhook (2 minutes)

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://sippdylyuzejudmzbwdn.supabase.co/functions/v1/stripe-webhook`
4. **Events to send**: Select these events:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
5. Click **"Add endpoint"**
6. **Copy the signing secret** (starts with `whsec_`)
7. Add it to Supabase Edge Function secrets:
   - Go to Supabase Dashboard > Edge Functions
   - Add secret: `STRIPE_WEBHOOK_SECRET` = `whsec_your_secret`

### Step 4: Test It! (30 seconds)

1. Open your app
2. Go to **Profile > I Miei Abbonamenti**
3. Click **"Scopri i Piani"**
4. You should see your three plans!
5. Add a payment method using test card: `4242 4242 4242 4242`
6. Subscribe to a plan
7. Check **Profile > I Miei Abbonamenti** to see your active subscription

## ✅ Verification Checklist

- [ ] Three products created in Stripe
- [ ] Three plans inserted in database
- [ ] Webhook endpoint configured
- [ ] Webhook secret added to Supabase
- [ ] Plans visible in app
- [ ] Can subscribe to a plan
- [ ] Subscription shows as active
- [ ] Can cancel subscription

## 🧪 Test Cards

**Success**: `4242 4242 4242 4242`
**Requires Auth**: `4000 0025 0000 3155`
**Declined**: `4000 0000 0000 9995`

Use any future expiry date, any 3-digit CVC, and any ZIP code.

## 🎯 What's Next?

Now that subscriptions are working, you can:

1. **Customize Plans**: Edit features, pricing, and descriptions
2. **Add More Plans**: Create additional tiers
3. **Implement Access Control**: Restrict features based on subscription
4. **Add Email Notifications**: Notify users of subscription events
5. **Create Admin Dashboard**: Monitor subscriptions and revenue

## 📚 Full Documentation

See `SUBSCRIPTION_SYSTEM_GUIDE.md` for complete documentation including:
- Architecture details
- API reference
- Advanced features
- Troubleshooting
- Best practices

## 🆘 Need Help?

**Plans not showing?**
- Check SQL was executed successfully
- Verify `is_active = true` in database
- Check console for errors

**Subscription fails?**
- Verify payment method is added
- Check Stripe Dashboard for errors
- Ensure webhook is configured

**Webhook not working?**
- Verify endpoint URL is correct
- Check webhook secret is set
- View logs in Stripe Dashboard
- Test with Stripe CLI

## 🎉 You're Done!

Your subscription system is now live and ready to accept payments! 

Remember: You're in **test mode**, so no real charges will be made. When ready for production, switch to live mode in Stripe and update your keys.
