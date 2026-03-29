# Production Checklist - WalletConnect & Payment Flow Fix

## Pre-Deployment Verification

### Code Review ✓
- [x] All files have been edited with proper error handling
- [x] No syntax errors (TypeScript compilation passes)
- [x] No breaking changes to existing APIs
- [x] Backward compatible with previous versions
- [x] All imports are correct

### Type Safety ✓
- [x] All TypeScript types are properly defined
- [x] No `any` types unless necessary
- [x] Function signatures are correct
- [x] Props are properly typed

### Testing Requirements

#### Unit Tests (if applicable)
- [ ] Address validators work correctly
- [ ] Mobile detection works on all platforms
- [ ] Session storage operations work
- [ ] Database queries return expected results

#### Integration Tests
- [ ] Wallet connection flow completes end-to-end
- [ ] Mark as paid updates database correctly
- [ ] Invoice list refreshes after payment
- [ ] Mobile deep linking works on real devices

#### Manual Testing

**Desktop Testing:**
- [ ] Chrome: Connect MetaMask → address saves → refresh shows address
- [ ] Firefox: Connect MetaMask → verify same as Chrome
- [ ] Safari: Connect MetaMask → verify same as Chrome
- [ ] Desktop: Mark as paid → invoice shows paid immediately
- [ ] Desktop: Invoice list shows updated status

**Mobile Testing (Real Devices Required):**
- [ ] iPhone Safari: Connect MetaMask → opens app → returns → address saved
- [ ] iPhone Safari: Connect Phantom → opens app → returns → address saved
- [ ] Android Chrome: Connect MetaMask → opens app → returns → address saved
- [ ] Android Chrome: Connect Phantom → opens app → returns → address saved
- [ ] iOS Firefox: Verify MetaMask works (deeplink support varies)
- [ ] Android Firefox: Verify MetaMask works

**Error Scenarios:**
- [ ] Wallet app not installed → clear error message
- [ ] User rejects connection → graceful fallback
- [ ] Network error during save → error toast with retry option
- [ ] Address format invalid → validation error before save
- [ ] Database write fails → clear error message

### Database Verification

Before production deployment, verify:

```sql
-- 1. Profiles table has wallet columns
SELECT column_name FROM information_schema.columns 
WHERE table_name='profiles' 
AND column_name IN ('wallet_address', 'usdc_network', 'payment_method');
-- Should return 3 rows

-- 2. Payment intents table exists
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='payment_intents');
-- Should return true

-- 3. RLS policies allow user updates
SELECT * FROM pg_policies WHERE table_name='profiles';
-- Should include "Users can update their own profile"

-- 4. No stale data
SELECT COUNT(*) FROM profiles WHERE wallet_address IS NOT NULL;
-- Check reasonable count
```

### API Verification

Test these endpoints with real data:

```bash
# 1. POST /api/invoices/{id}/mark-paid
curl -X POST https://your-domain.com/api/invoices/uuid-here/mark-paid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {jwt_token}" \
  -d '{}' \
  | jq .

# Expected response:
# {
#   "success": true,
#   "invoice": { "id": "...", "status": "paid", ... },
#   "paymentIntent": { ... },
#   "message": "Invoice marked as paid"
# }
```

### Performance Testing

Measure these in production:

1. **Wallet Connection Time**
   - Desktop: Should complete in <1 second
   - Mobile: Should redirect in ~100ms
   - Total verification: <500ms

2. **Mark as Paid Time**
   - API call: <100ms
   - Database update: <200ms
   - Verification query: <100ms
   - Total: <500ms
   - UI should show "Saving..." during this time

3. **Dashboard Refresh**
   - Invoice list re-fetch: <300ms
   - Should be imperceptible to user

### Monitoring & Logging

Set up monitoring for:

```javascript
// Error tracking (Sentry, LogRocket, etc.)
- [WalletConnect] Mobile wallet error
- [WalletConnect] Error saving mobile wallet
- [mark-paid] Invoice update error
- [mark-paid] Payment intent error

// Success tracking
- Wallet connections per day
- Mark as paid conversions
- Mobile vs desktop split
- By network (Base/Ethereum/Solana)
```

### Deployment Steps

1. **Backup Database**
   ```bash
   # On Supabase, create backup
   # Settings → Backups → Create Manual Backup
   ```

2. **Deploy Code**
   ```bash
   # Merge PR to main
   # Deploy to production (vercel, netlify, etc.)
   # Monitor deployment logs for errors
   ```

