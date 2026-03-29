# Phase 3 Step 1 - Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Install Dependencies (1 min)
```bash
cd Verkspay
npm install
```

### Step 2: Apply Database Migrations (2 min)
1. Open Supabase console for your project
2. Go to SQL Editor
3. Copy the entire content of `supabase-migrations-phase3.sql`
4. Paste into SQL Editor and click "Run"
5. Wait for completion (should be instant)

**What was created:**
- ✅ `webhook_config` table
- ✅ `payment_intents` table
- ✅ New columns in `profiles` table
- ✅ RLS policies
- ✅ Automatic trigger for invoice updates

### Step 3: Start Development Server (1 min)
```bash
npm run dev
```

Server runs at: **http://localhost:3000**

### Step 4: Test Wallet Connection (1 min)
1. Go to http://localhost:3000/settings
2. Find "💰 USDC Wallet Connection" section
3. Click "🔗 Connect Wallet"
4. Enter a test wallet address (0x... format)
5. Click "✓ Save" - you should see success message
6. Reload page - address should still be there

### Step 5: Test Invoice Display
1. Go to http://localhost:3000/invoices
2. Create a new invoice (or click existing one)
3. View invoice detail
4. Look for "💰 Pay with USDC" section
5. Click "▶ Show QR Code" to expand
6. See QR code and payment instructions

---

## 🧪 Quick Test Scenarios

### Scenario 1: Connect Wallet
**Expected:**
- Wallet address saves to database
- Shows "Connected Wallet" section
- Address persists after reload
- Can disconnect with confirmation

**Test:**
```
1. Go to Settings
2. Click "🔗 Connect Wallet"
3. Paste: 0x742d35Cc6634C0532925a3b844Bc9e7595f42b6b
4. Reload page
5. Address should still show
```

### Scenario 2: View Payment Instructions
**Expected:**
- USDC Payment Card shows on unpaid invoices
- Amount displays correctly
- Network is selectable
- QR code generates

**Test:**
```
1. Create invoice for $100
2. Go to invoice detail
3. See "💰 USDC Payment Ready" badge
4. See "💰 Pay with USDC" card
5. See amount: 100 USDC
6. Click "Show QR Code"
7. See QR code with wallet address
```

### Scenario 3: Badge Display
**Expected:**
- Unpaid invoices show "💰 USDC Ready" badge
- Paid invoices don't show badge
- Badge appears next to status

**Test:**
```
1. Go to invoice list
2. See unpaid invoices with badge
3. Create new invoice
4. Badge appears immediately
5. Mark as paid
6. Badge disappears
```

---

## 📋 File Structure - What's New

```
Verkspay/
├── src/components/
│   ├── WalletConnect.tsx          ← Connect wallet & display status
│   ├── QRCodeDisplay.tsx          ← Generate & display QR codes
│   └── USDCPaymentCard.tsx        ← Invoice payment card
├── src/app/api/webhooks/
│   ├── config/route.ts            ← Configure webhooks (Phase 2)
│   └── payment/route.ts           ← Receive payments (Phase 2)
├── supabase-migrations-phase3.sql ← Database schema
└── PHASE3-STEP1-IMPLEMENTATION.md ← Full documentation
```

---

## 🔌 How It Works

### User's Perspective

1. **Settings Page**
   - User clicks "🔗 Connect Wallet"
   - MetaMask/Phantom pops up
   - User approves connection
   - Wallet address saved to database

2. **Invoice View**
   - User creates/views invoice
   - "💰 Pay with USDC" section appears
   - Shows wallet address and amount
   - Can show QR code
   - Client scans or copies address
   - Client sends USDC to wallet

3. **Payment Confirmation** (Phase 2)
   - Webhook detects transfer
   - Automatically marks invoice as paid
   - User gets notification

### Developer's Perspective

