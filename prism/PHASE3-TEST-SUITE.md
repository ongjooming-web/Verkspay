# Phase 3 Step 1 - Test Suite

## Test Coverage

### Component Tests

#### WalletConnect Component
```typescript
describe('WalletConnect', () => {
  // Test 1: Initial State
  test('should show connect button when no wallet connected', () => {
    // Expected: Button with text "🔗 Connect Wallet"
  })

  // Test 2: Successful Connection
  test('should show connected address after wallet connection', () => {
    // Steps:
    // 1. Click "🔗 Connect Wallet"
    // 2. Approve connection
    // Expected: Address shown in format 0x1234...5678
  })

  // Test 3: Network Selection
  test('should change network when selected', () => {
    // Steps:
    // 1. Select "Base" from dropdown
    // 2. Click "🔗 Connect Wallet"
    // Expected: Network saved as 'base'
  })

  // Test 4: Persistence
  test('should persist wallet address after page reload', () => {
    // Steps:
    // 1. Connect wallet
    // 2. Reload page
    // Expected: Address still shows
  })

  // Test 5: Disconnection
  test('should remove address when disconnected', () => {
    // Steps:
    // 1. Connect wallet
    // 2. Click "🔓 Disconnect Wallet"
    // 3. Confirm dialog
    // Expected: Wallet info cleared
  })

  // Test 6: Error Handling
  test('should show error if user rejects connection', () => {
    // Steps:
    // 1. Click "🔗 Connect Wallet"
    // 2. Click "Cancel" in MetaMask
    // Expected: Error message shown
  })

  // Test 7: Read-Only Mode
  test('should disable controls in read-only mode', () => {
    // Steps:
    // 1. Mount with readOnly={true}
    // Expected: Connect button disabled, no disconnect
  })
})
```

#### QRCodeDisplay Component
```typescript
describe('QRCodeDisplay', () => {
  // Test 1: QR Generation
  test('should generate QR code with wallet address', () => {
    // Expected: Canvas element with QR code
  })

  // Test 2: ERC-681 Format (Base/Ethereum)
  test('should use ERC-681 format for Base network', () => {
    // Expected: Value = ethereum:0x...@8453
  })

  // Test 3: Solana Format
  test('should use Solana Pay format for Solana', () => {
    // Expected: Value starts with 'solana:'
  })

  // Test 4: Amount Inclusion
  test('should include amount in QR code', () => {
    // With amount={100}
    // Expected: QR includes amount data
  })

  // Test 5: Copy to Clipboard
  test('should copy address when button clicked', () => {
    // Steps:
    // 1. Click copy button
    // Expected: Address in clipboard, button shows "✓"
  })

  // Test 6: Download QR
  test('should download QR code as PNG', () => {
    // Steps:
    // 1. Click "⬇ Download QR"
    // Expected: PNG file downloads
  })
})
```

#### USDCPaymentCard Component
```typescript
describe('USDCPaymentCard', () => {
  // Test 1: Display for Unpaid Invoice
  test('should show payment card for unpaid invoice', () => {
    // With status='pending'
    // Expected: Card visible
  })

  // Test 2: Hidden for Paid Invoice
  test('should hide payment card for paid invoice', () => {
    // With status='paid'
    // Expected: Card not rendered
  })

  // Test 3: Amount Display
  test('should display invoice amount correctly', () => {
    // With invoiceAmount={1500}
    // Expected: Shows "1500 USDC"
  })

  // Test 4: Network Display
  test('should show selected network', () => {
    // With network='base'
    // Expected: Shows "⚡ Base"
  })

  // Test 5: Payment Instructions
  test('should show 4-step payment instructions', () => {
    // Expected: Steps 1-4 visible
  })

  // Test 6: QR Code Toggle
  test('should toggle QR code display', () => {
    // Steps:
    // 1. Click "Show QR Code"
    // Expected: QR appears, button text changes to "Hide QR Code"
  })

  // Test 7: Wallet Not Connected Error
  test('should show error when wallet not connected', () => {
    // With no wallet_address in DB
    // Expected: Error message shown
  })

  // Test 8: Badge Display
  test('should show USDC Ready badge', () => {
    // Expected: Green badge visible
  })
})
```

---

## Integration Tests