3. **Smoke Test**
   - [ ] Login to Verkspay
   - [ ] Navigate to Settings
   - [ ] Try to connect wallet (don't complete)
   - [ ] Go to Invoices
   - [ ] Click an invoice
   - [ ] Try mark as paid
   - [ ] Check database for updates

4. **Monitor for 24 Hours**
   - [ ] Check error logs hourly
   - [ ] Monitor database query performance
   - [ ] Check user feedback channels
   - [ ] Verify payment intents are being created

5. **Gradual Rollout (Optional)**
   - Deploy to canary 10% first
   - Monitor for 2 hours
   - Gradual increase to 25%, 50%, 100%
   - Have rollback plan ready

### Rollback Plan

If issues arise:

```bash
# 1. Immediate: Revert code to previous version
git revert {commit-hash}
npm run build && npm run deploy

# 2. Restore database from backup
# Supabase → Backups → Restore

# 3. Clear application state
localStorage.clear()
sessionStorage.clear()
```

### Post-Deployment

After successful deployment:

1. **Documentation**
   - [ ] Update README with mobile support info
   - [ ] Update API docs if needed
   - [ ] Add troubleshooting section to wiki

2. **User Communication**
   - [ ] Send email to users about mobile wallet support
   - [ ] Update in-app notification if available
   - [ ] Post in community channels

3. **Analytics**
   - [ ] Track wallet connection success rate
   - [ ] Track mark as paid usage
   - [ ] Compare mobile vs desktop usage
   - [ ] Monitor error rate by error type

4. **Performance Monitoring**
   - [ ] Set up alerts for failed mark-paid requests
   - [ ] Monitor database query times
   - [ ] Track user session errors
   - [ ] Monitor API response times

---

## Verification Commands

### Verify Deployed Code

```bash
# 1. Check that files are deployed
curl https://your-domain.com/_next/static/chunks/... | grep "MOBILE_DETECTION"
# Should find the mobile detection code

# 2. Check API endpoint is working
curl -I https://your-domain.com/api/invoices/test/mark-paid
# Should return 401 (unauthorized) not 404
```

### Database Health Check

```sql
-- Check invoice status distribution
SELECT status, COUNT(*) as count FROM invoices GROUP BY status;

-- Check payment intents exist
SELECT COUNT(*) as payment_intents FROM payment_intents;

-- Check wallet adoption
SELECT 
  COUNT(*) as total_users,
  COUNT(wallet_address) as wallets_connected,
  ROUND(100.0 * COUNT(wallet_address) / COUNT(*), 2) as adoption_rate
FROM profiles;

-- Check networks used
SELECT usdc_network, COUNT(*) FROM profiles 
WHERE wallet_address IS NOT NULL 
GROUP BY usdc_network;
```

### Browser Console Verification

On production, open DevTools and check:

```javascript
// 1. Mobile detection works
console.log('isMobile:', MOBILE_DETECTION.isMobile())

// 2. Can query Supabase
const { data } = await supabase.auth.getUser()
console.log('Current user:', data.user?.id)

// 3. Can reach profiles table
const { data: profile } = await supabase.from('profiles').select('*').limit(1).single()
console.log('Sample profile:', profile)
```

---

## Known Issues & Workarounds

### Issue: Mobile wallet deeplink slow on Android

**Workaround:**
- Add 2-second timeout before showing error
- Provide manual fallback (copy address from modal)
- Document that Firefox may be slower than Chrome

### Issue: Phantom doesn't auto-return to Safari

**Workaround:**
- Show instructions: "After approving in Phantom, tap Safari to return"
- Implement fallback check on page load (implemented via checkMobileWalletReturn)

### Issue: WalletConnect modal incompatible with mobile

**Note:** This is intentional - we use deeplinks on mobile for better UX than modal.

---

## Success Metrics

Track these KPIs post-deployment:

| Metric | Target | Actual |
|--------|--------|--------|
| Wallet connection success rate | >95% | ? |
| Mark as paid success rate | >95% | ? |
| Mobile adoption rate | >20% | ? |
| Average connection time | <1s | ? |
| Average mark-as-paid time | <500ms | ? |
| Error rate | <5% | ? |

---

## Communication Template

**For Team:**
```
The WalletConnect & Payment Flow fix is now live. 

Key changes:
✓ Wallet addresses now persist reliably with verification
✓ "Mark as paid" immediately updates the invoice list
✓ Mobile users get native wallet app experience (no more modal)
✓ Comprehensive debug logging for troubleshooting

If you see issues, check WALLET_FIX_DEBUG.md or MOBILE_WALLET_TESTING.md

Monitor logs for [WalletConnect], [mark-paid], and [USDCPaymentCard] messages.
```

**For Users:**
```
We've improved wallet connections:

📱 Mobile: Wallet connections now work with your native app
💰 Faster: "Mark as paid" instantly updates your invoice list
✅ Reliable: Wallet address is always verified and saved

Try connecting your wallet in Settings → Connect Wallet
```

---

## Final Checklist Before Go-Live

- [ ] All tests passing
- [ ] Code review approved
- [ ] Database backups created
- [ ] Rollback plan documented
- [ ] Monitoring set up
- [ ] Team notified
- [ ] Documentation updated
- [ ] Support team briefed
- [ ] Mobile devices tested (real iOS + Android)
- [ ] Error scenarios tested
- [ ] Performance acceptable
- [ ] Security review passed
- [ ] Ready for production ✅

---

**Deployment Date:** [DATE]
**Deployed By:** [PERSON]
**Verified By:** [PERSON]
**Status:** ⬜ Not Started | 🟡 In Progress | 🟢 Deployed