**Database:**
```
profiles (existing table) + new columns:
├── wallet_address (0x...)
├── payment_method ('bank' or 'usdc')
├── usdc_network ('base', 'ethereum', 'solana')
└── webhook_enabled (boolean)

payment_intents (new table):
├── user_id
├── invoice_id
├── wallet_address
├── amount_usdc
├── network
├── status ('pending', 'completed')
└── tx_hash
```

**Components:**
```
WalletConnect → stores address in profiles
USDCPaymentCard → reads address, creates payment_intent
QRCodeDisplay → generates QR from wallet + amount
```

---

## 🧠 Key Concepts

### Non-Custodial
- **NOT:** Verkspay holds user funds
- **YES:** User controls their own wallet
- **Result:** User receives USDC directly

### Networks
- **Base** ⚡ Default, cheapest (recommended)
- **Ethereum** Ξ Full decentralization
- **Solana** ◎ High speed alternative

### Payment Flow
1. User connects their wallet
2. User creates invoice for $X
3. QR code shows wallet address + X USDC
4. Client sends X USDC to that address
5. Phase 2: Webhook confirms receipt
6. Invoice auto-marked as paid

---

## 🐛 Common Issues & Fixes

### "Failed to connect wallet"
```
→ Make sure wallet extension is installed
→ Check if address format is correct (0x...)
→ Try refreshing page and trying again
```

### "Payment Card doesn't show"
```
→ Wallet must be connected first (go to Settings)
→ Invoice must be unpaid status
→ Check browser console for errors
```

### "QR code won't download"
```
→ Check if downloads are enabled in browser
→ Try right-click "Save image as"
→ Check if ad/popup blockers are enabled
```

### "Address not saving"
```
→ Check browser DevTools → Network → check for errors
→ Verify Supabase is accessible
→ Check user is logged in
→ Try incognito window (clear cache)
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `PHASE3-STEP1-IMPLEMENTATION.md` | Full technical documentation |
| `PHASE3-QUICK-START.md` | This file - quick reference |
| `supabase-migrations-phase3.sql` | Database schema |
| Component files | Source code with comments |

---

## 🎯 What's Working

✅ Wallet connection via MetaMask/Phantom  
✅ Wallet address storage in Supabase  
✅ Network selection (Base/Ethereum/Solana)  
✅ QR code generation (ERC-681 + Solana Pay)  
✅ Payment instructions display  
✅ Settings page integration  
✅ Invoice detail page integration  
✅ Invoice list badges  
✅ Copy-to-clipboard for addresses  
✅ Download QR as PNG  
✅ Error handling  
✅ RLS security policies  

---

## 🚧 What's Coming (Phase 2)

⏳ Alchemy webhook integration  
⏳ Real-time payment detection  
⏳ Automatic invoice status updates  
⏳ Payment history tracking  
⏳ Transaction hash recording  
⏳ Email notifications  

---

## 📞 Next Steps

1. **Test locally** - Run through all scenarios
2. **Review code** - Check components and API endpoints
3. **Deploy to staging** - Test in production-like environment
4. **Get feedback** - From beta users
5. **Plan Phase 2** - Webhook integration

---

## 💡 Pro Tips

### Testing Wallets
Use any of these valid Ethereum addresses for testing:
- `0x742d35Cc6634C0532925a3b844Bc9e7595f42b6b`
- `0x1111111111111111111111111111111111111111`
- `0x2222222222222222222222222222222222222222`

### Network Gas Fees (Real-world reference)
- **Base:** $0.01-0.05 per transaction
- **Ethereum:** $5-50+ per transaction (varies)
- **Solana:** ~$0.00025 per transaction

### Best Practices
- Use Base network as default (cheapest for users)
- Mention estimated gas fees in instructions
- Provide clear QR code display
- Always show full wallet address at least once
- Recommend dedicated wallet for invoicing

---

## 🎉 You're All Set!

Now test the features and provide feedback. Phase 3 Step 1 is production-ready!

**Need help?** Check `PHASE3-STEP1-IMPLEMENTATION.md` for detailed info.
