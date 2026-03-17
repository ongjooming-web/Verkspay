# Mobile Wallet Deep Linking - Testing & Implementation Guide

## Overview

The WalletConnect component now supports both **desktop modal connections** and **mobile deep linking**.

### Mobile Flows:
- **MetaMask Mobile (iOS/Android)**: Opens native app → user authorizes → returns to Prism
- **Phantom Mobile (iOS/Android)**: Opens native app → user authorizes → returns to Prism
- **Desktop (Safari/Chrome)**: Uses WalletConnect modal as before

---

## Technical Implementation

### 1. Mobile Detection (`MOBILE_DETECTION` utility)

```javascript
const MOBILE_DETECTION = {
  isIOS: () => /iPad|iPhone|iPod/.test(navigator.userAgent),
  isAndroid: () => /Android/.test(navigator.userAgent),
  isMobile: () => /iPhone|iPad|iPod|Android/.test(navigator.userAgent),
  isMetaMaskMobile: () => isMobile() && !!window.ethereum,
  isPhantomMobile: () => isMobile() && !!window.phantom?.solana
}
```

### 2. Deep Linking Strategy

**MetaMask Mobile:**
- Detects if on mobile → calls `window.ethereum.request({ method: 'eth_requestAccounts' })`
- MetaMask app intercepts and opens native app
- User authorizes → returns to Prism
- We check `eth_accounts` on return and save address

**Phantom Mobile:**
- Detects if on mobile → redirects to `https://phantom.app/ul/browse/{returnUrl}`
- Phantom app opens, handles auth
- Redirects back to Prism with wallet data
- We check for Phantom provider on return and save address

### 3. Session Storage for State

When attempting mobile connection, we store:
```javascript
sessionStorage.setItem('metamask_user_id', user.id)
sessionStorage.setItem('metamask_network', selectedNetwork)  // 'base' or 'ethereum'
sessionStorage.setItem('metamask_return_url', window.location.href)

// OR for Phantom:
sessionStorage.setItem('phantom_user_id', user.id)
sessionStorage.setItem('phantom_network', 'solana')
sessionStorage.setItem('phantom_return_url', window.location.href)
```

On page return, we check these and complete the connection.

---

## Flow Diagrams

### Desktop (Modal) Flow
```
User clicks "Connect Wallet"
    ↓
Desktop detected
    ↓
WalletConnect modal opens
    ↓
User selects MetaMask/other wallet
    ↓
User signs connection
    ↓
Address validated & saved to profiles.wallet_address
    ↓
Success toast shown
```

### Mobile (Deep Link) Flow
```
User clicks "Open MetaMask" / "Open Phantom"
    ↓
Mobile detected
    ↓
Session state stored (user_id, network, return_url)
    ↓
MetaMask/Phantom app opened via deep link
    ↓
User authorizes in native app
    ↓
Returns to Prism (via redirect or back button)
    ↓
checkMobileWalletReturn() runs
    ↓
Detects session state + checks eth_accounts/Phantom.isConnected
    ↓
Address validated & saved to profiles.wallet_address
    ↓
Success toast shown
    ↓
Session storage cleaned up
```

---

## Testing Scenarios

### Test 1: MetaMask Mobile (iOS)

**Prerequisites:**
- iPhone with MetaMask installed
- Logged into MetaMask app with test account
- Logged into Prism on Safari

**Steps:**
1. Go to Settings page
2. Scroll to "Connect Wallet"
3. Select "Base" network
4. Click "🔗 Open MetaMask" (should show instead of modal)
5. Confirm message pops up: "📱 Mobile Mode: You'll be directed to wallet app..."
6. Click button
7. **Safari switches to MetaMask app**
8. App shows: "Allow Prism to view your wallet address?"
9. Click "Allow" or "Connect"
10. **App returns to Safari**
11. Page shows: ✓ Green success toast

**Verify:**
- Wallet address shows in connected state
- Address matches MetaMask account
- Refresh page → address still there
- Go to invoice → shows correct wallet address

**Browser Console Logs:**
```
[WalletConnect] Mobile detected, using deep linking
[WalletConnect] Using MetaMask mobile deep link for base
[WalletConnect] Got MetaMask address on mobile: 0x123a...
[WalletConnect] Saving mobile wallet address: 0x123a...
[WalletConnect] Mobile wallet saved and verified
```

---

### Test 2: MetaMask Mobile (Android)

**Prerequisites:**
- Android device with MetaMask installed (Chrome/Firefox)
- Logged into MetaMask app
- Logged into Prism

