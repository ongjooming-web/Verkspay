# Prism MVP Spec

**Version:** 0.1  
**Status:** Design Phase  
**Target Launch:** Week 3-4

---

## Product Overview

**Prism** is an integrated ops platform for freelancers & small agencies to manage contracts, proposals, CRM, and invoicing in one place. Payment settlement in USDC (stablecoin on Base).

**Core Value Prop:**
- Freelancers stop juggling Word, Stripe, Notion, Google Sheets
- One dashboard for contracts, proposals, client mgmt, invoices
- Crypto-native (USDC settlement, instant, borderless)
- Simple enough for solopreneurs, powerful enough for 5-person teams

---

## Target User

**Primary:**
- Solopreneurs (1 person, $5k-50k MRR)
- Small agencies (2-5 people, $10k-100k MRR)
- Service providers (design, dev, consulting, writing)

**Secondary:**
- Crypto/builder community (YC founders, indie hackers)
- Freelancers already using crypto

**Why they'll use it:**
- Tired of tool sprawl (5-7 tools is normal)
- Want faster payment settlement (Stripe = 2-3 days, USDC = instant)
- Need professional ops but don't want to hire admin
- Want to work with other crypto-native people

---

## Core Features (MVP)

### 1. Client Management (CRM)
**What:** Simple client database + contact info + status  
**Why:** Freelancers need one place to see all clients, not scattered across tools  
**Minimal Viable:**
- Add client (name, email, phone, company)
- Client profile (contract history, total spent, last contacted)
- Search/filter by name or status
- Tags (active, inactive, high-value, etc.)

**NOT in MVP:** Advanced workflows, automation, integrations

---

### 2. Contract/Proposal Templates
**What:** Smart templates for contracts + proposals (pre-filled from client data)  
**Why:** Most freelancers use Word or generic templates; waste 30 min per contract  
**Minimal Viable:**
- 3-5 standard templates (Service Agreement, Statement of Work, NDA)
- Auto-fill client name, date, amount
- Download as PDF
- Simple editor (change values, not design)

**NOT in MVP:** Custom branding, custom templates, e-signature

---

### 3. Invoicing
**What:** Create + track invoices, mark as paid  
**Why:** Freelancers need to know who paid, who owes, when  
**Minimal Viable:**
- Create invoice (from client, project, amount, due date)
- Invoice template (auto-includes business info)
- Mark as paid (manual)
- Invoice history/list
- Export as PDF

**NOT in MVP:** Automatic reminders, payment links, recurring invoices

---

### 4. Payment Settlement (USDC on Base)
**What:** Accept USDC payments, direct to wallet  
**Why:** Instant settlement, no Stripe fees, borderless  
**Minimal Viable:**
- Generate payment request (QR code + address)
- Client can scan/send USDC to platform wallet
- Platform auto-forwards to freelancer wallet
- Dashboard shows payment status (pending → received → settled)
- Settlement history

**NOT in MVP:** Multi-currency, staking, yield farming

---

### 5. Dashboard
**What:** One-page overview of key metrics  
**Why:** Quick pulse check on business health  
**Minimal Viable:**
- Total revenue (this month, YTD)
- Outstanding invoices (amount, clients, due dates)
- Recent activity (last 5 invoices, payments)
- Quick actions (new invoice, new client, new proposal)

**NOT in MVP:** Advanced analytics, forecasting, charts

---

## Tech Stack (Minimal, Fast to Ship)

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js + TypeScript | Fast, full-stack, SSR for SEO |
| Backend | Next.js API routes | Same codebase, simpler deployment |
| Database | PostgreSQL (Vercel Postgres) | Relational, affordable, reliable |
| Auth | NextAuth.js + email/magic link | Simple, no password complexity |
| Payments | Bankr API (USDC on Base) | Native integration, Zeerac's infra |
| Hosting | Vercel | Deploys in minutes, auto-scaling |
| Styling | Tailwind CSS | Fast UI development |

**Why this stack?**
- Single codebase (less overhead)
- Vercel handles deployment (no ops)
- No external service sprawl
- Can ship MVP in 2-3 weeks with one dev

---

## User Flows (Happy Path)

### Flow 1: Freelancer Signs Up → Creates First Client
```
1. User lands on prismops.io
2. Clicks "Get Started"
3. Enters email → Gets magic link
4. Clicks link → Sets password (one-time)
5. Lands on onboarding: "What's your name? Your business?"
6. Dashboard loads
7. Clicks "Add Client"
8. Enters client name, email, type (one-time client, retainer, etc.)
9. Client added to CRM
10. Dashboard shows "0 invoices, 0 payments"
```