### Settings Page
```typescript
describe('Settings Page - Wallet Integration', () => {
  // Test 1: Navigation
  test('should navigate to settings', () => {
    // Steps:
    // 1. Click Settings in navigation
    // Expected: Settings page loads
  })

  // Test 2: Wallet Section Visible
  test('should show wallet connection section', () => {
    // Expected: "💰 USDC Wallet Connection" header visible
  })

  // Test 3: Complete Connection Flow
  test('should complete wallet connection flow', () => {
    // Steps:
    // 1. Select network "Base"
    // 2. Click "🔗 Connect Wallet"
    // 3. Approve in wallet
    // 4. See confirmation
    // Expected: Address saved and displayed
  })

  // Test 4: Network Change
  test('should change network preference', () => {
    // Steps:
    // 1. Connect wallet
    // 2. Change network to "Ethereum"
    // 3. Verify in database
    // Expected: Network changed
  })

  // Test 5: Disconnect
  test('should disconnect wallet from settings', () => {
    // Steps:
    // 1. Connect wallet
    // 2. Click "🔓 Disconnect Wallet"
    // 3. Confirm
    // Expected: Wallet cleared
  })
})
```

### Invoice Detail Page
```typescript
describe('Invoice Detail Page - USDC Payment', () => {
  // Test 1: Payment Card Display
  test('should show USDC payment card on unpaid invoice', () => {
    // Steps:
    // 1. Open unpaid invoice
    // Expected: Payment card visible
  })

  // Test 2: Payment Card Hidden
  test('should hide payment card on paid invoice', () => {
    // Steps:
    // 1. Open paid invoice
    // Expected: Payment card not visible
  })

  // Test 3: QR Code Display
  test('should display QR code with wallet and amount', () => {
    // Steps:
    // 1. Open invoice with wallet connected
    // 2. Click "Show QR Code"
    // Expected: QR code displays
  })

  // Test 4: Instructions Display
  test('should show payment instructions', () => {
    // Expected: 4 clear steps visible
  })

  // Test 5: Copy Address
  test('should copy wallet address', () => {
    // Steps:
    // 1. Click copy button
    // Expected: Address copied to clipboard
  })

  // Test 6: Network Info
  test('should show network information', () => {
    // Expected: Network name and description visible
  })
})
```

### Invoice List Page
```typescript
describe('Invoice List Page - USDC Badge', () => {
  // Test 1: Badge Display
  test('should show USDC badge on unpaid invoices', () => {
    // Steps:
    // 1. Go to invoice list
    // Expected: "💰 USDC Ready" badge visible
  })

  // Test 2: No Badge for Paid
  test('should not show badge on paid invoices', () => {
    // Expected: Paid invoices without badge
  })

  // Test 3: Badge Position
  test('should show badge next to status', () => {
    // Expected: Badge displays correctly positioned
  })

  // Test 4: Batch View
  test('should show badges for multiple invoices', () => {
    // With 5 unpaid invoices
    // Expected: All show badge
  })
})
```

---

## Database Tests

### Schema Validation
```sql
-- Test 1: Tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('webhook_config', 'payment_intents');
-- Expected: 2 rows

-- Test 2: Columns exist in profiles
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('wallet_address', 'payment_method', 'usdc_network');
-- Expected: 3 rows

-- Test 3: Enums created
SELECT typname FROM pg_type WHERE typname IN ('payment_method_enum', 'usdc_network_enum');
-- Expected: 2 rows
```

### RLS Policies
```sql
-- Test 1: User can view own webhook config
-- As user A, select from webhook_config where user_id = A.id
-- Expected: Success

-- Test 2: User cannot view other user's config
-- As user A, select from webhook_config where user_id = B.id
-- Expected: No rows returned

-- Test 3: User can update own config
-- As user A, update webhook_config set enabled = true where user_id = A.id
-- Expected: Success

-- Test 4: User cannot update others' config
-- As user A, update webhook_config set enabled = true where user_id = B.id
-- Expected: 0 rows updated
```

### Trigger Validation
```sql
-- Test 1: Trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'payment_intent_completed';
-- Expected: 1 row

-- Test 2: Invoice auto-updates on payment completion
-- Steps:
-- 1. Insert payment_intent with status='pending'
-- 2. Update payment_intent status='completed'
-- 3. Query invoices table
-- Expected: Invoice status='paid'
```

---

## API Tests