**Steps:**
1. Same as Test 1, but on Android
2. When you click "Open MetaMask", it may:
   - Directly open MetaMask app (if deep link recognized)
   - Open browser with deeplink → tap to open MetaMask
3. Authorize in MetaMask
4. Returns to Chrome/Firefox
5. Should see success

**Note:**
- Android behavior varies by browser
- MetaMask may ask to set as default wallet
- Deeplink should work with Chrome, Firefox, and Samsung Internet

---

### Test 3: Phantom Mobile (iOS)

**Prerequisites:**
- iPhone with Phantom installed
- Logged into Phantom app
- Logged into Prism on Safari

**Steps:**
1. Go to Settings page
2. Select "Solana" network
3. Click "🔗 Open Phantom"
4. Confirm message: "📱 Mobile Mode: You'll be directed to wallet app..."
5. Click button
6. **Safari switches to Phantom app**
7. App shows connection request for Prism
8. User approves
9. **App returns to Safari**
10. Success toast shown

**Verify:**
- Address is 44-character Base58 string (Solana format)
- Shows Solana in network indicator
- Refresh page → address persists
- Go to invoice → shows Solana wallet

**Browser Console Logs:**
```
[WalletConnect] Mobile detected, using deep linking
[WalletConnect] Using Phantom mobile deep link for Solana
[WalletConnect] Detected Phantom return from mobile app
[WalletConnect] Got Phantom address on return: ABC123...
[WalletConnect] Saving mobile wallet address: ABC123...
[WalletConnect] Mobile wallet saved and verified
```

---

### Test 4: Phantom Mobile (Android)

**Same as Phantom iOS, but:**
- Use Chrome, Firefox, or Brave on Android
- Phantom deeplink behavior may differ
- May need to manually return to app after auth

---

### Test 5: Desktop Safari/Chrome (Fallback)

**Prerequisites:**
- Desktop computer
- MetaMask/Phantom extension installed
- Logged into Prism

**Steps:**
1. Go to Settings
2. Click "🔗 Connect MetaMask" (modal text, not mobile)
3. WalletConnect modal opens (NOT deep link)
4. Modal shows available wallets
5. Select MetaMask
6. Standard browser extension popup
7. User signs
8. Success

**Expected:**
- Should NOT trigger mobile flow
- MOBILE_DETECTION.isMobile() returns false
- Modal appears instead of deep link
- Everything works as before

---

## Address Format Validation

### Solana Addresses (Mobile + Desktop)
```javascript
// Must match this regex:
/^[1-9A-HJ-NP-Z]{32,44}$/

// Examples of valid Solana addresses:
TokenkegQfeZyiNwAJsyFbPVwwQQfg5mNB2sSLJ4Jd
11111111111111111111111111111111
EPjFWaJgt46yNicPj6V84cairvXvWKgW4K9qwCdRfgy

// What's valid:
- 32-44 characters long
- Only Base58 characters: 1-9, A-Z except I,O,l,o, a-z
```

### EVM Addresses (MetaMask Mobile + Desktop)
```javascript
// Must match this regex:
/^0x[a-fA-F0-9]{40}$/

// Examples:
0x742d35Cc6634C0532925a3b844Bc9e7595f42b6b
0xaB5801a7D398351b8bE11C63E14aB8E6baB60061

// What's valid:
- Exactly 42 characters (0x + 40 hex)
- 0x prefix required
- Case insensitive
```

---

## Database Verification

After successful connection, verify in Supabase:

```sql
-- Check mobile wallet was saved
SELECT 
  id,
  email,
  wallet_address,
  usdc_network,
  payment_method
FROM profiles
WHERE id = '{user_id}';

-- Should show:
-- wallet_address: 0x123a... or ABC123...
-- usdc_network: base/ethereum/solana
-- payment_method: usdc
```

---

## Error Handling

### Error: "Phantom wallet not found on this device"

**Cause:**
- User on mobile but Phantom not installed
- Or: Phantom app not properly detected

**Fix:**
- Show install link: `https://phantom.app`
- Detect with: `window.phantom?.solana`
- Check if `isPhantomMobile()` returns true

---

### Error: "MetaMask wallet not found on this device"

**Cause:**
- User on mobile but MetaMask not installed
- Or: MetaMask not detected in browser

**Fix:**
- Show install link: `https://metamask.io`
- Detect with: `window.ethereum`
- Check if `isMetaMaskMobile()` returns true

---

### Error: "Failed to verify wallet save"

**Cause:**
- Supabase returned 200 but didn't actually save
- Network issue
- RLS policy blocking write

