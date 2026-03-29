# Master Test Account Setup

This document explains how to set up a master test account that bypasses all plan restrictions for comprehensive feature testing.

## Overview

A master test account is identified by email address (via environment variable) and automatically receives:
- ✅ Unlimited invoices (no monthly limits)
- ✅ Unlimited payment links (no monthly limits)
- ✅ Unlimited AI insights (no per-month quotas)
- ✅ No trial expiration
- ✅ All features enabled regardless of plan
- ✅ No usage tracking or enforcement

This is **server-side only** — the frontend never knows about master status; it just sees all features work.

## Setup Steps

### 1. Set Environment Variable

Add to `.env.local` (local testing) and Vercel (production):

```
MASTER_TEST_EMAILS=ongjooming@gmail.com
```

**Multiple emails:**
```
MASTER_TEST_EMAILS=ongjooming@gmail.com,test@example.com,dev@company.com
```

### 2. Create the Account (Any Method)

You can create the account in any way:
- Normal signup at https://app.Verkspayops.xyz/signup
- Via Supabase Dashboard
- Via your auth system
- Or request access from admin

The email must match exactly what you set in `MASTER_TEST_EMAILS` (case-insensitive).

### 3. Start Testing

Once the account is created and email is in the environment variable, all limits are automatically bypassed.

## What Gets Bypassed

### Invoice Creation Limits
- **Trial:** 5 invoices/month → **Unlimited**
- **Starter:** 20 invoices/month → **Unlimited**
- **Pro:** Unlimited → **Unlimited** (no change)
- **Enterprise:** Unlimited → **Unlimited** (no change)

### Payment Link Limits
- **Trial:** 3 payment links/month → **Unlimited**
- **Starter:** 10 payment links/month → **Unlimited**
- **Pro:** Unlimited → **Unlimited** (no change)
- **Enterprise:** Unlimited → **Unlimited** (no change)

### AI Insights Limits
- **Trial:** 5 insights/month → **Unlimited**
- **Starter:** 5 insights/month → **Unlimited**
- **Pro:** 30 insights/month → **Unlimited**
- **Enterprise:** Unlimited → **Unlimited** (no change)

### Trial Expiration
- Normal users: Trial expires after 15 days
- **Master account:** Never expires

### Feature Access
- All features enabled
- Can access all tier functionality
- No subscription status enforcement

## Technical Implementation

### Utility Function
File: `src/utils/isMasterAccount.ts`

```typescript
export function isMasterAccount(email: string | undefined | null): boolean {
  const masterEmails = process.env.MASTER_TEST_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
  return masterEmails.includes(email?.toLowerCase())
}
```

### Usage in API Routes

Anywhere you check limits or subscription status:

```typescript
import { isMasterAccount } from '@/utils/isMasterAccount'

// In your API route handler:
const userEmail = user.email

// Check invoices this month
if (isMasterAccount(userEmail)) {
  // Skip limit check - master accounts have unlimited invoices
} else {
  // Normal limit checking logic
}

// Check AI insights quota
if (isMasterAccount(userEmail)) {
  // Allow unlimited insights
} else {
  // Apply quota limits based on plan
}
```

## Testing Checklist

Use the master test account to verify:

- [ ] Create unlimited invoices in a single month
- [ ] Generate unlimited payment links
- [ ] Access AI Insights without quota limits
- [ ] Use all features from all tiers simultaneously
- [ ] Verify no trial countdown
- [ ] Create 100+ invoices to test UI/performance
- [ ] Generate insights multiple times per day
- [ ] Test partial payments, smart reminders, etc.

## Security Notes

⚠️ **Important:**
- Only set `MASTER_TEST_EMAILS` in development/staging
- In production, use a separate staging environment
- Treat like a production admin credential
- Change emails if team turnover occurs
- Document who has master account access
- Monitor master account activity in logs

## Troubleshooting

### "Master account not working"
- Verify email is in `MASTER_TEST_EMAILS` (case-insensitive match)
- Restart your dev server after changing `.env.local`
- Check that Vercel environment variable is set (for production)
- Confirm email matches exactly (check for trailing spaces)

### "Still seeing limits"
- Ensure the function is imported in the relevant API route
- Check that limit enforcement code includes the bypass
- Look at server logs to confirm `isMasterAccount()` returned true

### "Which endpoints need the check?"
All endpoints that enforce:
- Plan limits (invoices, payment links, insights)
- Trial expiration
- Feature gating
- Usage quotas

See the code for imports of `isMasterAccount` to find all locations.

## Removing Master Access

To remove master access:
1. Remove email from `MASTER_TEST_EMAILS`
2. Optionally delete the account via Supabase Dashboard

The account itself isn't special — it's just treated specially by the environment variable.

## Testing Different Plans

Master account gets all features. To test a specific plan:
1. Create normal accounts with different tiers
2. Create paid subscriptions in Stripe test mode
3. Test with Trial accounts separately

Use master account only when you need to bypass all restrictions.
