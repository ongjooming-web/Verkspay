# Stripe Subscription Flow - Debugging Guide

## Current Setup

The webhook is fully configured to handle subscription purchases and cancellations.

### Webhook Endpoint
- **URL:** `https://app.verkspay.com/api/stripe/webhook`
- **Location:** `src/app/api/stripe/webhook/route.ts`
- **Events Handled:**
  - `checkout.session.completed` → Updates user plan
  - `customer.subscription.deleted` → Downgrades user to trial
  - `invoice.payment_succeeded` → Logged
  - `invoice.payment_failed` → Logged

### Required Environment Variables
All must be set in Vercel:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_ID_STARTER_ANNUAL=price_xxx
STRIPE_PRICE_ID_PRO_MONTHLY=price_xxx
STRIPE_PRICE_ID_PRO_ANNUAL=price_xxx
STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_ID_ENTERPRISE_ANNUAL=price_xxx
```

## How It Works

### 1. User Initiates Checkout
**File:** `src/app/settings/page.tsx` → `handleUpgrade()`

```typescript
POST /api/billing/create-checkout-session
{
  plan: 'pro',
  billingPeriod: 'monthly'
}
```

### 2. Checkout Session Created
**File:** `src/app/api/billing/create-checkout-session/route.ts`

```typescript
Stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId }],
  metadata: {
    userId: user.id,        // ← Required!
    plan: 'pro'             // ← Required!
  },
  customer_email: user.email,
  success_url: 'https://app.verkspay.com/dashboard?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://app.verkspay.com/pricing'
})
```

### 3. User Pays
User enters card in Stripe Checkout → Payment succeeds

### 4. Webhook Fires
**Event:** `checkout.session.completed`

**Webhook Handler Steps:**

```typescript
1. Parse event from Stripe
2. Check if userId + plan in metadata
3. If not, query line_items and detect plan from price ID using getPlanFromPriceId()
4. Update profiles table:
   - plan = 'starter'/'pro'/'enterprise'
   - subscription_status = 'active'
   - stripe_customer_id = customer ID from Stripe
5. Log the result
```

### 5. User is Upgraded
Settings page shows new plan because it reads from `profiles.plan`

## Testing Checklist

### ✅ Prerequisites
- [ ] All 6 `STRIPE_PRICE_ID_*` env vars set in Vercel
- [ ] `STRIPE_SECRET_KEY` set
- [ ] `STRIPE_WEBHOOK_SECRET` set
- [ ] Webhook registered in Stripe Dashboard (see below)

### ✅ Register Webhook in Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
   - URL: `https://app.verkspay.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded` (optional)
     - `invoice.payment_failed` (optional)
3. Click **Create endpoint**
4. Copy the **Signing secret** → Set as `STRIPE_WEBHOOK_SECRET` in Vercel

### ✅ Test Flow

1. **Create test user**
   - Sign up at https://app.verkspay.com/signup
   - Email: `test@example.com`
   - Password: `TestPassword123`

2. **Go to Settings**
   - Click Settings → Subscription
   - Should see "Trial" plan

3. **Click "Choose a Plan"**
   - Select "Starter - $19/mo" or "Pro - $49/mo"
   - Should redirect to Stripe Checkout

