# WalletConnect v2 Mobile Support - Setup Guide

## Overview

This implementation provides proper mobile wallet support using WalletConnect AppKit alongside desktop support for MetaMask/Phantom. The system automatically detects the device type and routes to the appropriate connection method.

## Installation

### Step 1: Install Dependencies

The following packages have been added to `package.json`:

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem
```

Already installed:
- `@reown/appkit` - WalletConnect AppKit for mobile
- `@reown/appkit-adapter-wagmi` - Wagmi adapter for AppKit
- `wagmi` - React hooks for Ethereum
- `viem` - Ethereum client library

### Step 2: Get WalletConnect Project ID

1. Go to [cloud.reown.com](https://cloud.reown.com)
2. Sign up or log in with your GitHub/email
3. Create a new project (free)
4. Copy your **Project ID**

### Step 3: Configure Environment Variables

Add to `.env.local`:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

Example:
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=abc123def456ghi789jkl
```

## Architecture

### Detection Logic

The `WalletConnect.tsx` component detects the user's device and connection capability:

```typescript
const isMobileDevice = /iPhone|iPad|Android/i.test(navigator.userAgent)
const hasEthereum = typeof window !== 'undefined' && !!window.ethereum

// Use AppKit if mobile OR no window.ethereum available
const shouldUseMobile = isMobileDevice || !hasEthereum
```

### Connection Flows

#### Desktop (with MetaMask/Phantom)
1. User clicks "Connect Wallet"
2. Direct call to `window.ethereum.request()`
3. MetaMask/Phantom popup appears
4. User approves connection
5. Sign message with `personal_sign` (optional)
6. Address saved to Supabase
7. ✅ Connected

#### Mobile (or no ethereum)
1. User clicks "Connect Wallet"
2. WalletConnect AppKit modal opens
3. QR code or wallet list displayed
4. User selects wallet app or scans QR
5. **Deep link**: Automatically opens wallet app
6. Wallet app shows signature request
7. User signs message
8. Auto-return to Prism app
9. Address saved to Supabase
10. ✅ Connected

## Component Structure

### Main Component: `WalletConnect.tsx`

Routes between AppKit (mobile) and direct ethereum (desktop):

```tsx
// Detect device type
if (useMobile) {
  return <WalletConnectAppKit onWalletConnected={onWalletConnected} />
} else {
  return <Card>Desktop wallet connection UI</Card>
}
```

### Mobile Component: `WalletConnectAppKit.tsx`

Handles WalletConnect AppKit initialization and connection:

```tsx
// Initialize AppKit with Wagmi adapter
const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet, base, polygon],
  projectId,
  ssr: false  // Critical: disable SSR for wallet libs
})

const instance = createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet, base, polygon],
  projectId,
  metadata: { name, description, url, icons }
})
```

### Updated Global Types: `global.d.ts`

Extended window.ethereum types and AppKit support:

```typescript
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void
  isMetaMask?: boolean
  isPhantom?: boolean
  selectedAddress?: string | null
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}
```

## Message Signing

Both flows support message signing for authentication:

```
Sign in to Prism
Wallet: 0x1234...5678
Timestamp: 1710723000000
```

Method: `personal_sign` (EIP-191)

This message can be verified server-side:
- Confirm address matches signature
- Prevent replay attacks with timestamp
- Store signature in database if needed

## Features

✅ **Mobile Support**
- Automatic detection of mobile devices
- Deep linking to wallet apps (Metamask, Phantom, etc.)
- WalletConnect QR code fallback
- Auto-return after signature

✅ **Desktop Support**
- Direct MetaMask/Phantom connection
- Familiar popup-based flow
- Message signing

✅ **Security**
- Message signing authentication
- Timestamp to prevent replay
- No private keys exposed
- Signature verification ready

✅ **User Experience**
- One-click connection
- Automatic detection
- Clear error messages
- Loading states
- Success confirmation

✅ **Supported Networks**
- Mainnet (Ethereum)
- Base
- Polygon

## Testing

### Desktop Testing

1. Install MetaMask extension
2. Open Prism app
3. Click "Connect Wallet"
4. Approve in MetaMask popup
5. ✅ Should show connected address

### Mobile Testing

#### Option 1: Real Mobile Device
1. Open Prism in mobile browser (Safari/Chrome)
2. Click "Connect Wallet"
3. Select wallet (MetaMask, Phantom, etc.)
4. AppKit redirects to wallet app via deep link
5. Approve and sign in wallet
6. Auto-returns to Prism
7. ✅ Should show connected address

#### Option 2: Mobile Emulation (Chrome DevTools)
1. Open DevTools > Device Toolbar
2. Switch to iPhone/Android
3. Refresh page
4. Click "Connect Wallet"
5. Should show AppKit modal instead of direct ethereum prompt

### Debug Logging

The implementation includes console logging:

```typescript
console.log('[WalletConnect] Detection:', {
  isMobileDevice,
  hasEthereum,
  useMobile,
  userAgent
})

console.log('[AppKit] Opening modal...')
console.log('[AppKit] Connected address:', address)
console.log('[AppKit] Message signed:', signature)
```

## Troubleshooting

### Issue: "Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"

**Solution:** Add Project ID to `.env.local`:
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Issue: "No wallet detected" on desktop

**Solution:** 
- Install MetaMask or Phantom extension
- Refresh page after installation
- Check browser console for errors

### Issue: Mobile redirect not working

**Solution:**
- Ensure wallet app is installed on device
- Try manual QR code scan
- Check if deep linking is enabled in wallet settings
- Use latest version of wallet app

### Issue: Message signing fails

**Solution:**
- Message signing is optional (continues without signature)
- Check wallet version supports personal_sign
- Verify correct message format

## Deployment

### 1. Set Environment Variable

Add to your deployment platform (Vercel, Netlify, etc.):

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 2. Test Before Deploying

```bash
npm run build
npm run start
```

Open app and test wallet connection.

### 3. Monitor in Production

- Check browser console for any errors
- Monitor Supabase for wallet_address updates
- Test on real mobile devices

## Architecture Benefits

**Separation of Concerns**
- Desktop flow uses direct ethereum RPC
- Mobile flow uses WalletConnect protocol
- Each optimized for its use case

**Future-Proof**
- WalletConnect v2 is the industry standard
- Works with any wallet supporting the protocol
- Easy to add more chains

**Performance**
- SSR disabled only for wallet components
- Lazy loading prevents bundle bloat
- No unnecessary imports on desktop

## Supported Wallets

### Desktop
- MetaMask
- Phantom
- Brave Wallet
- Other wallet extensions that support window.ethereum

### Mobile
- MetaMask Mobile
- Phantom Mobile
- Coinbase Wallet
- Trust Wallet
- Ledger Live
- Rainbow
- Argent
- And 300+ other WalletConnect-enabled wallets

## Next Steps

1. **Deploy**
   - Push to git
   - Deploy to Vercel
   - Add Project ID to environment

2. **Test**
   - Test on desktop with MetaMask
   - Test on mobile with wallet app
   - Verify signatures saved to Supabase

3. **Monitor**
   - Check error logs
   - Monitor wallet connections
   - Gather user feedback

4. **Enhance**
   - Add ENS name resolution
   - Store signatures for verification
   - Add transaction capabilities

## References

- [WalletConnect Documentation](https://docs.walletconnect.com/)
- [Reown AppKit Docs](https://docs.reown.com/appkit)
- [Wagmi Hooks](https://wagmi.sh/)
- [Viem Client](https://viem.sh/)
- [EIP-191 Personal Sign](https://eips.ethereum.org/EIPS/eip-191)
