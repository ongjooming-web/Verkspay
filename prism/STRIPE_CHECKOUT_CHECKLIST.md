# Stripe Subscription Checkout - Setup Checklist

## ✅ What's Done (Code Side)

- [x] All 3 plans supported: Starter, Pro, Enterprise
- [x] Both billing periods supported: Monthly & Annual
- [x] Annual pricing correctly configured (20% discount)
- [x] Dynamic price ID lookup from environment variables
- [x] Pricing page passes `billingPeriod` to checkout API
- [x] Webhook handles subscription creation and tier updates
- [x] Error handling with clear messages
- [x] Auth validation before checkout
- [x] Comprehensive Stripe setup guide created

## ⚠️ What Needs Stripe Dashboard Setup

Before users can actually subscribe, you MUST:

### Step 1: Create Products in Stripe Dashboard
- [ ] Create product: "Starter Plan" (recurring, monthly)
- [ ] Create product: "Pro Plan" (recurring, monthly)
- [ ] Create product: "Enterprise Plan" (recurring, monthly)

### Step 2: Create Prices for Each Product

**Starter Plan:**
- [ ] Price 1: $19/month → Save Price ID as `STRIPE_PRICE_ID_STARTER_MONTHLY`
- [ ] Price 2: $180/year → Save Price ID as `STRIPE_PRICE_ID_STARTER_ANNUAL`

**Pro Plan:**
- [ ] Price 1: $49/month → Save Price ID as `STRIPE_PRICE_ID_PRO_MONTHLY`
- [ ] Price 2: $468/year → Save Price ID as `STRIPE_PRICE_ID_PRO_ANNUAL`

**Enterprise Plan:**
- [ ] Price 1: $199/month → Save Price ID as `STRIPE_PRICE_ID_ENTERPRISE_MONTHLY`
- [ ] Price 2: $1,908/year → Save Price ID as `STRIPE_PRICE_ID_ENTERPRISE_ANNUAL`

### Step 3: Add to Vercel Environment Variables

In Vercel Dashboard > Settings > Environment Variables, add:

```
STRIPE_PRICE_ID_STARTER_MONTHLY=price_1xxx...
STRIPE_PRICE_ID_STARTER_ANNUAL=price_1yyy...
STRIPE_PRICE_ID_PRO_MONTHLY=price_1zzz...
STRIPE_PRICE_ID_PRO_ANNUAL=price_1aaa...
STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=price_1bbb...
STRIPE_PRICE_ID_ENTERPRISE_ANNUAL=price_1ccc...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

- [ ] All 6 price IDs added
- [ ] Secret keys verified

### Step 4: Test Locally (Optional)

1. [ ] Copy price IDs to `.env.local`
2. [ ] Run `npm run dev`
3. [ ] Go to `/pricing` and try "Start Free Trial"
4. [ ] Use test card: `4242 4242 4242 4242`
5. [ ] Verify checkout completes and redirects to dashboard

### Step 5: Deploy & Monitor

1. [ ] Redeploy to Vercel (or wait for auto-deploy)
2. [ ] Test on production: https://app.prismops.xyz/pricing
3. [ ] Monitor Stripe Dashboard for:
   - Webhook deliveries (Webhooks > Events)
   - Customer creation (Customers tab)
   - Subscription creation (Billing > Subscriptions)

## 🔗 Quick Links

- Stripe Dashboard: https://dashboard.stripe.com
- Prism Pricing Page: https://app.prismops.xyz/pricing
- Vercel Settings: https://vercel.com/projects (select prism)
- Full Setup Guide: See `STRIPE_SETUP_GUIDE.md` in this repo

## ⏱️ Expected Timeline

- Stripe setup: 15-30 minutes
- Adding to Vercel: 5 minutes
- Testing: 10 minutes
- **Total: ~1 hour**

## 🐛 Troubleshooting

If checkout shows "Missing Stripe price ID":
1. Verify all 6 environment variables are in Vercel
2. Check price ID format: should start with `price_`
3. Redeploy after adding variables (wait ~1 min for deployment)

If checkout page doesn't load:
1. Check browser console for errors
2. Verify you're logged in before clicking button
3. Check Vercel logs for API errors

## Questions?

Refer to the detailed `STRIPE_SETUP_GUIDE.md` in this directory.