4. **Complete Stripe Test Payment**
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/26` (any future date)
   - CVC: `123` (any 3 digits)
   - Name: `Test User`
   - Email: `test@example.com`
   - Click **Pay**

5. **Verify Payment Succeeded**
   - Should redirect to dashboard
   - Check Stripe Dashboard → Customers
   - New customer should appear with subscription

6. **Check Database**
   - Go to Supabase Dashboard
   - Query `profiles` table
   - Find your test user by email
   - Verify:
     - `plan` = `'starter'` or `'pro'` ✅
     - `subscription_status` = `'active'` ✅
     - `stripe_customer_id` = populated ✅

7. **Check Settings Page**
   - Refresh Settings → Subscription
   - Should now show "Starter" or "Pro" (not Trial)
   - Status badge should say "Active" (green)
   - Usage should show Infinity (∞) for limits

### ✅ Test Webhook Delivery
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click your endpoint
3. Scroll to **Events**
4. Find the `checkout.session.completed` event
5. Click it → Click **View log**
6. Should see:
   - Request: `POST /api/stripe/webhook`
   - Response: `200 OK`

## Debugging

### Problem: Plan Still Shows "Trial" After Payment

**Check 1: Did webhook fire?**
```
Stripe Dashboard → Developers → Webhooks → Click endpoint → Events tab
Look for: checkout.session.completed with ✓ status
```

**Check 2: Are all price IDs set?**
```
Vercel Dashboard → Settings → Environment Variables
Confirm all 6 STRIPE_PRICE_ID_* variables exist
```

**Check 3: Check webhook logs**
```
Vercel Dashboard → Deployments → Select latest → Runtime logs
Filter: "Webhook" or "Stripe"
Look for:
- "[Webhook] checkout.session.completed detected"
- "[Webhook] Updating user subscription"
- "[Webhook] ✓ User ... upgraded to pro"
```

**Check 4: Check database directly**
```
Supabase Dashboard → SQL Editor
SELECT id, email, plan, subscription_status, stripe_customer_id 
FROM profiles 
WHERE email = 'test@example.com';
```

Expected output:
```
id | email | plan | subscription_status | stripe_customer_id
---+-------+------+---------------------+-------------------
123| test@...| pro  | active              | cus_xxx...
```

### Problem: Webhook Returns 401/403

**Check 1: Webhook secret**
```
Stripe Dashboard → Developers → Webhooks → Click endpoint → Signing secret
Copy exactly → Vercel → STRIPE_WEBHOOK_SECRET
```

**Check 2: Webhook not registered**
```
Stripe Dashboard → Developers → Webhooks
Verify endpoint exists: https://app.verkspay.com/api/stripe/webhook
```

### Problem: "Missing Stripe price ID" Error

**Check 1: Verify environment variables**
```
Vercel → Settings → Environment Variables
Ensure all STRIPE_PRICE_ID_* are set
```

**Check 2: Verify price ID format**
```
Should look like: price_1TCCRzQMMhQikSDp7fI08Hvt
NOT: STRIPE_PRICE_ID_PRO_MONTHLY (that's the ENV VAR NAME)
```

## Logs to Look For

### Successful Payment Flow
```
[Webhook] checkout.session.completed detected
[Webhook] Metadata: { userId: '123', plan: 'pro' }
[Webhook] Updating user subscription: { userId: '123', plan: 'pro', customer: 'cus_xxx', sessionId: 'cs_xxx' }
[Webhook] ✓ User 123 upgraded to pro
```

### Fallback Price ID Detection
```
[Webhook] Plan not in metadata, checking line items...
[Webhook] First line item: { price: 'price_xxx' }
[Webhook] Detected plan from price ID: pro
```

### Subscription Cancellation
```
[Webhook] Subscription canceled: { subscriptionId: 'sub_xxx', customerId: 'cus_xxx' }
[Webhook] ✓ User 123 subscription canceled, plan set to trial
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Plan doesn't update | Webhook secret wrong | Copy fresh from Stripe |
| 401 error on webhook | Invalid signature | Reset webhook secret |
| "Missing price ID" | Env var not set | Add to Vercel |
| Payment stuck on Checkout | Redirect URL wrong | Check `success_url`/`cancel_url` |
| User doesn't exist error | userId not in metadata | Check checkout session creation |

## Next Steps After Verification

If everything works:
1. Test subscription cancellation (Stripe → Customers → Cancel)
2. Test annual vs monthly pricing
3. Test switching plans (upgrade from Starter to Pro)
4. Load test with multiple concurrent purchases

