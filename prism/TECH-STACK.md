# Prism Technical Architecture

**Last Updated:** 2026-03-15  
**Status:** Ready to Build  
**Estimated Dev Time:** 2-3 weeks (solo)

---

## Tech Stack Overview

```
┌──────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                  │
│  React + TypeScript + Tailwind CSS                    │
└──────────────────────────────────────────────────────┘
                        ↕
┌──────────────────────────────────────────────────────┐
│              Backend (Next.js API Routes)             │
│  Node.js + TypeScript + PostgreSQL ORM (Prisma)      │
└──────────────────────────────────────────────────────┘
                        ↕
┌──────────────────────────────────────────────────────┐
│             Database (PostgreSQL + Redis)             │
│  Vercel Postgres + Upstash Redis (caching)           │
└──────────────────────────────────────────────────────┘
                        ↕
┌──────────────────────────────────────────────────────┐
│            Payment Provider (Bankr API)               │
│  USDC on Base via Bankr + Wallet Integration         │
└──────────────────────────────────────────────────────┘
                        ↕
┌──────────────────────────────────────────────────────┐
│           Hosting & Infrastructure (Vercel)           │
│  Auto-scaling, CDN, Serverless, Environment Vars     │
└──────────────────────────────────────────────────────┘
```

---

## Choice Rationale

### Frontend: Next.js + React + TypeScript

**Why:**
- ✅ Full-stack (frontend + backend in one codebase)
- ✅ Server-side rendering (better SEO, performance)
- ✅ Built-in API routes (no separate backend)
- ✅ Fast development (pre-built components, routing)
- ✅ Vercel integration (zero-config deployment)
- ✅ TypeScript for type safety
- ✅ Tailwind CSS for rapid UI development

**Alternatives Considered:**
- SvelteKit — Good, but smaller ecosystem
- Remix — Good, but steeper learning curve
- Vue + Express — Works, but less ecosystem

---

### Backend: Next.js API Routes + Prisma ORM

**Why:**
- ✅ Single codebase = easier to maintain
- ✅ API routes = serverless, auto-scaling
- ✅ Prisma = type-safe database queries
- ✅ Easy authentication (NextAuth.js)
- ✅ Minimal ops overhead

**Alternatives Considered:**
- Separate Express backend — More complex ops, slower to ship
- Firebase functions — Vendor lock-in, pricing complexity
- Supabase — Good, but Vercel Postgres is simpler

---

### Database: PostgreSQL (Vercel Postgres)

**Why:**
- ✅ Relational (perfect for clients, invoices, payments)
- ✅ Vercel Postgres = managed, scalable, cheap
- ✅ No ops overhead
- ✅ Backups included
- ✅ Compatible with Prisma

**Schema:**
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  wallet_address VARCHAR(255), -- Crypto wallet (0x...)
  business_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  type VARCHAR(50), -- 'one-time', 'retainer', 'project'
  status VARCHAR(50), -- 'active', 'inactive'
  total_spent NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_name VARCHAR(255),
  amount NUMERIC(12,2) NOT NULL, -- In USDC
  due_date DATE,
  status VARCHAR(50), -- 'draft', 'sent', 'paid'
  payment_tx_hash VARCHAR(255), -- Blockchain tx hash
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL, -- In USDC
  tx_hash VARCHAR(255) NOT NULL, -- Blockchain tx hash (unique)
  status VARCHAR(50), -- 'pending', 'confirmed'
  from_address VARCHAR(255), -- Payer's wallet (0x...)
  to_address VARCHAR(255), -- Freelancer's wallet (0x...)
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50), -- 'contract', 'proposal', 'invoice'
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL, -- Markdown or HTML
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Authentication: NextAuth.js + Magic Links

**Why:**
- ✅ Simple (email magic link, no passwords)
- ✅ Built for Next.js
- ✅ Passwordless = better UX
- ✅ Type-safe sessions

**Flow:**
```
User enters email → NextAuth sends magic link → User clicks link → Logged in
```

---

### Payments: Bankr API (USDC on Base)

