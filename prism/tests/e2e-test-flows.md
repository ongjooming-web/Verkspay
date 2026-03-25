# Prism: End-to-End Test Flows

Use this document to manually test every feature on Prism. 
Test with both your Master account (Enterprise) and a fresh Trial account to catch plan-gated issues.

---

## FLOW 1: Account Signup & Onboarding

```
1. Go to https://app.prismops.xyz/signup
2. Enter a new email + password
3. ✅ Should receive a verification email (check spam if using Supabase default SMTP)
4. Click verification link in email
5. ✅ Should redirect to login or dashboard
6. Log in with the new credentials
7. ✅ Should land on Dashboard
8. Go to Settings
9. ✅ Profile should show:
 - plan: Trial
 - Status: Active
 - "15 days remaining" (or close to it)
 - Usage: 0/5 Invoices, 0/3 Payment Links, 0/5 AI Insights
10. ✅ "Choose a Plan" button should be visible

EDGE CASES:
- [ ] Try signing up with an existing email → should show error
- [ ] Try signing up with an invalid email format → should show validation error
- [ ] Try logging in before email verification → should show "verify your email" message
- [ ] Try logging in with wrong password → should show error
```

---

## FLOW 2: Client Management

```
1. Go to Clients page
2. Click "Add Client" (or equivalent button)
3. Fill in:
 - Name: "Test Client ABC"
 - Email: "testclient@example.com"
 - Phone: "+60123456789"
 - Company: "ABC Corp"
 - Address: "123 Test Street, KL"
4. Save
5. ✅ Client should appear in the clients list
6. Click on the client to view details
7. ✅ Should show all entered information
8. Edit the client — change the phone number
9. Save
10. ✅ Updated phone number should persist
11. ✅ Client should be selectable in the invoice creation form

EDGE CASES:
- [ ] Create client with only name (minimum required fields) → should work
- [ ] Create client with duplicate email → check behavior (allow or warn?)
- [ ] Delete a client → check if their invoices are handled properly
```

---

## FLOW 3: Invoice Creation (with Line Items)

```
1. Go to Invoices page
2. Click "Create Invoice" (or "New Invoice")
3. Select client: "Test Client ABC"
4. ✅ If client has past invoices, fields should auto-populate (Smart Suggestions)
5. Set Due Date: 2 weeks from today
6. Set Payment Terms: "Net 30"
7. Set Currency: "MYR"
8. Add Line Items:
 - Item 1: Description "Website Design", Qty 1, Rate 3000 → Amount should auto-calculate to 3000
 - Item 2: Description "Logo Design", Qty 2, Rate 500 → Amount should auto-calculate to 1000
9. ✅ Total should show MYR 4,000.00
10. Add Invoice Notes (optional): "Thank you for your business"
11. Click "Create Invoice"
12. ✅ Invoice should be created with status "draft" or "pending"
13. ✅ Invoice should appear in the invoices list
14. Click on the invoice to view details
15. ✅ Should show line items table: Description | Qty | Rate | Amount
16. ✅ Total should match

EDGE CASES:
- [ ] Create invoice with no line items → should show validation error
- [ ] Create invoice with 0 amount → should warn or block
- [ ] Create invoice with no client selected → should show validation error
- [ ] Create invoice with no due date → check behavior
- [ ] Remove a line item row → total should update
- [ ] Add 10+ line items → form should handle it cleanly
- [ ] Check invoice on Trial account → should count against 5/month limit
- [ ] Try creating 6th invoice on Trial → should be blocked with upgrade prompt
```

---

## FLOW 4: Invoice Smart Suggestions (Phase 2A)

```
1. Create 2-3 invoices for the SAME client with similar line items
 - Invoice 1: "Website Design" at MYR 3000, Payment Terms "Net 30"
 - Invoice 2: "Website Design" at MYR 3000, "SEO Setup" at MYR 1500, Payment Terms "Net 30"
 - Invoice 3: "Website Design" at MYR 3000, Payment Terms "Net 30"
2. Create a NEW invoice and select that same client
3. ✅ Payment Terms should auto-fill to "Net 30"
4. ✅ Currency should auto-fill to "MYR"
5. ✅ Line items should pre-populate with "Website Design" at MYR 3000 (most frequent)
6. ✅ "Suggested from history" section should show other past items like "SEO Setup"
7. ✅ Clicking "+ Add" on a suggestion should add it as a line item
8. ✅ Auto-filled fields should be editable
9. ✅ "Auto-filled from history" indicator should appear briefly

EDGE CASES:
- [ ] Select a brand new client with no history → no suggestions, form stays empty
- [ ] Select a client with only 1 past invoice → should show suggestions but with lower confidence
- [ ] API fails → form should work normally with no suggestions (silent failure)
```