**Fix:**
- Check Supabase RLS policies:
```sql
SELECT * FROM policies WHERE table_name = 'profiles';
```
- Ensure user can UPDATE their own row
- Check database logs for errors

---

### Error: "Invalid address format for base"

**Cause:**
- Got Solana address for EVM network
- Got malformed address
- Network mismatch

**Fix:**
- Show network selector again
- Re-validate address format
- Check NETWORK_CONFIGS[network].type

---

## Session Storage Cleanup

If you see stale session data, manually clean:

```javascript
// Clear MetaMask session
sessionStorage.removeItem('metamask_user_id')
sessionStorage.removeItem('metamask_network')
sessionStorage.removeItem('metamask_return_url')

// Clear Phantom session
sessionStorage.removeItem('phantom_user_id')
sessionStorage.removeItem('phantom_network')
sessionStorage.removeItem('phantom_return_url')

// Or clear all:
sessionStorage.clear()
```

---

## Browser DevTools Testing

### Simulate Mobile in Chrome DevTools

1. Open DevTools: F12
2. Click Device Toggle: Ctrl+Shift+M
3. Select "iPhone" or "Pixel" preset
4. Refresh page
5. Test mobile flow

**Note:**
- This simulates mobile **user agent**
- Doesn't simulate actual app deeplinks
- For real testing, use actual mobile devices

### Check Mobile Detection

In DevTools console:
```javascript
// Should return true on mobile, false on desktop
console.log('isMobile:', MOBILE_DETECTION.isMobile())
console.log('isMetaMaskMobile:', MOBILE_DETECTION.isMetaMaskMobile())
console.log('isPhantomMobile:', MOBILE_DETECTION.isPhantomMobile())

// Check session storage
console.log('Sessions:', sessionStorage)
```

---

## Debugging Mobile Wallet Issues

### Enable Verbose Logging

All mobile functions log with `[WalletConnect]` prefix:

```javascript
// Filter DevTools console to show only WalletConnect logs
// Type in filter box: [WalletConnect]
```

### Common Issues

| Issue | Log | Solution |
|-------|-----|----------|
| Wallet app doesn't open | `Mobile detected, using deep linking` | Check if app installed, or use fallback |
| Returns to page but no address | `Detected MetaMask return` → silence | App may not have triggered auth, retry |
| Success but can't find address | `Saving mobile wallet address` | Check Supabase, not in localStorage |
| Address disappears on refresh | `Loaded wallet: null` | Check RLS policies block read |

---

## Deployment Checklist

- [ ] Mobile detection works on iOS/Android
- [ ] MetaMask deeplink works on iOS
- [ ] MetaMask deeplink works on Android
- [ ] Phantom deeplink works on iOS
- [ ] Phantom deeplink works on Android
- [ ] Desktop fallback to modal still works
- [ ] Address validates for correct network
- [ ] Address persists after page refresh
- [ ] Session storage cleaned up after success
- [ ] Error messages are clear
- [ ] Logs appear with `[WalletConnect]` prefix
- [ ] Invoice shows correct wallet after connection
- [ ] Mark as paid still works on mobile

---

## Production Notes

### Testing in Production

Use ngrok or tunnel to test with real devices:

```bash
# Tunnel localhost:3000 to public URL
ngrok http 3000

# Visit on mobile:
# https://xxxxx.ngrok.io/invoices
```

### Monitoring

Watch for these errors in production logs:

```
ERROR [WalletConnect] Mobile wallet error
ERROR [WalletConnect] Error saving mobile wallet
ERROR [WalletConnect] Error in mobile return check
```

### Performance

Mobile flows are fast:
- Deeplink redirect: ~100ms
- User auth in app: ~2-5 seconds
- Return + address save: ~500ms
- Total: ~3-7 seconds

---

## Files Modified

```
src/components/WalletConnect.tsx
  → Added MOBILE_DETECTION utility
  → Added handleMobileWalletConnection()
  → Added saveMobileWalletAddress()
  → Added checkMobileWalletReturn()
  → Updated handleConnectWallet() to route mobile users
  → Updated UI to show mobile-specific buttons/text
  → Added useEffect hook for mobile return detection
```

---

## Future Improvements

- [ ] WalletConnect V2 for broader mobile support
- [ ] Deep link for Coinbase Wallet mobile
- [ ] Deep link for Trust Wallet mobile
- [ ] Fallback to QR code if deeplink fails
- [ ] Analytics tracking for wallet connection success rate
- [ ] A/B test modal vs deeplink on desktop
