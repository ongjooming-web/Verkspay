# Stripe Subscription Setup Guide

This guide walks through setting up Stripe subscription prices for Prism's billing system.

## Prerequisites

1. Stripe account created and API keys set up
2. Vercel project linked with environment variables
3. Webhook endpoint configured in Stripe Dashboard

## Step 1: Create Products in Stripe Dashboard

Go to **Products** > **Add Product**:

### Product 1: Prism Starter
- **Name**: Starter Plan
- **Type**: Recurring (Subscription)
- **Billing Period**: Monthly and Annually (you'll create prices separately)

### Product 2: Prism Pro
- **Name**: Pro Plan
- **Type**: Recurring (Subscription)

### Product 3: Prism Enterprise
- **Name**: Enterprise Plan
- **Type**: Recurring (Subscription)

## Step 2: Create Prices for Each Product

For each product, create two prices:

### Starter Prices
1. **Monthly Price**
   - Amount: $19/month
   - Billing Period: Monthly
   - Copy the Price ID → `STRIPE_PRICE_ID_STARTER_MONTHLY`
   
2. **Annual Price**
   - Amount: $180/year (billed annually)
   - Billing Period: Yearly
   - Copy the Price ID → `STRIPE_PRICE_ID_STARTER_ANNUAL`

### Pro Prices
1. **Monthly Price**
   - Amount: $49/month
   - Billing Period: Monthly
   - Copy the Price ID → `STRIPE_PRICE_ID_PRO_MONTHLY`
   
2. **Annual Price**
   - Amount: $468/year (billed annually)
   - Billing Period: Yearly
   - Copy the Price ID → `STRIPE_PRICE_ID_PRO_ANNUAL`

### Enterprise Prices
1. **Monthly Price**
   - Amount: $199/month
   - Billing Period: Monthly
   - Copy the Price ID → `STRIPE_PRICE_ID_ENTERPRISE_MONTHLY`
   
2. **Annual Price**
   - Amount: $1,908/year (billed annually)
   - Billing Period: Yearly
   - Copy the Price ID → `STRIPE_PRICE_ID_ENTERPRISE_ANNUAL`

## Step 3: Add Environment Variables to Vercel

In Vercel Dashboard:
1. Go to **Settings** > **Environment Variables**
2. Add all 6 price IDs from Step 2:

```
STRIPE_PRICE_ID_STARTER_MONTHLY=price_1xxx...
STRIPE_PRICE_ID_STARTER_ANNUAL=price_1yyy...
STRIPE_PRICE_ID_PRO_MONTHLY=price_1zzz...
STRIPE_PRICE_ID_PRO_ANNUAL=price_1aaa...
STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=price_1bbb...
STRIPE_PRICE_ID_ENTERPRISE_ANNUAL=price_1ccc...
```

3. Also ensure you have:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Step 4: Configure Webhook in Stripe

1. Go to **Webhooks** in Stripe Dashboard
2. Add Endpoint:
   - URL: `https://app.prismops.xyz/api/stripe/webhook`
   - Events: Select these events:
     - `checkout.session.completed`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. Copy the Signing Secret → Set as `STRIPE_WEBHOOK_SECRET` in Vercel

## Step 5: Test the Flow

### Local Testing
1. Set environment variables in `.env.local`
2. Use Stripe CLI to forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Run app locally:
   ```bash
   npm run dev
   ```
4. Go to pricing page and click "Start Free Trial"
5. Verify checkout page loads with correct plan/price

### Production Testing
1. Deploy to Vercel
2. Go to `https://app.prismops.xyz/pricing`
3. Click "Start Free Trial" on a plan
4. Use Stripe test card: `4242 4242 4242 4242` (exp: any future date, CVC: any 3 digits)
5. Verify webhook fires and subscription is created in Supabase

## Troubleshooting

### "Missing Stripe price ID" Error
- Check that all 6 environment variables are set in Vercel
- Verify price IDs are correct (format: `price_1xxx...`)
- Redeploy after adding variables

### Checkout doesn't load
- Verify `STRIPE_SECRET_KEY` is correct
- Check browser console for JavaScript errors
- Ensure you're logged in before clicking "Start Free Trial"

### Webhook not firing
- Verify webhook secret is correct in both Stripe and Vercel
- Check Stripe Dashboard > Webhooks for failed delivery attempts
- Make sure endpoint URL is exactly: `https://app.prismops.xyz/api/stripe/webhook`

### Subscription not created
- Check Stripe Dashboard > Customers for the customer record
- Verify webhook event `checkout.session.completed` was received
- Check logs in Vercel for webhook processing errors

## Database Schema

After successful checkout, the webhook updates the user's profile:
```sql
-- profiles table
subscription_tier: 'starter' | 'pro' | 'enterprise' | 'free'
subscription_status: 'active' | 'canceled'
stripe_customer_id: customer ID from Stripe
```

## Support

For Stripe-specific issues:
- Stripe Docs: https://stripe.com/docs
- Dashboard: https://dashboard.stripe.com
- Test Cards: https://stripe.com/docs/testing#cards
