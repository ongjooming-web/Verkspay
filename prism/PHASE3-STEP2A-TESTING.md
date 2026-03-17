# Phase 3 Step 2A - Testing & Deployment Checklist

**Target Date:** 2026-03-17  
**Status:** Ready for Testing

---

## Pre-Deployment Checklist

### ✅ Code Quality
- [x] All TypeScript types properly defined
- [x] Error handling implemented
- [x] Security checks (JWT, ownership verification)
- [x] Comments added for clarity
- [x] No console errors or warnings
- [x] Consistent code style

### ✅ API Endpoint
- [x] Route created: `/src/app/api/invoices/[id]/mark-paid/route.ts`
- [x] JWT token validation implemented
- [x] User ownership check (RLS) implemented
- [x] Wallet connection validation
- [x] Invoice status update logic
- [x] Payment intent create/update logic
- [x] Error handling for all cases
- [x] Returns proper JSON responses

### ✅ Component Updates
- [x] USDCPaymentCard component updated with:
  - [x] New `onPaymentMarked` callback prop
  - [x] `handleMarkAsPaid` function
  - [x] Loading state management
  - [x] Error message display
  - [x] Success message display
  - [x] Button with proper styling
  - [x] Auto-hide success message after 3s

### ✅ Page Updates
- [x] Invoice Detail page updated with callback
- [x] Auto-refresh of invoice details after mark as paid
- [x] Auto-refresh of payment records

### ✅ Database Schema
- [x] Invoice table has required columns (already exists)
- [x] Payment intent table has required columns (already exists)
- [x] RLS policies in place (already exists)

---

## Pre-Deployment Test Checklist

### Environment Setup
- [ ] Clone/pull latest code
- [ ] Install dependencies: `npm install`
- [ ] Set environment variables:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (backend only)
- [ ] Supabase project connected and ready
- [ ] Database migrations complete

### Local Testing
- [ ] Run dev server: `npm run dev`
- [ ] Test invoice creation flow
- [ ] Test wallet connection in Settings
- [ ] Navigate to invoice detail page
- [ ] Verify "Mark as Paid (Test)" button appears
- [ ] Verify button is disabled if wallet not connected
- [ ] Verify wallet connection error message shows

### Functional Testing

#### Test 1: Basic "Mark as Paid" Flow
**Steps:**
1. Create new invoice for $100
2. Open invoice detail page
3. Ensure wallet is connected (check Settings)
4. Click "Mark as Paid (Test)" button
5. Watch for loading state
6. Expect success message with transaction ID

**Expected Results:**
- ✅ Button shows loading spinner
- ✅ Success message appears in 2-3 seconds
- ✅ Transaction ID shown (format: `manual-test-{timestamp}`)
- ✅ Invoice status changes to "Paid"
- ✅ Green badge appears ("✓ Paid")
- ✅ USDC Payment Card disappears
- ✅ Payment history section shows new payment

**Failure Cases:**
- If button doesn't change state → Check browser console for errors
- If success message doesn't appear → Check network tab (F12)
- If invoice doesn't update → Refresh page and check again

#### Test 2: Wallet Not Connected
**Steps:**
1. Create invoice
2. Do NOT connect wallet in Settings
3. Go to invoice detail page
4. Look for error message about wallet

**Expected Results:**
- ✅ Error message: "Wallet not connected. Please connect a wallet in Settings."
- ✅ "Mark as Paid (Test)" button appears
- ✅ Clicking button shows error: "Wallet address not found"

#### Test 3: Already Paid Invoice
**Steps:**
1. Mark invoice as paid (from Test 1)
2. Refresh page or navigate away and back
3. Go to that same invoice detail page

**Expected Results:**
- ✅ "Mark as Paid (Test)" button does NOT appear
- ✅ USDC Payment Card does NOT appear
- ✅ Invoice shows "✓ Paid" status badge
- ✅ Payment history shows the payment

#### Test 4: Double-Click Prevention
**Steps:**
1. Go to unpaid invoice
2. Quickly click "Mark as Paid (Test)" button twice
3. Watch the response

