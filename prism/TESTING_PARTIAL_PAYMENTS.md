# End-to-End Testing: Partial Payments (2026-03-19)

## Test Objective
Verify that partial payments flow works end-to-end:
1. Create invoice (amount: $200)
2. Generate partial Stripe payment link (amount: $50)
3. Complete payment via Stripe
4. Verify DB updates: `amount_paid = $50`, `remaining_balance = $150`, `status = paid_partial`
5. Verify payment_records table has entry

---

## Prerequisites
- ✅ User logged in to app.prismops.xyz
- ✅ At least 1 client created
- ✅ Stripe test mode enabled
- ✅ Test card: `4242 4242 4242 4242` (Exp: 12/26, CVC: 123)

---

## Test Steps

### Step 1: Create Invoice
1. Go to `/invoices`
2. Click "+ Create Invoice"
3. Fill in:
   - Client: Pick existing client
   - Amount: `$200.00`
   - Due Date: `2026-04-19` (30 days out)
   - Description: "Test partial payment invoice"
4. Click "Create"
5. **Expected:** Invoice created with `status: unpaid`, `amount_paid: 0`, `remaining_balance: $200`
6. **Verify in DB:** Run in Supabase SQL Editor:
   ```sql
   SELECT id, invoice_number, amount, amount_paid, remaining_balance, status 
   FROM invoices 
   WHERE invoice_number LIKE 'INV-%' 
   ORDER BY created_at DESC LIMIT 1;
   ```
   Expected: `amount_paid: 0`, `remaining_balance: 200`, `status: unpaid`

---

### Step 2: Navigate to Invoice Detail
1. From invoices list, click on the invoice you just created
2. Scroll down to "💜 Partial Payments" card
3. **Expected:** See:
   - Total Amount: $200.00
   - Amount Paid: $0.00
   - Remaining: $200.00
   - Two buttons: "💰 Record Manual" and "💳 Create Link"

---

### Step 3: Create Partial Stripe Payment Link
1. Click "💳 Create Link" button
2. Modal opens: "Create Partial Payment Link"
3. Fill in:
   - Payment Amount: `$50.00` (should be pre-filled with $200, change it)
   - Client Email: `test@example.com`
4. Click "💳 Create Link"
5. **Expected:** 
   - Modal changes to "✅ Link Created!" screen
   - Shows the payment link (long URL)
   - "📋 Copy Link" and "🔗 Open Link" buttons

---

### Step 4: Make Payment via Stripe
1. Click "🔗 Open Link" (opens in new tab)
2. **Expected:** Stripe Payment Link page shows:
   - Item: "Partial Payment - Invoice INV-XXXXX"
   - Amount: $50.00
   - Payment method form
3. Fill in payment details:
   - Email: `test@example.com`
   - Card: `4242 4242 4242 4242`
   - Exp: `12/26`
   - CVC: `123`
4. Click "Pay $50.00"
5. **Expected:** Payment succeeds, redirects to success page or closes

---

### Step 5: Verify Database Updates
After payment completes, go to Supabase SQL Editor and run:

```sql
-- Check invoice totals updated
SELECT id, amount, amount_paid, remaining_balance, status 
FROM invoices 
WHERE id = '[INVOICE_ID]';
```

**Expected output:**
```
id: [uuid]
amount: 200
amount_paid: 50
remaining_balance: 150
status: paid_partial
```

---

### Step 6: Verify Payment Records Table
```sql
SELECT id, invoice_id, amount, payment_method, payment_date 
FROM payment_records 
WHERE invoice_id = '[INVOICE_ID]';
```

**Expected:** At least 1 record with:
- amount: 50
- payment_method: null (auto-filled by webhook)
- payment_date: TODAY

---

### Step 7: Verify UI Updates
1. Go back to invoice detail page
2. Refresh the page
3. **Expected:** Partial Payments card now shows:
   - Amount Paid: $50.00 (green)
   - Remaining: $150.00 (red)
4. Scroll down to "Payment History" section
5. **Expected:** See payment record with:
   - $50.00 via [stripe/payment method]
   - Today's date

---

### Step 8: Test Manual Partial Payment Recording
1. Click "💰 Record Manual" button
2. Modal opens: "Record Manual Payment"
3. Fill in:
   - Amount: `$75.00` (partial of remaining $150)
   - Payment Method: "Bank Transfer"
   - Date: Today
   - Notes: "Wire transfer received"
4. Click "💾 Save Payment"
5. **Expected:** Alert: "✅ Payment recorded successfully!"

---

### Step 9: Verify Second Payment Updated DB
```sql
SELECT amount_paid, remaining_balance, status 
FROM invoices 
WHERE id = '[INVOICE_ID]';
```

**Expected:**
```
amount_paid: 125
remaining_balance: 75
status: paid_partial
```

---

### Step 10: Test Final Payment to Mark as Paid
1. Record another manual payment for $75.00
2. **Expected:**
   - Alert confirms success
   - DB shows: `amount_paid: 200`, `remaining_balance: 0`, `status: paid`

---

### Step 11: Verify Payment History Shows All
1. Go back to invoice detail
2. Scroll to "Payment History"
3. **Expected:** See all 3 transactions:
   - $50 (Stripe)
   - $75 (Bank Transfer)
   - $75 (Bank Transfer)

---

## Success Criteria

| Step | Expected Result | Status |
|------|-----------------|--------|
| Step 1 | Invoice created with unpaid status | ☐ |
| Step 2 | Partial Payments card displays correctly | ☐ |
| Step 3 | Shareable Stripe link generated | ☐ |
| Step 4 | Stripe payment succeeds | ☐ |
| Step 5 | amount_paid = 50, remaining_balance = 150 | ☐ |
| Step 6 | Payment record created in DB | ☐ |
| Step 7 | UI auto-refreshes with new totals | ☐ |
| Step 8 | Manual payment modal works | ☐ |
| Step 9 | Manual payment updates DB (125 paid) | ☐ |
| Step 10 | Final payment marks invoice as paid | ☐ |
| Step 11 | Payment history shows all transactions | ☐ |

---

## Known Issues / Edge Cases to Test

### Edge Case A: Overpayment
1. Invoice has $150 remaining
2. Try to record payment for $200
3. **Expected:** Error: "Amount cannot exceed remaining balance: $150.00"

### Edge Case B: Zero Payment
1. Try to record $0 payment
2. **Expected:** Error: "Amount must be greater than 0"

### Edge Case C: Webhook Delay
1. After Stripe payment, if DB doesn't update immediately
2. **Workaround:** Hard refresh (Ctrl+Shift+R) or wait 5 seconds
3. **Expected:** Webhook should fire within 5 seconds

---

## Rollback Plan (If Issues Found)

If partial payments don't work:
1. Check Vercel logs for API endpoint errors
2. Check webhook delivery in Stripe dashboard
3. Verify RESEND_API_KEY is set (for reminders, not partial payments, but affects overall system)
4. Check Supabase RLS policies on payment_records table

---

## Test Date & Tester
- **Date:** 2026-03-19
- **Tester:** Zeerac
- **Result:** ☐ PASS / ☐ FAIL

---

## Notes
- This test is CRITICAL before moving to public launch
- If all steps pass, partial payments feature is PRODUCTION READY
- If any step fails, document the error and create a bug issue
- Do not proceed to Step 1 (Payment Page Redesign) until this passes