---

## FLOW 5: Payment Links (Stripe)

```
1. Create an invoice (or open an existing pending invoice)
2. Click "Create Payment Link" (or "Generate Link")
3. ✅ Should generate a Stripe Checkout link
4. ✅ Link should be displayed/copyable
5. Open the payment link in an incognito browser
6. ✅ Should show Stripe Checkout page with correct amount and description
7. Pay using Stripe test card: 4242 4242 4242 4242, any future expiry, any CVC
8. ✅ Payment should succeed
9. ✅ Stripe should redirect to success page
10. Go back to the invoice in Prism
11. ✅ Invoice status should update to "paid" (may take a few seconds for webhook)
12. ✅ Payment should appear in Payment History section

EDGE CASES:
- [ ] Cancel payment on Stripe Checkout → invoice should remain "pending"
- [ ] Try generating payment link for already paid invoice → should warn or block
- [ ] Check payment link count against plan limits
- [ ] Test with different currencies (USD, MYR)
```

---

## FLOW 6: Partial Payments

```
1. Create an invoice for MYR 2,000
2. Generate a payment link or use "Record Manual Payment"
3. Record a partial payment:
 - Amount: MYR 500
 - Payment Method: Bank Transfer
 - Payment Date: Today
 - Notes: "First installment"
4. ✅ Should save successfully (no 500 error)
5. ✅ Invoice should show:
 - Total: MYR 2,000
 - Paid: MYR 500
 - Remaining: MYR 1,500
 - Status: "partial" or still "pending"
6. ✅ Payment History should show: "MYR 500.00 via BANK TRANSFER" with correct date
7. Record another partial payment of MYR 1,500
8. ✅ Invoice should now show:
 - Paid: MYR 2,000
 - Remaining: MYR 0
 - Status: "paid"
9. ✅ No NaN or "UNKNOWN" values in Payment History

EDGE CASES:
- [ ] Try recording payment larger than remaining balance → should warn or block
- [ ] Try recording payment of MYR 0 → should block
- [ ] Record payment with no date → should default to today or show error
- [ ] Record payment with no method → should show error
- [ ] Check partial payment via Stripe (Create Link for partial amount)
```

---

## FLOW 7: Smart Reminders

```
1. Create an invoice with due date set to yesterday (already overdue)
2. ✅ Invoice should show as "overdue" in the invoices list
3. ✅ Dashboard should count it under "Overdue Invoices"
4. Check if reminder was auto-sent (or check reminder_sent_count in Supabase)
5. ✅ After 3 days overdue: first reminder should be sent/queued
6. ✅ After 7 days overdue: second reminder
7. ✅ After 14 days overdue: third reminder
8. Check reminders_log table for entries

EDGE CASES:
- [ ] Paid invoice should NOT receive reminders
- [ ] Draft invoice should NOT receive reminders
- [ ] Invoice with no due date → should not trigger reminders
- [ ] Check reminder_sent_count increments correctly
```

---

## FLOW 8: Subscription & Billing

```
SUBSCRIBE:
1. Log in with a Trial account
2. Go to Settings → Subscription & Billing
3. ✅ Should show "Trial - Active - X days remaining"
4. Click "Choose" on the Pro plan ($49/mo)
5. ✅ Should redirect to Stripe Checkout
6. Complete payment with test card 4242 4242 4242 4242
7. ✅ Should redirect back to Settings
8. ✅ Plan should now show "Pro - Active"
9. ✅ Usage limits should update (Unlimited invoices, 30 AI Insights, etc.)
10. ✅ Enterprise card should show "Choose" (upgrade), Pro should show "Current Plan"
11. Click "Manage Billing"
12. ✅ Should open Stripe Customer Portal
13. ✅ Should show payment method and invoice history

CHANGE PLAN:
14. In Stripe Portal (or Settings), upgrade to Enterprise
15. ✅ Plan should update to "Enterprise"
16. ✅ Usage limits should show unlimited

CANCEL:
17. In Stripe Portal, cancel subscription
18. ✅ Plan should revert to "Trial" with trial_expired = true
19. ✅ Should show "Choose a Plan" prompt
20. ✅ Features should be restricted again

ANNUAL BILLING:
21. Toggle to "Annual" in Choose Billing section
22. Click "Choose" on Starter
23. ✅ Stripe Checkout should show annual price ($180/year)
24. ✅ After payment, plan should show "Starter" with "Billed annually"

EDGE CASES:
- [ ] Subscribe, then try subscribing again → should not create duplicate subscriptions
- [ ] Payment fails (use test card 4000 0000 0000 0002) → should show error, plan stays trial
- [ ] Webhook fails → plan doesn't update, but retry should work
- [ ] Check Stripe Dashboard → customer, subscription, and invoices should all be clean
```

