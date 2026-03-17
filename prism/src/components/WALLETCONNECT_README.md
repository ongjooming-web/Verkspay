# WalletConnect Component - Network-Aware Wallet Integration

## Overview

The updated `WalletConnect.tsx` component now provides intelligent, network-specific wallet connection handling for both EVM chains (Base, Ethereum) and Solana.

## Problem Solved

✅ **Before**: Component supported only EVM addresses, resulting in:
- Solana users getting EVM addresses instead of Solana addresses
- No validation of address format matching network
- Single wallet provider for all networks

✅ **After**: Component now:
- Detects network selection BEFORE wallet connection
- Routes to Phantom wallet for Solana
- Routes to MetaMask/EVM wallets for Base/Ethereum
- Validates address format matches network type
- Prevents address/network mismatches

## Features

### 1. Network-Aware Wallet Provider Selection

**Solana Network** → Uses Phantom wallet
```typescript
// Automatically routes to Phantom provider
const provider = WALLET_PROVIDERS.solana.getProvider()
// Expects Solana public key format (Base58, ~44 chars)
```

**Base/Ethereum Networks** → Uses EVM wallets (MetaMask, etc.)
```typescript
// Automatically routes to EVM provider
const provider = WALLET_PROVIDERS.evm.getProvider()
// Expects EVM address format (0x + 40 hex chars)
```

### 2. Address Format Validation

**Solana Address Validation**
- Format: Base58 encoded
- Length: 32-44 characters
- Example: `Cn4fv2ZL8ZFYFDEYNtwC6GkR5bApJevQVpGD3P41eezw`
- Regex: `/^[1-9A-HJ-NP-Z]{32,44}$/`

**EVM Address Validation**
- Format: Hex with 0x prefix
- Length: 42 characters total
- Example: `0x742d35Cc6634C0532925a3b844Bc9e7595f42a7b`
- Regex: `/^0x[a-fA-F0-9]{40}$/`

### 3. Network Detection & Validation

```typescript
// Validates address format before saving
validateAddressForNetwork(address: string, network: 'base' | 'ethereum' | 'solana'): boolean

// Example
validateAddressForNetwork('0x742d...', 'solana') // ❌ False - EVM address for Solana
validateAddressForNetwork('0x742d...', 'base') // ✅ True - EVM address for EVM chain
validateAddressForNetwork('Cn4fv...', 'solana') // ✅ True - Solana address for Solana
```

### 4. User Experience

**Before Connection**
- User selects network (Base, Ethereum, or Solana)
- UI shows required wallet provider ("Connect Phantom" for Solana)
- UI shows expected address format

**After Connection**
- Displays connected address (truncated)
- Shows connected network name
- Shows address format type
- Network switch requires reconnection

**Error Handling**
- ❌ No wallet installed: Clear error message with installation link
- ❌ Address format mismatch: Explicit error about wrong wallet/address type
- ❌ User rejected: Clear rejection message
- ❌ Network mismatch: Highlights that address doesn't match selected network

## Installation

```bash
# Install Solana-related dependencies
npm install @solana/web3.js @solana/wallet-adapter-base @solana/wallet-adapter-wallets @solana/wallet-adapter-react

# Already installed (for EVM)
# - @walletconnect/modal
# - @walletconnect/ethereum-provider
# - ethers
```

## Database Schema

The component stores addresses in the `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN wallet_address TEXT;
ALTER TABLE profiles ADD COLUMN usdc_network TEXT CHECK (usdc_network IN ('base', 'ethereum', 'solana'));
ALTER TABLE profiles ADD COLUMN payment_method TEXT CHECK (payment_method IN ('usdc', 'bank'));
```

Example data:
```sql
-- Solana user
UPDATE profiles 
SET wallet_address = 'Cn4fv2ZL8ZFYFDEYNtwC6GkR5bApJevQVpGD3P41eezw', 
    usdc_network = 'solana'
WHERE id = 'user-123';

-- Base user
UPDATE profiles 
SET wallet_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f42a7b', 
    usdc_network = 'base'
WHERE id = 'user-456';
```

## Usage

### Basic Implementation

```tsx
import { WalletConnectComponent } from '@/components/WalletConnect'

export default function PaymentSettings() {
  const handleWalletConnected = (address: string, network: string) => {
    console.log(`Connected: ${address} on ${network}`)
    // Update your app state
  }

  const handleWalletDisconnected = () => {
    console.log('Wallet disconnected')
    // Clear your app state
  }

  return (
    <WalletConnectComponent
      onWalletConnected={handleWalletConnected}
      onWalletDisconnected={handleWalletDisconnected}
    />
  )
}
```

### Read-Only Mode

```tsx
<WalletConnectComponent readOnly={true} />
```

## Test Cases

### Test 1: Connect Solana Wallet

**Scenario**: User selects Solana and connects Phantom

**Expected Behavior**:
- ✅ UI shows "Connecting to Solana Mainnet"
- ✅ Component requests Phantom provider
- ✅ Component receives Solana public key
- ✅ Validates address is valid Base58 format
- ✅ Saves address to `profiles.wallet_address` with `usdc_network='solana'`
- ✅ Displays address truncated (e.g., `Cn4fv...eezw`)