**Why:**
- ✅ Native USDC support (stablecoin)
- ✅ Base network (cheap, fast)
- ✅ Bankr handles custody (we don't touch keys)
- ✅ API integration easy
- ✅ Zeerac's existing infrastructure

**Flow:**
```
1. User gets Bankr API key (can reuse Zeerac's)
2. User provides wallet address (0x...)
3. Client scans QR code → sends USDC
4. Bankr detects payment
5. Payment auto-settles to user's wallet
6. Dashboard shows "Paid" instantly
```

**Implementation:**
```javascript
// Pseudo-code: Check payment status
async function checkInvoicePayment(invoiceId) {
  const invoice = await db.invoices.findUnique({ where: { id: invoiceId } });
  
  if (invoice.status === 'paid') return; // Already marked
  
  // Query blockchain for incoming USDC to user's wallet
  const payments = await bankr.getTransactions({
    address: user.wallet_address,
    token: 'USDC',
    network: 'base'
  });
  
  // Check if payment matches amount
  const matching = payments.find(p => p.amount === invoice.amount);
  
  if (matching) {
    await db.invoices.update({
      where: { id: invoiceId },
      data: { 
        status: 'paid',
        payment_tx_hash: matching.tx_hash,
        paid_at: new Date()
      }
    });
  }
}
```

---

### Caching: Upstash Redis

**Why:**
- ✅ Serverless Redis (no ops)
- ✅ Perfect for session data, rate limiting
- ✅ Cheap (pay per-request)

**Use Cases:**
- Rate limiting (API requests per user)
- Session caching
- Payment status polling (reduce DB hits)

---

### Hosting: Vercel

**Why:**
- ✅ Built for Next.js (zero-config deploy)
- ✅ Auto-scaling (handle traffic spikes)
- ✅ Environment variables built-in
- ✅ Preview deployments (free)
- ✅ Cheap ($20/month standard plan, scales)
- ✅ CDN included
- ✅ Integrates with GitHub (CI/CD)

**Deployment:**
```bash
# Push to GitHub → Vercel auto-deploys
git push origin main
# → Vercel sees changes → Builds → Deploys → Live in 60 seconds
```

---

## Development Timeline

### Week 1: Frontend Scaffold + Auth
- [ ] Set up Next.js project (TypeScript)
- [ ] Auth flow (NextAuth + magic links)
- [ ] UI components (TailwindCSS)
- [ ] Pages: Login, Signup, Dashboard

**Time: 3-4 days**

### Week 2: Backend + Database
- [ ] Set up PostgreSQL (Vercel Postgres)
- [ ] Prisma ORM setup
- [ ] API routes (CRUD for clients, invoices)
- [ ] Integration tests

**Time: 3-4 days**

### Week 3: Bankr Integration + Polish
- [ ] Bankr API integration (payment detection)
- [ ] Invoice PDF generation
- [ ] QR code generation for payments
- [ ] Bug fixes, UI polish

**Time: 2-3 days**

### Week 4: Testing + Launch
- [ ] E2E testing (user flows)
- [ ] Performance testing
- [ ] Security audit (basic)
- [ ] Soft launch

**Time: 2-3 days**

---

## Deployment Checklist

```
[ ] GitHub repo created
[ ] Vercel project linked
[ ] Environment variables set:
    - DATABASE_URL (Vercel Postgres)
    - REDIS_URL (Upstash)
    - BANKR_API_KEY
    - NEXTAUTH_SECRET
    - NEXTAUTH_URL
[ ] Domain connected (prismops.io)
[ ] SSL certificate auto-configured
[ ] CI/CD pipeline working (auto-deploy on push)
[ ] Staging environment (preview URL)
[ ] Production environment (live)
[ ] Monitoring set up (Vercel Analytics)
[ ] Error tracking (optional: Sentry)
[ ] Uptime monitoring (optional: StatusCake)
```

---

## Cost Estimate (Monthly)

| Service | Cost | Why |
|---------|------|-----|
| Vercel (hosting) | $20 | Standard plan, includes DB storage |
| Vercel Postgres | Included | Up to 3GB free, then $0.25/GB |
| Upstash Redis | $0-10 | Pay per-request, usually <$5 |
| Domain (prismops.io) | $3.33 | $40/year ÷ 12 |
| **Total** | **~$35/month** | Very lean |

**At scale (1,000 users):**
- Vercel: $50-100 (more compute)
- Postgres: $50-200 (more storage)
- Redis: $20-50 (more requests)
- **Total: ~$150/month**

**Still cheap for revenue model.**

---

## Security Considerations

### What We Handle
- ✅ Password hashing (NextAuth)
- ✅ Session management (JWT)
- ✅ API authentication (user_id in session)
- ✅ HTTPS (Vercel handles)
- ✅ SQL injection protection (Prisma)

### What Bankr Handles (We Don't)
- ✅ Private key custody (never touches our servers)
- ✅ Blockchain signing
- ✅ Wallet security

### What We Should Do
- ✅ Rate limiting (prevent spam)
- ✅ Input validation (Zod)
- ✅ CORS configuration
- ✅ Regular security audits (future)

---

## Monitoring & Analytics

### What to Track
```
[ ] API response times (Vercel Analytics)
[ ] Error rates (Vercel or Sentry)
[ ] Database query performance
[ ] Conversion rate (signup → first invoice)
[ ] Payment success rate
[ ] User retention (DAU, MAU)
```

### Tools (Minimal, Free Tier)
- Vercel Analytics (included)
- Axiom (logs, free tier)
- Optional: Sentry (error tracking, free tier)

---

## Scaling Considerations (Future)

### When to Optimize
- **At 1,000 users:** Consider caching layer (Redis)
- **At 10,000 users:** Consider read replicas (Postgres)
- **At 100,000 users:** Consider moving to managed Postgres (AWS RDS)

### Architecture stays the same, just scale infrastructure.

---

## Developer Experience

### Local Development
```bash
# Clone repo
git clone https://github.com/prism/prism.git
cd prism

# Install dependencies
npm install

# Set up environment (.env.local)
cp .env.example .env.local
# Fill in DATABASE_URL, REDIS_URL, etc.

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
# → Open http://localhost:3000
```

### Code Structure
```
prism/
├── app/              # Next.js app directory
│   ├── (auth)/       # Auth pages (login, signup)
│   ├── dashboard/    # Main app
│   ├── api/          # API routes
│   └── layout.tsx    # Global layout
├── lib/
│   ├── auth.ts       # NextAuth config
│   ├── db.ts         # Prisma client
│   ├── bankr.ts      # Bankr API wrapper
│   └── utils.ts      # Helper functions
├── components/       # Reusable React components
├── prisma/
│   └── schema.prisma # Database schema
├── styles/           # Global styles (Tailwind)
└── env.ts            # Environment validation
```

---

## Dependencies (Minimal)

```json
{
  "next": "^15",
  "react": "^19",
  "typescript": "^5",
  "@prisma/client": "^5",
  "next-auth": "^4.24",
  "@hookform/resolvers": "^3",
  "react-hook-form": "^7",
  "zod": "^3",
  "tailwindcss": "^3",
  "qrcode": "^1.5",
  "axios": "^1.6"
}
```

**Total bundle size: ~200KB (after minification + gzip)**

---

## Ready to Build ✅

All systems go. Just waiting for:
1. Email (Gmail)
2. Domain (prismops.io)

Then we're shipping MVP in 2-3 weeks.