### Webhook Config Endpoint
```typescript
describe('POST /api/webhooks/config', () => {
  // Test 1: Enable webhook
  test('should create webhook config with enable action', async () => {
    const response = await fetch('/api/webhooks/config', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        action: 'enable',
        network: 'base'
      })
    })
    // Expected: 200, contains webhook_id
  })

  // Test 2: Get config
  test('should retrieve webhook config with get action', async () => {
    const response = await fetch('/api/webhooks/config', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        action: 'get',
        network: 'base'
      })
    })
    // Expected: 200, returns config data
  })

  // Test 3: Disable webhook
  test('should disable webhook with disable action', async () => {
    const response = await fetch('/api/webhooks/config', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        action: 'disable',
        network: 'base'
      })
    })
    // Expected: 200, webhook_enabled = false
  })

  // Test 4: Unauthorized access
  test('should reject requests without auth token', async () => {
    const response = await fetch('/api/webhooks/config', {
      method: 'POST',
      body: JSON.stringify({ action: 'get' })
    })
    // Expected: 401 Unauthorized
  })

  // Test 5: Invalid action
  test('should reject invalid action', async () => {
    const response = await fetch('/api/webhooks/config', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'invalid' })
    })
    // Expected: 400 Bad Request
  })
})
```

---

## Manual Test Checklist

### Pre-Launch
- [ ] Database migrations apply without errors
- [ ] No console errors on any page
- [ ] Settings page loads correctly
- [ ] Invoice pages load correctly
- [ ] All buttons are clickable

### Wallet Connection
- [ ] Can click "🔗 Connect Wallet" button
- [ ] Network selector shows all 3 options
- [ ] Can select different networks
- [ ] Wallet address displays (if using MetaMask)
- [ ] Address persists after page reload
- [ ] Can disconnect with confirmation
- [ ] Success message appears on connect
- [ ] Error message shows on failure
- [ ] Invalid addresses rejected

### Invoice Display
- [ ] USDC Payment Card shows on unpaid invoices
- [ ] Payment card hides on paid invoices
- [ ] Amount displays correctly
- [ ] Network displays correctly
- [ ] 4 payment instructions visible
- [ ] Instructions are clear and accurate

### QR Code
- [ ] QR code generates without errors
- [ ] QR code shows correct data (network-specific format)
- [ ] Copy button works and shows confirmation
- [ ] Download button creates PNG file
- [ ] Wallet address is copyable
- [ ] QR code can be toggled on/off

### Badge Display
- [ ] "💰 USDC Ready" badge shows on unpaid invoices
- [ ] Badge does not show on paid invoices
- [ ] Badge displays next to status
- [ ] Badge displays on invoice list

### Settings Page
- [ ] All sections load correctly
- [ ] Wallet connection section visible
- [ ] Phase 2 preview section visible
- [ ] Network selector works
- [ ] Success/error messages display correctly
- [ ] Settings persist after refresh

### Error Scenarios
- [ ] Wallet not connected → shows clear error
- [ ] Invalid address → shows error message
- [ ] Network error → displays gracefully
- [ ] Database error → shows friendly message
- [ ] Missing invoice → handled correctly

### Cross-Browser
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Mobile browser

### Responsive Design
- [ ] Mobile (320px width)
- [ ] Tablet (768px width)
- [ ] Desktop (1920px width)
- [ ] All elements visible
- [ ] No horizontal scroll

---

## Performance Tests

### Load Testing
```
Metrics to monitor:
- Page load time: < 2s
- Component render: < 500ms
- QR generation: < 1s
- Database query: < 500ms
```

### Memory
```
Monitor browser DevTools Memory:
- No memory leaks after disconnect/reconnect
- Component cleanup working properly
- Event listeners removed properly
```

---

## Security Tests

- [ ] RLS policies prevent cross-user access
- [ ] Users cannot edit other user's wallet
- [ ] Users cannot view other user's payment intents
- [ ] API endpoints require authentication
- [ ] Invalid tokens rejected
- [ ] Private keys never stored or transmitted

---

## Test Evidence

For each test, document:
```markdown
### Test Name
**Status:** ✅ Pass / ❌ Fail
**Date:** YYYY-MM-DD
**Tester:** Name
**Browser:** Chrome 120
**Evidence:** Screenshot/video link
**Notes:** Any observations
```

---

## Deployment Validation

Before going to production:

- [ ] All tests pass
- [ ] No console errors or warnings
- [ ] Database migrations applied
- [ ] Environment variables correct
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Accessibility checked
- [ ] Security audit passed

---

## Regression Testing

After Phase 2 webhook integration:

- [ ] All Phase 1 features still work
- [ ] All Phase 2 features (settings changes)
- [ ] Settings features still work
- [ ] Invoice pages still work
- [ ] Existing wallets still connect
- [ ] Payment intents still create

---

## Conclusion

This test suite ensures Phase 3 Step 1 is production-ready.
Run all tests before deployment.