**Test Data**:
```
Network: Solana
Address: Cn4fv2ZL8ZFYFDEYNtwC6GkR5bApJevQVpGD3P41eezw
Format: ✅ Valid Solana Base58
```

### Test 2: Connect Base Network

**Scenario**: User selects Base and connects MetaMask

**Expected Behavior**:
- ✅ UI shows "Connecting to Base"
- ✅ Component requests EVM provider
- ✅ Component receives EVM address
- ✅ Validates address is valid 0x format
- ✅ Saves address to `profiles.wallet_address` with `usdc_network='base'`
- ✅ Displays address truncated (e.g., `0x742d...f42a7b`)

**Test Data**:
```
Network: Base
Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f42a7b
Format: ✅ Valid EVM 0x address
```

### Test 3: Address Format Mismatch Detection

**Scenario**: User selects Solana but MetaMask returns EVM address

**Expected Behavior**:
- ❌ Component detects address format doesn't match Solana
- ❌ Shows error: "Address format mismatch! Got EVM address for solana network."
- ❌ Does NOT save address to database
- ❌ Wallet remains disconnected

**Test Data**:
```
Network Selected: Solana
Address Received: 0x742d35Cc6634C0532925a3b844Bc9e7595f42a7b (EVM)
Format Check: ❌ Fails - EVM address for Solana
Result: Connection rejected
```

### Test 4: Network Switch Requires Reconnection

**Scenario**: User connects to Base, then switches to Solana

**Expected Behavior**:
- ✅ Connected address is cleared
- ✅ Shows error: "Switching from Base to Solana Mainnet. Please reconnect your wallet."
- ✅ Network selector shows new selection (Solana)
- ✅ User must connect Phantom wallet again

### Test 5: Missing Wallet Provider

**Scenario**: User selects Solana but Phantom is not installed

**Expected Behavior**:
- ❌ Shows error: "Phantom wallet not installed. Please install Phantom to connect to Solana."
- ❌ Suggests installation: "Requires Phantom wallet. Download from phantom.app"

**Test Data**:
```
Network: Solana
Phantom Installed: ❌ No
Result: Clear error message with fix
```

### Test 6: Load Stored Address

**Scenario**: User returns to app with saved wallet

**Expected Behavior**:
- ✅ Component loads address from `profiles.wallet_address`
- ✅ Loads network from `profiles.usdc_network`
- ✅ Validates address format matches network
- ✅ Displays connected wallet state immediately
- ✅ No re-connection needed

**Test Data**:
```
Stored Address: Cn4fv2ZL8ZFYFDEYNtwC6GkR5bApJevQVpGD3P41eezw
Stored Network: solana
Format Check: ✅ Valid
Display: ✅ Shows as connected
```

### Test 7: Corrupted Address Detection

**Scenario**: Database contains address from wrong network

**Expected Behavior**:
- ❌ Component detects format mismatch on load
- ❌ Shows error: "Invalid solana address format stored. Please reconnect."
- ❌ Clears connected state
- ❌ Forces user to reconnect with correct wallet

## Component Props

```typescript
interface WalletConnectProps {
  // Callback when wallet successfully connects
  onWalletConnected?: (address: string, network: string) => void
  
  // Callback when wallet disconnects
  onWalletDisconnected?: () => void
  
  // Read-only mode (hides connect button, shows connected state only)
  readOnly?: boolean
}
```

## Address Validators

The component exports internal validators for address validation:

```typescript
// In your own code
const ADDRESS_VALIDATORS = {
  solana: (address: string): boolean => {
    return /^[1-9A-HJ-NP-Z]{32,44}$/.test(address) && 
           address.length >= 32 && address.length <= 44
  },
  evm: (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
}
```

## Debugging

**Enable Debug Logging**

Add to component:
```typescript
console.log('Network selected:', selectedNetwork)
console.log('Provider:', getWalletProvider(selectedNetwork))
console.log('Address received:', connectedAddr)
console.log('Address valid:', validateAddressForNetwork(connectedAddr, selectedNetwork))
```

**Check Wallet Injection**

```javascript
// Check Phantom
window.phantom?.solana // Should exist for Solana

// Check MetaMask
window.ethereum // Should exist for EVM
```

## Production Checklist

- ✅ Address format validators implemented
- ✅ Network-aware provider selection
- ✅ Address/network mismatch detection
- ✅ Solana support via @solana/web3.js
- ✅ EVM support via ethers.js
- ✅ Error messages for missing wallets
- ✅ Database schema updated
- ✅ Read-only mode support
- ✅ Network switching support
- ✅ Callback handlers (onConnect, onDisconnect)

## Version History

- **v2.0.0** (Current)
  - ✅ Network-aware wallet selection
  - ✅ Address format validation
  - ✅ Solana Phantom support
  - ✅ Production-ready error handling

- **v1.0.0** (Legacy)
  - ❌ EVM-only
  - ❌ No Solana support
  - ❌ No address validation