---

## FLOW 9: Plan Limits & Gating

```
Test with a STARTER plan account (or modify trial limits to test):

INVOICE LIMITS (Starter = 20/month):
1. Check Usage This Month shows correct count
2. Create invoices up to the limit
3. ✅ At limit: should show upgrade prompt when trying to create more
4. ✅ Counter should increment with each invoice created

PAYMENT LINK LIMITS (Starter = 10/month):
5. Create payment links up to the limit
6. ✅ At limit: should block with upgrade message

AI INSIGHTS LIMITS (Starter = 5/month):
7. Use AI Insights up to the limit
8. ✅ At limit: should show "You've used all X insights this month"
9. ✅ Should show upgrade prompt

MASTER ACCOUNT:
10. Log in with master account (ongjooming@gmail.com)
11. ✅ All limits should be bypassed
12. ✅ Usage should show ∞

MONTHLY RESET:
13. Check that usage counts reset at the start of each month
14. ✅ insights_usage_reset_date should update when month changes

EDGE CASES:
- [ ] API endpoints enforce limits server-side (not just frontend hiding buttons)
- [ ] Master account bypass works on ALL limit checks
```

---

## FLOW 10: Invoice PDF / Print

```
1. Open an existing invoice
2. Click "Download PDF" or "Print"
3. ✅ Should generate a clean PDF with:
 - Invoice number
 - Client name and details
 - Line items table (if line items exist)
 - Total amount
 - Due date
 - Payment terms
 - Your business details
4. ✅ PDF should be downloadable
5. ✅ For old invoices without line items: should show single description + amount

EDGE CASES:
- [ ] Invoice with very long description → should wrap properly
- [ ] Invoice with 20+ line items → should paginate or fit
- [ ] Invoice with special characters in description → should render correctly
```

---

## FLOW 11: Dashboard

```
1. Log in and go to Dashboard
2. ✅ Should show summary cards:
 - Paid Revenue (total from paid invoices)
 - Pending Amount (total from pending invoices)
 - Overdue Invoices (count)
3. ✅ Numbers should match actual invoice data
4. ✅ Recent invoices list should show latest invoices
5. Create a new paid invoice → refresh dashboard
6. ✅ Paid Revenue should increase
7. Create an overdue invoice → refresh
8. ✅ Overdue count should increase

EDGE CASES:
- [ ] New account with no invoices → should show zeros, not errors
- [ ] Dashboard with mixed currencies → check how it handles MYR + USD
```

---

## FLOW 12: Settings & Profile

```
1. Go to Settings
2. Update business details:
 - Business Name: "Test Business"
 - Business Email: "test@business.com"
 - Phone: "+60111111111"
 - Address: "456 Business Ave"
3. Save
4. ✅ Changes should persist after page refresh
5. ✅ Business details should appear on invoices/PDFs
6. Update profile:
 - Full Name
 - Currency preference
7. Save
8. ✅ Should persist

STRIPE CONNECT:
9. If not connected: click "Connect Stripe"
10. ✅ Should redirect to Stripe onboarding
11. Complete onboarding
12. ✅ Should show "Connected" status
13. ✅ Payment links should now work

EDGE CASES:
- [ ] Save with empty required fields → should show validation
- [ ] Upload business logo → should persist and show on invoices
- [ ] Stripe Connect callback updates stripe_onboarding_complete correctly
```

---

## FLOW 13: Navigation & General UX

```
1. ✅ All nav links work: Dashboard, Clients, Invoices, Pricing, Proposals, Settings
2. ✅ Logout button works → redirects to login
3. ✅ Accessing any page while logged out → redirects to login
4. ✅ Accessing /dashboard directly while logged in → works
5. ✅ Mobile responsive: test on phone or browser dev tools (375px width)
6. ✅ No console errors on any page (except Talisman extension — that's your browser)
7. ✅ Page load times are reasonable (< 3 seconds)

EDGE CASES:
- [ ] Refresh any page → should not lose auth state
- [ ] Open multiple tabs → should all be authenticated
- [ ] Session expiry → should redirect to login gracefully
```

---

## Test Accounts Needed

| Account | Email | Plan | Purpose |
|---------|-------|------|---------|
| Master | ongjooming@gmail.com | Enterprise (bypass all) | Test all features without limits |
| Trial | fresh signup | Trial | Test limits, upgrade flow, trial expiry |
| Starter | subscribe to Starter | Starter | Test Starter limits |
| Pro | subscribe to Pro | Pro | Test Pro limits |

## Stripe Test Cards

| Card | Result |
|------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 3220 | Requires 3D Secure |

---

## Bug Tracking

As you test, log any bugs here:

| # | Flow | Step | Expected | Actual | Status |
|---|------|------|----------|--------|--------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