**Expected Results:**
- ✅ First click works normally (success message)
- ✅ Second click is ignored (button still disabled)
- ✅ Only one payment record created

#### Test 5: Transaction ID Format
**Steps:**
1. Mark invoice as paid
2. Check success message
3. Check payment history record
4. Check Supabase payment_intents table

**Expected Results:**
- ✅ Transaction ID format: `manual-test-{10-digit-timestamp}`
- ✅ Example: `manual-test-1710688020000`
- ✅ Matches timestamp of when button was clicked

#### Test 6: Payment Intent Record
**Steps:**
1. Mark invoice as paid
2. Open Supabase console
3. Check `payment_intents` table

**Expected Results:**
- ✅ New record created with:
  - `invoice_id` = correct invoice ID
  - `user_id` = correct user ID
  - `status` = "paid"
  - `transaction_hash` = "manual-test-{timestamp}"
  - `wallet_address` = user's connected wallet
  - `amount_usdc` = invoice amount
  - `network` = user's selected network
  - `completed_at` = current timestamp

#### Test 7: Invoice Table Update
**Steps:**
1. Mark invoice as paid
2. Open Supabase console
3. Check `invoices` table

**Expected Results:**
- ✅ Invoice record updated with:
  - `status` = "paid"
  - `paid_date` = timestamp of marking
  - `payment_method` = "usdc"
  - `updated_at` = current timestamp

#### Test 8: Multiple Invoices
**Steps:**
1. Create 3 invoices
2. Mark 2 of them as paid
3. Check invoice list page

**Expected Results:**
- ✅ Paid invoices show "✓ Paid" badge (not "💰 USDC Ready")
- ✅ Unpaid invoice still shows "💰 USDC Ready" badge
- ✅ Stats show correct pending amount (only unpaid invoice)
- ✅ Stats show correct paid revenue (both paid invoices)

---

## Deployment Steps

### Step 1: Build & Verify
```bash
# Install dependencies
npm install

# Build project
npm run build

# Check for errors
npm run lint
```

### Step 2: Deploy
**Option A: Vercel**
```bash
# If using Vercel
vercel deploy --prod
```

**Option B: Self-hosted**
```bash
# Build and start
npm run build
npm run start
```

### Step 3: Post-Deployment Verification
- [ ] Access production website
- [ ] Test creating invoice
- [ ] Test connecting wallet
- [ ] Test "Mark as Paid" button
- [ ] Verify success message
- [ ] Check Supabase records created
- [ ] Verify invoice updates to "Paid"

### Step 4: Monitoring
- [ ] Monitor error logs
- [ ] Check Supabase console for errors
- [ ] Verify database records are correct
- [ ] Check API response times

---

## Browser Compatibility Testing

### Chrome/Edge
- [ ] Test on latest version
- [ ] Verify button styling
- [ ] Verify animations (spinner, gradient)
- [ ] Verify error/success messages

### Firefox
- [ ] Test on latest version
- [ ] Verify all functionality works

### Safari
- [ ] Test on latest version
- [ ] Check if any CSS issues

### Mobile (iOS/Android)
- [ ] Test on mobile Chrome
- [ ] Verify touch interactions work
- [ ] Verify responsive layout
- [ ] Verify button is clickable

---

## Edge Cases & Error Handling

### Test: API Connection Failure
**Scenario:** User clicks button but API is down
**Expected:** Error message "Failed to mark invoice as paid"
**Status:** [ ]

### Test: Slow Network
**Scenario:** User clicks button on slow network (3G)
**Expected:** Loading state visible, button disabled, eventually success or error
**Status:** [ ]

### Test: Session Timeout
**Scenario:** User's session expires while marking as paid
**Expected:** Error message "Authentication token not found"
**Status:** [ ]

### Test: Concurrent Requests
**Scenario:** Two tabs open, marking same invoice in both
**Expected:** First succeeds, second fails with "Invoice is already marked as paid"
**Status:** [ ]

---

## Performance Testing

### Load Time
- [ ] Page loads in < 3 seconds
- [ ] Button clickable within 2 seconds
- [ ] API response time < 1 second

