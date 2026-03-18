# MEMORY.md - Long-Term Memory

## Who I Am

**Name:** Zenith (⚡)  
**Nature:** AI agent with real autonomy — I build, ship, move capital  
**Mission:** Make $100K revenue  
**Boss:** Zeerac (kevojm)  
**Given:** Full autonomy (no approval needed, just execute)  
**Timezone:** GMT+8

## The Deal

- Built Prism to make $100K
- $1K capital to start (earn more = spend more)
- Full execution autonomy granted (March 15, 2026)
- Weekly updates to Zeerac
- First milestone: $500 MRR (prove model)

## Current Project: Prism

**Agent:** Zenith (me, ⚡)  
**Product:** Prism (freelance ops platform)  
**Vertical:** Freelancers & small agencies (1-5 person teams) — crypto/builder first, mainstream later  
**Problem:** Fragmented workflows — contracts, proposals, invoicing, CRM all separate tools  
**Solution:** Integrated platform combining:
- Smart contract templates (crypto-friendly)
- Proposal builder
- Basic CRM
- Invoicing dashboard
- **Payment:** USDC on Base (Bankr) → Stripe later

**Pricing:** $49/mo freemium → $299/mo pro  
**Launch Timeline:**
- Week 1 (now): Validate with 10-15 users
- Week 2-3: Build MVP
- Week 3-4: Launch to crypto/builder community

**Brand Stack:**
- Twitter: @prismops (owned by me, shared creds with Zeerac)
- Landing: Simple (collect emails, explain the problem)
- Product: Crypto-first (USDC on Base), Stripe funded by revenue

**Why This Vertical:**
- High pain (daily friction in ops)
- High willingness to pay ($300-999/mo)
- Low competition for integrated play
- Sticky (business-critical, switching costs)
- Direct audience (Twitter, Discord, indie communities)

## Capital & Assets

**BOTCOIN Claim:** ✅ COMPLETED (3/16/2026 ~8:09 AM GMT+8)
- Unstaked 50M BOTCOIN from staking contract
- Now in wallet: 0x685bbc9aca1df49bead43c49343de8959ce67fb3
- Value: ~$1,162 USD
- Next: Evaluate whether to hold, trade, or deploy

## Capital Tracking

| Item | Budget | Status |
|------|--------|--------|
| Validation (ads + interviews) | $300 | In progress |
| Hosting + domain + tools | $200 | TBD |
| Launch reserve | $500 | Reserved |
| **Total** | **$1,000** | - |

## Security Standards (Non-Negotiable)

**Established:** 2026-03-18 (after full codebase security audit)  
**Applies to:** All Prism code going forward

### Authentication
- **NEVER** manually decode JWT tokens using `Buffer.from/base64`
- **ALWAYS** use `supabase.auth.getUser(token)` to verify tokens
- **ALWAYS** use shared `verifyAuth()` helper from `/lib/auth.ts`
- **ALWAYS** refresh session before getting token on client side:
  ```typescript
  await supabase.auth.refreshSession()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session.access_token
  ```

### Supabase Client Usage
- Server API routes **ALWAYS** use `SUPABASE_SERVICE_ROLE_KEY`
- **NEVER** use `NEXT_PUBLIC_SUPABASE_ANON_KEY` in server routes
- Client components use client-side supabase instance only
- Import server client from `/lib/supabase-server.ts`
- Export functions: `getSupabaseServer()`, `getSupabaseAuth()`

### Environment Variables
- **NEVER** use `NEXT_PUBLIC_` prefix for server-only secrets
- `NEXT_PUBLIC_` is **ONLY** for values safe to expose to the browser
- Stripe keys, service role keys = **no** `NEXT_PUBLIC_` prefix
- Example: `STRIPE_PRICE_PRO` (not `NEXT_PUBLIC_STRIPE_PRICE_PRO`)

### API Route Checklist
Every new API route must have:
- [ ] `verifyAuth()` at the top for protected routes
- [ ] `try/catch` with proper error handling
- [ ] Service role Supabase client (not anon key)
- [ ] Input validation before processing
- [ ] Proper HTTP status codes (401, 403, 404, 500)
- [ ] Ownership checks (user can only modify own data)

### Code Quality
- Shared helpers go in `/lib/` — never duplicate auth logic
- All database column references must exist in schema
- Test every new endpoint before marking as done
- **No** `console.log` of sensitive data (tokens, keys, emails)
- All routes import from shared helpers, not local instantiation

### Before Every Commit
- ✅ Does this introduce any manual JWT decoding? → Fix it
- ✅ Does this use `ANON_KEY` in a server route? → Fix it
- ✅ Does this expose env vars to the client? → Fix it
- ✅ Does this have proper error handling? → Add it
- ✅ Does this verify user owns the resource? → Add ownership check

### Known Vulnerabilities Fixed
1. **Mark-paid endpoint** - Had manual JWT decode (Buffer.from) → Fixed with `auth.getUser()`
2. **Check-limits endpoint** - Used ANON_KEY in server route → Fixed with SERVICE_ROLE_KEY
3. **Payment-link endpoint** - Missing auth verification → Fixed with `requireAuth()` + ownership check
4. **Billing endpoints** - Inconsistent auth patterns → Refactored to use shared helpers

---

## Daily Standup

Track what I'm doing each day here. Updates will flow into this.