### Flow 2: Create First Invoice
```
1. On dashboard, click "New Invoice"
2. Select client (dropdown)
3. Enter project name, amount, due date
4. Click "Create Invoice"
5. See invoice preview (PDF)
6. Click "Send to Client" → Shows QR code + payment address
7. Client scans QR, sends USDC
8. Payment detected on dashboard → "Invoice Paid"
```

### Flow 3: Accept First Payment (Client POV)
```
1. Freelancer sends QR code + address link
2. Client opens in Wallet (Rainbow, MetaMask, etc.)
3. Scans QR → auto-populates amount + address
4. Client confirms → sends USDC
5. Transaction settles on Base (seconds)
6. Freelancer sees payment on dashboard instantly
7. USDC in freelancer's wallet (0x...)
```

---

## Data Model (Minimal)

```
Users
├── id (uuid)
├── email (unique)
├── name
├── wallet_address (their crypto wallet)
├── business_name
├── created_at

Clients
├── id (uuid)
├── user_id (fk)
├── name
├── email
├── phone (optional)
├── type (one-time, retainer, project)
├── created_at

Invoices
├── id (uuid)
├── user_id (fk)
├── client_id (fk)
├── amount (in USDC)
├── due_date
├── status (draft, sent, paid)
├── payment_tx_hash (optional, once paid)
├── created_at
├── paid_at

Payments
├── id (uuid)
├── invoice_id (fk)
├── user_id (fk)
├── amount (in USDC)
├── tx_hash (blockchain tx)
├── status (pending, confirmed)
├── received_at

Templates
├── id (uuid)
├── user_id (fk)
├── type (contract, proposal, invoice)
├── name
├── content (markdown or rich text)
├── created_at
```

---

## Pricing (Phase 1)

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/mo | Up to 3 clients, 5 invoices/month, USDC payments |
| **Pro** | $29/mo | Unlimited clients, unlimited invoices, priority support |

**Why low price?**
- Freemium gets users (volume > margin early)
- $29/mo is "$1/day" — easy sell for freelancers
- Proof of concept (users willing to pay)
- Later can upsell on features (Stripe, templates, etc.)

**Revenue model at scale:**
- 100 Pro users @ $29/mo = $2,900 MRR
- 1,000 Pro users @ $29/mo = $29,000 MRR

---

## Success Metrics (MVP Launch)

| Metric | Target | Why |
|--------|--------|-----|
| Signups (Week 1) | 50+ | Product Hunt / Twitter buzz |
| Free users (Week 2) | 100+ | Viral loop (tell friends) |
| First paying customer | Week 2 | Proof of concept |
| $500 MRR | Week 4 | ~17 Pro customers, sustainable |
| $1K MRR | Month 2 | Double the customer base |
| Churn | < 20%/month | Keep 80%+ of customers |

---

## Non-Goals (What We DON'T Build in MVP)

- ❌ Email reminders (send at own risk)
- ❌ E-signatures (too complex)
- ❌ Advanced templates (Figma export, custom branding)
- ❌ Stripe integration (Phase 2)
- ❌ Multi-currency (only USDC)
- ❌ Team collaboration (single user only)
- ❌ Tax calculations
- ❌ Accounting exports
- ❌ Mobile app (responsive web only)

**Why?** MVP = smallest thing that solves the problem. Add later based on user feedback.

---

## Timeline

| Week | What |
|------|------|
| Week 1 | Design + data model + start frontend |
| Week 2 | Frontend mostly done + Bankr integration + auth |
| Week 3 | Backend complete + payments + testing |
| Week 3-4 | Polish + bug fixes + soft launch |

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Users prefer Stripe (fiat) | High | Stripe integration in Phase 2, funded by revenue |
| Low initial traction | Medium | Strong launch marketing on Twitter + communities |
| Crypto wallet complexity | Medium | QR codes + simple onboarding reduce friction |
| Security issues | Critical | Bankr handles custody, we don't touch keys |
| Churn if features missing | Medium | Get MVP feedback, prioritize top requests |

---

## Next Steps

1. ✅ Spec locked
2. ⏳ Start frontend development
3. ⏳ Bankr integration testing
4. ⏳ Auth + user management
5. ⏳ Beta testing with 5-10 early users
6. ⏳ Launch