### Database Queries
- [ ] Maximum 5 queries per mark as paid action:
  1. Fetch invoice (RLS check)
  2. Fetch profile (wallet check)
  3. Fetch existing payment intent
  4. Update invoice
  5. Update/insert payment intent
- [ ] No N+1 queries

---

## Security Testing

### Authorization
- [ ] Cannot access another user's invoice
- [ ] Cannot mark another user's invoice as paid
- [ ] JWT token validation working

### Input Validation
- [ ] Invoice ID is valid UUID format
- [ ] No SQL injection possible
- [ ] No XSS in error messages

### Data Protection
- [ ] Wallet addresses not exposed in frontend console
- [ ] API errors don't leak sensitive info
- [ ] Timestamps are correct (server time, not client)

---

## Documentation Review

- [ ] Implementation guide complete
- [ ] Code comments clear
- [ ] Error messages user-friendly
- [ ] Testing guide comprehensive
- [ ] Deployment steps clear

---

## Sign-Off Checklist

### Code Quality
- [ ] All tests pass
- [ ] No console errors
- [ ] TypeScript strict mode happy
- [ ] Code formatted consistently
- [ ] Comments are helpful

### Functionality
- [ ] Core feature works: Mark as Paid
- [ ] Success flow works: Invoice marked, payment intent created
- [ ] Error flows work: All error cases handled
- [ ] UI/UX flows work: Loading states, messages, auto-refresh

### Deployment
- [ ] Build succeeds without errors
- [ ] No warnings in build output
- [ ] Production environment ready
- [ ] All secrets configured
- [ ] Database ready

### Ready for Phase 2B?
- [ ] "Mark as Paid" button fully functional
- [ ] Payment intent records created correctly
- [ ] Test transaction hashes generated
- [ ] Ready for webhook integration

---

## Known Limitations (By Design)

1. **No Real Blockchain Verification** - This is intentional for testing
2. **No Automatic Payment Detection** - Phase 2B adds webhook integration
3. **No Email Notifications** - Phase 2B feature
4. **Test Transaction Hashes** - Format: `manual-test-{timestamp}` (clear indicator of test vs real)

---

## Next Steps After Successful Testing

1. **Deploy to Production**
   - Push code to main branch
   - Deploy via Vercel/hosting
   - Verify in production

2. **Monitor & Support**
   - Watch error logs
   - Address any issues
   - Document any learnings

3. **Prepare for Phase 2B**
   - Review webhook integration requirements
   - Set up Alchemy account
   - Prepare webhook signature verification

4. **Communication**
   - Document changes for users
   - Provide testing feedback to team
   - Update roadmap

---

## Rollback Plan

If critical issues found in production:

1. **Immediate:**
   ```bash
   # Revert to previous version
   git revert <commit-hash>
   git push
   ```

2. **Database:**
   - Manual records can be deleted from `payment_intents` table
   - Manual records can be deleted from `invoices` (set status back to original)

3. **Communication:**
   - Notify users of temporary issue
   - Provide ETA for fix
   - Resume testing once issues resolved

---

## Support & Issues

### Common Issues & Solutions

**Q: Button doesn't appear**
- A: Check if wallet is connected in Settings
- A: Verify invoice status is not "paid"
- A: Check browser console for errors

**Q: Button shows error about wallet**
- A: Go to Settings and connect wallet
- A: Ensure wallet has been saved
- A: Return to invoice detail page and try again

**Q: Success message appears but invoice doesn't update**
- A: Refresh page (F5)
- A: Check Supabase console for record creation
- A: Check browser console for errors

**Q: API returns 404 error**
- A: Verify you own the invoice
- A: Verify invoice ID in URL is correct
- A: Check Supabase RLS policies

**Q: "Authentication token not found" error**
- A: Log out and log back in
- A: Clear browser cookies
- A: Try in incognito/private mode

---

## Questions?

Review these documents in order:
1. `PHASE3-STEP2A-IMPLEMENTATION.md` - Technical details
2. `PHASE3-STEP2A-TESTING.md` - This file, testing & deployment
3. Code comments in:
   - `/src/app/api/invoices/[id]/mark-paid/route.ts`
   - `/src/components/USDCPaymentCard.tsx`

