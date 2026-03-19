# TASK 4: Partial Payments End-to-End Testing Guide

**Status:** Infrastructure in place, ready for testing  
**Last Updated:** 2026-03-19 14:35 GMT+8

---

## Test Setup

### Prerequisites
- Prism app deployed on Vercel (https://prism.ongjooming.dev or equivalent)
- Stripe test keys configured in `.env`:
  - `STRIPE_SECRET_KEY` (sk_test_...)
  - `STRIPE_WEBHOOK_SECRET` (whsec_...)
- Stripe test mode enabled
- Supabase database accessible

### Test Card
```
Card Number: 4242 4242 4242 4242
Exp: 12/26
CVC: 123
```

---

## E2E Test Flow

### Step 1: Create a Test Invoice

1. **Login to app**: https://prism.ongjooming.dev/login
2. **Create invoice** at `/invoices`:
   - Client: "Test Client"
   - Amount: **$1000** (easy to split: $400 + $600)
   - Due Date: (any date)
   - Description: "Partial Payment Test"
   - **Submit** → Invoice created with ID (e.g., `inv_123`)

3. **Expected Result:**
   - Invoice appears in dashboard
   - Status: `unpaid`
   - Amount: $1000
   - Amount Paid: $0
   - Remaining Balance: $1000

---

### Step 2: Generate First Partial Payment Link

1. **Open invoice detail** page for created invoice
2. **Click "Generate Payment Link"** or equivalent button
3. **In modal:**
   - Amount to collect: **$400** (40% of total)
   - Click "Generate Stripe Link"
   - Copy payment URL

4. **Expected Result:**
   - Payment link created
   - URL returned (Stripe Checkout Session)

---

### Step 3: Complete First Partial Payment ($400)

1. **Visit payment link** in new tab
2. **Fill Stripe form:**
   - Card: 4242 4242 4242 4242
   - Exp: 12/26
   - CVC: 123
   - Name: Test User
3. **Click "Pay $400.00"**

4. **Expected Result (Success Page):**
   - Confirmation: "Payment received - $400"
   - Redirect to `/pay/[invoiceId]?payment_status=success`

---

### Step 4: Verify Invoice Updated (First Payment)

1. **Go back to invoice detail**
2. **Refresh page**

3. **Expected Result:**
   - Status: **`paid_partial`** (not `paid`)
   - Amount Paid: **$400**
   - Remaining Balance: **$600**
   - Payment appears in history

4. **Database Check (Supabase):**
   ```sql
   SELECT id, amount, amount_paid, remaining_balance, status 
   FROM invoices 
   WHERE id = '[invoice_id]';
   
   -- Should show:
   -- id: [invoice_id]
   -- amount: 1000
   -- amount_paid: 400
   -- remaining_balance: 600
   -- status: paid_partial
   
   SELECT * FROM payment_records 
   WHERE invoice_id = '[invoice_id]';
   
   -- Should show:
   -- amount: 400
   -- payment_method: stripe
   -- payment_date: [now]
   ```

---

### Step 5: Generate Second Partial Payment Link ($600)

1. **Back in invoice detail**
2. **Click "Generate Payment Link" again**
3. **In modal:**
   - Amount: **$600** (remaining balance)
   - Click "Generate Stripe Link"
4. **Copy second payment URL**

---

### Step 6: Complete Second Partial Payment ($600)

1. **Visit second payment link**
2. **Fill Stripe form** (same card)
3. **Click "Pay $600.00"**

4. **Expected Result (Success Page):**
   - Confirmation: "Payment received - $600"

---

### Step 7: Verify Invoice Fully Paid

1. **Go back to invoice detail**
2. **Refresh page**

3. **Expected Result:**
   - Status: **`paid`** (changed from `paid_partial`)
   - Amount Paid: **$1000**
   - Remaining Balance: **$0**
   - **Mark as Paid button** should be disabled (or hidden)
   - Two payments visible in history ($400 + $600)

4. **Database Check (Supabase):**
   ```sql
   SELECT id, amount, amount_paid, remaining_balance, status, paid_date
   FROM invoices 
   WHERE id = '[invoice_id]';
   
   -- Should show:
   -- status: paid
   -- amount_paid: 1000
   -- remaining_balance: 0
   -- paid_date: [now]
   
   SELECT COUNT(*) as payment_count FROM payment_records 
   WHERE invoice_id = '[invoice_id]';
   
   -- Should show: 2
   ```

---

## Webhook Verification

**Stripe sends webhook** → App receives at `/api/stripe/webhook`

### Check Stripe Dashboard

1. Go to Stripe Test Dashboard
2. **Developers → Webhooks**
3. **Look for:**
   - Event: `checkout.session.completed` (should have 2 entries)
   - Status: ✅ Delivered (not pending or failed)

### Check App Logs

1. **Vercel Dashboard**
2. **Prism Project → Deployments → [latest] → Logs**
3. **Search for:**
   ```
   [Webhook] Partial payment received for invoice
   [Webhook] Invoice [id] updated: amount_paid=$, status=
   ```

---

## Failure Modes to Test

### Test: Payment Canceled Mid-Checkout
1. Generate payment link for $300
2. Start payment, then close tab
3. **Expected:** Invoice unchanged (status still `unpaid`, amount_paid still previous value)

### Test: Duplicate Payment Detection
1. Generate payment link for $200
2. Complete payment successfully
3. **Immediately** generate same payment link again and complete (within 1 second)
4. **Expected:** Second payment should be accepted (no duplicate detection yet, but webhook idempotency should prevent double-update)

### Test: Partial Payment Exceeds Total
1. Create invoice for $500
2. Try to generate payment link for $600
3. **Expected:** Either rejected with error or capped at $500

---

## Success Criteria

| Criterion | Status |
|-----------|--------|
| ✅ Invoice created with correct amount | TBD |
| ✅ First partial payment ($400) processed | TBD |
| ✅ Invoice status updated to `paid_partial` | TBD |
| ✅ `amount_paid` and `remaining_balance` correct | TBD |
| ✅ Payment record created in DB | TBD |
| ✅ Second partial payment ($600) processed | TBD |
| ✅ Invoice status updated to `paid` | TBD |
| ✅ `paid_date` set correctly | TBD |
| ✅ Stripe webhook received and logged | TBD |
| ✅ No payment history errors | TBD |

---

## Test Report Template

```markdown
## Test Run: [Date/Time]

### Invoice Created
- Invoice ID: 
- Amount: $1000
- Status at creation: unpaid

### First Payment ($400)
- Payment link generated: ✅/❌
- Payment completed: ✅/❌
- Webhook received: ✅/❌
- Invoice status: [unpaid/paid_partial/paid]
- Amount paid: $[?]
- Remaining: $[?]

### Second Payment ($600)
- Payment link generated: ✅/❌
- Payment completed: ✅/❌
- Webhook received: ✅/❌
- Invoice status: [unpaid/paid_partial/paid]
- Amount paid: $[?]
- Remaining: $[?]

### Database Verification
- payment_records count: [?]
- Final status: [paid/paid_partial/unpaid]
- Errors: [?]

### Conclusion
✅ All tests passed / ⚠️ Issues found: [...]
```

---

## Troubleshooting

### "Payment link not generating"
- Check: STRIPE_SECRET_KEY in .env
- Check: Stripe test mode enabled
- Check: Vercel logs for errors

### "Webhook not received"
- Check: STRIPE_WEBHOOK_SECRET is correct
- Check: Webhook endpoint URL in Stripe Dashboard matches `/api/stripe/webhook`
- Check: Stripe event delivery status in Dashboard

### "amount_paid not updating"
- Check: payment_records table exists
- Check: Webhook logs for errors
- Check: Supabase RLS policies allow updates

### "Status stays 'unpaid' after payment"
- Check: Stripe webhook received (Stripe Dashboard → Events)
- Check: Webhook signature verification passing
- Check: Vercel logs show webhook processing

---

## Next Steps After Testing

1. **If ✅ All Pass:**
   - Mark TASK 4 as complete
   - Document final test results
   - Proceed to TASK 5 (smart reminders testing)

2. **If ⚠️ Issues Found:**
   - Debug webhook delivery
   - Fix DB updates
   - Re-run tests

---

**Ready to proceed with testing.** 🚀
