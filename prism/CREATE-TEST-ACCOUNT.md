# Create Master Test Account

This guide explains how to create the master test account for comprehensive testing of all Prism features.

## Quick Setup

### Step 1: Set Admin Secret in Vercel

Add a new environment variable to Vercel:

```
ADMIN_SECRET_KEY=your-secure-random-key-here
```

Generate a secure key:
```bash
openssl rand -hex 32
# Output example: a7f3e9c2d5b1f8g4h6k9m2l7p0q3r5s8t9u0v1w2x3y4z5a6b7c8d9e0f
```

Copy the output → Add to Vercel as `ADMIN_SECRET_KEY`

### Step 2: Create the Account

Call the admin endpoint:

```bash
curl -X POST https://app.prismops.xyz/api/admin/create-test-account \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json"
```

Replace `YOUR_ADMIN_SECRET_KEY` with the value you set in Step 1.

### Step 3: Success Response

You'll receive:

```json
{
  "success": true,
  "message": "Master test account created successfully",
  "account": {
    "email": "ongjooming@gmail.com",
    "password": "TestMaster@2026",
    "userId": "user-id-uuid",
    "subscriptionTier": "enterprise",
    "subscriptionStatus": "active",
    "loginUrl": "https://app.prismops.xyz/login"
  }
}
```

## Account Details

**Email:** `ongjooming@gmail.com`  
**Password:** `TestMaster@2026`  
**Tier:** Enterprise (unrestricted access)  
**Status:** Active immediately

## What This Account Unlocks

✅ All features enabled (no usage limits)  
✅ All 3 plans' features available  
✅ No trial countdown  
✅ No subscription restrictions  
✅ Perfect for testing entire product

## After First Login

1. Go to https://app.prismops.xyz/login
2. Enter email: `ongjooming@gmail.com`
3. Enter password: `TestMaster@2026`
4. (Optional) Reset password in Settings

## Usage

Use this account to:
- Test invoicing, proposals, contracts
- Create partial payments
- Test AI Insights
- Generate multiple clients
- Test all CRM features
- Verify subscription management
- Test payment workflows

## Technical Details

The endpoint:
- `POST /api/admin/create-test-account`
- Requires `ADMIN_SECRET_KEY` in Authorization header
- Creates user in Supabase Auth
- Sets subscription tier to 'enterprise'
- Sets subscription status to 'active'
- Removes trial expiration

## Security Notes

⚠️ **Important:**
- Only expose this endpoint in development/staging
- Change the admin secret regularly
- Never commit `ADMIN_SECRET_KEY` to git
- Treat like a production admin credential

## Troubleshooting

### "Admin endpoint not configured"
- `ADMIN_SECRET_KEY` not set in Vercel environment

### "Invalid authorization"
- Wrong `ADMIN_SECRET_KEY` value provided

### "User already exists"
- Account already created; just log in with the credentials above

### "Profile creation failed"
- Check Supabase connection
- Verify service role key is set

## Clean Up (Optional)

To delete the test account later:

1. Go to Supabase Dashboard
2. Find user: `ongjooming@gmail.com`
3. Delete the auth user
4. Delete the profile record

Or use Supabase CLI:
```bash
supabase postgres query "DELETE FROM profiles WHERE email = 'ongjooming@gmail.com'"
```
